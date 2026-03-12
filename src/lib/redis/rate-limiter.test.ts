import { vi } from "vitest";

const mockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

const mockRedis = {
  pipeline: vi.fn(() => mockPipeline),
};

vi.mock("./client", () => ({
  getRedisClient: vi.fn(() => mockRedis),
}));

import { checkRateLimit } from "./rate-limiter";
import { getRedisClient } from "./client";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(mockRedis);
    mockRedis.pipeline.mockReturnValue(mockPipeline);
  });

  it("allows requests under the limit", async () => {
    // results[2] is the ZCARD result (current count)
    mockPipeline.exec.mockResolvedValue([null, null, 500, null]);

    const result = await checkRateLimit("int_1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(500);
    expect(result.limit).toBe(1000);
  });

  it("blocks requests over the limit (1001st request)", async () => {
    mockPipeline.exec.mockResolvedValue([null, null, 1001, null]);

    const result = await checkRateLimit("int_1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("fails open when Redis unavailable", async () => {
    (getRedisClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await checkRateLimit("int_1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1000);
  });

  it("fails open on pipeline error", async () => {
    mockPipeline.exec.mockRejectedValue(new Error("Redis connection lost"));

    const result = await checkRateLimit("int_1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1000);
  });

  it("returns correct reset time", async () => {
    mockPipeline.exec.mockResolvedValue([null, null, 100, null]);

    const before = Math.ceil((Date.now() + 60_000) / 1000);
    const result = await checkRateLimit("int_1");
    const after = Math.ceil((Date.now() + 60_000) / 1000);

    expect(result.reset).toBeGreaterThanOrEqual(before);
    expect(result.reset).toBeLessThanOrEqual(after);
  });
});
