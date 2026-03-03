import { db } from "@/lib/db";
import { securityScans, securityFindings, endpoints, integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runSignatureTest } from "./tests/signature-test";
import { runTimestampTest } from "./tests/timestamp-test";
import { runReplayTest } from "./tests/replay-test";
import { runInjectionTest } from "./tests/injection-test";
import type { SecurityScanResult, EndpointTestPayload, SecurityTestResult } from "./types";
import type { AnomalySeverity } from "@/types";

const SEVERITY_PENALTIES: Record<AnomalySeverity, number> = {
  critical: 25,
  high: 15,
  medium: 5,
  low: 0,
};

export async function runSecurityScan(endpointId: string): Promise<SecurityScanResult> {
  // Fetch endpoint + integration
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  if (!endpoint) {
    throw new Error(`Endpoint ${endpointId} not found`);
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, endpoint.integrationId))
    .limit(1);

  if (!integration) {
    throw new Error(`Integration for endpoint ${endpointId} not found`);
  }

  const testPayload: EndpointTestPayload = {
    url: endpoint.url,
    signingSecret: integration.signingSecret,
    provider: integration.provider,
  };

  // Run all 4 tests sequentially
  const results: SecurityTestResult[] = [];

  const signatureResult = await runSignatureTest(testPayload);
  results.push(signatureResult);

  const timestampResult = await runTimestampTest(testPayload);
  results.push(timestampResult);

  const replayResult = await runReplayTest(testPayload);
  results.push(replayResult);

  const injectionResult = await runInjectionTest(testPayload);
  results.push(injectionResult);

  // Collect findings (only failed tests)
  const findings = results.filter((r) => !r.passed);

  // Calculate score: 100 minus penalties per finding
  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_PENALTIES[finding.severity] ?? 0;
  }
  score = Math.max(0, score);

  // Persist scan
  const [scan] = await db
    .insert(securityScans)
    .values({
      endpointId,
      scanType: "full",
      findings: findings.map((f) => ({
        vulnerabilityType: f.vulnerabilityType,
        severity: f.severity,
        description: f.description,
      })),
      score,
      scannedAt: new Date(),
    })
    .returning();

  // Persist individual findings
  if (findings.length > 0) {
    await db.insert(securityFindings).values(
      findings.map((f) => ({
        scanId: scan.id,
        vulnerabilityType: f.vulnerabilityType,
        severity: f.severity,
        description: f.description,
        remediation: f.remediation,
      }))
    );
  }

  return {
    scanId: scan.id,
    endpointId,
    score,
    findings,
    scannedAt: scan.scannedAt,
  };
}
