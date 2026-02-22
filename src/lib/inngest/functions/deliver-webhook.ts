import { inngest } from "../client";
import { db } from "@/lib/db";
import { deliveries, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000, 21_600_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;
const DELIVERY_TIMEOUT_MS = 5_000;

export const deliverWebhook = inngest.createFunction(
  {
    id: "deliver-webhook",
    name: "Deliver Webhook",
    retries: 6 as const,
  },
  { event: "webhook/received" },
  async ({ event, step, attempt }) => {
    const { eventId, integrationId, destinationUrl } = event.data;

    const [webhookEvent] = await step.run("fetch-event", async () => {
      return db.select().from(events).where(eq(events.id, eventId)).limit(1);
    });

    if (!webhookEvent) {
      throw new Error(`Event ${eventId} not found`);
    }

    const result = await step.run("deliver", async () => {
      const start = Date.now();
      let statusCode: number | null = null;
      let responseBody: string | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

        const response = await fetch(destinationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-HookWise-Event-ID": eventId,
            "X-HookWise-Timestamp": new Date().toISOString(),
            "X-HookWise-Integration-ID": integrationId,
          },
          body: JSON.stringify(webhookEvent.payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        statusCode = response.status;
        const text = await response.text();
        responseBody = text.slice(0, 1024);

        return { statusCode, responseBody, responseTimeMs: Date.now() - start, success: response.ok };
      } catch (err) {
        return {
          statusCode,
          responseBody: err instanceof Error ? err.message : "Unknown error",
          responseTimeMs: Date.now() - start,
          success: false,
        };
      }
    });

    const currentAttempt = (attempt ?? 0) + 1;
    const isLastAttempt = currentAttempt >= MAX_ATTEMPTS;
    const deliveryStatus = result.success
      ? "delivered"
      : isLastAttempt
      ? "dead_letter"
      : "failed";

    await step.run("record-delivery", async () => {
      await db.insert(deliveries).values({
        eventId,
        status: deliveryStatus,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        responseBody: result.responseBody,
        attemptNumber: currentAttempt,
        attemptedAt: new Date(),
        nextRetryAt:
          !result.success && !isLastAttempt
            ? new Date(Date.now() + RETRY_DELAYS_MS[currentAttempt - 1])
            : null,
      });
    });

    if (!result.success && !isLastAttempt) {
      throw new Error(`Delivery failed with status ${result.statusCode}. Will retry.`);
    }

    return { success: result.success, attempts: currentAttempt };
  }
);
