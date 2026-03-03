import { db } from "@/lib/db";
import { sequencerRules, deliveries, events } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface SequenceCheckResult {
  ready: boolean;
  holdTimeoutMs: number;
  reason: string;
}

export async function checkSequenceReady(
  integrationId: string,
  eventType: string,
  correlationKey: string | null
): Promise<SequenceCheckResult> {
  // Can't sequence without a correlation key
  if (!correlationKey) {
    return { ready: true, holdTimeoutMs: 0, reason: "no_correlation_key" };
  }

  // Fetch active sequencer rules for this integration
  const rules = await db
    .select()
    .from(sequencerRules)
    .where(
      and(
        eq(sequencerRules.integrationId, integrationId),
        eq(sequencerRules.enabled, true)
      )
    );

  if (rules.length === 0) {
    return { ready: true, holdTimeoutMs: 0, reason: "no_rules" };
  }

  // Find a rule that contains this event type
  for (const rule of rules) {
    const eventOrder = rule.eventOrder as string[];
    const idx = eventOrder.indexOf(eventType);

    if (idx === -1) continue;

    // First in sequence — always ready
    if (idx === 0) {
      return { ready: true, holdTimeoutMs: 0, reason: "first_in_sequence" };
    }

    // Check that all predecessor event types have been delivered for this correlation key
    const predecessorTypes = eventOrder.slice(0, idx);

    // Find events matching this correlation key and predecessor types
    const predecessorEvents = await db
      .select({ id: events.id, eventType: events.eventType })
      .from(events)
      .innerJoin(deliveries, eq(deliveries.eventId, events.id))
      .where(
        and(
          eq(events.integrationId, integrationId),
          inArray(events.eventType, predecessorTypes),
          eq(events.providerEventId, correlationKey),
          eq(deliveries.status, "delivered")
        )
      );

    const deliveredTypes = new Set(predecessorEvents.map((e) => e.eventType));
    const allPredecessorsDelivered = predecessorTypes.every((t) =>
      deliveredTypes.has(t)
    );

    if (allPredecessorsDelivered) {
      return { ready: true, holdTimeoutMs: 0, reason: "predecessors_delivered" };
    }

    return {
      ready: false,
      holdTimeoutMs: rule.holdTimeoutMs,
      reason: `waiting_for: ${predecessorTypes.filter((t) => !deliveredTypes.has(t)).join(", ")}`,
    };
  }

  // Event type not in any rule — allow through
  return { ready: true, holdTimeoutMs: 0, reason: "not_in_any_rule" };
}
