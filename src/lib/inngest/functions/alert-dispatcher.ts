import { inngest } from "../client";
import { db } from "@/lib/db";
import { alertConfigs, anomalies, integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmailAlert, sendSlackAlert } from "@/lib/ai/alerting";
import type { AIDiagnosis } from "@/lib/ai/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const alertDispatcher = inngest.createFunction(
  {
    id: "alert-dispatcher",
    name: "Alert Dispatcher",
    retries: 2,
  },
  { event: "anomaly/detected" },
  async ({ event, step }) => {
    const { anomalyId, integrationId, type, severity } = event.data;

    const context = await step.run("fetch-context", async () => {
      const [anomaly] = await db
        .select()
        .from(anomalies)
        .where(eq(anomalies.id, anomalyId))
        .limit(1);

      const [integration] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);

      const configs = await db
        .select()
        .from(alertConfigs)
        .where(
          and(
            eq(alertConfigs.integrationId, integrationId),
            eq(alertConfigs.enabled, true)
          )
        );

      return { anomaly, integration, configs };
    });

    if (!context.anomaly || !context.integration || context.configs.length === 0) {
      return { dispatched: 0, reason: "no-config-or-missing-data" };
    }

    let diagnosis: AIDiagnosis;
    try {
      diagnosis = JSON.parse(context.anomaly.diagnosis ?? "{}");
    } catch {
      diagnosis = {
        what: "Anomaly detected",
        why: "Unknown",
        impact: "Unknown",
        recommendation: "Check dashboard",
        confidence: 0,
        crossCorrelation: null,
      };
    }

    const payload = {
      anomalyId,
      integrationName: context.integration.name,
      provider: context.integration.provider,
      anomalyType: type,
      severity,
      diagnosis,
      dashboardUrl: `${APP_URL}/anomalies/${anomalyId}`,
    };

    let dispatched = 0;

    for (const config of context.configs) {
      // Check threshold: skip if severity is below configured threshold
      if (config.threshold !== null) {
        const severityValue: Record<string, number> = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4,
        };
        const anomalySeverityValue = severityValue[severity] ?? 0;
        if (anomalySeverityValue < config.threshold) continue;
      }

      const sent = await step.run(
        `send-${config.channel}-${config.id}`,
        async () => {
          if (config.channel === "email") {
            return sendEmailAlert(config.destination, payload);
          } else if (config.channel === "slack") {
            return sendSlackAlert(config.destination, payload);
          }
          return false;
        }
      );

      if (sent) dispatched++;
    }

    return { dispatched };
  }
);
