export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Pill,
  ProviderTag,
  fmtAgo,
} from "@/components/hw";
import { resolveOrgTier } from "@/lib/tier";

type Severity = "low" | "medium" | "high" | "critical";
type StatusFilter = "all" | "open" | "monitoring" | "resolved";

const SEVERITY_PILL = (s: Severity) => {
  const tone =
    s === "critical" || s === "high" ? "red" : s === "medium" ? "amber" : "violet";
  return <Pill tone={tone as "red" | "amber" | "violet"}>{s}</Pill>;
};

export default async function AnomaliesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const statusFilter = parseStatus(sp.status);
  const selectedParam = typeof sp.selected === "string" ? sp.selected : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));
  const tier = resolveOrgTier(userIntegrations);

  const allAnomalies =
    integrationIds.length > 0
      ? await db
          .select()
          .from(anomalies)
          .where(inArray(anomalies.integrationId, integrationIds))
          .orderBy(desc(anomalies.detectedAt))
          .limit(120)
      : [];

  // Counts pre-filter so chips show truthful totals.
  const counts = {
    all: allAnomalies.length,
    open: 0,
    monitoring: 0,
    resolved: 0,
  };
  let totalRevenueAtRisk = 0;
  let diagnosedCount = 0;
  const mttrSamples: number[] = [];
  for (const a of allAnomalies) {
    const lifecycleStatus = lifecycleOf(a);
    counts[lifecycleStatus] += 1;
    const d = parseDiagnosis(a.diagnosis);
    if (d.evidence.length > 0) diagnosedCount++;
    if (!a.resolvedAt && d.severityAssessment.revenueAtRisk) {
      totalRevenueAtRisk += d.severityAssessment.revenueAtRisk;
    }
    if (a.resolvedAt) {
      const ms = new Date(a.resolvedAt).getTime() - new Date(a.detectedAt).getTime();
      if (ms > 0) mttrSamples.push(ms);
    }
  }
  const medianMttrMs = median(mttrSamples);

  const filtered = allAnomalies.filter((a) => {
    if (statusFilter === "all") return true;
    return lifecycleOf(a) === statusFilter;
  });

  // Selected — fall back to first filtered row.
  const selectedId =
    (selectedParam && filtered.find((a) => a.id === selectedParam)?.id) ||
    filtered[0]?.id ||
    null;
  const selected = filtered.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      <DashTopbar
        title="Investigations"
        subtitle="AI-detected incidents · root cause + suggested fix"
        right={
          <Pill tone={counts.open > 0 ? "red" : "green"}>
            {counts.open} open · {counts.resolved} resolved
          </Pill>
        }
      />

      <div
        style={{
          padding: "24px 32px 40px",
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PageHead
          crumb="AI Investigations"
          title={
            <>
              {counts.all} investigations.{" "}
              <span
                className="hf-serif"
                style={{ color: "var(--hf-accent)" }}
              >
                {counts.open === 0
                  ? "All quiet"
                  : `${counts.open} need${counts.open === 1 ? "s" : ""} you`}
              </span>
              .
            </>
          }
          sub="Every anomaly automatically diagnosed against delivery history, endpoint health, provider status, schema drift, prior incidents, and revenue impact — in parallel."
          actions={
            <>
              <button type="button" className="hf-btn outline small">
                Filters
              </button>
              <Link href={`/anomalies?status=${statusFilter}`} className="hf-btn pill small">
                + Ask
              </Link>
            </>
          }
        />

        {/* Stat row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile
            label="OPEN"
            value={counts.open}
            sub="awaiting action"
            color="#f29a9a"
            accent="#f29a9a"
          />
          <StatTile
            label="MONITORING"
            value={counts.monitoring}
            sub="fix applied · watching"
            color="#fbbf24"
            accent="#fbbf24"
          />
          <StatTile
            label="RESOLVED · 30d"
            value={counts.resolved}
            sub="closed automatically"
            color="#7ed98a"
            accent="#7ed98a"
          />
          {tier.revenueTrackingEnabled ? (
            <StatTile
              label="REVENUE AT RISK"
              value={
                totalRevenueAtRisk > 0 ? fmtMoney(totalRevenueAtRisk) : "$0"
              }
              sub={
                diagnosedCount > 0
                  ? `${diagnosedCount} diagnosed by AI`
                  : "no open exposure"
              }
              color={
                totalRevenueAtRisk > 0
                  ? "var(--hf-accent-warm)"
                  : "var(--hf-ink)"
              }
              accent="var(--hf-accent-warm)"
            />
          ) : (
            <StatTile
              label="MEDIAN MTTR"
              value={medianMttrMs != null ? fmtMs(medianMttrMs) : "—"}
              sub={
                medianMttrMs != null
                  ? `${counts.resolved} resolved · last 30d`
                  : "no resolutions yet"
              }
              color="var(--hf-accent)"
              accent="var(--hf-accent)"
            />
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              ["monitoring", "Monitoring"],
              ["resolved", "Resolved"],
            ] as const
          ).map(([k, l]) => {
            const active = statusFilter === k;
            const num =
              k === "all" ? counts.all : counts[k as Exclude<StatusFilter, "all">];
            return (
              <Link
                key={k}
                href={k === "all" ? "/anomalies" : `/anomalies?status=${k}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  background: active ? "var(--hf-bg-4)" : "transparent",
                  color: active ? "var(--hf-ink)" : "var(--hf-ink-3)",
                  border: `1px solid ${active ? "var(--hf-line-2)" : "var(--hf-line)"}`,
                  transition: "background-color 120ms ease, color 120ms ease",
                }}
              >
                {l}
                <span
                  className="hf-num"
                  style={{ color: "var(--hf-ink-4)", fontSize: 11 }}
                >
                  {num}
                </span>
              </Link>
            );
          })}
          <span style={{ flex: 1 }} />
          <span
            className="hf-mono"
            style={{
              fontSize: 11,
              color: "var(--hf-ink-4)",
              letterSpacing: "0.04em",
              alignSelf: "center",
            }}
          >
            showing {filtered.length} of {counts.all}
          </span>
        </div>

        {/* Split — list + detail */}
        {filtered.length === 0 ? (
          <EmptyState hasAny={counts.all > 0} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "420px 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            {/* List rail */}
            <div
              style={{
                background: "var(--hf-bg-3)",
                border: "1px solid var(--hf-line)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {filtered.map((a) => {
                const integ = integrationMap.get(a.integrationId);
                const d = parseDiagnosis(a.diagnosis);
                const sel = a.id === selectedId;
                const lifecycle = lifecycleOf(a);
                const tone =
                  lifecycle === "open"
                    ? "red"
                    : lifecycle === "monitoring"
                      ? "amber"
                      : "green";
                return (
                  <Link
                    key={a.id}
                    href={`/anomalies?${buildSelectedQs(statusFilter, a.id)}`}
                    className="hf-incident-row"
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      borderBottom: "1px solid var(--hf-line)",
                      background: sel ? "rgba(163,230,53,0.04)" : "transparent",
                      borderLeft: sel
                        ? "3px solid var(--hf-accent)"
                        : "3px solid transparent",
                      padding: "18px 22px 18px " + (sel ? "19px" : "22px"),
                      transition: "background-color 120ms ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        className="hf-mono"
                        style={{ fontSize: 11, color: "var(--hf-ink-4)" }}
                      >
                        {shortIdOf(a.id)}
                      </span>
                      <Pill
                        tone={
                          tone as "red" | "amber" | "green"
                        }
                      >
                        {lifecycle}
                      </Pill>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--hf-ink)",
                        fontWeight: 450,
                        lineHeight: 1.35,
                        marginBottom: 10,
                        letterSpacing: "-0.005em",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {d.what ?? a.type}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                        fontSize: 11.5,
                        color: "var(--hf-ink-3)",
                      }}
                    >
                      {integ && <ProviderTag name={integ.provider} />}
                      <span>· {fmtAgo(a.detectedAt)} ago</span>
                      {d.evidence.length > 0 && (
                        <>
                          <span>· {d.evidence.length} sources</span>
                          <span>
                            · confidence{" "}
                            <span
                              className="hf-num hf-mono"
                              style={{
                                color:
                                  (d.confidence ?? 0) > 0.9
                                    ? "#7ed98a"
                                    : (d.confidence ?? 0) > 0.8
                                      ? "var(--hf-accent)"
                                      : "#fbbf24",
                              }}
                            >
                              {(d.confidence ?? 0).toFixed(2)}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Detail pane */}
            <div
              style={{
                background: "var(--hf-bg-3)",
                border: "1px solid var(--hf-line)",
                borderRadius: 14,
                position: "sticky",
                top: 24,
                maxHeight: "calc(100vh - 48px)",
                overflow: "auto",
              }}
            >
              {selected ? (
                <DetailPane
                  anomaly={selected}
                  integrationName={
                    integrationMap.get(selected.integrationId)?.name ?? "—"
                  }
                  provider={
                    integrationMap.get(selected.integrationId)?.provider ?? "—"
                  }
                  revenueTrackingEnabled={tier.revenueTrackingEnabled}
                />
              ) : (
                <div
                  style={{
                    padding: "60px 24px",
                    textAlign: "center",
                    color: "var(--hf-ink-4)",
                    fontSize: 13,
                  }}
                >
                  Select an investigation from the list.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ───────────── Detail pane ───────────── */

function DetailPane({
  anomaly,
  integrationName,
  provider,
  revenueTrackingEnabled,
}: {
  anomaly: typeof anomalies.$inferSelect;
  integrationName: string;
  provider: string;
  revenueTrackingEnabled: boolean;
}) {
  const d = parseDiagnosis(anomaly.diagnosis);
  const lifecycle = lifecycleOf(anomaly);
  const tone =
    lifecycle === "open" ? "red" : lifecycle === "monitoring" ? "amber" : "green";
  const ctx = (anomaly.context ?? null) as {
    baseline?: { avgResponseMs?: number; failureRate?: number };
    current?: { avgResponseMs?: number; failureRate?: number };
  } | null;

  const confidence = Math.round((d.confidence ?? 0) * 100);
  const revenue = d.severityAssessment.revenueAtRisk;
  const eventsAffected = d.severityAssessment.eventsAffected;
  const mttrMs = anomaly.resolvedAt
    ? new Date(anomaly.resolvedAt).getTime() - new Date(anomaly.detectedAt).getTime()
    : null;

  return (
    <div style={{ padding: "26px 28px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          marginBottom: 22,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              className="hf-mono"
              style={{ fontSize: 11, color: "var(--hf-ink-4)" }}
            >
              {shortIdOf(anomaly.id)}
            </span>
            <Pill tone={tone as "red" | "amber" | "green"}>{lifecycle}</Pill>
            <ProviderTag name={provider} />
            {SEVERITY_PILL(anomaly.severity as Severity)}
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.25,
              color: "var(--hf-ink)",
            }}
          >
            {d.what ?? `${anomaly.type} on ${integrationName}`}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" className="hf-btn outline small">
            Share
          </button>
          <Link
            href={`/anomalies/${anomaly.id}`}
            className="hf-btn pill small"
          >
            Open full →
          </Link>
        </div>
      </div>

      {/* Mini stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <StatTile
          label="Confidence"
          value={d.evidence.length > 0 ? `${confidence}%` : "—"}
          color="var(--hf-accent)"
        />
        <StatTile
          label="MTTR"
          value={mttrMs != null ? fmtMs(mttrMs) : "—"}
        />
        <StatTile
          label={revenueTrackingEnabled ? "Revenue at risk" : "Events affected"}
          value={
            revenueTrackingEnabled
              ? revenue != null && revenue > 0
                ? fmtMoney(revenue)
                : "$0"
              : eventsAffected.toLocaleString()
          }
          color={
            revenueTrackingEnabled
              ? revenue != null && revenue > 0
                ? "#fbbf24"
                : "#7ed98a"
              : "var(--hf-ink)"
          }
        />
        <StatTile
          label="Sources queried"
          value={d.evidence.length > 0 ? d.evidence.length : "—"}
        />
      </div>

      {/* Root cause */}
      {(d.why || d.what) && (
        <div
          style={{
            border: "1px solid var(--hf-line)",
            borderRadius: 12,
            padding: "20px 22px",
            marginBottom: 18,
            background: "var(--hf-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span style={{ color: "var(--hf-accent)" }}>✦</span>
            <span
              className="hf-mono"
              style={{
                fontSize: 11,
                color: "var(--hf-ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Root cause · HookWise AI
            </span>
          </div>
          {d.why && (
            <div
              style={{
                fontSize: 15,
                color: "var(--hf-ink)",
                fontWeight: 450,
                marginBottom: d.impact ? 10 : 0,
                letterSpacing: "-0.01em",
                lineHeight: 1.45,
              }}
            >
              {d.why}
            </div>
          )}
          {d.impact && (
            <p
              style={{
                fontSize: 13.5,
                color: "var(--hf-ink-2)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {d.impact}
            </p>
          )}

          {ctx?.baseline?.avgResponseMs != null && ctx?.current?.avgResponseMs != null && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12.5,
                color: "var(--hf-ink-3)",
                lineHeight: 1.6,
              }}
            >
              Endpoint p95 went{" "}
              <span className="hf-mono" style={{ color: "var(--hf-ink-2)" }}>
                {Math.round(ctx.baseline.avgResponseMs)}ms
              </span>{" "}
              →{" "}
              <span className="hf-mono" style={{ color: "#fbbf24" }}>
                {Math.round(ctx.current.avgResponseMs)}ms
              </span>{" "}
              at detection time.
            </p>
          )}
        </div>
      )}

      {/* Evidence trail — real data only */}
      {d.evidence.length > 0 && (
        <div
          style={{
            border: "1px solid var(--hf-line)",
            borderRadius: 12,
            marginBottom: 18,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--hf-line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              className="hf-mono"
              style={{
                fontSize: 11,
                color: "var(--hf-ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Evidence trail
            </div>
            <span style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}>
              {d.evidence.length} signals · queried in parallel
            </span>
          </div>
          <div>
            {d.evidence.slice(0, 7).map((e, i, arr) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 180px 1fr",
                  gap: 14,
                  padding: "12px 20px",
                  borderBottom:
                    i < arr.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  alignItems: "start",
                }}
              >
                <span
                  className="hf-mono hf-num"
                  style={{
                    fontSize: 11,
                    color: "var(--hf-ink-4)",
                    paddingTop: 1,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="hf-mono"
                  style={{
                    fontSize: 12,
                    color: "#c4a5ff",
                    letterSpacing: "0.02em",
                  }}
                >
                  {e.tool}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--hf-ink-2)",
                    lineHeight: 1.55,
                  }}
                >
                  {e.finding}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested fix */}
      {d.recommendation && (
        <div
          style={{
            border: "1px solid rgba(163,230,53,0.25)",
            borderRadius: 12,
            padding: "18px 20px",
            background: "rgba(163,230,53,0.04)",
          }}
        >
          <div
            className="hf-mono"
            style={{
              fontSize: 11,
              color: "var(--hf-accent)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Suggested fix
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--hf-ink-2)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {d.recommendation}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Link
              href={`/anomalies/${anomaly.id}`}
              className="hf-btn pill small"
            >
              Apply & open chat
            </Link>
            <button type="button" className="hf-btn outline small">
              Open PR
            </button>
            <button type="button" className="hf-btn ghost small">
              Snooze 1h
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── helpers ───────────── */

function lifecycleOf(a: typeof anomalies.$inferSelect): Exclude<StatusFilter, "all"> {
  if (a.resolvedAt) return "resolved";
  // No DB-tracked "monitoring" state; map via diagnosis recommendation + recency
  // — keep simple for now: anything still active is "open".
  return "open";
}

function shortIdOf(id: string): string {
  return `INC-${id.slice(0, 8).toUpperCase()}`;
}

function parseStatus(v: string | string[] | undefined): StatusFilter {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === "open" || s === "monitoring" || s === "resolved") return s;
  return "all";
}

function buildSelectedQs(status: StatusFilter, selected: string): string {
  const u = new URLSearchParams();
  if (status !== "all") u.set("status", status);
  u.set("selected", selected);
  return u.toString();
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function fmtMs(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        padding: "60px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, color: "var(--hf-ink-2)" }}>
        {hasAny ? "No investigations match this filter" : "No anomalies detected yet"}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--hf-ink-4)",
          maxWidth: 380,
          margin: "10px auto 0",
          lineHeight: 1.55,
        }}
      >
        {hasAny ? (
          <>
            Try a different filter, or{" "}
            <Link href="/anomalies" className="hf-link-accent">
              clear filters
            </Link>
            .
          </>
        ) : (
          <>Investigations appear here once integrations have enough data for AI pattern learning (200+ events).</>
        )}
      </div>
    </div>
  );
}
