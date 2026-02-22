import { db } from "@/lib/db";
import { endpoints, deliveries } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { CircuitState } from "@/types";
import type { Endpoint } from "@/lib/db/schema";

const SLIDING_WINDOW_SIZE = 20;
const CONSECUTIVE_FAILURES_THRESHOLD = 5;
const SUCCESS_RATE_OPEN_THRESHOLD = 50;
const HEALTH_CHECKS_FOR_HALF_OPEN = 3;
const SUCCESSES_FOR_CLOSED = 10;
const HALF_OPEN_FAILURE_THRESHOLD = 2;

export async function getEndpointForIntegration(integrationId: string): Promise<Endpoint | null> {
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integrationId))
    .limit(1);
  return endpoint ?? null;
}

export async function getEndpointState(endpointId: string): Promise<Endpoint | null> {
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);
  return endpoint ?? null;
}

export async function recordDeliveryResult(
  endpointId: string,
  success: boolean,
  responseTimeMs: number
): Promise<{ previousState: CircuitState; newState: CircuitState }> {
  // Use raw SQL for SELECT ... FOR UPDATE to ensure atomic state transitions
  const result = await db.transaction(async (tx) => {
    // Lock the endpoint row
    const [endpoint] = await tx
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, endpointId))
      .for("update")
      .limit(1);

    if (!endpoint) {
      throw new Error(`Endpoint ${endpointId} not found`);
    }

    const previousState = endpoint.circuitState as CircuitState;

    // Compute sliding window stats from last N deliveries
    const recentDeliveries = await tx
      .select({
        status: deliveries.status,
        responseTimeMs: deliveries.responseTimeMs,
      })
      .from(deliveries)
      .where(eq(deliveries.endpointId, endpointId))
      .orderBy(desc(deliveries.attemptedAt))
      .limit(SLIDING_WINDOW_SIZE);

    const totalInWindow = recentDeliveries.length + 1; // include current
    const previousSuccesses = recentDeliveries.filter((d) => d.status === "delivered").length;
    const currentSuccesses = previousSuccesses + (success ? 1 : 0);
    const successRate = totalInWindow > 0 ? (currentSuccesses / totalInWindow) * 100 : 100;

    const responseTimes = recentDeliveries
      .map((d) => d.responseTimeMs)
      .filter((t): t is number => t !== null);
    responseTimes.push(responseTimeMs);
    const avgResponseMs = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const newConsecutiveFailures = success ? 0 : endpoint.consecutiveFailures + 1;
    const newConsecutiveSuccesses = success ? endpoint.consecutiveSuccesses + 1 : 0;

    // Determine state transition
    let newState: CircuitState = previousState;

    if (previousState === "closed") {
      if (
        newConsecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD ||
        (totalInWindow >= 5 && successRate < SUCCESS_RATE_OPEN_THRESHOLD)
      ) {
        newState = "open";
      }
    } else if (previousState === "half_open") {
      if (newConsecutiveSuccesses >= SUCCESSES_FOR_CLOSED) {
        newState = "closed";
      } else if (newConsecutiveFailures >= HALF_OPEN_FAILURE_THRESHOLD) {
        newState = "open";
      }
    }
    // If OPEN, deliveries shouldn't happen (they go to replay queue),
    // but handle defensively
    else if (previousState === "open") {
      // No state change from deliveries while OPEN
    }

    const stateChanged = newState !== previousState;

    await tx
      .update(endpoints)
      .set({
        successRate,
        avgResponseMs,
        consecutiveFailures: newConsecutiveFailures,
        consecutiveSuccesses: newConsecutiveSuccesses,
        // Reset health checks on state change
        consecutiveHealthChecks: stateChanged ? 0 : endpoint.consecutiveHealthChecks,
        circuitState: newState,
        ...(stateChanged ? { stateChangedAt: new Date() } : {}),
      })
      .where(eq(endpoints.id, endpointId));

    return { previousState, newState };
  });

  return result;
}

export async function recordHealthCheckResult(
  endpointId: string,
  success: boolean
): Promise<{ previousState: CircuitState; newState: CircuitState }> {
  const result = await db.transaction(async (tx) => {
    const [endpoint] = await tx
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, endpointId))
      .for("update")
      .limit(1);

    if (!endpoint) {
      throw new Error(`Endpoint ${endpointId} not found`);
    }

    const previousState = endpoint.circuitState as CircuitState;

    // Health checks only matter when OPEN
    if (previousState !== "open") {
      return { previousState, newState: previousState };
    }

    const newConsecutiveHealthChecks = success ? endpoint.consecutiveHealthChecks + 1 : 0;
    let newState: CircuitState = previousState;

    if (newConsecutiveHealthChecks >= HEALTH_CHECKS_FOR_HALF_OPEN) {
      newState = "half_open";
    }

    const stateChanged = newState !== previousState;

    await tx
      .update(endpoints)
      .set({
        consecutiveHealthChecks: newConsecutiveHealthChecks,
        lastHealthCheck: new Date(),
        circuitState: newState,
        // Reset counters on transition to half_open
        ...(stateChanged
          ? {
              stateChangedAt: new Date(),
              consecutiveFailures: 0,
              consecutiveSuccesses: 0,
            }
          : {}),
      })
      .where(eq(endpoints.id, endpointId));

    return { previousState, newState };
  });

  return result;
}

export async function enqueueForReplay(
  endpointId: string,
  eventId: string,
  correlationKey: string | null,
  position: number
): Promise<void> {
  const { replayQueue } = await import("@/lib/db/schema");
  await db.insert(replayQueue).values({
    endpointId,
    eventId,
    position,
    correlationKey,
    status: "pending",
    attempts: 0,
  });
}

export async function getNextReplayPosition(endpointId: string): Promise<number> {
  const { replayQueue } = await import("@/lib/db/schema");
  const [result] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${replayQueue.position}), 0)` })
    .from(replayQueue)
    .where(eq(replayQueue.endpointId, endpointId));
  return (result?.maxPos ?? 0) + 1;
}
