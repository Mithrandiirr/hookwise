import { inngest } from "../client";
import { db } from "@/lib/db";
import { deliveries, events, integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deliverPayload } from "@/lib/utils/deliver";
import { classifyDeliveryError } from "@/lib/utils/classify-error";
import { extractCorrelationKey } from "@/lib/utils/extract-correlation-key";
import {
  getEndpointForIntegration,
  recordDeliveryResult,
  enqueueForReplay,
  getNextReplayPosition,
} from "@/lib/mitigation/circuit-breaker";
import type { Provider } from "@/types";

const BASE_TIMEOUT_MS = 5_000;

export const deliverWebhook = inngest.createFunction(
  {
    id: "deliver-webhook",
    name: "Deliver Webhook",
    retries: 0,
  },
  { event: "webhook/received" },
  async ({ event, step }) => {
    const { eventId, integrationId, destinationUrl } = event.data;

    // Fetch event + integration + endpoint
    const data = await step.run("fetch-context", async () => {
      const [webhookEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      const [integration] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);

      const endpoint = await getEndpointForIntegration(integrationId);

      return {
        webhookEvent: webhookEvent ?? null,
        integration: integration ?? null,
        endpoint,
      };
    });

    if (!data.webhookEvent || !data.integration) {
      throw new Error(`Event ${eventId} or integration ${integrationId} not found`);
    }

    const endpoint = data.endpoint;

    // If no endpoint exists (shouldn't happen for new integrations), deliver directly
    if (!endpoint) {
      const directResult = await step.run("direct-deliver", async () => {
        return deliverPayload(destinationUrl, data.webhookEvent!.payload, {
          "X-HookWise-Event-ID": eventId,
          "X-HookWise-Timestamp": new Date().toISOString(),
          "X-HookWise-Integration-ID": integrationId,
        });
      });

      await step.run("record-direct-delivery", async () => {
        const cls = !directResult.success
          ? classifyDeliveryError(directResult.statusCode, directResult.error, directResult.retryAfterHeader)
          : null;
        await db.insert(deliveries).values({
          eventId,
          status: directResult.success ? "delivered" : "failed",
          statusCode: directResult.statusCode,
          responseTimeMs: directResult.responseTimeMs,
          responseBody: directResult.responseBody ?? directResult.error,
          errorType: cls?.errorType ?? null,
          attemptNumber: 1,
          attemptedAt: new Date(),
        });
      });

      return { success: directResult.success, attempts: 1 };
    }

    const circuitState = endpoint.circuitState;

    // If OPEN -> enqueue for replay, don't deliver
    if (circuitState === "open") {
      await step.run("enqueue-replay", async () => {
        const position = await getNextReplayPosition(endpoint.id);
        const correlationKey = extractCorrelationKey(
          data.integration!.provider as Provider,
          data.webhookEvent!.payload as Record<string, unknown>
        );
        await enqueueForReplay(endpoint.id, eventId, correlationKey, position);
      });

      return { success: false, queued: true, circuitState: "open" };
    }

    // If HALF_OPEN -> throttle with sleep
    if (circuitState === "half_open") {
      await step.sleep("half-open-throttle", "1s");
    }

    // Deliver
    const result = await step.run("deliver", async () => {
      return deliverPayload(destinationUrl, data.webhookEvent!.payload, {
        "X-HookWise-Event-ID": eventId,
        "X-HookWise-Timestamp": new Date().toISOString(),
        "X-HookWise-Integration-ID": integrationId,
      }, BASE_TIMEOUT_MS);
    });

    // Classify error if failed
    const classification = !result.success
      ? classifyDeliveryError(result.statusCode, result.error, result.retryAfterHeader)
      : null;

    // Record delivery
    await step.run("record-delivery", async () => {
      await db.insert(deliveries).values({
        eventId,
        endpointId: endpoint.id,
        status: result.success ? "delivered" : "failed",
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        responseBody: result.responseBody ?? result.error,
        errorType: classification?.errorType ?? null,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });
    });

    // Update circuit breaker
    const stateTransition = await step.run("update-circuit-breaker", async () => {
      return recordDeliveryResult(endpoint.id, result.success, result.responseTimeMs);
    });

    // Emit circuit opened event if state changed to open
    if (stateTransition.newState === "open" && stateTransition.previousState !== "open") {
      await step.run("emit-circuit-opened", async () => {
        await inngest.send({
          name: "endpoint/circuit-opened",
          data: { endpointId: endpoint.id, integrationId },
        });
      });
    }

    // Smart retry logic for failures
    if (!result.success && classification) {
      // SSL errors: never retry
      if (classification.errorType === "ssl") {
        return { success: false, error: "ssl", noRetry: true };
      }

      // Connection refused: don't retry, circuit should open
      if (classification.errorType === "connection_refused") {
        return { success: false, error: "connection_refused", noRetry: true };
      }

      // 500 server error: retry once
      if (classification.errorType === "server_error" && result.statusCode !== 503) {
        await step.run("emit-retry-500", async () => {
          await inngest.send({
            name: "webhook/retry",
            data: {
              eventId,
              integrationId,
              destinationUrl,
              attemptNumber: 2,
              timeoutMs: BASE_TIMEOUT_MS,
            },
          });
        });
        return { success: false, retrying: true, errorType: "server_error" };
      }

      // 503: aggressive backoff retry
      if (result.statusCode === 503 && classification.shouldRetry) {
        await step.sleep("backoff-503", "30s");
        await step.run("emit-retry-503", async () => {
          await inngest.send({
            name: "webhook/retry",
            data: {
              eventId,
              integrationId,
              destinationUrl,
              attemptNumber: 2,
              timeoutMs: BASE_TIMEOUT_MS,
            },
          });
        });
        return { success: false, retrying: true, errorType: "server_error" };
      }

      // 429 rate limit: honor Retry-After
      if (classification.errorType === "rate_limit" && classification.retryDelayMs) {
        const delaySec = Math.ceil(classification.retryDelayMs / 1000);
        await step.sleep("backoff-429", `${delaySec}s`);
        await step.run("emit-retry-429", async () => {
          await inngest.send({
            name: "webhook/retry",
            data: {
              eventId,
              integrationId,
              destinationUrl,
              attemptNumber: 2,
              timeoutMs: BASE_TIMEOUT_MS,
            },
          });
        });
        return { success: false, retrying: true, errorType: "rate_limit" };
      }

      // Timeout: retry once with 2x timeout
      if (classification.errorType === "timeout") {
        await step.run("emit-retry-timeout", async () => {
          await inngest.send({
            name: "webhook/retry",
            data: {
              eventId,
              integrationId,
              destinationUrl,
              attemptNumber: 2,
              timeoutMs: BASE_TIMEOUT_MS * 2,
            },
          });
        });
        return { success: false, retrying: true, errorType: "timeout" };
      }
    }

    // Emit flow/step-completed for successful deliveries
    if (result.success) {
      await step.run("emit-flow-step", async () => {
        const correlationKey = extractCorrelationKey(
          data.integration!.provider as Provider,
          data.webhookEvent!.payload as Record<string, unknown>
        );
        await inngest.send({
          name: "flow/step-completed",
          data: {
            eventId,
            integrationId,
            eventType: data.webhookEvent!.eventType,
            correlationKey,
          },
        });
      });
    }

    return { success: result.success, attempts: 1 };
  }
);

export const retryWebhook = inngest.createFunction(
  {
    id: "retry-webhook",
    name: "Retry Webhook Delivery",
    retries: 0,
  },
  { event: "webhook/retry" },
  async ({ event, step }) => {
    const { eventId, integrationId, destinationUrl, attemptNumber, timeoutMs } = event.data;

    const data = await step.run("fetch-context", async () => {
      const [webhookEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      const endpoint = await getEndpointForIntegration(integrationId);
      return { webhookEvent: webhookEvent ?? null, endpoint };
    });

    if (!data.webhookEvent) {
      throw new Error(`Event ${eventId} not found for retry`);
    }

    // If circuit is now open, don't retry — it'll be replayed later
    if (data.endpoint?.circuitState === "open") {
      return { success: false, queued: true, circuitState: "open" };
    }

    const result = await step.run("deliver-retry", async () => {
      return deliverPayload(destinationUrl, data.webhookEvent!.payload, {
        "X-HookWise-Event-ID": eventId,
        "X-HookWise-Timestamp": new Date().toISOString(),
        "X-HookWise-Integration-ID": integrationId,
        "X-HookWise-Retry-Count": String(attemptNumber - 1),
      }, timeoutMs);
    });

    const classification = !result.success
      ? classifyDeliveryError(result.statusCode, result.error, result.retryAfterHeader)
      : null;

    await step.run("record-retry-delivery", async () => {
      await db.insert(deliveries).values({
        eventId,
        endpointId: data.endpoint?.id ?? null,
        status: result.success ? "delivered" : "failed",
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        responseBody: result.responseBody ?? result.error,
        errorType: classification?.errorType ?? null,
        attemptNumber,
        attemptedAt: new Date(),
      });
    });

    if (data.endpoint) {
      await step.run("update-circuit-breaker-retry", async () => {
        return recordDeliveryResult(data.endpoint!.id, result.success, result.responseTimeMs);
      });
    }

    return { success: result.success, attempts: attemptNumber };
  }
);

