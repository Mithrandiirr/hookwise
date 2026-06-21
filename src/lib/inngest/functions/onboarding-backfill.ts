// Day 2 — backwards-poll job for first-signup magic moment.
// Reuses the Shopify orders.json API but with since: now-30d.
// Caps at maxEvents so a high-volume signup doesn't blow through free-tier in one job.
// Marks rows with source='onboarding_backfill' so they're distinguishable from live webhooks
// and reconciliation gap-fills.
// Computes aggregate summary at end and stores it on backfill_runs.summary for the
// /dashboard/loading page to read.

import { inngest } from "../client";
import { db, integrations, events, backfillRuns } from "@/lib/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { resolveOrgTier } from "@/lib/tier";

// Industry-baseline failure rate used for the projection. Roughly aligned with public
// numbers from Shopify webhook reliability reports. Honest framing: this is an
// *estimate* extrapolated from cohort baselines, not measurement of the customer's own
// historical drops (HookWise wasn't live yet — we can't measure what they actually lost).
const ASSUMED_FAILURE_RATE = 0.003;

type ShopifyOrder = {
  id: number | string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  total_price?: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  [k: string]: unknown;
};

type BackfillSummary = {
  totalEvents: number;
  topEventTypes: Array<{ type: string; count: number }>;
  // Tier A only — sum of amount_cents across the window. The customer's actual revenue
  // throughput, which HookWise now sits in front of.
  revenueProtectedCents: number | null;
  // Tier A only — projection: revenueProtectedCents × ASSUMED_FAILURE_RATE.
  // Surface with "estimated" framing in the UI.
  estimatedAtRiskCents: number | null;
  // Estimated count of deliveries that would have been auto-recovered under HookWise.
  estimatedAutoRecovered: number;
  assumedFailureRate: number;
  windowDays: number;
  // Day 3 additions — failure detection for the first-load AI Diagnosis card.
  // failedEvents = events whose payload signals a provider-side failure (e.g.,
  // *.failed Stripe types, refunded/voided Shopify orders). Not the same as webhook
  // delivery failures (those need HookWise to be live).
  failedEvents: number;
  failureRate: number;
  // Highest-impact failure pattern by count. Drives the AI Diagnosis card.
  highestImpactFailure: {
    eventType: string;
    count: number;
    sampleEventId: string | null;
    sampleAmountCents: number | null;
  } | null;
};

export const onboardingBackfill = inngest.createFunction(
  {
    id: "onboarding-backfill",
    name: "Onboarding · Backwards-poll",
    // Backfill is heavy; keep it from running multiple instances on the same integration.
    concurrency: { limit: 1, key: "event.data.integrationId" },
  },
  { event: "onboarding/backfill" },
  async ({ event, step }) => {
    const { integrationId, windowDays, maxEvents } = event.data;

    // 1) Resolve integration + create run row.
    const integration = await step.run("load-integration", async () => {
      const [row] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, integrationId));
      if (!row) throw new Error(`integration ${integrationId} not found`);
      if (!row.apiKeyEncrypted) throw new Error(`integration ${integrationId} has no API key`);
      return row;
    });

    const run = await step.run("create-run-row", async () => {
      const [r] = await db
        .insert(backfillRuns)
        .values({
          integrationId,
          status: "running",
          scanned: 0,
          totalEstimate: maxEvents,
          windowDays,
          maxEvents,
        })
        .returning();
      return r;
    });

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const apiKey = integration.apiKeyEncrypted!;

    // 2) Provider-specific paginated fetch + insert. Each page updates run.scanned so the
    //    /dashboard/loading poller can show a live counter.
    let inserted = 0;
    let capped = false;
    try {
      if (integration.provider === "shopify") {
        if (!integration.providerDomain) throw new Error("shopify integration missing providerDomain");
        const result = await runShopifyBackfill({
          shopDomain: integration.providerDomain,
          apiKey,
          since,
          maxEvents,
          integrationId,
          runId: run.id,
          step,
        });
        inserted = result.inserted;
        capped = result.capped;
      } else {
        throw new Error(`backfill not supported for provider=${integration.provider}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(backfillRuns)
        .set({ status: "failed", error: msg, completedAt: new Date() })
        .where(eq(backfillRuns.id, run.id));
      throw err;
    }

    // 3) Compute summary from what we just wrote.
    const summary = await step.run("compute-summary", async () => {
      return computeSummary({ integrationId, runId: run.id, windowDays });
    });

    await db
      .update(backfillRuns)
      .set({
        status: "complete",
        scanned: inserted,
        totalEstimate: inserted,
        completedAt: new Date(),
        summary,
      })
      .where(eq(backfillRuns.id, run.id));

    return { runId: run.id, inserted, capped, summary };
  }
);

// -------- Shopify --------

async function runShopifyBackfill(args: {
  shopDomain: string;
  apiKey: string;
  since: Date;
  maxEvents: number;
  integrationId: string;
  runId: string;
  // Inngest's step object — full SDK shape. We only call step.run; widened to keep this
  // helper independent of SDK type churn.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any;
}): Promise<{ inserted: number; capped: boolean }> {
  const { shopDomain, apiKey, since, maxEvents, integrationId, runId, step } = args;
  let pageUrl: string | null =
    `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${since.toISOString()}&limit=250`;
  let inserted = 0;
  let page = 0;

  while (pageUrl && inserted < maxEvents) {
    const currentPageUrl: string = pageUrl;
    page += 1;
    const { rows, nextUrl } = (await step.run(`shopify-page-${page}`, async () => {
      const res = await fetch(currentPageUrl, {
        headers: {
          "X-Shopify-Access-Token": apiKey,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`shopify ${res.status} at page ${page}`);
      }
      const body = (await res.json()) as { orders: ShopifyOrder[] };
      const link = res.headers.get("link");
      const next = link?.match(/<([^>]+)>;\s*rel="next"/);
      return { rows: body.orders, nextUrl: next ? next[1] : null };
    })) as { rows: ShopifyOrder[]; nextUrl: string | null };

    if (rows.length === 0) break;

    const remaining = maxEvents - inserted;
    const slice = rows.slice(0, remaining);

    await db.insert(events).values(
      slice.map((o) => ({
        integrationId,
        eventType: `orders.${o.financial_status ?? "created"}`,
        payload: o as unknown as Record<string, unknown>,
        headers: {},
        receivedAt: o.created_at ? new Date(o.created_at) : new Date(),
        signatureValid: true,
        providerEventId: String(o.id),
        source: "onboarding_backfill" as const,
        amountCents: parseShopifyAmountCents(o.total_price),
      }))
    );

    inserted += slice.length;
    await db
      .update(backfillRuns)
      .set({ scanned: inserted })
      .where(eq(backfillRuns.id, runId));

    if (slice.length < rows.length) {
      // Hit the cap mid-page.
      return { inserted, capped: true };
    }
    pageUrl = nextUrl;
  }

  return { inserted, capped: pageUrl !== null && inserted >= maxEvents };
}

function parseShopifyAmountCents(totalPrice: string | undefined): number | null {
  if (!totalPrice) return null;
  const n = Number(totalPrice);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// -------- Summary --------

async function computeSummary(args: {
  integrationId: string;
  runId: string;
  windowDays: number;
}): Promise<BackfillSummary> {
  const { integrationId, windowDays } = args;

  // Top 3 event types by count for this backfill run.
  const topRows = await db
    .select({
      type: events.eventType,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        eq(events.source, "onboarding_backfill"),
      ),
    )
    .groupBy(events.eventType)
    .orderBy(desc(sql`count(*)`))
    .limit(3);

  const topEventTypes = topRows.map((r) => ({ type: r.type, count: Number(r.count) }));

  const [totals] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(${events.amountCents}), 0)::bigint`,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        eq(events.source, "onboarding_backfill"),
      ),
    );

  const totalEvents = Number(totals?.total ?? 0);
  const revenueProtectedCents = Number(totals?.revenue ?? 0);

  // Tier resolution drives whether we surface revenue at all.
  const [integration] = await db
    .select({ provider: integrations.provider, status: integrations.status })
    .from(integrations)
    .where(eq(integrations.id, integrationId));

  const tier = resolveOrgTier(integration ? [integration] : []);

  const isTierA = tier.revenueTrackingEnabled;
  const estimatedAtRiskCents = isTierA
    ? Math.round(revenueProtectedCents * ASSUMED_FAILURE_RATE)
    : null;
  const estimatedAutoRecovered = Math.round(totalEvents * ASSUMED_FAILURE_RATE);

  // Failure pattern detection — Shopify voided/refunded orders.
  // SQL pattern catches them (event_type LIKE '%failed%' OR '%refunded%' OR '%voided%').
  // This is provider-reported failures, not webhook delivery drops — those need live HookWise.
  const failureRows = await db
    .select({
      type: events.eventType,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        eq(events.source, "onboarding_backfill"),
        sql`(${events.eventType} LIKE '%failed%' OR ${events.eventType} LIKE '%refunded%' OR ${events.eventType} LIKE '%voided%')`,
      ),
    )
    .groupBy(events.eventType)
    .orderBy(desc(sql`count(*)`));

  const failedEvents = failureRows.reduce((sum, r) => sum + Number(r.count), 0);
  const failureRate = totalEvents > 0 ? failedEvents / totalEvents : 0;

  let highestImpactFailure: BackfillSummary["highestImpactFailure"] = null;
  if (failureRows.length > 0) {
    const top = failureRows[0];
    const [sample] = await db
      .select({
        id: events.id,
        amountCents: events.amountCents,
      })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integrationId),
          eq(events.source, "onboarding_backfill"),
          eq(events.eventType, top.type),
        ),
      )
      .limit(1);

    highestImpactFailure = {
      eventType: top.type,
      count: Number(top.count),
      sampleEventId: sample?.id ?? null,
      sampleAmountCents: sample?.amountCents ?? null,
    };
  }

  return {
    totalEvents,
    topEventTypes,
    revenueProtectedCents: isTierA ? revenueProtectedCents : null,
    estimatedAtRiskCents,
    estimatedAutoRecovered,
    assumedFailureRate: ASSUMED_FAILURE_RATE,
    windowDays,
    failedEvents,
    failureRate,
    highestImpactFailure,
  };
}

export type { BackfillSummary };
