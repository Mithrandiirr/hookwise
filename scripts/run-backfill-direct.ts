/**
 * Runs the Shopify onboarding backfill directly (bypassing the Inngest dev server,
 * which can't register SDK 3.52.3 with CLI 1.31.0 — sdk_version_denied).
 * Mirrors src/lib/inngest/functions/onboarding-backfill.ts logic.
 *
 * Usage: npx tsx scripts/run-backfill-direct.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const INTEGRATION_ID = "7f0a840e-59de-4c03-93b6-f1f5edfcc53a";
const WINDOW_DAYS = 120;
const MAX_EVENTS = 5000;
const API_VERSION = "2024-01";
const ASSUMED_FAILURE_RATE = 0.003;

type ShopifyOrder = {
  id: number | string;
  total_price?: string;
  financial_status?: string | null;
  created_at?: string;
  [k: string]: unknown;
};

function parseCents(p: string | undefined): number | null {
  if (!p) return null;
  const n = Number(p);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

async function main() {
  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { eq, and, sql, desc } = await import("drizzle-orm");
  const { resolveOrgTier } = await import("../src/lib/tier");

  const [integration] = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, INTEGRATION_ID));
  if (!integration?.apiKeyEncrypted || !integration.providerDomain)
    throw new Error("integration missing token/domain");

  const [run] = await db
    .insert(schema.backfillRuns)
    .values({ integrationId: INTEGRATION_ID, status: "running", scanned: 0, totalEstimate: MAX_EVENTS, windowDays: WINDOW_DAYS, maxEvents: MAX_EVENTS })
    .returning();

  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);
  const apiKey = integration.apiKeyEncrypted;
  const domain = integration.providerDomain;

  let pageUrl: string | null = `https://${domain}/admin/api/${API_VERSION}/orders.json?status=any&created_at_min=${since.toISOString()}&limit=250`;
  let inserted = 0;
  let page = 0;

  while (pageUrl && inserted < MAX_EVENTS) {
    page++;
    const res: Response = await fetch(pageUrl, { headers: { "X-Shopify-Access-Token": apiKey, Accept: "application/json" } });
    if (!res.ok) throw new Error(`shopify ${res.status} at page ${page}`);
    const body = (await res.json()) as { orders: ShopifyOrder[] };
    const rows = body.orders;
    if (rows.length === 0) break;

    const slice = rows.slice(0, MAX_EVENTS - inserted);
    await db.insert(schema.events).values(
      slice.map((o) => ({
        integrationId: INTEGRATION_ID,
        eventType: `orders.${o.financial_status ?? "created"}`,
        payload: o as unknown as Record<string, unknown>,
        headers: {},
        receivedAt: o.created_at ? new Date(o.created_at) : new Date(),
        signatureValid: true,
        providerEventId: String(o.id),
        source: "onboarding_backfill" as const,
        amountCents: parseCents(o.total_price),
      }))
    );
    inserted += slice.length;
    await db.update(schema.backfillRuns).set({ scanned: inserted }).where(eq(schema.backfillRuns.id, run.id));

    const link = res.headers.get("link");
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = slice.length < rows.length ? null : next ? next[1] : null;
  }

  // Summary (mirrors computeSummary)
  const where = and(eq(schema.events.integrationId, INTEGRATION_ID), eq(schema.events.source, "onboarding_backfill"));
  const topRows = await db
    .select({ type: schema.events.eventType, count: sql<number>`count(*)::int` })
    .from(schema.events).where(where).groupBy(schema.events.eventType).orderBy(desc(sql`count(*)`)).limit(3);
  const [totals] = await db
    .select({ total: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${schema.events.amountCents}),0)::bigint` })
    .from(schema.events).where(where);

  const totalEvents = Number(totals?.total ?? 0);
  const revenueCents = Number(totals?.revenue ?? 0);
  const tier = resolveOrgTier([{ provider: integration.provider, status: integration.status }]);
  const isA = tier.revenueTrackingEnabled;

  const summary = {
    totalEvents,
    topEventTypes: topRows.map((r) => ({ type: r.type, count: Number(r.count) })),
    revenueProtectedCents: isA ? revenueCents : null,
    estimatedAtRiskCents: isA ? Math.round(revenueCents * ASSUMED_FAILURE_RATE) : null,
    estimatedAutoRecovered: Math.round(totalEvents * ASSUMED_FAILURE_RATE),
    assumedFailureRate: ASSUMED_FAILURE_RATE,
    windowDays: WINDOW_DAYS,
    failedEvents: 0,
    failureRate: 0,
    highestImpactFailure: null,
  };

  await db.update(schema.backfillRuns)
    .set({ status: "complete", scanned: inserted, totalEstimate: inserted, completedAt: new Date(), summary })
    .where(eq(schema.backfillRuns.id, run.id));

  console.log(`✓ backfill complete — inserted ${inserted} order events`);
  console.log("  summary:", JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
