import { inngest } from "../client";
import { db } from "@/lib/db";
import { deliveries, events, integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deliverPayload, type DeliveryResult } from "@/lib/utils/deliver";
import { classifyDeliveryError } from "@/lib/utils/classify-error";
import { extractCorrelationKey } from "@/lib/utils/extract-correlation-key";
import {
  getEndpointForIntegration,
  recordDeliveryResult,
  enqueueForReplay,
  getNextReplayPosition,
} from "@/lib/mitigation/circuit-breaker";
import type { Provider } from "@/types";
import { checkSequenceReady } from "@/lib/sequencer";

const BASE_TIMEOUT_MS = 5_000;

async function deliverToDestination(
  destinationType: string,
  destinationUrl: string,
  payload: unknown,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<DeliveryResult> {
  if (destinationType !== "http") {
    const { deliverToQueue } = await import("@/lib/queue");
    const queueResult = await deliverToQueue(
      { destinationType: destinationType as "sqs" | "kafka" | "pubsub", destinationUrl },
      payload,
      headers
    );
    return {
      statusCode: queueResult.success ? 200 : null,
      responseBody: queueResult.messageId,
      responseTimeMs: queueResult.responseTimeMs,
      success: queueResult.success,
      error: queueResult.error,
      retryAfterHeader: null,
    };
  }
  return deliverPayload(destinationUrl, payload, headers, timeoutMs);
}

export const deliverWebhook = inngest.createFunction(
  {
    id: "deliver-webhook",
    name: "Deliver Webhook",
    retries: 0,
  },
  { event: "webhook/received" },
  async ({ event, step }) => {
    const { eventId, integrationId, destinationUrl, skipSequencer } = event.data;

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

    const destinationType = data.integration!.destinationType ?? "http";

    // If no endpoint exists (shouldn't happen for new integrations), deliver directly
    if (!endpoint) {
      const directResult = await step.run("direct-deliver", async () => {
        return deliverToDestination(destinationType, destinationUrl, data.webhookEvent!.payload, {
          "X-HookWise-Event-ID": eventId,
          "X-HookWise-Timestamp": new Date().toISOString(),
          "X-HookWise-Integration-ID": integrationId,
        }, BASE_TIMEOUT_MS);
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

    // Enrichment: fetch latest resource state if enabled
    let payloadToDeliver = data.webhookEvent!.payload;
    let enriched = false;

    if (data.integration!.enrichmentEnabled && data.integration!.apiKeyEncrypted) {
      const enrichmentResult = await step.run("enrich-event", async () => {
        const { enrichEvent } = await import("@/lib/enrichment");
        return enrichEvent(data.integration!, data.webhookEvent!);
      });

      if (enrichmentResult.success && enrichmentResult.enrichedPayload) {
        payloadToDeliver = enrichmentResult.enrichedPayload;
        enriched = true;
        await step.run("store-enriched-payload", async () => {
          await db.update(events)
            .set({ enrichedPayload: enrichmentResult.enrichedPayload })
            .where(eq(events.id, eventId));
        });
      }
    }

    // Sequencer: hold event if predecessors haven't been delivered yet
    if (data.integration!.sequencerEnabled && !skipSequencer) {
      const sequenceResult = await step.run("check-sequence", async () => {
        const correlationKey = extractCorrelationKey(
          data.integration!.provider as Provider,
          data.webhookEvent!.payload as Record<string, unknown>
        );
        return {
          ...(await checkSequenceReady(integrationId, data.webhookEvent!.eventType, correlationKey)),
          correlationKey,
        };
      });

      if (!sequenceResult.ready) {
        await step.run("emit-sequence-hold", async () => {
          const holdUntil = new Date(Date.now() + sequenceResult.holdTimeoutMs).toISOString();
          await inngest.send({
            name: "webhook/sequence-hold",
            data: { eventId, integrationId, destinationUrl, holdUntil },
          });
        });
        return { held: true, reason: sequenceResult.reason };
      }
    }

    // Deliver
    const enrichHeaders: Record<string, string> = enriched
      ? { "X-HookWise-Enriched": "true" }
      : {};

    const result = await step.run("deliver", async () => {
      return deliverToDestination(destinationType, destinationUrl, payloadToDeliver, {
        "X-HookWise-Event-ID": eventId,
        "X-HookWise-Timestamp": new Date().toISOString(),
        "X-HookWise-Integration-ID": integrationId,
        ...enrichHeaders,
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

    // Audit log
    if (result.success) {
      step.run("audit-delivered", async () => {
        const { logAuditEvent } = await import("@/lib/compliance/audit");
        await logAuditEvent({
          userId: data.integration!.userId,
          integrationId,
          eventId,
          action: "event.delivered",
          details: { statusCode: result.statusCode, responseTimeMs: result.responseTimeMs },
        });
      }).catch(() => {});
    } else {
      step.run("audit-failed", async () => {
        const { logAuditEvent } = await import("@/lib/compliance/audit");
        await logAuditEvent({
          userId: data.integration!.userId,
          integrationId,
          eventId,
          action: "event.failed",
          details: { statusCode: result.statusCode, error: result.error, errorType: classification?.errorType },
        });
      }).catch(() => {});
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
      const [integration] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId))
        .limit(1);
      const endpoint = await getEndpointForIntegration(integrationId);
      return { webhookEvent: webhookEvent ?? null, integration: integration ?? null, endpoint };
    });

    if (!data.webhookEvent) {
      throw new Error(`Event ${eventId} not found for retry`);
    }

    // If circuit is now open, don't retry — it'll be replayed later
    if (data.endpoint?.circuitState === "open") {
      return { success: false, queued: true, circuitState: "open" };
    }

    // Use enriched payload if available (avoid re-fetching on retry)
    const retryPayload = data.webhookEvent!.enrichedPayload ?? data.webhookEvent!.payload;
    const retryEnriched = data.webhookEvent!.enrichedPayload !== null;
    const retryDestType = data.integration?.destinationType ?? "http";

    const result = await step.run("deliver-retry", async () => {
      return deliverToDestination(retryDestType, destinationUrl, retryPayload, {
        "X-HookWise-Event-ID": eventId,
        "X-HookWise-Timestamp": new Date().toISOString(),
        "X-HookWise-Integration-ID": integrationId,
        "X-HookWise-Retry-Count": String(attemptNumber - 1),
        ...(retryEnriched ? { "X-HookWise-Enriched": "true" } : {}),
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

export const sequenceHoldChecker = inngest.createFunction(
  {
    id: "sequence-hold-checker",
    name: "Sequence Hold Checker",
    retries: 3,
  },
  { event: "webhook/sequence-hold" },
  async ({ event, step }) => {
    const { eventId, integrationId, destinationUrl, holdUntil } = event.data;

    await step.sleep("hold-wait", "2s");

    const check = await step.run("check-hold-status", async () => {
      const now = new Date();
      const timeout = new Date(holdUntil);

      if (now >= timeout) {
        return { action: "deliver" as const, reason: "timeout_expired" };
      }

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

      if (!webhookEvent || !integration) {
        return { action: "deliver" as const, reason: "not_found" };
      }

      const correlationKey = extractCorrelationKey(
        integration.provider as Provider,
        webhookEvent.payload as Record<string, unknown>
      );

      const result = await checkSequenceReady(integrationId, webhookEvent.eventType, correlationKey);

      if (result.ready) {
        return { action: "deliver" as const, reason: "predecessors_ready" };
      }

      return { action: "hold" as const, reason: result.reason };
    });

    if (check.action === "deliver") {
      await step.run("re-emit-for-delivery", async () => {
        await inngest.send({
          name: "webhook/received",
          data: { eventId, integrationId, destinationUrl, skipSequencer: true },
        });
      });
      return { released: true, reason: check.reason };
    }

    // Still not ready — re-emit hold event to loop
    await step.run("re-emit-hold", async () => {
      await inngest.send({
        name: "webhook/sequence-hold",
        data: { eventId, integrationId, destinationUrl, holdUntil },
      });
    });

    return { held: true, reason: check.reason };
  }
);

