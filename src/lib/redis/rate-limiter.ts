import { getRedisClient } from "./client";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 1000;
const PREFIX = "hookwise:rl:ingest";

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds
}

export async function checkRateLimit(integrationId: string): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    // Fail open if Redis is unavailable
    return { allowed: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS, reset: 0 };
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const key = `${PREFIX}:${integrationId}`;
  const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Sliding window: add current timestamp, remove old entries, count
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member });
    pipeline.zcard(key);
    pipeline.expire(key, 120); // TTL slightly longer than window

    const results = await pipeline.exec();
    const currentCount = (results[2] as number) ?? 0;
    const resetAt = Math.ceil((now + WINDOW_MS) / 1000);

    if (currentCount > MAX_REQUESTS) {
      return {
        allowed: false,
        limit: MAX_REQUESTS,
        remaining: 0,
        reset: resetAt,
      };
    }

    return {
      allowed: true,
      limit: MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - currentCount),
      reset: resetAt,
    };
  } catch {
    // Fail open on Redis errors
    return { allowed: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS, reset: 0 };
  }
}
