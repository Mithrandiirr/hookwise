import { db } from "@/lib/db";
import { anomalies } from "@/lib/db/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import type { AnomalyType } from "@/types";
import type { IncidentReference, AIDiagnosis } from "./types";

const MAX_SIMILAR_INCIDENTS = 5;

/**
 * Find past anomalies of the same type for this integration.
 * Returns incidents with their diagnoses so the AI can learn from history.
 */
export async function findSimilarIncidents(
  integrationId: string,
  anomalyType: AnomalyType
): Promise<IncidentReference[]> {
  const pastAnomalies = await db
    .select()
    .from(anomalies)
    .where(
      and(
        eq(anomalies.integrationId, integrationId),
        eq(anomalies.type, anomalyType),
        isNotNull(anomalies.diagnosis)
      )
    )
    .orderBy(desc(anomalies.detectedAt))
    .limit(MAX_SIMILAR_INCIDENTS);

  return pastAnomalies.map((a) => {
    const diag = a.diagnosis as Partial<AIDiagnosis> | null;

    return {
      anomalyId: a.id,
      type: a.type as AnomalyType,
      detectedAt: a.detectedAt,
      resolvedAt: a.resolvedAt,
      diagnosisSummary: diag?.what ?? "No diagnosis available",
      resolution: diag?.recommendation ?? null,
    };
  });
}

/**
 * Store a diagnosis back to the anomaly record so future investigations can reference it.
 */
export async function storeIncidentDiagnosis(
  anomalyId: string,
  diagnosis: AIDiagnosis
): Promise<void> {
  await db
    .update(anomalies)
    .set({
      diagnosis: {
        what: diagnosis.what,
        why: diagnosis.why,
        impact: diagnosis.impact,
        recommendation: diagnosis.recommendation,
        confidence: diagnosis.confidence,
        crossCorrelation: diagnosis.crossCorrelation,
        predictedResolution: diagnosis.predictedResolution,
        remediationActions: diagnosis.remediationActions,
        severityAssessment: diagnosis.severityAssessment,
        evidenceCount: diagnosis.evidence.length,
        similarIncidentCount: diagnosis.similarIncidents.length,
        diagnosedAt: new Date().toISOString(),
      },
    })
    .where(eq(anomalies.id, anomalyId));
}

/**
 * Get the recurrence count and average resolution time for this anomaly type.
 * Useful for predicting how long an incident might last.
 */
export async function getIncidentStats(
  integrationId: string,
  anomalyType: AnomalyType
): Promise<{
  totalOccurrences: number;
  resolvedCount: number;
  avgResolutionMinutes: number | null;
}> {
  const past = await db
    .select({
      detectedAt: anomalies.detectedAt,
      resolvedAt: anomalies.resolvedAt,
    })
    .from(anomalies)
    .where(
      and(
        eq(anomalies.integrationId, integrationId),
        eq(anomalies.type, anomalyType)
      )
    )
    .orderBy(desc(anomalies.detectedAt));

  const resolved = past.filter((a) => a.resolvedAt !== null);
  const resolutionTimes = resolved.map((a) => {
    const detected = a.detectedAt.getTime();
    const resolvedAt = a.resolvedAt!.getTime();
    return (resolvedAt - detected) / (1000 * 60); // minutes
  });

  const avgResolutionMinutes =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : null;

  return {
    totalOccurrences: past.length,
    resolvedCount: resolved.length,
    avgResolutionMinutes: avgResolutionMinutes
      ? Math.round(avgResolutionMinutes)
      : null,
  };
}
