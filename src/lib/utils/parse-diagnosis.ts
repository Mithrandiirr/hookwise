import type { AIDiagnosis } from "@/lib/ai/types";

const EMPTY_DIAGNOSIS: AIDiagnosis = {
  what: "Anomaly detected",
  why: "Unknown",
  impact: "Unknown",
  recommendation: "Check dashboard",
  confidence: 0,
  crossCorrelation: null,
};

/**
 * Parses the diagnosis field from an anomaly row.
 * Handles both legacy string rows (JSON-encoded) and new jsonb object rows.
 */
export function parseDiagnosis(raw: unknown): AIDiagnosis {
  if (!raw) return EMPTY_DIAGNOSIS;

  if (typeof raw === "object") {
    return raw as AIDiagnosis;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AIDiagnosis;
    } catch {
      return EMPTY_DIAGNOSIS;
    }
  }

  return EMPTY_DIAGNOSIS;
}
