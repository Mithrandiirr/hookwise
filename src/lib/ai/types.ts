import type { AnomalyType, AnomalySeverity } from "@/types";

export interface MetricSnapshot {
  eventCount: number;
  avgResponseMs: number;
  failureRate: number;
  eventTypeDistribution: Record<string, number>;
  timestamp: string;
}

export interface AnomalyContext {
  integrationId: string;
  integrationName: string;
  provider: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  baseline: {
    eventCount: number;
    avgResponseMs: number;
    failureRate: number;
    stddevEventCount: number;
    stddevResponseMs: number;
    stddevFailureRate: number;
    sampleCount: number;
  };
  current: MetricSnapshot;
  recentEvents: Array<{
    id: string;
    eventType: string;
    receivedAt: Date;
    signatureValid: boolean;
    source: string;
  }>;
  recentDeliveries: Array<{
    statusCode: number | null;
    responseTimeMs: number | null;
    errorType: string | null;
    attemptedAt: Date;
  }>;
  otherIntegrations: Array<{
    id: string;
    name: string;
    provider: string;
    currentFailureRate: number;
  }>;
}

// --- Enhanced diagnosis types ---

export type RemediationAction =
  | { type: "open_circuit_breaker"; endpointId: string; reason: string }
  | { type: "enable_rate_limiting"; integrationId: string; maxPerMinute: number; reason: string }
  | { type: "adjust_retry_strategy"; integrationId: string; strategy: "backoff" | "pause" | "aggressive"; reason: string }
  | { type: "pause_integration"; integrationId: string; reason: string }
  | { type: "trigger_reconciliation"; integrationId: string; reason: string }
  | { type: "enable_idempotency"; integrationId: string; reason: string }
  | { type: "notify_provider_outage"; provider: string; reason: string };

export interface InvestigationStep {
  tool: string;
  query: Record<string, unknown>;
  finding: string;
}

export interface IncidentReference {
  anomalyId: string;
  type: AnomalyType;
  detectedAt: Date;
  resolvedAt: Date | null;
  diagnosisSummary: string;
  resolution: string | null;
}

export interface AIDiagnosis {
  what: string;
  why: string;
  impact: string;
  recommendation: string;
  confidence: number;
  crossCorrelation: string | null;
  // Enhanced fields
  evidence: InvestigationStep[];
  remediationActions: RemediationAction[];
  similarIncidents: IncidentReference[];
  predictedResolution: string | null;
  severityAssessment: {
    revenueAtRisk: number | null;
    eventsAffected: number;
    estimatedRecoveryMinutes: number | null;
  };
}

export interface DetectedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  context: AnomalyContext;
}

// Tool result types for the investigation agent
export interface DeliveryHistoryResult {
  total: number;
  failed: number;
  failureRate: number;
  errorBreakdown: Record<string, number>;
  avgResponseMs: number;
  p95ResponseMs: number;
  statusCodeBreakdown: Record<string, number>;
  timeRange: { from: string; to: string };
}

export interface EndpointHealthResult {
  circuitState: string;
  successRate: number;
  avgResponseMs: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastHealthCheck: string | null;
  stateChangedAt: string;
  healthScore: number;
  replayQueueSize: number;
}

export interface SimilarAnomalyResult {
  anomalyId: string;
  type: string;
  severity: string;
  detectedAt: string;
  resolvedAt: string | null;
  diagnosisWhat: string | null;
  diagnosisWhy: string | null;
  resolution: string | null;
}

export interface ProviderHealthResult {
  provider: string;
  avgFailureRate: number;
  avgLatencyMs: number;
  sampleSize: number;
  affectedIntegrationCount: number;
  status: "operational" | "degraded" | "outage";
}

export interface EventPatternResult {
  hourlyVolumes: Array<{ hour: string; count: number }>;
  eventTypeBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  avgPayloadSizeBytes: number;
  signatureValidRate: number;
}

export interface PayloadChangeResult {
  eventType: string;
  newFields: string[];
  removedFields: string[];
  typeChanges: Array<{ field: string; was: string; now: string }>;
  sizeChangePercent: number;
  lastSchemaUpdate: string;
}
