// Gap Report builder — aggregates a 7-day audit window into the report payload.
//
// Correctness over drama: a gap is only counted in the headline dollar figure when its
// classification is "confirmed". Unconfirmed gaps are listed but never priced into the
// headline. Late deliveries are latency findings, not losses.

import { db } from "@/lib/db";
import {
  audits,
  endpoints,
  events,
  reconciliationRuns,
  type Audit,
  type Integration,
} from "@/lib/db/schema";
import { and, between, eq, gte, inArray, sql } from "drizzle-orm";
import { classifyGap } from "@/lib/audit/classify";
import type { Provider } from "@/types";
import type { Finding, GapReportData, GapRow } from "./types";

const MAX_GAP_ROWS = 50;

export async function buildGapReport(
  audit: Audit,
  integration: Integration,
  now: Date = new Date()
): Promise<GapReportData> {
  const provider = integration.provider as Provider;
  const windowStart = audit.startedAt;
  const windowEnd = now.getTime() < audit.endsAt.getTime() ? now : audit.endsAt;

  const [webhookCountRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integration.id),
        eq(events.source, "webhook"),
        between(events.receivedAt, windowStart, windowEnd)
      )
    );
  const webhooksDelivered = webhookCountRow?.count ?? 0;

  // Gaps the reconciler recovered during the window.
  const gapEvents = await db
    .select({
      providerEventId: events.providerEventId,
      eventType: events.eventType,
      payload: events.payload,
      receivedAt: events.receivedAt,
      amountCents: events.amountCents,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integration.id),
        eq(events.source, "reconciliation"),
        between(events.receivedAt, windowStart, windowEnd)
      )
    );

  // A webhook with the same provider_event_id that arrived anyway means the provider was
  // late, not silent — downgrade those gaps to latency findings.
  const gapIds = gapEvents
    .map((g) => g.providerEventId)
    .filter((id): id is string => id !== null);
  const lateIds = new Set<string>();
  if (gapIds.length > 0) {
    const lateRows = await db
      .select({ providerEventId: events.providerEventId })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integration.id),
          eq(events.source, "webhook"),
          inArray(events.providerEventId, gapIds)
        )
      );
    for (const row of lateRows) {
      if (row.providerEventId) lateIds.add(row.providerEventId);
    }
  }

  // API-version fall-forward check — residual doubt makes gaps unconfirmed, never lost.
  const apiVersions = await distinctShopifyApiVersions(integration.id, windowStart, windowEnd, provider);
  const versionMismatch = apiVersions.length > 1;

  const gaps: GapRow[] = gapEvents
    .filter((g) => g.providerEventId !== null)
    .map((g) => {
      const occurredAt = extractOccurredAt(g.payload as Record<string, unknown>) ?? g.receivedAt;
      return {
        providerEventId: g.providerEventId!,
        eventType: g.eventType,
        occurredAt: occurredAt.toISOString(),
        recoveredAt: g.receivedAt.toISOString(),
        amountCents: g.amountCents ?? 0,
        classification: classifyGap({
          provider,
          occurredAt,
          webhookArrivedLate: lateIds.has(g.providerEventId!),
          uncertain: versionMismatch,
          now,
        }),
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);

  const confirmed = gaps.filter((g) => g.classification === "confirmed");
  const unconfirmed = gaps.filter((g) => g.classification === "unconfirmed");
  const late = gaps.filter((g) => g.classification === "late");

  const [pollsRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(reconciliationRuns)
    .where(
      and(
        eq(reconciliationRuns.integrationId, integration.id),
        gte(reconciliationRuns.ranAt, windowStart)
      )
    );

  const findings = await buildFindings({
    integration,
    provider,
    apiVersions,
    confirmedCount: confirmed.length,
    lateCount: late.length,
    webhooksDelivered,
  });

  return {
    version: 1,
    generatedAt: now.toISOString(),
    provider,
    store: { name: integration.name, domain: integration.providerDomain },
    window: {
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      days: Math.max(1, Math.round((windowEnd.getTime() - windowStart.getTime()) / 86_400_000)),
    },
    auditStatus: audit.status,
    brandName: audit.brandName,
    totals: {
      // Provider truth = everything that arrived + everything we had to recover.
      providerEvents: webhooksDelivered + confirmed.length + unconfirmed.length,
      webhooksDelivered,
      gapsConfirmed: confirmed.length,
      gapsUnconfirmed: unconfirmed.length,
      lateDeliveries: late.length,
      confirmedAmountCents: confirmed.reduce((s, g) => s + g.amountCents, 0),
      unconfirmedAmountCents: unconfirmed.reduce((s, g) => s + g.amountCents, 0),
      pollsRun: pollsRow?.count ?? 0,
    },
    gaps: gaps.slice(0, MAX_GAP_ROWS),
    findings,
  };
}

/** Builds and caches the report on the audit row. */
export async function generateAndCacheReport(
  audit: Audit,
  integration: Integration,
  now: Date = new Date()
): Promise<GapReportData> {
  // A completed audit's report is frozen — regenerate only while running.
  if (audit.status === "complete" && audit.report) {
    return audit.report as GapReportData;
  }
  const report = await buildGapReport(audit, integration, now);
  await db
    .update(audits)
    .set({ report, reportGeneratedAt: now })
    .where(eq(audits.id, audit.id));
  return report;
}

function extractOccurredAt(payload: Record<string, unknown>): Date | null {
  // Shopify resources carry created_at (ISO); Stripe events carry created (unix seconds).
  if (typeof payload.created_at === "string") {
    const d = new Date(payload.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof payload.created === "number") {
    return new Date(payload.created * 1000);
  }
  return null;
}

async function distinctShopifyApiVersions(
  integrationId: string,
  start: Date,
  end: Date,
  provider: Provider
): Promise<string[]> {
  if (provider !== "shopify") return [];
  const rows = await db
    .selectDistinct({
      version: sql<string | null>`COALESCE(${events.headers} ->> 'x-shopify-api-version', ${events.headers} ->> 'X-Shopify-Api-Version')`,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        eq(events.source, "webhook"),
        between(events.receivedAt, start, end)
      )
    );
  return rows.map((r) => r.version).filter((v): v is string => v !== null && v !== "");
}

async function buildFindings(params: {
  integration: Integration;
  provider: Provider;
  apiVersions: string[];
  confirmedCount: number;
  lateCount: number;
  webhooksDelivered: number;
}): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { integration, provider, apiVersions } = params;

  // Subscription health — Shopify silently auto-removes subscriptions that keep failing.
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integration.id))
    .limit(1);

  if (endpoint) {
    if (endpoint.circuitState !== "closed") {
      findings.push({
        severity: "critical",
        title: "Webhook endpoint is failing",
        detail:
          `Your endpoint's circuit is ${endpoint.circuitState.replace("_", "-")} ` +
          `(${endpoint.consecutiveFailures} consecutive failures). ` +
          (provider === "shopify"
            ? "Shopify drops events permanently after 8 retries / ~4 hours and silently removes subscriptions that keep failing."
            : "Stripe retries for ~72 hours, then the event is permanently lost."),
      });
    } else if (endpoint.successRate < 95) {
      findings.push({
        severity: "warning",
        title: "Endpoint success rate is degraded",
        detail: `${endpoint.successRate.toFixed(1)}% of deliveries succeed. Sustained failures put the subscription at risk of silent removal.`,
      });
    }

    if (endpoint.avgResponseMs > 1000) {
      findings.push({
        severity: "warning",
        title: "Slow webhook responses",
        detail: `Average response time is ${Math.round(endpoint.avgResponseMs)}ms. ${
          provider === "shopify"
            ? "Shopify counts responses slower than 5s as failures — sustained slowness leads to subscription removal."
            : "Slow acks increase retry pressure and timeout risk."
        }`,
      });
    }
  }

  if (apiVersions.length > 1) {
    findings.push({
      severity: "warning",
      title: "Multiple Shopify API versions observed",
      detail:
        `Webhooks arrived under ${apiVersions.length} API versions (${apiVersions.join(", ")}). ` +
        "Version fall-forward changes payload shape silently; gaps in this window are labeled unconfirmed until it settles.",
    });
  }

  if (params.lateCount > 0) {
    findings.push({
      severity: "info",
      title: `${params.lateCount} late ${params.lateCount === 1 ? "delivery" : "deliveries"}`,
      detail:
        "These events eventually arrived after our poller had already recovered them. Not lost — but your handlers waited on data that was already actionable.",
    });
  }

  if (params.confirmedCount === 0 && params.webhooksDelivered > 0) {
    findings.push({
      severity: "info",
      title: "No confirmed gaps in this window",
      detail:
        "Every provider-side event we could verify was delivered. That's the result you want — and the audit keeps watching, because delivery failure is bursty and correlated with high-stakes moments.",
    });
  }

  return findings;
}
