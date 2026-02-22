import { inngest } from "../client";
import { db } from "@/lib/db";
import { integrations, anomalies } from "@/lib/db/schema";
import { eq, and, gte, isNull } from "drizzle-orm";
import { detectAnomalies } from "@/lib/ai/anomaly-detection";
import { diagnoseAnomaly } from "@/lib/ai/diagnose";

export const anomalyDetector = inngest.createFunction(
  {
    id: "anomaly-detector",
    name: "Anomaly Detection Engine",
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const activeIntegrations = await step.run(
      "fetch-active-integrations",
      async () => {
        return db
          .select({ id: integrations.id })
          .from(integrations)
          .where(eq(integrations.status, "active"));
      }
    );

    if (activeIntegrations.length === 0) {
      return { checked: 0, anomaliesDetected: 0 };
    }

    let totalDetected = 0;

    for (const integration of activeIntegrations) {
      // Run detection, dedup, diagnosis, and storage in a single step
      // to avoid Inngest serialization issues with Date objects in context
      const result = await step.run(
        `process-${integration.id}`,
        async () => {
          const detected = await detectAnomalies(integration.id);
          const stored: string[] = [];

          for (const anomaly of detected) {
            // Deduplication
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const [existing] = await db
              .select({ id: anomalies.id })
              .from(anomalies)
              .where(
                and(
                  eq(anomalies.integrationId, integration.id),
                  eq(anomalies.type, anomaly.type),
                  isNull(anomalies.resolvedAt),
                  gte(anomalies.detectedAt, oneHourAgo)
                )
              )
              .limit(1);

            if (existing) continue;

            // AI diagnosis
            const diagnosis = await diagnoseAnomaly(anomaly.context);

            // Store
            const [inserted] = await db
              .insert(anomalies)
              .values({
                integrationId: integration.id,
                type: anomaly.type,
                severity: anomaly.severity,
                diagnosis: JSON.stringify(diagnosis),
                context: anomaly.context,
                detectedAt: new Date(),
              })
              .returning({ id: anomalies.id });

            if (inserted) {
              stored.push(inserted.id);
            }
          }

          return { detected: detected.length, stored };
        }
      );

      // Emit events for stored anomalies (outside the main step to ensure delivery)
      for (const anomalyId of result.stored) {
        await step.run(`emit-anomaly-${anomalyId}`, async () => {
          // Re-fetch the anomaly to get type/severity
          const [a] = await db
            .select({ type: anomalies.type, severity: anomalies.severity })
            .from(anomalies)
            .where(eq(anomalies.id, anomalyId))
            .limit(1);

          if (a) {
            await inngest.send({
              name: "anomaly/detected",
              data: {
                anomalyId,
                integrationId: integration.id,
                type: a.type,
                severity: a.severity,
              },
            });
          }
        });
        totalDetected++;
      }
    }

    return {
      checked: activeIntegrations.length,
      anomaliesDetected: totalDetected,
    };
  }
);
