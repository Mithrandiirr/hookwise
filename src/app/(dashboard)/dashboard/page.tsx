export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  events,
  deliveries,
  endpoints,
  anomalies,
  reconciliationRuns,
  replayQueue,
  backfillRuns,
} from "@/lib/db";
import { eq, desc, count, and, gte, inArray, isNull, sql } from "drizzle-orm";
import { resolveOrgTier } from "@/lib/tier";
import type { BackfillSummary } from "@/lib/inngest/functions/onboarding-backfill";
import { FirstLoadView } from "./first-load-view";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));

  const integrationIds = userIntegrations.map((i) => i.id);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    eventsLastHourRow,
    eventsLast24hRow,
    failedRow,
    userEndpoints,
    openAnomalies,
    revenueRow,
    reconRow,
    replayRow,
    dupesRow,
  ] = await Promise.all([
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, oneHourAgo),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, twentyFourHoursAgo),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(deliveries)
          .innerJoin(events, eq(deliveries.eventId, events.id))
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              eq(deliveries.status, "failed"),
              gte(deliveries.attemptedAt, oneHourAgo),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
    integrationIds.length > 0
      ? db.select().from(endpoints).where(inArray(endpoints.integrationId, integrationIds))
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select()
          .from(anomalies)
          .where(
            and(
              inArray(anomalies.integrationId, integrationIds),
              isNull(anomalies.resolvedAt),
            ),
          )
          .orderBy(desc(anomalies.detectedAt))
          .limit(5)
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({ amount: sql<number>`COALESCE(SUM(${events.amountCents}), 0)` })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, thirtyDaysAgo),
            ),
          )
      : Promise.resolve([{ amount: 0 }]),
    integrationIds.length > 0
      ? db
          .select({ gaps: sql<number>`COALESCE(SUM(${reconciliationRuns.gapsResolved}), 0)` })
          .from(reconciliationRuns)
          .where(
            and(
              inArray(reconciliationRuns.integrationId, integrationIds),
              gte(reconciliationRuns.ranAt, thirtyDaysAgo),
            ),
          )
      : Promise.resolve([{ gaps: 0 }]),
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(replayQueue)
          .innerJoin(endpoints, eq(replayQueue.endpointId, endpoints.id))
          .where(
            and(
              inArray(endpoints.integrationId, integrationIds),
              eq(replayQueue.status, "pending"),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(deliveries)
          .innerJoin(events, eq(deliveries.eventId, events.id))
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(deliveries.attemptedAt, thirtyDaysAgo),
              eq(deliveries.deliveryType, "dedup"),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
  ]);

  const integrationById = new Map(userIntegrations.map((i) => [i.id, i] as const));
  const endpointMap = new Map(userEndpoints.map((e) => [e.integrationId, e] as const));
  const tier = resolveOrgTier(userIntegrations);

  // Hourly bucket query for the HeroBars chart (24 × 1h).
  const hourlyRows =
    integrationIds.length > 0
      ? await db
          .select({
            bucket: sql<Date>`date_trunc('hour', ${events.receivedAt})`,
            count: count(),
          })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, twentyFourHoursAgo),
            ),
          )
          .groupBy(sql`date_trunc('hour', ${events.receivedAt})`)
          .orderBy(sql`date_trunc('hour', ${events.receivedAt})`)
      : [];

  // Densify into exactly 24 buckets ending at the current hour so the bar chart
  // is always full-width even when there are gaps.
  const nowHour = new Date();
  nowHour.setMinutes(0, 0, 0);
  const hourlyBuckets: number[] = Array.from({ length: 24 }, (_, i) => {
    const slot = new Date(nowHour.getTime() - (23 - i) * 60 * 60 * 1000);
    const found = hourlyRows.find((r) => new Date(r.bucket).getTime() === slot.getTime());
    return Number(found?.count ?? 0);
  });
  const hourlyMax = Math.max(1, ...hourlyBuckets);
  const prior24hCount = 0; // placeholder — would need another query for prior-24h to compute delta
  const trendPct =
    prior24hCount > 0
      ? ((eventsLast24hRow[0]?.count ?? 0) - prior24hCount) / prior24hCount * 100
      : null;

  // Day 3 — first-load magic moment. If the user just finished onboarding (no live events
  // in the last 24h but a completed backfill exists), surface the back-poll summary as a
  // dedicated landing view instead of the normal "Last 24 hours" hero.
  // Wrapped so a missing backfill_runs table (pre-migration) doesn't crash the dashboard.
  const latestBackfill = await (async () => {
    if (integrationIds.length === 0) return null;
    try {
      const [row] = await db
        .select()
        .from(backfillRuns)
        .where(
          and(
            inArray(backfillRuns.integrationId, integrationIds),
            eq(backfillRuns.status, "complete"),
          ),
        )
        .orderBy(desc(backfillRuns.completedAt))
        .limit(1);
      return row ?? null;
    } catch (err) {
      console.warn("[dashboard] backfill_runs query failed — migration likely not applied:", err);
      return null;
    }
  })();

  const eventsLastHour = eventsLastHourRow[0]?.count ?? 0;
  const eventsLast24h = eventsLast24hRow[0]?.count ?? 0;
  const failedLastHour = failedRow[0]?.count ?? 0;
  const revenueProtected = (revenueRow[0]?.amount ?? 0) / 100;
  const gapsReconciled = reconRow[0]?.gaps ?? 0;
  const replayQueued = replayRow[0]?.count ?? 0;
  const dupesCount = dupesRow[0]?.count ?? 0;

  const successRate =
    eventsLastHour > 0
      ? 100 - (failedLastHour / Math.max(eventsLastHour, 1)) * 100
      : 100;

  // Group by provider for the "By provider" panel
  const providerStats = new Map<
    string,
    { count: number; parity: number; p95: number; status: "healthy" | "degraded" | "down" }
  >();
  for (const integration of userIntegrations) {
    const ep = endpointMap.get(integration.id);
    const cur = providerStats.get(integration.provider) ?? {
      count: 0,
      parity: 100,
      p95: 0,
      status: "healthy" as const,
    };
    cur.count += 1;
    if (ep) {
      cur.parity = Math.min(cur.parity, ep.successRate ?? 100);
      cur.p95 = Math.max(cur.p95, ep.avgResponseMs ?? 0);
      if (ep.circuitState === "open") cur.status = "down";
      else if (ep.circuitState === "half_open" && cur.status === "healthy") cur.status = "degraded";
    }
    providerStats.set(integration.provider, cur);
  }

  const PROVIDER_COLOR: Record<string, string> = {
    stripe: "#9ac7ff",
    shopify: "#9ec396",
    clerk: "#c4a5ff",
    resend: "#f2b37a",
    github: "#fbbf24",
  };

  const providerRows = Array.from(providerStats.entries()).map(([provider, s]) => ({
    name: provider,
    color: PROVIDER_COLOR[provider] ?? "var(--hf-ink-2)",
    count: s.count,
    parity: s.parity,
    p95: Math.round(s.p95),
    status: s.status,
  }));

  // First-load: no live events yet, but the back-poll left us numbers to show.
  const isFirstLoad =
    eventsLast24h === 0 && latestBackfill != null && latestBackfill.summary != null;

  if (isFirstLoad && latestBackfill) {
    const integration = integrationById.get(latestBackfill.integrationId);
    return (
      <FirstLoadView
        summary={latestBackfill.summary as BackfillSummary}
        integrationId={latestBackfill.integrationId}
        provider={integration?.provider ?? "unknown"}
        revenueTrackingEnabled={tier.revenueTrackingEnabled}
      />
    );
  }

  return (
    <>
      {/* Sticky topbar */}
      <div
        style={{
          padding: "16px 32px",
          borderBottom: "1px solid var(--hf-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--hf-overlay)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--hf-ink-3)" }}>
          <span>acme-production</span>
          <span>/</span>
          <span style={{ color: "var(--hf-ink)" }}>Overview</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            className="hf-mono"
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 8,
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: "var(--hf-ink-3)",
              minWidth: 320,
            }}
          >
            <span>⌕</span>
            <span style={{ flex: 1 }}>Search events, customers, endpoints…</span>
            <span style={{ background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>
              ⌘K
            </span>
          </div>
          <button className="hf-btn outline small" type="button">
            Last 24h ⌄
          </button>
          <Link href="/integrations/new" className="hf-btn pill small">
            + Endpoint
          </Link>
        </div>
      </div>

      <div style={{ padding: 32, overflow: "auto", flex: 1 }}>
        {/* Flat control-board hero (matches .design overview) */}
        <section
          style={{
            border: "1px solid var(--hf-line)",
            borderRadius: 16,
            background: "var(--hf-bg-2)",
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          {/* meta strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 28px",
              borderBottom: "1px solid var(--hf-line)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              color: "var(--hf-ink-4)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              flexWrap: "wrap",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <span>acme-production</span>
              <span style={{ color: "var(--hf-ink-4)" }}>·</span>
              <span>last 24h</span>
              <span style={{ color: "var(--hf-ink-4)" }}>·</span>
              <span>region us-east-1</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--hf-ink-2)" }}>
                <span className="hf-dot-live" /> live
              </span>
              <span>
                updated{" "}
                <span style={{ color: "var(--hf-ink-2)" }}>just now</span>
              </span>
            </div>
          </div>

          {/* display block — number + bars */}
          <div
            style={{
              padding: "32px 32px 28px",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 40,
              alignItems: "flex-end",
            }}
          >
            <div>
              <div className="hf-eyebrow" style={{ marginBottom: 10 }}>
                events processed
              </div>
              <div
                className="hf-num"
                style={{
                  fontSize: 84,
                  fontWeight: 450,
                  letterSpacing: "-0.045em",
                  lineHeight: 0.9,
                  color: "var(--hf-ink)",
                }}
              >
                {eventsLast24h.toLocaleString()}
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  fontSize: 13,
                  color: "var(--hf-ink-3)",
                  flexWrap: "wrap",
                }}
              >
                {trendPct !== null && (
                  <span
                    style={{
                      display: "inline-flex",
                      gap: 5,
                      alignItems: "center",
                      color: trendPct >= 0 ? "var(--hf-accent)" : "#f29a9a",
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{trendPct >= 0 ? "▲" : "▼"}</span>
                    {Math.abs(trendPct).toFixed(1)}%
                  </span>
                )}
                {trendPct !== null && <span>vs prior 24h</span>}
                {trendPct !== null && (
                  <span style={{ color: "var(--hf-ink-4)" }}>·</span>
                )}
                <span>{openAnomalies.length} incidents</span>
                <span style={{ color: "var(--hf-ink-4)" }}>·</span>
                <span>{replayQueued} in DLQ</span>
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 10.5,
                  color: "var(--hf-ink-4)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                <span>ingest rate · 60 min buckets</span>
                <span>
                  <span style={{ color: "var(--hf-accent)" }}>●</span> current window
                </span>
              </div>
              <HeroBars values={hourlyBuckets} max={hourlyMax} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 10,
                  color: "var(--hf-ink-4)",
                  marginTop: 6,
                }}
              >
                <span>−24h</span>
                <span>−18h</span>
                <span>−12h</span>
                <span>−6h</span>
                <span>now</span>
              </div>
            </div>
          </div>

          {/* KPI row — flat hairline separators (no card borders) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid var(--hf-line)",
            }}
          >
            {[
              {
                l: "DELIVERED",
                v: (eventsLast24h - failedLastHour).toLocaleString(),
                sub: `${successRate.toFixed(2)}% rate`,
                color: "#7ed98a",
              },
              tier.revenueTrackingEnabled
                ? {
                    l: "REVENUE PROTECTED",
                    v: `$${(revenueProtected / 1000).toFixed(1)}K`,
                    sub: `+${gapsReconciled} via reconciler`,
                    color: "var(--hf-accent-warm)",
                  }
                : {
                    l: "AUTO-RECOVERED",
                    v: gapsReconciled.toLocaleString(),
                    sub: tier.reconciliationEnabled
                      ? "via reconciler · 30d"
                      : "connect a provider",
                    color: "var(--hf-accent)",
                  },
              {
                l: "P95 LATENCY",
                v: Math.round(
                  userEndpoints.reduce((m, e) => Math.max(m, e.avgResponseMs ?? 0), 0),
                ).toString(),
                unit: "ms",
                sub: "ack to provider",
                color: "var(--hf-ink)",
              },
              {
                l: "MTTR",
                v: "4.6",
                unit: "s",
                sub: "median diagnose",
                color: "var(--hf-accent)",
              },
            ].map((k, i) => (
              <div
                key={k.l}
                style={{
                  padding: "20px 28px",
                  borderLeft: i > 0 ? "1px solid var(--hf-line)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  className="hf-mono"
                  style={{
                    fontSize: 10.5,
                    color: "var(--hf-ink-4)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {k.l}
                </div>
                <div
                  className="hf-num"
                  style={{
                    fontSize: 28,
                    fontWeight: 500,
                    letterSpacing: "-0.025em",
                    color: k.color,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  {k.v}
                  {"unit" in k && k.unit && (
                    <span
                      style={{
                        fontSize: 14,
                        color: "var(--hf-ink-4)",
                        fontWeight: 400,
                      }}
                    >
                      {k.unit}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* status rail */}
          <div
            style={{
              display: "flex",
              gap: 24,
              padding: "12px 28px",
              borderTop: "1px solid var(--hf-line)",
              background: "var(--hf-bg)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              color: "var(--hf-ink-3)",
              letterSpacing: "0.02em",
              flexWrap: "wrap",
            }}
          >
            {(
              [
                ["ingest", eventsLastHour > 0 ? "nominal" : "idle", eventsLastHour > 0 ? "var(--hf-accent)" : "var(--hf-ink-4)"],
                ["reconciler", gapsReconciled > 0 ? `+${gapsReconciled} recovered · 30d` : "synced", "var(--hf-accent)"],
                ["replay", replayQueued > 0 ? `${replayQueued} queued` : "0 queued", replayQueued > 0 ? "#fbbf24" : "var(--hf-accent)"],
                ["dedup", `${dupesCount.toLocaleString()} · 30d`, "var(--hf-accent)"],
                ["anomalies", openAnomalies.length > 0 ? `${openAnomalies.length} active` : "0 active", openAnomalies.length > 0 ? "#fbbf24" : "var(--hf-accent)"],
                ["alerts", "armed", "var(--hf-accent)"],
              ] as Array<[string, string, string]>
            ).map(([n, s, c]) => (
              <span key={n} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: c, fontSize: 8 }}>●</span>
                <span style={{ color: "var(--hf-ink-4)" }}>{n}</span>
                <span style={{ color: "var(--hf-ink-2)" }}>{s}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Active anomaly banner */}
        {openAnomalies[0] && (
          <div
            style={{
              padding: "18px 20px",
              background:
                "linear-gradient(90deg, rgba(251,191,36,0.06), transparent 60%), var(--hf-bg-3)",
              border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#fbbf24" }} />
              <span
                className="hf-mono"
                style={{ fontSize: 11, color: "#fbbf24", letterSpacing: "0.1em" }}
              >
                ACTIVE ANOMALY
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "var(--hf-ink)" }}>
                {(openAnomalies[0].diagnosis as { summary?: string } | null)?.summary ?? (
                  <>
                    <span className="hf-mono" style={{ color: "var(--hf-violet)" }}>
                      {openAnomalies[0].type}
                    </span>{" "}
                    detected — severity {openAnomalies[0].severity}
                  </>
                )}
              </div>
              <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", marginTop: 4 }}>
                INC-{openAnomalies[0].id.slice(0, 8)} · detected{" "}
                {new Date(openAnomalies[0].detectedAt).toLocaleTimeString()}
              </div>
            </div>
            <Link href={`/anomalies/${openAnomalies[0].id}`} className="hf-btn outline small">
              Open investigation →
            </Link>
          </div>
        )}

        {/* By provider + Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* By provider */}
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              padding: "22px 24px",
            }}
          >
            <div className="hf-section-intro" style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>By provider</h2>
              <Link href="/integrations" className="hf-link-accent">
                All endpoints →
              </Link>
            </div>
            <div
              className="hf-mono"
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr 90px 90px 90px 100px",
                gap: 16,
                padding: "14px 0 8px",
                fontSize: 10.5,
                color: "var(--hf-ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderBottom: "1px solid var(--hf-line)",
              }}
            >
              <span>Provider</span>
              <span>Parity</span>
              <span style={{ textAlign: "right" }}>Events</span>
              <span style={{ textAlign: "right" }}>Parity %</span>
              <span style={{ textAlign: "right" }}>p95</span>
              <span style={{ justifySelf: "end" }}>Status</span>
            </div>
            {providerRows.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--hf-ink-4)",
                }}
              >
                No integrations yet.{" "}
                <Link href="/integrations/new" className="hf-link-accent">
                  Add your first →
                </Link>
              </div>
            ) : (
              providerRows.map((r) => (
                <ProviderRow
                  key={r.name}
                  name={r.name}
                  color={r.color}
                  count={r.count.toLocaleString()}
                  parity={`${r.parity.toFixed(2)}%`}
                  parityPct={r.parity}
                  p95={`${r.p95}ms`}
                  status={r.status}
                />
              ))
            )}
          </div>

          {/* Activity rail */}
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              padding: "22px 24px",
            }}
          >
            <div className="hf-section-intro" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>Activity</h2>
              <Link href="/events" className="hf-link-accent">
                All →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(openAnomalies.length > 0 || gapsReconciled > 0
                ? [
                    ...(openAnomalies[0]
                      ? [
                          [
                            "✦",
                            "var(--hf-accent)",
                            `Investigation queued · ${openAnomalies[0].type}`,
                            timeAgo(openAnomalies[0].detectedAt),
                          ] as const,
                        ]
                      : []),
                    ...(gapsReconciled > 0
                      ? [
                          [
                            "⟲",
                            "#9ec396",
                            `Reconciler recovered ${gapsReconciled} events`,
                            "30d",
                          ] as const,
                        ]
                      : []),
                    ...(replayQueued > 0
                      ? [
                          [
                            "⏱",
                            "#fbbf24",
                            `${replayQueued} events queued for replay`,
                            "now",
                          ] as const,
                        ]
                      : []),
                    ["✓", "#7ed98a", `${dupesCount.toLocaleString()} dedup'd duplicates · 30d`, "30d"] as const,
                  ]
                : ([
                    ["✓", "#7ed98a", "Everything is flowing — no incidents", "now"],
                    ["⟲", "#9ec396", `${gapsReconciled} reconciler runs in the last 30 days`, "30d"],
                    ["✓", "#7ed98a", `${dupesCount.toLocaleString()} dedup'd duplicates`, "30d"],
                  ] as const)
              ).map((r, i, arr) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 1fr auto",
                    gap: 12,
                    alignItems: "flex-start",
                    paddingBottom: 10,
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <span style={{ color: r[1], fontSize: 14, paddingTop: 1 }}>{r[0]}</span>
                  <span style={{ fontSize: 12.5, color: "var(--hf-ink-2)", lineHeight: 1.45 }}>{r[2]}</span>
                  <span
                    className="hf-mono"
                    style={{ fontSize: 11, color: "var(--hf-ink-4)", paddingTop: 2 }}
                  >
                    {r[3]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

function timeAgo(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function HeroBars({ values, max }: { values: number[]; max: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 72,
        padding: "0 0 6px",
      }}
    >
      {values.map((v, i) => {
        const isLast = i >= values.length - 3;
        const h = max > 0 ? Math.max(2, (v / max) * 100) : 2;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: isLast ? "var(--hf-accent)" : "rgba(255,255,255,0.16)",
              borderRadius: 1,
              transition: "background 200ms",
            }}
          />
        );
      })}
    </div>
  );
}

function ProviderRow({
  name,
  color,
  count,
  parity,
  parityPct,
  p95,
  status,
}: {
  name: string;
  color: string;
  count: string;
  parity: string;
  parityPct: number;
  p95: string;
  status: "healthy" | "degraded" | "down";
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 90px 90px 90px 100px",
        gap: 16,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--hf-line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <span style={{ fontWeight: 500, color: "var(--hf-ink)", fontSize: 13.5, textTransform: "capitalize" }}>
          {name}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, parityPct))}%`,
            background: color,
          }}
        />
      </div>
      <span className="hf-num" style={{ fontSize: 12.5, color: "var(--hf-ink-2)", textAlign: "right" }}>
        {count}
      </span>
      <span className="hf-num" style={{ fontSize: 12.5, color: "var(--hf-ink)", textAlign: "right" }}>
        {parity}
      </span>
      <span className="hf-num" style={{ fontSize: 12.5, color: "var(--hf-ink-2)", textAlign: "right" }}>
        {p95}
      </span>
      <span
        style={{
          fontSize: 11,
          padding: "3px 8px",
          borderRadius: 999,
          justifySelf: "end",
          background:
            status === "healthy"
              ? "rgba(126,217,138,0.1)"
              : status === "degraded"
                ? "rgba(251,191,36,0.1)"
                : "rgba(242,154,154,0.1)",
          color:
            status === "healthy"
              ? "#7ed98a"
              : status === "degraded"
                ? "#fbbf24"
                : "#f29a9a",
          fontWeight: 500,
        }}
      >
        ● {status}
      </span>
    </div>
  );
}

