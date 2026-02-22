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

export interface AIDiagnosis {
  what: string;
  why: string;
  impact: string;
  recommendation: string;
  confidence: number;
  crossCorrelation: string | null;
}

export interface DetectedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  context: AnomalyContext;
}
