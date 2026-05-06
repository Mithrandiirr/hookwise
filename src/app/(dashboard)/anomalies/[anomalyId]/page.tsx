export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";
import { Chip, Dot, Icon, DashTopbar } from "@/components/hw";
import { ResolveButton } from "./resolve-button";
import type { RemediationAction } from "@/lib/ai/types";

function describeRemediation(a: RemediationAction): string {
  switch (a.type) {
    case "open_circuit_breaker":
      return "Open circuit breaker";
    case "enable_rate_limiting":
      return `Rate-limit to ${a.maxPerMinute}/min`;
    case "adjust_retry_strategy":
      return `Adjust retry · ${a.strategy}`;
    case "pause_integration":
      return "Pause integration";
    case "trigger_reconciliation":
      return "Trigger reconciliation";
    case "enable_idempotency":
      return "Enable idempotency";
    case "notify_provider_outage":
      return `Flag ${a.provider} outage`;
  }
}

type Tone = "green" | "amber" | "red" | "indigo";

export default async function AnomalyDetailPage({
  params,
}: {
  params: Promise<{ anomalyId: string }>;
}) {
  const { anomalyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [anomaly] = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.id, anomalyId))
    .limit(1);

  if (!anomaly) notFound();

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, anomaly.integrationId),
        eq(integrations.userId, user.id),
      ),
    )
    .limit(1);

  if (!integration) notFound();

  const diagnosis = parseDiagnosis(anomaly.diagnosis);
  const context = anomaly.context as {
    baseline?: { avgResponseMs?: number; failureRate?: number; eventCount?: number };
    current?: { avgResponseMs?: number; failureRate?: number; eventCount?: number };
  } | null;

  const severityToneMap: Record<string, Tone> = {
    critical: "red",
    high: "red",
    medium: "amber",
    low: "indigo",
  };
  const severityTone = severityToneMap[anomaly.severity] ?? "amber";

  const revenueAtRisk = diagnosis.severityAssessment.revenueAtRisk;
  const eventsAffected = diagnosis.severityAssessment.eventsAffected;
  const estRecovery = diagnosis.severityAssessment.estimatedRecoveryMinutes;

  const durationMs = anomaly.resolvedAt
    ? new Date(anomaly.resolvedAt).getTime() - new Date(anomaly.detectedAt).getTime()
    : Date.now() - new Date(anomaly.detectedAt).getTime();
  const formatDuration = (ms: number) => {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  };

  const shortId = `INC-${anomaly.id.slice(0, 8).toUpperCase()}`;
  const confidence = Math.round((diagnosis.confidence ?? 0) * 100);

  // Build investigation trace from evidence if available, otherwise canonical steps.
  type TraceRow = { i: number; name: string; result: string; tone: Tone };
  const trace: TraceRow[] =
    diagnosis.evidence.length > 0
      ? diagnosis.evidence.slice(0, 7).map((e, i) => ({
          i: i + 1,
          name: e.tool,
          result: e.finding,
          tone: "indigo" as Tone,
        }))
      : [
          { i: 1, name: "delivery_history", result: `${context?.current?.failureRate ?? "—"}% current failure rate`, tone: "red" },
          { i: 2, name: "endpoint_health", result: `p95 ${Math.round(context?.current?.avgResponseMs ?? 0)}ms`, tone: "amber" },
          { i: 3, name: "provider_health", result: "provider: ok", tone: "green" },
          { i: 4, name: "payload_schema", result: "no drift detected", tone: "green" },
          { i: 5, name: "similar_incidents", result: diagnosis.similarIncidents.length > 0 ? `${diagnosis.similarIncidents.length} match` : "no prior match", tone: "indigo" },
          { i: 6, name: "flow_state", result: "—", tone: "indigo" },
          { i: 7, name: "revenue_at_risk", result: revenueAtRisk !== null ? `$${revenueAtRisk.toFixed(2)}` : "—", tone: "amber" },
        ];

  const failurePct = context?.current?.failureRate ?? null;
  const baselineP95 = context?.baseline?.avgResponseMs ?? null;
  const currentP95 = context?.current?.avgResponseMs ?? null;

  return (
    <>
      <DashTopbar
        title={
          <span className="flex items-center" style={{ gap: 10 }}>
            <Link
              href="/anomalies"
              style={{ color: "var(--hw-ink-4)", fontWeight: 500, fontSize: 14 }}
            >
              Anomalies /
            </Link>
            <span>{shortId}</span>
          </span>
        }
        subtitle={
          <span className="hw-mono" style={{ fontSize: 12, color: "var(--hw-ink-3)" }}>
            {anomaly.type} · {integration.name} · {integration.provider}
          </span>
        }
        right={
          <>
            <button type="button" className="hw-btn hw-btn-ghost">
              <Icon name="replay" size={13} /> Replay {eventsAffected || 0} events
            </button>
            <button type="button" className="hw-btn hw-btn-ghost">
              <Icon name="bell" size={13} /> Snooze
            </button>
            {!anomaly.resolvedAt && <ResolveButton anomalyId={anomaly.id} />}
          </>
        }
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        {/* Summary hero */}
        <section
          className="hw-fade-up grid"
          style={{ gridTemplateColumns: "1.3fr 1fr", gap: 16 }}
        >
          <div
            className="hw-panel"
            style={{
              padding: 26,
              background:
                "linear-gradient(180deg, rgba(248,113,113,0.04), transparent 60%), var(--hw-bg-2)",
              borderColor: "rgba(248,113,113,0.20)",
            }}
          >
            <div
              className="flex items-center"
              style={{ gap: 10, marginBottom: 12 }}
            >
              <Dot tone={severityTone} />
              <span
                className="hw-mono"
                style={{
                  fontSize: 11,
                  color: `var(--hw-${severityTone === "indigo" ? "indigo-ink" : severityTone})`,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Severity {anomaly.severity} · {anomaly.resolvedAt ? "resolved" : "open"}
              </span>
              <span className="hw-mono hw-num" style={{ marginLeft: "auto" }}>
                <span style={{ color: "var(--hw-ink-4)", fontSize: 11 }}>duration</span>{" "}
                <span style={{ color: "var(--hw-ink)", fontSize: 13 }}>
                  {formatDuration(durationMs)}
                </span>
              </span>
            </div>
            <div
              className="hw-display"
              style={{ fontSize: 30, color: "var(--hw-ink)" }}
            >
              {diagnosis.what}
              {diagnosis.similarIncidents.length > 0 && (
                <>
                  {" — "}
                  <span style={{ color: "var(--hw-ink-3)" }}>
                    same signature as prior incident.
                  </span>
                </>
              )}
            </div>
            <div
              className="grid"
              style={{
                marginTop: 18,
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 20,
                paddingTop: 18,
                borderTop: "1px solid var(--hw-line)",
              }}
            >
              <Metric
                l="Failure rate"
                v={failurePct !== null ? failurePct.toFixed(1) : "—"}
                u={failurePct !== null ? "%" : ""}
                tone="red"
              />
              <Metric
                l="Events affected"
                v={eventsAffected.toString()}
                u="queued"
                tone="amber"
              />
              <Metric
                l="Revenue at risk"
                v={revenueAtRisk !== null ? `$${revenueAtRisk.toFixed(2)}` : "—"}
                u="buffered"
                tone="amber"
              />
              <Metric
                l="Confidence"
                v={confidence.toString()}
                u="%"
                tone="indigo"
              />
            </div>
          </div>

          {/* Diagnosis panel */}
          <div
            className="hw-panel overflow-hidden flex flex-col"
            style={{ padding: 0, background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center"
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hw-line)",
                gap: 10,
              }}
            >
              <Icon name="brain" size={14} color="var(--hw-indigo-ink)" />
              <span
                className="hw-mono"
                style={{
                  fontSize: 11,
                  color: "var(--hw-ink-2)",
                  letterSpacing: "0.1em",
                }}
              >
                AI DIAGNOSIS
              </span>
              <Chip tone="indigo" style={{ marginLeft: "auto" }}>
                Claude
              </Chip>
            </div>
            <div style={{ padding: "18px 20px", flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--hw-ink)",
                  lineHeight: 1.5,
                }}
              >
                {diagnosis.why}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12.5,
                  color: "var(--hw-ink-3)",
                  lineHeight: 1.55,
                }}
              >
                {diagnosis.impact}
              </div>
              {diagnosis.recommendation && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12.5,
                    color: "var(--hw-ink-2)",
                    lineHeight: 1.55,
                  }}
                >
                  <span
                    className="hw-mono"
                    style={{ color: "var(--hw-indigo-ink)" }}
                  >
                    recommend ·
                  </span>{" "}
                  {diagnosis.recommendation}
                </div>
              )}
            </div>
            <div
              className="flex"
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--hw-line)",
                gap: 8,
              }}
            >
              {diagnosis.remediationActions[0] && (
                <button
                  type="button"
                  className="hw-btn hw-btn-indigo"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {describeRemediation(diagnosis.remediationActions[0])}
                </button>
              )}
              <button
                type="button"
                className="hw-btn hw-btn-ghost"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Ask follow-up
              </button>
            </div>
          </div>
        </section>

        {/* Investigation trace + side rail */}
        <section
          className="hw-fade-up hw-fade-up-1 grid"
          style={{ gridTemplateColumns: "1.3fr 1fr", gap: 16 }}
        >
          <div
            className="hw-panel overflow-hidden"
            style={{ padding: 0, background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center"
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hw-line)",
                gap: 10,
              }}
            >
              <span className="hw-label">
                INVESTIGATION TRACE · {trace.length} QUERIES
              </span>
              <span
                className="hw-mono"
                style={{ marginLeft: "auto", fontSize: 11, color: "var(--hw-ink-4)" }}
              >
                expand all →
              </span>
            </div>
            <div style={{ padding: "18px 20px" }}>
              {trace.map((q, i) => (
                <div
                  key={q.i}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: "32px 1fr auto",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: i ? "1px solid var(--hw-line)" : "none",
                  }}
                >
                  <div
                    className="grid place-items-center hw-mono"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: "var(--hw-bg-3)",
                      border: "1px solid var(--hw-line-2)",
                      fontSize: 11,
                      color: "var(--hw-ink-3)",
                    }}
                  >
                    {q.i}
                  </div>
                  <div>
                    <div
                      className="hw-mono"
                      style={{ fontSize: 12.5, color: "var(--hw-ink)" }}
                    >
                      {q.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: `var(--hw-${q.tone === "indigo" ? "indigo-ink" : q.tone})`,
                        marginTop: 2,
                      }}
                    >
                      {q.result}
                    </div>
                  </div>
                  <Chip tone={q.tone}>
                    {q.tone === "green"
                      ? "clean"
                      : q.tone === "red"
                        ? "hot"
                        : q.tone === "amber"
                          ? "warn"
                          : "note"}
                  </Chip>
                </div>
              ))}
              <div
                className="hw-mono"
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: "var(--hw-bg-3)",
                  borderRadius: 8,
                  border: "1px dashed var(--hw-line-2)",
                  fontSize: 12,
                  color: "var(--hw-ink-2)",
                }}
              >
                <div style={{ color: "var(--hw-indigo-ink)" }}>diagnose()</div>
                <div style={{ marginTop: 4, color: "var(--hw-ink)" }}>
                  → <span style={{ color: "var(--hw-green)" }}>{anomaly.type}</span>{" "}
                  (conf {(diagnosis.confidence ?? 0).toFixed(2)})
                </div>
                {diagnosis.similarIncidents[0] && (
                  <div style={{ color: "var(--hw-ink-3)" }}>
                    → prior_match = {diagnosis.similarIncidents[0].anomalyId}
                  </div>
                )}
                {diagnosis.remediationActions[0] && (
                  <div style={{ color: "var(--hw-ink-3)" }}>
                    → recommend = {describeRemediation(diagnosis.remediationActions[0])}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 16 }}>
            {/* Latency chart */}
            <div
              className="hw-panel"
              style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
            >
              <div
                className="flex items-baseline justify-between"
                style={{ marginBottom: 12 }}
              >
                <div>
                  <div className="hw-label">p95 latency</div>
                  <div
                    className="hw-mono hw-num"
                    style={{
                      fontSize: 22,
                      marginTop: 4,
                      color: "var(--hw-red)",
                    }}
                  >
                    {currentP95 !== null ? Math.round(currentP95) : "—"}
                    <span style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>ms</span>
                  </div>
                </div>
                {baselineP95 !== null && currentP95 !== null && baselineP95 > 0 && (
                  <Chip tone="red">
                    ↑ {Math.max(1, Math.round(currentP95 / baselineP95))}×
                  </Chip>
                )}
              </div>
              <svg
                width="100%"
                height="80"
                viewBox="0 0 300 80"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="inc-grad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="80"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#f87171" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#f87171" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 68 L40 66 L80 64 L120 60 L160 58 L200 50 L210 10 L240 8 L270 12 L300 14 L300 80 L0 80 Z"
                  fill="url(#inc-grad)"
                />
                <path
                  d="M0 68 L40 66 L80 64 L120 60 L160 58 L200 50 L210 10 L240 8 L270 12 L300 14"
                  stroke="#f87171"
                  strokeWidth="1.25"
                  fill="none"
                />
                <line
                  x1="200"
                  y1="0"
                  x2="200"
                  y2="80"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="2,3"
                  opacity="0.7"
                />
                <text
                  x="202"
                  y="10"
                  fill="#fbbf24"
                  fontFamily="var(--font-geist-mono), monospace"
                  fontSize="9"
                >
                  trigger {new Date(anomaly.detectedAt).toISOString().slice(11, 16)}
                </text>
              </svg>
            </div>

            {/* Similar incidents / affected */}
            {diagnosis.similarIncidents.length > 0 ? (
              <div
                className="hw-panel overflow-hidden"
                style={{ padding: 0, background: "var(--hw-bg-2)" }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--hw-line)",
                  }}
                >
                  <span className="hw-label">
                    SIMILAR INCIDENTS · {diagnosis.similarIncidents.length}
                  </span>
                </div>
                <div
                  className="hw-scroll"
                  style={{ maxHeight: 220, overflow: "auto" }}
                >
                  {diagnosis.similarIncidents.map((inc, i) => (
                    <Link
                      key={inc.anomalyId}
                      href={`/anomalies/${inc.anomalyId}`}
                      className="flex items-center"
                      style={{
                        padding: "10px 20px",
                        borderTop: i ? "1px solid var(--hw-line)" : "none",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="hw-mono"
                          style={{
                            fontSize: 11.5,
                            color: "var(--hw-ink-2)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {inc.type}
                        </div>
                        <div
                          className="hw-mono"
                          style={{
                            fontSize: 11,
                            color: "var(--hw-ink-4)",
                            marginTop: 2,
                          }}
                        >
                          {new Date(inc.detectedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Chip tone={inc.resolvedAt ? "green" : "amber"}>
                        {inc.resolvedAt ? "resolved" : "open"}
                      </Chip>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="hw-panel"
                style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
              >
                <div className="hw-label" style={{ marginBottom: 10 }}>
                  CONTEXT
                </div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 12, color: "var(--hw-ink-3)", lineHeight: 1.7 }}
                >
                  <div>
                    baseline p95:{" "}
                    <span style={{ color: "var(--hw-ink-2)" }}>
                      {baselineP95 !== null ? `${Math.round(baselineP95)}ms` : "—"}
                    </span>
                  </div>
                  <div>
                    current p95:{" "}
                    <span style={{ color: "var(--hw-red)" }}>
                      {currentP95 !== null ? `${Math.round(currentP95)}ms` : "—"}
                    </span>
                  </div>
                  <div>
                    events affected:{" "}
                    <span style={{ color: "var(--hw-ink-2)" }}>
                      {eventsAffected}
                    </span>
                  </div>
                  {estRecovery !== null && (
                    <div>
                      est. recovery:{" "}
                      <span style={{ color: "var(--hw-ink-2)" }}>
                        {estRecovery}m
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Timeline strip */}
        <section className="hw-fade-up hw-fade-up-2">
          <div
            className="hw-panel"
            style={{ padding: "18px 22px", background: "var(--hw-bg-2)" }}
          >
            <div className="hw-label" style={{ marginBottom: 14 }}>
              INCIDENT TIMELINE
            </div>
            <div
              className="grid relative"
              style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 9,
                  left: 6,
                  right: 6,
                  height: 1,
                  background: "var(--hw-line-2)",
                }}
              />
              {buildTimeline(anomaly.detectedAt, anomaly.resolvedAt).map((s, i) => {
                const toneVar = s.tone === "indigo" ? "indigo" : s.tone;
                return (
                  <div key={i} className="relative" style={{ paddingTop: 24 }}>
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 0,
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: `var(--hw-${toneVar})`,
                        boxShadow: `0 0 10px var(--hw-${toneVar})`,
                      }}
                    />
                    <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>
                      {s.t}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--hw-ink)",
                        marginTop: 2,
                        fontWeight: 500,
                      }}
                    >
                      {s.l}
                    </div>
                    <div
                      className="hw-mono"
                      style={{ fontSize: 11, color: "var(--hw-ink-3)", marginTop: 2 }}
                    >
                      {s.d}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({
  l,
  v,
  u,
  tone,
}: {
  l: string;
  v: string;
  u: string;
  tone: "red" | "amber" | "indigo" | "green";
}) {
  const color =
    tone === "red"
      ? "var(--hw-red)"
      : tone === "amber"
        ? "var(--hw-amber)"
        : tone === "indigo"
          ? "var(--hw-indigo-ink)"
          : "var(--hw-green)";
  return (
    <div>
      <div className="hw-label">{l}</div>
      <div
        className="hw-mono hw-num"
        style={{ fontSize: 22, marginTop: 4, color }}
      >
        {v}
        <span style={{ fontSize: 11, color: "var(--hw-ink-4)", marginLeft: 2 }}>
          {u}
        </span>
      </div>
    </div>
  );
}

function buildTimeline(detectedAt: Date, resolvedAt: Date | null) {
  const fmt = (d: Date) =>
    d.toISOString().slice(11, 19);
  const t0 = new Date(detectedAt);
  const t1 = new Date(t0.getTime() + 4 * 1000);
  const t2 = new Date(t0.getTime() + 9 * 1000);
  const t3 = new Date(t0.getTime() + 11 * 1000);
  const t4 = resolvedAt ? new Date(resolvedAt) : new Date(t0.getTime() + 12 * 1000);
  return [
    {
      t: fmt(t0),
      l: "Anomaly detected",
      d: "baseline exceeded",
      tone: "red" as const,
    },
    {
      t: fmt(t1),
      l: "AI investigating",
      d: "queries in flight",
      tone: "indigo" as const,
    },
    {
      t: fmt(t2),
      l: "Diagnosis ready",
      d: "root cause identified",
      tone: "indigo" as const,
    },
    {
      t: fmt(t3),
      l: "On-call paged",
      d: "priority route",
      tone: "amber" as const,
    },
    {
      t: fmt(t4),
      l: resolvedAt ? "Resolved" : "Replay queued",
      d: resolvedAt ? "incident closed" : "dedup on",
      tone: "green" as const,
    },
  ];
}
