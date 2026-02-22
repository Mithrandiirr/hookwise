import { db } from "@/lib/db";
import {
  integrations,
  events,
  reconciliationRuns,
} from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { fetchStripeEvents } from "@/lib/providers/stripe-api";
import { fetchShopifyOrders } from "@/lib/providers/shopify-api";
import type { Provider } from "@/types";

export interface ReconciliationResult {
  providerEventsFound: number;
  hookwiseEventsFound: number;
  gapsDetected: number;
  gapsResolved: number;
}

export async function reconcileIntegration(
  integrationId: string
): Promise<ReconciliationResult> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration || !integration.apiKeyEncrypted) {
    return {
      providerEventsFound: 0,
      hookwiseEventsFound: 0,
      gapsDetected: 0,
      gapsResolved: 0,
    };
  }

  // For now, use the encrypted key directly — in production this would be decrypted via Supabase Vault
  const apiKey = integration.apiKeyEncrypted;
  const since = new Date(Date.now() - 10 * 60 * 1000); // last 10 minutes
  const until = new Date();

  let providerEventIds: Map<string, { type: string; payload: Record<string, unknown> }>;

  try {
    providerEventIds = await fetchProviderEvents(
      integration.provider as Provider,
      apiKey,
      integration.destinationUrl,
      since,
      until
    );
  } catch (error) {
    console.error(
      `[HookWise Reconciliation] Failed to fetch provider events for ${integrationId}:`,
      error
    );
    return {
      providerEventsFound: 0,
      hookwiseEventsFound: 0,
      gapsDetected: 0,
      gapsResolved: 0,
    };
  }

  // Fetch HookWise events in the same window
  const hookwiseEvents = await db
    .select({
      id: events.id,
      providerEventId: events.providerEventId,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, since)
      )
    );

  const hookwiseEventIdSet = new Set(
    hookwiseEvents
      .map((e) => e.providerEventId)
      .filter((id): id is string => id !== null)
  );

  // Find gaps: provider events not in HookWise
  const gaps: Array<{
    providerEventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }> = [];

  for (const [providerEventId, data] of providerEventIds) {
    if (!hookwiseEventIdSet.has(providerEventId)) {
      gaps.push({
        providerEventId,
        eventType: data.type,
        payload: data.payload,
      });
    }
  }

  let gapsResolved = 0;

  // Insert missing events and trigger delivery
  for (const gap of gaps) {
    const [inserted] = await db
      .insert(events)
      .values({
        integrationId,
        eventType: gap.eventType,
        payload: gap.payload,
        headers: {},
        receivedAt: new Date(),
        signatureValid: true,
        providerEventId: gap.providerEventId,
        source: "reconciliation",
      })
      .returning({ id: events.id });

    if (inserted) {
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
    providerEventsFound: providerEventIds.size,
    hookwiseEventsFound: hookwiseEvents.length,
    gapsDetected: gaps.length,
    gapsResolved,
  };

  // Log reconciliation run
  await db.insert(reconciliationRuns).values({
    integrationId,
    providerEventsFound: result.providerEventsFound,
    hookwiseEventsFound: result.hookwiseEventsFound,
    gapsDetected: result.gapsDetected,
    gapsResolved: result.gapsResolved,
    ranAt: new Date(),
  });

  return result;
}

async function fetchProviderEvents(
  provider: Provider,
  apiKey: string,
  destinationUrl: string,
  since: Date,
  until: Date
): Promise<Map<string, { type: string; payload: Record<string, unknown> }>> {
  const map = new Map<string, { type: string; payload: Record<string, unknown> }>();

  if (provider === "stripe") {
    const stripeEvents = await fetchStripeEvents(apiKey, since, until);
    for (const evt of stripeEvents) {
      map.set(evt.id, {
        type: evt.type,
        payload: { id: evt.id, type: evt.type, created: evt.created, data: evt.data },
      });
    }
  } else if (provider === "shopify") {
    // Extract shop domain from destination URL or use apiKey format
    const domain = extractShopifyDomain(destinationUrl);
    if (domain) {
      const orders = await fetchShopifyOrders(domain, apiKey, since);
      for (const order of orders) {
        const eventId = `shopify:order:${order.id}`;
        map.set(eventId, {
          type: "orders/create",
          payload: order as unknown as Record<string, unknown>,
        });
      }
    }
  }
  // GitHub has no reconciliation API

  return map;
}

function extractShopifyDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    // If the destination points to a .myshopify.com domain
    if (parsed.hostname.endsWith(".myshopify.com")) {
      return parsed.hostname;
    }
    return null;
  } catch {
    return null;
  }
}
