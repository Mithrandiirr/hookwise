import type { VulnerabilityType, AnomalySeverity } from "@/types";

export interface SecurityTestResult {
  passed: boolean;
  vulnerabilityType: VulnerabilityType;
  severity: AnomalySeverity;
  description: string;
  remediation: string;
  details?: Record<string, unknown>;
}

export interface SecurityScanResult {
  scanId: string;
  endpointId: string;
  score: number;
  findings: SecurityTestResult[];
  scannedAt: Date;
}

export interface EndpointTestPayload {
  url: string;
  signingSecret: string;
  provider: string;
}
