import { getRedisClient } from "./client";

const BUFFER_KEY = "hookwise:buffer";
const BUFFER_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface BufferedEvent {
  integrationId: string;
  eventType: string;
  payload: unknown;
  headers: Record<string, string>;
  signatureValid: boolean;
  providerEventId: string | null;
  receivedAt: string; // ISO string
  destinationUrl: string;
}

export async function bufferEvent(event: BufferedEvent): Promise<void> {
  const redis = getRedisClient();
  if (!redis) throw new Error("Redis not configured — cannot buffer event");
  await redis.lpush(BUFFER_KEY, JSON.stringify(event));
  await redis.expire(BUFFER_KEY, BUFFER_TTL_SECONDS);
}

export async function drainBuffer(batchSize = 50): Promise<BufferedEvent[]> {
  const redis = getRedisClient();
  if (!redis) return [];
  const items: BufferedEvent[] = [];

  for (let i = 0; i < batchSize; i++) {
    const raw = await redis.rpop<string>(BUFFER_KEY);
    if (!raw) break;
    items.push(typeof raw === "string" ? JSON.parse(raw) : raw as BufferedEvent);
  }

  return items;
}

export async function getBufferLength(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;
  return redis.llen(BUFFER_KEY);
}
