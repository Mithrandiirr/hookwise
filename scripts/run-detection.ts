/**
 * Runs anomaly detection + AI diagnosis in-process for every active integration,
 * mirroring src/lib/inngest/functions/anomaly-detector.ts — but WITHOUT the Inngest
 * runner (which is incompatible with the local CLI). Purely additive: no deletes.
 *
 * Usage: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/run-detection.ts
 */
import { db } from "../src/lib/db";
import { integrations, anomalies } from "../src/lib/db/schema";
import { eq, and, gte, isNull } from "drizzle-orm";
import { detectAnomalies } from "../src/lib/ai/anomaly-detection";
import { diagnoseAnomaly } from "../src/lib/ai/diagnose";
import { storeIncidentDiagnosis } from "../src/lib/ai/incident-memory";

async function main() {
  const active = await db
    .select({ id: integrations.id, name: integrations.name })
    .from(integrations)
    .where(eq(integrations.status, "active"));

  console.log(`Active integrations: ${active.length}\n`);
  let totalStored = 0;

  for (const integration of active) {
    const detected = await detectAnomalies(integration.id);
    if (detected.length === 0) {
      console.log(`· ${integration.name.padEnd(28)} — no anomalies`);
      continue;
    }

    const stored: string[] = [];
    for (const anomaly of detected) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [existing] = await db
        .select({ id: anomalies.id })
        .from(anomalies)
        .where(
          and(
            eq(anomalies.integrationId, integration.id),
            eq(anomalies.type, anomaly.type),
            isNull(anomalies.resolvedAt),
            gte(anomalies.detectedAt, oneHourAgo),
          ),
        )
        .limit(1);
      if (existing) continue;

      console.log(`  ↳ ${integration.name}: ${anomaly.type} — diagnosing with Claude…`);
      const diagnosis = await diagnoseAnomaly(anomaly.context);

      const ai = diagnosis.severityAssessment;
      let severity = anomaly.severity;
      if (ai.revenueAtRisk && ai.revenueAtRisk > 100000) severity = "critical";
      else if (ai.revenueAtRisk && ai.revenueAtRisk > 10000 && severity !== "critical") severity = "high";

      const [inserted] = await db
        .insert(anomalies)
        .values({
          integrationId: integration.id,
          type: anomaly.type,
          severity,
          diagnosis,
          context: anomaly.context,
          detectedAt: new Date(),
        })
        .returning({ id: anomalies.id });

      if (inserted) {
        await storeIncidentDiagnosis(inserted.id, diagnosis);
        stored.push(inserted.id);
        console.log(`     ✓ stored anomaly ${inserted.id} [${severity}] — ${diagnosis.what?.slice(0, 80)}`);
      }
    }
    totalStored += stored.length;
    console.log(`✓ ${integration.name.padEnd(28)} — detected ${detected.length}, stored ${stored.length}`);
  }

  console.log(`\nDone. New anomalies stored: ${totalStored}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
