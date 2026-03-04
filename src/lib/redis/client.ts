import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return null;
    }

    redis = new Redis({ url, token });
  }

  return redis;
}
