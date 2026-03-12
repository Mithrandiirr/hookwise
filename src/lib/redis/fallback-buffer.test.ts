import { vi } from "vitest";

const mockRedis = {
  lpush: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  rpop: vi.fn(),
  llen: vi.fn().mockResolvedValue(0),
};

vi.mock("./client", () => ({
  getRedisClient: vi.fn(() => mockRedis),
}));

import { bufferEvent, drainBuffer, getBufferLength, type BufferedEvent } from "./fallback-buffer";
import { getRedisClient } from "./client";

function makeSampleEvent(overrides: Partial<BufferedEvent> = {}): BufferedEvent {
  return {
    integrationId: "int_1",
    eventType: "payment_intent.succeeded",
    payload: { id: "evt_123" },
    headers: { "content-type": "application/json" },
    signatureValid: true,
    providerEventId: "evt_123",
    receivedAt: new Date().toISOString(),
    destinationUrl: "https://example.com/webhook",
    ...overrides,
  };
}

describe("bufferEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(mockRedis);
  });

  it("calls lpush with correct key and serialized data", async () => {
    const event = makeSampleEvent();
    await bufferEvent(event);

    expect(mockRedis.lpush).toHaveBeenCalledWith("hookwise:buffer", JSON.stringify(event));
  });

  it("sets TTL to 24 hours", async () => {
    await bufferEvent(makeSampleEvent());

    expect(mockRedis.expire).toHaveBeenCalledWith("hookwise:buffer", 86400);
  });

  it("throws when Redis not configured", async () => {
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(bufferEvent(makeSampleEvent())).rejects.toThrow(
      "Redis not configured — cannot buffer event"
    );
  });
});

describe("drainBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(mockRedis);
  });

  it("pops items in order up to batchSize", async () => {
    const event1 = makeSampleEvent({ integrationId: "int_1" });
    const event2 = makeSampleEvent({ integrationId: "int_2" });

    mockRedis.rpop
      .mockResolvedValueOnce(JSON.stringify(event1))
      .mockResolvedValueOnce(JSON.stringify(event2))
      .mockResolvedValueOnce(null);

    const result = await drainBuffer(5);
    expect(result).toHaveLength(2);
    expect(result[0].integrationId).toBe("int_1");
    expect(result[1].integrationId).toBe("int_2");
  });

  it("stops at batchSize", async () => {
    mockRedis.rpop.mockResolvedValue(JSON.stringify(makeSampleEvent()));

    const result = await drainBuffer(3);
    expect(result).toHaveLength(3);
    expect(mockRedis.rpop).toHaveBeenCalledTimes(3);
  });

  it("returns empty array when Redis unavailable", async () => {
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await drainBuffer();
    expect(result).toEqual([]);
  });
});

describe("getBufferLength", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(mockRedis);
  });

  it("returns llen result", async () => {
    mockRedis.llen.mockResolvedValue(42);

    const length = await getBufferLength();
    expect(length).toBe(42);
  });

  it("returns 0 when Redis unavailable", async () => {
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const length = await getBufferLength();
    expect(length).toBe(0);
  });
});
