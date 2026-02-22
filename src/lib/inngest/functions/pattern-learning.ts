import { inngest } from "../client";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { computePatterns } from "@/lib/ai/patterns";
import { updatePayloadSchema } from "@/lib/ai/payload-schema";
import { events } from "@/lib/db/schema";
import { gte, desc, and } from "drizzle-orm";

export const patternLearning = inngest.createFunction(
  {
    id: "pattern-learning",
    name: "Pattern Learning Engine",
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
      return { processed: 0 };
    }

    let processed = 0;
    let schemasUpdated = 0;

    for (const integration of activeIntegrations) {
      await step.run(`compute-patterns-${integration.id}`, async () => {
        await computePatterns(integration.id);
      });
      processed++;

      // Sample recent events for payload schema learning
      const schemaResult = await step.run(
        `update-schemas-${integration.id}`,
        async () => {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
          const recentEvents = await db
            .select({
              integrationId: events.integrationId,
              eventType: events.eventType,
              payload: events.payload,
            })
            .from(events)
            .where(
              and(
                eq(events.integrationId, integration.id),
                gte(events.receivedAt, fiveMinAgo)
              )
            )
            .orderBy(desc(events.receivedAt))
            .limit(5);

          let updated = 0;
          for (const evt of recentEvents) {
            await updatePayloadSchema(
              evt.integrationId,
              evt.eventType,
              evt.payload as Record<string, unknown>
            );
            updated++;
          }
          return updated;
        }
      );

      schemasUpdated += schemaResult;
    }

    return { processed, schemasUpdated };
  }
);
