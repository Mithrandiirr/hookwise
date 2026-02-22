import { inngest } from "../client";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";
import { reconcileIntegration } from "@/lib/ai/reconciliation";

export const reconciliation = inngest.createFunction(
  {
    id: "reconciliation",
    name: "Reconciliation Engine",
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    // Fetch integrations that have an API key configured
    const eligibleIntegrations = await step.run(
      "fetch-eligible-integrations",
      async () => {
        return db
          .select({ id: integrations.id, provider: integrations.provider })
          .from(integrations)
          .where(
            and(
              eq(integrations.status, "active"),
              isNotNull(integrations.apiKeyEncrypted)
            )
          );
      }
    );

    if (eligibleIntegrations.length === 0) {
      return { processed: 0 };
    }

    const results: Array<{ integrationId: string; gapsDetected: number; gapsResolved: number }> = [];

    for (const integration of eligibleIntegrations) {
      // GitHub has no reconciliation API
      if (integration.provider === "github") continue;

      const result = await step.run(
        `reconcile-${integration.id}`,
        async () => {
          return reconcileIntegration(integration.id);
        }
      );

      results.push({
        integrationId: integration.id,
        gapsDetected: result.gapsDetected,
        gapsResolved: result.gapsResolved,
      });
    }

    return { processed: results.length, results };
  }
);
