import { inngest } from "../client";
import { db } from "@/lib/db";
import { replayQueue, events, endpoints, deliveries } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { deliverPayload } from "@/lib/utils/deliver";
import { classifyDeliveryError } from "@/lib/utils/classify-error";
import { recordDeliveryResult, getEndpointState } from "@/lib/mitigation/circuit-breaker";

const BATCH_SIZE = 10;
const MAX_SKIP_ATTEMPTS = 3;

const RATE_TIERS = [1, 2, 5, 10]; // events per second
const SUCCESSES_PER_TIER = 5;

export const replayEngine = inngest.createFunction(
  {
    id: "replay-engine",
    name: "Ordered Replay Engine",
  },
  { event: "endpoint/replay-started" },
  async ({ event, step }) => {
    const { endpointId, integrationId } = event.data;

    let totalDelivered = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let consecutiveSuccesses = 0;
    let currentTierIndex = 0;
    let hasMore = true;

    while (hasMore) {
      // Check if endpoint is still in half_open or closed state
      const currentEndpoint = await step.run(`check-state-${totalDelivered}`, async () => {
        return getEndpointState(endpointId);
      });

      if (!currentEndpoint || currentEndpoint.circuitState === "open") {
        break;
      }

      // Fetch next batch of pending replay items
      const batch = await step.run(`fetch-batch-${totalDelivered}`, async () => {
        return db
          .select()
          .from(replayQueue)
          .where(
            and(
              eq(replayQueue.endpointId, endpointId),
              eq(replayQueue.status, "pending")
            )
          )
          .orderBy(asc(replayQueue.position))
          .limit(BATCH_SIZE);
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of batch) {
        // Re-check circuit state before each delivery
        const endpointCheck = await step.run(`pre-check-${item.id}`, async () => {
          return getEndpointState(endpointId);
        });

        if (!endpointCheck || endpointCheck.circuitState === "open") {
          hasMore = false;
          break;
        }

        // Deduplication: check if this event was already delivered via another path
        const alreadyDelivered = await step.run(`dedup-check-${item.id}`, async () => {
          const [webhookEvent] = await db
            .select({ providerEventId: events.providerEventId })
            .from(events)
            .where(eq(events.id, item.eventId))
            .limit(1);

          if (!webhookEvent?.providerEventId) return false;

          const existingDelivery = await db
            .select({ id: deliveries.id })
            .from(deliveries)
            .innerJoin(events, eq(deliveries.eventId, events.id))
            .where(
              and(
                eq(events.providerEventId, webhookEvent.providerEventId),
                eq(deliveries.status, "delivered")
              )
            )
            .limit(1);

          return existingDelivery.length > 0;
        });

        if (alreadyDelivered) {
          await step.run(`skip-dedup-${item.id}`, async () => {
            await db
              .update(replayQueue)
              .set({ status: "delivered", deliveredAt: new Date() })
              .where(eq(replayQueue.id, item.id));
          });
          totalSkipped++;
          continue;
        }

        // Skip-and-continue: if too many attempts, skip this event
        if (item.attempts >= MAX_SKIP_ATTEMPTS) {
          await step.run(`skip-failed-${item.id}`, async () => {
            await db
              .update(replayQueue)
              .set({ status: "skipped" })
              .where(eq(replayQueue.id, item.id));
          });
          totalSkipped++;
          continue;
        }

        // Mark as delivering
        await step.run(`mark-delivering-${item.id}`, async () => {
          await db
            .update(replayQueue)
            .set({ status: "delivering", attempts: item.attempts + 1 })
            .where(eq(replayQueue.id, item.id));
        });

        // Fetch event payload
        const webhookEvent = await step.run(`fetch-event-${item.id}`, async () => {
          const [evt] = await db
            .select()
            .from(events)
            .where(eq(events.id, item.eventId))
            .limit(1);
          return evt ?? null;
        });

        if (!webhookEvent) {
          await step.run(`skip-missing-${item.id}`, async () => {
            await db
              .update(replayQueue)
              .set({ status: "skipped" })
              .where(eq(replayQueue.id, item.id));
          });
          totalSkipped++;
          continue;
        }

        // Rate limit based on current tier
        const currentRate = RATE_TIERS[currentTierIndex] ?? RATE_TIERS[RATE_TIERS.length - 1];
        const delayMs = Math.ceil(1000 / currentRate);
        if (delayMs > 100) {
          await step.sleep(`rate-limit-${item.id}`, `${delayMs}ms`);
        }

        // Deliver
        const result = await step.run(`deliver-${item.id}`, async () => {
          return deliverPayload(
            currentEndpoint!.url,
            webhookEvent.payload,
            {
              "X-HookWise-Event-ID": item.eventId,
              "X-HookWise-Timestamp": new Date().toISOString(),
              "X-HookWise-Integration-ID": integrationId,
              "X-HookWise-Replay": "true",
            },
            5_000
          );
        });

        const classification = !result.success
          ? classifyDeliveryError(result.statusCode, result.error, result.retryAfterHeader)
          : null;

        // Record delivery attempt
        await step.run(`record-${item.id}`, async () => {
          await db.insert(deliveries).values({
            eventId: item.eventId,
            endpointId,
            status: result.success ? "delivered" : "failed",
            statusCode: result.statusCode,
            responseTimeMs: result.responseTimeMs,
            responseBody: result.responseBody ?? result.error,
            errorType: classification?.errorType ?? null,
            attemptNumber: item.attempts + 1,
            attemptedAt: new Date(),
          });
        });

        // Update circuit breaker
        const transition = await step.run(`circuit-update-${item.id}`, async () => {
          return recordDeliveryResult(endpointId, result.success, result.responseTimeMs);
        });

        if (result.success) {
          await step.run(`mark-delivered-${item.id}`, async () => {
            await db
              .update(replayQueue)
              .set({ status: "delivered", deliveredAt: new Date() })
              .where(eq(replayQueue.id, item.id));
          });
          totalDelivered++;
          consecutiveSuccesses++;

          // Adaptive rate: scale up after consecutive successes
          if (
            consecutiveSuccesses >= SUCCESSES_PER_TIER &&
            currentTierIndex < RATE_TIERS.length - 1
          ) {
            currentTierIndex++;
            consecutiveSuccesses = 0;
          }
        } else {
          // Mark back as pending for retry
          await step.run(`mark-failed-${item.id}`, async () => {
            await db
              .update(replayQueue)
              .set({ status: "pending" })
              .where(eq(replayQueue.id, item.id));
          });
          totalFailed++;
          consecutiveSuccesses = 0;
          // Back off rate on failure
          currentTierIndex = 0;

          // If circuit tripped back to open, stop
          if (transition.newState === "open") {
            hasMore = false;
            break;
          }
        }
      }
    }

    return { totalDelivered, totalSkipped, totalFailed };
  }
);
