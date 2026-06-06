export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Panel,
  Pill,
  ProviderTag,
  fmtAgo,
} from "@/components/hw";
import { ResolveButton } from "./resolve-button";
import { AnomalyChat } from "./anomaly-chat";
import type { RemediationAction } from "@/lib/ai/types";

type Severity = "low" | "medium" | "high" | "critical";
type Lifecycle = "open" | "monitoring" | "resolved";

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

function severityPill(s: Severity) {
  const tone =
    s === "critical" || s === "high" ? "red" : s === "medium" ? "amber" : "violet";
  return (
    <Pill tone={tone as "red" | "amber" | "violet"} dot={false}>
      {s}
    </Pill>
  );
}

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
  const context = (anomaly.context ?? null) as {
    baseline?: { avgResponseMs?: number; failureRate?: number; eventCount?: number };
    current?: { avgResponseMs?: number; failureRate?: number; eventCount?: number };
  } | null;

  const sev = anomaly.severity as Severity;
  const isResolved = !!anomaly.resolvedAt;
  const lifecycle: Lifecycle = isResolved ? "resolved" : "open";

  const revenueAtRisk = diagnosis.severityAssessment.revenueAtRisk;
  const eventsAffected = diagnosis.severityAssessment.eventsAffected;
  const confidence = Math.round((diagnosis.confidence ?? 0) * 100);

  const durationMs = anomaly.resolvedAt
    ? new Date(anomaly.resolvedAt).getTime() -
      new Date(anomaly.detectedAt).getTime()
    : Date.now() - new Date(anomaly.detectedAt).getTime();

  const shortId = `INC-${anomaly.id.slice(0, 8).toUpperCase()}`;
  const failurePct = context?.current?.failureRate ?? null;
  const baselineFailurePct = context?.baseline?.failureRate ?? null;
  const baselineP95 = context?.baseline?.avgResponseMs ?? null;
  const currentP95 = context?.current?.avgResponseMs ?? null;

  const trace = diagnosis.evidence.slice(0, 7);
  const hasEvidence = trace.length > 0;
  const primaryRemediation = diagnosis.remediationActions[0];

  const lifecycleTone: "red" | "green" = lifecycle === "open" ? "red" : "green";

  return (
    <>
      <DashTopbar
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
          >
            <Link
              href="/anomalies"
              style={{
                color: "var(--hf-ink-4)",
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Investigations
            </Link>
            <span style={{ color: "var(--hf-ink-4)" }}>/</span>
            <span
              className="hf-mono"
              style={{ color: "var(--hf-ink)", fontSize: 14 }}
            >
              {shortId}
            </span>
          </span>
        }
        subtitle={
          <span
            className="hf-mono"
            style={{ fontSize: 12, color: "var(--hf-ink-3)" }}
          >
            {anomaly.type} · {integration.name} · {integration.provider}
          </span>
        }
        right={
          isResolved ? (
            <Pill tone="green">resolved · {fmtMs(durationMs)}</Pill>
          ) : (
            <>
              <Pill tone="red">open · {fmtMs(durationMs)}</Pill>
              {eventsAffected > 0 && (
                <button type="button" className="hf-btn outline small">
                  Replay {eventsAffected}
                </button>
              )}
              <ResolveButton anomalyId={anomaly.id} />
            </>
          )
        }
      />

      <div
        style={{
          padding: "24px 32px 40px",
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* PageHead — landscape with the diagnosis "what" */}
        <PageHead
          crumb={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span>{shortId}</span>
              <span style={{ color: "var(--hf-ink-4)" }}>·</span>
              <Pill tone={lifecycleTone}>{lifecycle}</Pill>
              <ProviderTag name={integration.provider} />
              {severityPill(sev)}
            </span>
          }
          title={diagnosis.what ?? `${anomaly.type} on ${integration.name}`}
          sub={
            diagnosis.similarIncidents.length > 0 ? (
              <>
                Matches{" "}
                <Link
                  href={`/anomalies/${diagnosis.similarIncidents[0].anomalyId}`}
                  className="hf-mono"
                  style={{ color: "#c4a5ff", textDecoration: "none" }}
                >
                  {`INC-${diagnosis.similarIncidents[0].anomalyId.slice(0, 8).toUpperCase()}`}
                </Link>{" "}
                · {diagnosis.similarIncidents.length} prior incident
                {diagnosis.similarIncidents.length === 1 ? "" : "s"} at{" "}
                {confidence}% confidence.
              </>
            ) : (
              `Detected ${fmtAgo(anomaly.detectedAt)} ago${anomaly.resolvedAt ? ` · resolved ${fmtAgo(anomaly.resolvedAt)} ago` : ""}.`
            )
          }
          actions={
            isResolved ? undefined : (
              <>
                {eventsAffected > 0 && (
                  <button type="button" className="hf-btn outline small">
                    Replay {eventsAffected}
                  </button>
                )}
                <ResolveButton anomalyId={anomaly.id} />
              </>
            )
          }
        />

        {/* StatTiles row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          <StatTile
            label="FAILURE RATE"
            value={failurePct !== null ? `${failurePct.toFixed(2)}%` : "—"}
            sub={
              failurePct !== null &&
              baselineFailurePct !== null &&
              baselineFailurePct > 0
                ? `↑ ${(failurePct / baselineFailurePct).toFixed(1)}× baseline`
                : "vs baseline"
            }
            color={failurePct && failurePct > 1 ? "#f29a9a" : "var(--hf-ink)"}
            accent="#f29a9a"
          />
          <StatTile
            label="EVENTS AFFECTED"
            value={eventsAffected > 0 ? eventsAffected.toLocaleString() : "—"}
            sub={eventsAffected > 0 ? "queued · replay-eligible" : "—"}
            color={eventsAffected > 0 ? "#fbbf24" : "var(--hf-ink)"}
            accent="#fbbf24"
          />
          <StatTile
            label="REVENUE AT RISK"
            value={
              revenueAtRisk !== null && revenueAtRisk > 0
                ? fmtMoney(revenueAtRisk)
                : "—"
            }
            sub={
              revenueAtRisk !== null && revenueAtRisk > 0
                ? "buffered · not lost"
                : "no money at risk"
            }
            color={
              revenueAtRisk !== null && revenueAtRisk > 0
                ? "var(--hf-accent-warm)"
                : "var(--hf-ink)"
            }
            accent="var(--hf-accent-warm)"
          />
          <StatTile
            label="AI CONFIDENCE"
            value={hasEvidence ? `${confidence}%` : "—"}
            sub={
              hasEvidence
                ? `${trace.length} evidence step${trace.length === 1 ? "" : "s"}`
                : "no diagnosis yet"
            }
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
        </div>

        {/* Root cause card — using design's pattern */}
        {(diagnosis.why || diagnosis.what) && (
          <div
            style={{
              border: "1px solid var(--hf-line)",
              borderRadius: 12,
              padding: "22px 24px",
              background: "var(--hf-bg-3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
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
              <span style={{ flex: 1 }} />
              {hasEvidence && (
                <Pill tone="ember" dot={false}>
                  Claude · {confidence}%
                </Pill>
              )}
            </div>

            {diagnosis.why && (
              <div
                style={{
                  fontSize: 16,
                  color: "var(--hf-ink)",
                  fontWeight: 450,
                  marginBottom: diagnosis.impact ? 12 : 0,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.45,
                }}
              >
                {diagnosis.why}
              </div>
            )}
            {diagnosis.impact && (
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--hf-ink-2)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {diagnosis.impact}
              </p>
            )}

            {baselineP95 != null &&
              currentP95 != null &&
              baselineP95 > 0 && (
                <p
                  style={{
                    marginTop: 14,
                    fontSize: 12.5,
                    color: "var(--hf-ink-3)",
                    lineHeight: 1.6,
                  }}
                >
                  Endpoint p95 went{" "}
                  <span className="hf-mono" style={{ color: "var(--hf-ink-2)" }}>
                    {Math.round(baselineP95)}ms
                  </span>{" "}
                  →{" "}
                  <span className="hf-mono" style={{ color: "#fbbf24" }}>
                    {Math.round(currentP95)}ms
                  </span>{" "}
                  at detection time.
                </p>
              )}
          </div>
        )}

        {/* Evidence trail */}
        {hasEvidence && (
          <Panel
            title="Evidence trail"
            right={
              <span style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}>
                {trace.length} signals · queried in parallel
              </span>
            }
            padded={false}
          >
            <div>
              {trace.map((e, i, arr) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 200px 1fr",
                    gap: 16,
                    padding: "14px 22px",
                    alignItems: "start",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                  }}
                >
                  <span
                    className="hf-mono hf-num"
                    style={{
                      width: 28,
                      height: 26,
                      borderRadius: 6,
                      background: "var(--hf-bg)",
                      border: "1px solid var(--hf-line-2)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      color: "var(--hf-ink-3)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div
                      className="hf-mono"
                      style={{
                        fontSize: 12.5,
                        color: "#c4a5ff",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {e.tool}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--hf-ink-2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {e.finding}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Suggested fix card — only when there's a recommendation */}
        {diagnosis.recommendation && (
          <div
            style={{
              border: "1px solid rgba(163,230,53,0.25)",
              borderRadius: 12,
              padding: "20px 22px",
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
              Suggested fix · one click
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--hf-ink)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {diagnosis.recommendation}
            </p>
            {!isResolved && primaryRemediation && (
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button type="button" className="hf-btn pill small">
                  {describeRemediation(primaryRemediation)}
                </button>
                <button type="button" className="hf-btn outline small">
                  Open PR
                </button>
                <button type="button" className="hf-btn ghost small">
                  Snooze 1h
                </button>
              </div>
            )}
          </div>
        )}

        {/* Follow-up chat — same context, conversational */}
        <AnomalyChat anomalyId={anomaly.id} />

        {/* Context + Similar incidents row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <Panel title="Context">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ContextRow
                label="p95 latency"
                baseline={
                  baselineP95 !== null ? `${Math.round(baselineP95)}ms` : "—"
                }
                current={
                  currentP95 !== null ? `${Math.round(currentP95)}ms` : "—"
                }
                alarming={
                  baselineP95 !== null &&
                  currentP95 !== null &&
                  currentP95 > baselineP95 * 2
                }
              />
              <ContextRow
                label="Failure rate"
                baseline={
                  baselineFailurePct !== null
                    ? `${baselineFailurePct.toFixed(2)}%`
                    : "—"
                }
                current={
                  failurePct !== null ? `${failurePct.toFixed(2)}%` : "—"
                }
                alarming={
                  baselineFailurePct !== null &&
                  failurePct !== null &&
                  failurePct > baselineFailurePct * 2
                }
              />
              <ContextRow
                label="Events affected"
                baseline="—"
                current={
                  eventsAffected > 0 ? eventsAffected.toLocaleString() : "0"
                }
                alarming={eventsAffected > 0}
              />
              {diagnosis.severityAssessment.estimatedRecoveryMinutes !== null && (
                <ContextRow
                  label="Est. recovery"
                  baseline="—"
                  current={`${diagnosis.severityAssessment.estimatedRecoveryMinutes}m`}
                  alarming={false}
                />
              )}
            </div>
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid var(--hf-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--hf-ink-3)",
              }}
            >
              <span>
                Integration ·{" "}
                <Link
                  href="/integrations"
                  className="hf-mono"
                  style={{ color: "var(--hf-ink-2)", textDecoration: "none" }}
                >
                  {integration.name}
                </Link>
              </span>
              <ProviderTag name={integration.provider} />
            </div>
          </Panel>

          {diagnosis.similarIncidents.length > 0 ? (
            <Panel
              title="Similar incidents"
              right={
                <span
                  className="hf-mono"
                  style={{ fontSize: 11, color: "var(--hf-ink-4)" }}
                >
                  {diagnosis.similarIncidents.length}
                </span>
              }
              padded={false}
            >
              <div style={{ maxHeight: 240, overflow: "auto" }}>
                {diagnosis.similarIncidents.map((inc, i, a) => (
                  <Link
                    key={inc.anomalyId}
                    href={`/anomalies/${inc.anomalyId}`}
                    className="hf-incident-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 14,
                      alignItems: "center",
                      padding: "12px 22px",
                      borderTop: i > 0 ? "1px solid var(--hf-line)" : "none",
                      borderBottom:
                        i < a.length - 1
                          ? "1px solid rgba(255,255,255,0.03)"
                          : "none",
                      textDecoration: "none",
                      color: "var(--hf-ink)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="hf-mono"
                        style={{
                          fontSize: 12,
                          color: "var(--hf-ink-2)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inc.type}
                      </div>
                      <div
                        className="hf-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--hf-ink-4)",
                          marginTop: 2,
                        }}
                      >
                        {fmtAgo(inc.detectedAt)} ago
                      </div>
                    </div>
                    <Pill tone={inc.resolvedAt ? "green" : "amber"}>
                      {inc.resolvedAt ? "resolved" : "open"}
                    </Pill>
                    <span style={{ color: "var(--hf-ink-4)", fontSize: 14 }}>›</span>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : (
            <Panel title="Similar incidents">
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  color: "var(--hf-ink-4)",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                No prior matches — this signature is new.
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function ContextRow({
  label,
  baseline,
  current,
  alarming,
}: {
  label: string;
  baseline: string;
  current: string;
  alarming: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        alignItems: "baseline",
        gap: 10,
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--hf-ink-3)" }}>{label}</span>
      <span
        className="hf-mono hf-num"
        style={{ fontSize: 12, color: "var(--hf-ink-4)" }}
      >
        {baseline}
      </span>
      <span style={{ color: "var(--hf-ink-4)" }}>→</span>
      <span
        className="hf-mono hf-num"
        style={{
          fontSize: 13,
          color: alarming ? "#f29a9a" : "var(--hf-ink)",
          fontWeight: 500,
        }}
      >
        {current}
      </span>
    </div>
  );
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
