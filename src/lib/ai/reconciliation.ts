import { db } from "@/lib/db";
import {
  integrations,
  events,
  reconciliationRuns,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { fetchShopifyOrders } from "@/lib/providers/shopify-api";
import { extractAmountCents } from "@/lib/scanner/extract-amount";
import { maturityCutoff, maturityWindowMs } from "@/lib/audit/maturity";
import type { Provider } from "@/types";

export interface ReconciliationResult {
  providerEventsFound: number;
  hookwiseEventsFound: number;
  gapsDetected: number;
  gapsResolved: number;
}

// How far past the maturity window each poll looks. Three windows of overlap means a
// single failed poll never opens a blind spot, at negligible API cost.
const LOOKBACK_PAST_MATURITY_MS = 45 * 60 * 1000;

const EMPTY_RESULT: ReconciliationResult = {
  providerEventsFound: 0,
  hookwiseEventsFound: 0,
  gapsDetected: 0,
  gapsResolved: 0,
};

export async function reconcileIntegration(
  integrationId: string
): Promise<ReconciliationResult> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration || !integration.apiKeyEncrypted) {
    return EMPTY_RESULT;
  }

  // For now, use the encrypted key directly — in production this would be decrypted via Supabase Vault
  const apiKey = integration.apiKeyEncrypted;
  const provider = integration.provider as Provider;
  const providerDomain = integration.providerDomain;
  const now = new Date();

  // Providers deliver late, not just never (Shopify documents 20+ min delays).
  // Only events older than the maturity window are eligible to be called gaps.
  const cutoff = maturityCutoff(provider, now);
  const since = new Date(cutoff.getTime() - LOOKBACK_PAST_MATURITY_MS);

  let providerEvents: Map<
    string,
    { type: string; payload: Record<string, unknown>; occurredAt: Date }
  >;

  try {
    providerEvents = await fetchProviderEvents(
      provider,
      apiKey,
      providerDomain,
      since,
      cutoff
    );
  } catch (error) {
    console.error(
      `[HookWise Reconciliation] Failed to fetch provider events for ${integrationId}:`,
      error
    );
    return EMPTY_RESULT;
  }

  // Drop anything younger than the maturity window — never flag immature events.
  for (const [id, data] of providerEvents) {
    if (data.occurredAt.getTime() > cutoff.getTime()) {
      providerEvents.delete(id);
    }
  }

  if (providerEvents.size === 0) {
    return EMPTY_RESULT;
  }

  // Diff against the delivery log by provider_event_id — exact match, no time-window
  // race: a webhook that arrived at any point counts.
  const providerIds = [...providerEvents.keys()];
  const hookwiseEvents = await db
    .select({ providerEventId: events.providerEventId })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        inArray(events.providerEventId, providerIds)
      )
    );

  const seenIds = new Set(
    hookwiseEvents
      .map((e) => e.providerEventId)
      .filter((id): id is string => id !== null)
  );

  const gaps = providerIds.filter((id) => !seenIds.has(id));

  // Audit mode records the gap but never touches the customer endpoint.
  const auditMode = integration.mode === "audit";
  let gapsResolved = 0;
  let gapsDetected = 0;

  for (const providerEventId of gaps) {
    const gap = providerEvents.get(providerEventId)!;

    // Double-check immediately before claiming: the webhook may have landed between
    // the diff and now. False positives in a Gap Report are fatal to credibility.
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integrationId),
          eq(events.providerEventId, providerEventId)
        )
      )
      .limit(1);
    if (existing) continue;

    gapsDetected++;

    const [inserted] = await db
      .insert(events)
      .values({
        integrationId,
        eventType: gap.type,
        payload: gap.payload,
        headers: {},
        receivedAt: new Date(),
        signatureValid: true,
        providerEventId,
        source: "reconciliation",
        amountCents:
          extractAmountCents(provider, gap.type, gap.payload) || null,
      })
      .returning({ id: events.id });

    if (inserted && !auditMode) {
      await inngest.send({
        name: "webhook/received",
        data: {
          eventId: inserted.id,
          integrationId,
          destinationUrl: integration.destinationUrl,
        },
      });
      gapsResolved++;
    }
  }

  const result: ReconciliationResult = {
    providerEventsFound: providerEvents.size,
    hookwiseEventsFound: seenIds.size,
    gapsDetected,
    gapsResolved,
  };

  // Log reconciliation run
  await db.insert(reconciliationRuns).values({
    integrationId,
    providerEventsFound: result.providerEventsFound,
    hookwiseEventsFound: result.hookwiseEventsFound,
    gapsDetected: result.gapsDetected,
    gapsResolved: result.gapsResolved,
    ranAt: now,
  });

  return result;
}

async function fetchProviderEvents(
  provider: Provider,
  apiKey: string,
  providerDomain: string | null,
  since: Date,
  until: Date
): Promise<Map<string, { type: string; payload: Record<string, unknown>; occurredAt: Date }>> {
  const map = new Map<
    string,
    { type: string; payload: Record<string, unknown>; occurredAt: Date }
  >();

  if (provider === "shopify") {
    if (!providerDomain) {
      console.error("[HookWise Reconciliation] No provider domain configured for Shopify integration");
      return map;
    }
    const orders = await fetchShopifyOrders(providerDomain, apiKey, since);
    for (const order of orders) {
      const eventId = `shopify:order:${order.id}`;
      map.set(eventId, {
        type: "orders/create",
        payload: order as unknown as Record<string, unknown>,
        occurredAt: new Date(order.created_at),
      });
    }
  }

  return map;
}

export { maturityWindowMs };
