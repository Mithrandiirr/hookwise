import type { AIDiagnosis } from "@/lib/ai/types";

const EMPTY_DIAGNOSIS: AIDiagnosis = {
  what: "Anomaly detected",
  why: "Unknown",
  impact: "Unknown",
  recommendation: "Check dashboard",
  confidence: 0,
  crossCorrelation: null,
  evidence: [],
  remediationActions: [],
  similarIncidents: [],
  predictedResolution: null,
  severityAssessment: {
    revenueAtRisk: null,
    eventsAffected: 0,
    estimatedRecoveryMinutes: null,
  },
};

/**
 * Parses the diagnosis field from an anomaly row.
 * Handles legacy format (without enhanced fields) and new format.
 */
export function parseDiagnosis(raw: unknown): AIDiagnosis {
  if (!raw) return EMPTY_DIAGNOSIS;

  if (typeof raw === "object") {
    const obj = raw as Partial<AIDiagnosis>;
    return {
      what: obj.what ?? EMPTY_DIAGNOSIS.what,
      why: obj.why ?? EMPTY_DIAGNOSIS.why,
      impact: obj.impact ?? EMPTY_DIAGNOSIS.impact,
      recommendation: obj.recommendation ?? EMPTY_DIAGNOSIS.recommendation,
      confidence: obj.confidence ?? 0,
      crossCorrelation: obj.crossCorrelation ?? null,
      evidence: obj.evidence ?? [],
      remediationActions: obj.remediationActions ?? [],
      similarIncidents: obj.similarIncidents ?? [],
      predictedResolution: obj.predictedResolution ?? null,
      severityAssessment: obj.severityAssessment ?? EMPTY_DIAGNOSIS.severityAssessment,
    };
  }

  if (typeof raw === "string") {
    try {
      return parseDiagnosis(JSON.parse(raw));
    } catch {
      return EMPTY_DIAGNOSIS;
    }
  }

  return EMPTY_DIAGNOSIS;
}
