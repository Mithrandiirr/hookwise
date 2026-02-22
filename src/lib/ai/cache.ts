import type { AIDiagnosis } from "./types";

interface CacheEntry {
  diagnosis: AIDiagnosis;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = new Map<string, CacheEntry>();

function buildKey(integrationId: string, anomalyType: string): string {
  return `${integrationId}:${anomalyType}`;
}

export function getCachedDiagnosis(
  integrationId: string,
  anomalyType: string
): AIDiagnosis | null {
  const key = buildKey(integrationId, anomalyType);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.diagnosis;
}

export function cacheDiagnosis(
  integrationId: string,
  anomalyType: string,
  diagnosis: AIDiagnosis
): void {
  const key = buildKey(integrationId, anomalyType);
  cache.set(key, {
    diagnosis,
    expiresAt: Date.now() + TTL_MS,
  });
}
