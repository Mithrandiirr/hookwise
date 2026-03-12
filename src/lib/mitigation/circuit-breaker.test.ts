import { vi, type Mock } from "vitest";

// Mock the db module
vi.mock("@/lib/db", () => {
  const mockTx = {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  };

  // Chain helpers for select
  function createSelectChain(rows: unknown[]) {
    const chain: Record<string, Mock> = {};
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockResolvedValue(rows);
    chain.for = vi.fn().mockReturnValue(chain);
    return chain;
  }

  // Chain helpers for update
  function createUpdateChain() {
    const chain: Record<string, Mock> = {};
    chain.set = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockResolvedValue(undefined);
    return chain;
  }

  const db = {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    }),
    select: vi.fn(),
    insert: vi.fn(),
    _mockTx: mockTx,
    _createSelectChain: createSelectChain,
    _createUpdateChain: createUpdateChain,
  };

  return { db };
});

// Mock the schema module
vi.mock("@/lib/db/schema", () => ({
  endpoints: { id: "id", integrationId: "integrationId" },
  deliveries: {
    endpointId: "endpointId",
    status: "status",
    responseTimeMs: "responseTimeMs",
    attemptedAt: "attemptedAt",
  },
  integrations: { id: "id", userId: "userId" },
  replayQueue: { endpointId: "endpointId", position: "position" },
}));

// Mock drizzle-orm functions
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ col: _col, val })),
  desc: vi.fn((col: unknown) => ({ desc: col })),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
}));

// Mock the compliance audit module
vi.mock("@/lib/compliance/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import { recordDeliveryResult, recordHealthCheckResult } from "./circuit-breaker";

interface MockDb {
  _mockTx: { select: Mock; update: Mock };
  _createSelectChain: (rows: unknown[]) => Record<string, Mock>;
  _createUpdateChain: () => Record<string, Mock>;
  transaction: Mock;
}

function setupTransaction(
  endpointRow: Record<string, unknown>,
  deliveryRows: Record<string, unknown>[] = []
) {
  const mockDb = db as unknown as MockDb;
  const tx = mockDb._mockTx;

  let selectCallCount = 0;
  tx.select.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // First select: endpoint row (with FOR UPDATE)
      return mockDb._createSelectChain([endpointRow]);
    }
    // Second select: recent deliveries
    return mockDb._createSelectChain(deliveryRows);
  });

  tx.update.mockImplementation(() => mockDb._createUpdateChain());
}

function makeEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: "ep_1",
    integrationId: "int_1",
    circuitState: "closed",
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    consecutiveHealthChecks: 0,
    successRate: 100,
    avgResponseMs: 50,
    ...overrides,
  };
}

function makeDeliveries(count: number, status: string = "delivered"): Record<string, unknown>[] {
  return Array.from({ length: count }, () => ({
    status,
    responseTimeMs: 100,
  }));
}

describe("recordDeliveryResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions CLOSED → OPEN after 5 consecutive failures", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "closed", consecutiveFailures: 4, consecutiveSuccesses: 0 }),
      makeDeliveries(4, "failed")
    );

    const result = await recordDeliveryResult("ep_1", false, 100);
    expect(result.previousState).toBe("closed");
    expect(result.newState).toBe("open");
  });

  it("transitions CLOSED → OPEN when success rate drops below 50%", async () => {
    // 0 successes in window of 4 failed + current failure = 0/5 = 0%
    setupTransaction(
      makeEndpoint({ circuitState: "closed", consecutiveFailures: 0, consecutiveSuccesses: 0 }),
      makeDeliveries(4, "failed")
    );

    const result = await recordDeliveryResult("ep_1", false, 100);
    expect(result.previousState).toBe("closed");
    expect(result.newState).toBe("open");
  });

  it("stays CLOSED after 4 failures then a success", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "closed", consecutiveFailures: 4, consecutiveSuccesses: 0 }),
      makeDeliveries(4, "failed")
    );

    // Success resets consecutive failures to 0 (below threshold of 5)
    // Success rate: (0 + 1) / 5 = 20% < 50% but let's make the window have some successes
    // Actually with 4 failed deliveries in window + 1 current success = 1/5 = 20% → still opens
    // We need enough successes in the window to keep rate >= 50%
    setupTransaction(
      makeEndpoint({ circuitState: "closed", consecutiveFailures: 4, consecutiveSuccesses: 0 }),
      [
        ...makeDeliveries(2, "failed"),
        ...makeDeliveries(2, "delivered"),
      ]
    );

    const result = await recordDeliveryResult("ep_1", true, 100);
    // 2 previous successes + 1 current = 3/5 = 60% >= 50%, and consecutive failures reset to 0
    expect(result.previousState).toBe("closed");
    expect(result.newState).toBe("closed");
  });

  it("stays CLOSED when success rate is exactly 50%", async () => {
    // Need 4 deliveries in window: 2 delivered + 2 failed, plus 1 current failure
    // Successes: 2 / 5 total = 40% - that's below. Let's adjust:
    // 3 delivered in window + current success = (3+1)/5 = 80% - too high
    // Let's do: 1 delivered, 3 failed in window + current success = (1+1)/5 = 40% - below
    // Actually we need exactly 50%:
    // Window has 3 items: 2 delivered, 1 failed. Current = failure. Total = 4. Successes = 2. Rate = 50%.
    // But totalInWindow < 5 so success rate check doesn't trigger.
    // Window has 4 items: 2 delivered, 2 failed. Current = success. Total = 5. Successes = 3. Rate = 60%.
    // Window has 4 items: 1 delivered, 3 failed. Current = success. Total = 5. Successes = 2. Rate = 40%.
    // We want exactly 50%: Window 4 items, current makes 5. Successes = 2.5 impossible...
    // 50% means we need success ≥ 50%. Code checks < 50, so 50% stays closed.
    // Window has 9 items: 4 delivered, 5 failed. Current = success. Total = 10. Successes = 5. Rate = 50%.
    setupTransaction(
      makeEndpoint({ circuitState: "closed", consecutiveFailures: 0, consecutiveSuccesses: 0 }),
      [
        ...makeDeliveries(4, "delivered"),
        ...makeDeliveries(5, "failed"),
      ]
    );

    const result = await recordDeliveryResult("ep_1", true, 100);
    // (4 + 1) / 10 = 50% - not < 50%, stays closed
    expect(result.previousState).toBe("closed");
    expect(result.newState).toBe("closed");
  });

  it("transitions HALF_OPEN → CLOSED after 10 consecutive successes", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "half_open", consecutiveSuccesses: 9, consecutiveFailures: 0 }),
      makeDeliveries(9, "delivered")
    );

    const result = await recordDeliveryResult("ep_1", true, 100);
    expect(result.previousState).toBe("half_open");
    expect(result.newState).toBe("closed");
  });

  it("transitions HALF_OPEN → OPEN after 2 consecutive failures", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "half_open", consecutiveFailures: 1, consecutiveSuccesses: 0 }),
      makeDeliveries(1, "failed")
    );

    const result = await recordDeliveryResult("ep_1", false, 100);
    expect(result.previousState).toBe("half_open");
    expect(result.newState).toBe("open");
  });

  it("stays HALF_OPEN after 1 failure", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "half_open", consecutiveFailures: 0, consecutiveSuccesses: 3 }),
      makeDeliveries(3, "delivered")
    );

    const result = await recordDeliveryResult("ep_1", false, 100);
    expect(result.previousState).toBe("half_open");
    expect(result.newState).toBe("half_open");
  });

  it("stays OPEN on delivery (defensive — no state change)", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "open", consecutiveFailures: 5, consecutiveSuccesses: 0 }),
      makeDeliveries(5, "failed")
    );

    const result = await recordDeliveryResult("ep_1", true, 100);
    expect(result.previousState).toBe("open");
    expect(result.newState).toBe("open");
  });

  it("resets consecutive failures on success", async () => {
    const updateChainSpy = vi.fn();
    const mockDb = db as unknown as MockDb;
    const tx = mockDb._mockTx;

    let selectCallCount = 0;
    tx.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return mockDb._createSelectChain([
          makeEndpoint({ consecutiveFailures: 3, consecutiveSuccesses: 0 }),
        ]);
      }
      return mockDb._createSelectChain(makeDeliveries(3, "delivered"));
    });

    const updateChain: Record<string, Mock> = {};
    updateChain.set = vi.fn().mockImplementation((vals: Record<string, unknown>) => {
      updateChainSpy(vals);
      return updateChain;
    });
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    tx.update.mockImplementation(() => updateChain);

    await recordDeliveryResult("ep_1", true, 100);

    expect(updateChainSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
      })
    );
  });

  it("throws when endpoint not found", async () => {
    const mockDb = db as unknown as MockDb;
    mockDb._mockTx.select.mockImplementation(() =>
      mockDb._createSelectChain([])
    );

    await expect(recordDeliveryResult("ep_nonexistent", true, 100)).rejects.toThrow(
      "Endpoint ep_nonexistent not found"
    );
  });
});

describe("recordHealthCheckResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions OPEN → HALF_OPEN after 3 consecutive successful health checks", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "open", consecutiveHealthChecks: 2 })
    );

    const result = await recordHealthCheckResult("ep_1", true);
    expect(result.previousState).toBe("open");
    expect(result.newState).toBe("half_open");
  });

  it("stays OPEN and resets counter after failure", async () => {
    const updateChainSpy = vi.fn();
    const mockDb = db as unknown as MockDb;
    const tx = mockDb._mockTx;

    tx.select.mockImplementation(() =>
      mockDb._createSelectChain([
        makeEndpoint({ circuitState: "open", consecutiveHealthChecks: 2 }),
      ])
    );

    const updateChain: Record<string, Mock> = {};
    updateChain.set = vi.fn().mockImplementation((vals: Record<string, unknown>) => {
      updateChainSpy(vals);
      return updateChain;
    });
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    tx.update.mockImplementation(() => updateChain);

    const result = await recordHealthCheckResult("ep_1", false);
    expect(result.previousState).toBe("open");
    expect(result.newState).toBe("open");
    expect(updateChainSpy).toHaveBeenCalledWith(
      expect.objectContaining({ consecutiveHealthChecks: 0 })
    );
  });

  it("returns same state for CLOSED endpoint (no-op)", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "closed", consecutiveHealthChecks: 0 })
    );

    const result = await recordHealthCheckResult("ep_1", true);
    expect(result.previousState).toBe("closed");
    expect(result.newState).toBe("closed");
  });

  it("returns same state for HALF_OPEN endpoint (no-op)", async () => {
    setupTransaction(
      makeEndpoint({ circuitState: "half_open", consecutiveHealthChecks: 0 })
    );

    const result = await recordHealthCheckResult("ep_1", true);
    expect(result.previousState).toBe("half_open");
    expect(result.newState).toBe("half_open");
  });

  it("resets failure/success counters on HALF_OPEN transition", async () => {
    const updateChainSpy = vi.fn();
    const mockDb = db as unknown as MockDb;
    const tx = mockDb._mockTx;

    tx.select.mockImplementation(() =>
      mockDb._createSelectChain([
        makeEndpoint({
          circuitState: "open",
          consecutiveHealthChecks: 2,
          consecutiveFailures: 5,
          consecutiveSuccesses: 0,
        }),
      ])
    );

    const updateChain: Record<string, Mock> = {};
    updateChain.set = vi.fn().mockImplementation((vals: Record<string, unknown>) => {
      updateChainSpy(vals);
      return updateChain;
    });
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    tx.update.mockImplementation(() => updateChain);

    await recordHealthCheckResult("ep_1", true);

    expect(updateChainSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
      })
    );
  });
});
