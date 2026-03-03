import { fetchStripeEvents } from "@/lib/providers/stripe-api";
import { fetchShopifyOrders } from "@/lib/providers/shopify-api";
import { extractAmountCents } from "./extract-amount";
import { db, events } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import type {
  ScanRequest,
  ScanReport,
  ScanEventSummary,
  EventTypeBreakdown,
} from "./types";

const MAX_EVENTS = 10_000;
const TOP_GAPS_LIMIT = 50;
const SCAN_PERIOD_DAYS = 30;

interface NormalizedEvent {
  providerEventId: string;
  eventType: string;
  createdAt: Date;
  amountCents: number;
}

export async function runScan(request: ScanRequest): Promise<ScanReport> {
  const since = new Date(Date.now() - SCAN_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const until = new Date();

  // 1. Fetch provider events
  let providerEvents: NormalizedEvent[];
  let truncated = false;

  if (request.provider === "stripe") {
    const raw = await fetchStripeEvents(request.apiKey, since, until);
    const capped = raw.slice(0, MAX_EVENTS);
    truncated = raw.length > MAX_EVENTS;
    providerEvents = capped.map((e) => ({
      providerEventId: e.id,
      eventType: e.type,
      createdAt: new Date(e.created * 1000),
      amountCents: extractAmountCents("stripe", e.type, e.data),
    }));
  } else if (request.provider === "shopify") {
    if (!request.shopDomain) {
      throw new Error("shopDomain is required for Shopify scans");
    }
    const raw = await fetchShopifyOrders(request.shopDomain, request.apiKey, since);
    const capped = raw.slice(0, MAX_EVENTS);
    truncated = raw.length > MAX_EVENTS;
    providerEvents = capped.map((o) => ({
      providerEventId: String(o.id),
      eventType: "orders/create",
      createdAt: new Date(o.created_at),
      amountCents: extractAmountCents(
        "shopify",
        "orders/create",
        o as unknown as Record<string, unknown>
      ),
    }));
  } else {
    throw new Error(`Unsupported provider: ${request.provider}`);
  }

  // 2. If user has an existing integration, diff against HookWise events
  const hookwiseEventIds = new Set<string>();
  let totalHookwiseEvents = 0;

  if (request.integrationId) {
    const providerEventIds = providerEvents.map((e) => e.providerEventId);

    if (providerEventIds.length > 0) {
      // Batch lookup in chunks of 500
      for (let i = 0; i < providerEventIds.length; i += 500) {
        const chunk = providerEventIds.slice(i, i + 500);
        const found = await db
          .select({ providerEventId: events.providerEventId })
          .from(events)
          .where(
            eq(events.integrationId, request.integrationId)
          );

        for (const row of found) {
          if (row.providerEventId && chunk.includes(row.providerEventId)) {
            hookwiseEventIds.add(row.providerEventId);
          }
        }
      }
      totalHookwiseEvents = hookwiseEventIds.size;
    }
  }

  // 3. Mark gaps + extract summaries
  const summaries: ScanEventSummary[] = providerEvents.map((e) => ({
    providerEventId: e.providerEventId,
    eventType: e.eventType,
    createdAt: e.createdAt,
    amountCents: e.amountCents,
    isGap: request.integrationId ? !hookwiseEventIds.has(e.providerEventId) : false,
  }));

  // 4. Build event type breakdown
  const breakdownMap = new Map<string, EventTypeBreakdown>();
  for (const s of summaries) {
    let entry = breakdownMap.get(s.eventType);
    if (!entry) {
      entry = { eventType: s.eventType, totalCount: 0, gapCount: 0, dollarImpactCents: 0 };
      breakdownMap.set(s.eventType, entry);
    }
    entry.totalCount++;
    if (s.isGap) {
      entry.gapCount++;
      entry.dollarImpactCents += s.amountCents;
    }
  }
  const breakdown = Array.from(breakdownMap.values()).sort(
    (a, b) => b.dollarImpactCents - a.dollarImpactCents
  );

  // 5. Calculate health score
  const gapsFound = summaries.filter((s) => s.isGap).length;
  const healthScore =
    providerEvents.length > 0
      ? Math.round(((providerEvents.length - gapsFound) / providerEvents.length) * 100)
      : 100;

  // 6. Top gaps (sorted by dollar impact desc)
  const topGaps = summaries
    .filter((s) => s.isGap)
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, TOP_GAPS_LIMIT);

  const dollarAtRiskCents = summaries
    .filter((s) => s.isGap)
    .reduce((sum, s) => sum + s.amountCents, 0);

  return {
    provider: request.provider,
    scannedAt: new Date(),
    periodDays: SCAN_PERIOD_DAYS,
    totalProviderEvents: providerEvents.length,
    totalHookwiseEvents,
    gapsFound,
    dollarAtRiskCents,
    healthScore,
    breakdown,
    topGaps,
    truncated,
    integrationId: request.integrationId,
  };
}
