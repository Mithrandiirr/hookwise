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
} from "@/lib/db";
import { eq, desc, count, and, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  Chip,
  Dot,
  Icon,
  ProviderMark,
  Sparkline,
  DashTopbar,
  SectionHeader,
} from "@/components/hw";
import { DashLiveIngest } from "./live-ingest";

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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    eventsCount,
    failedCount,
    userEndpoints,
    openAnomalies,
    revenueRow,
    reconRuns,
    replayWaiting,
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
      ? db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
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

  const endpointMap = new Map(
    userEndpoints.map((e) => [e.integrationId, e] as const),
  );

  const revenueProtected = (revenueRow[0]?.amount ?? 0) / 100;
  const gapsReconciled = reconRuns[0]?.gaps ?? 0;
  const replayQueued = replayWaiting[0]?.count ?? 0;
  const dupesCount = dupesRow[0]?.count ?? 0;
  const eventsLastHour = eventsCount[0]?.count ?? 0;
  const failedLastHour = failedCount[0]?.count ?? 0;
  const successRate = eventsLastHour > 0
    ? 100 - (failedLastHour / Math.max(eventsLastHour, 1)) * 100
    : 100;

  const top = openAnomalies[0];
  const topDiagnosis = (top?.diagnosis as { summary?: string } | null)?.summary;

  return (
    <>
      <DashTopbar
        title="Overview"
        subtitle="Webhook operations · live"
        right={
          <>
            <div
              className="flex items-center"
              style={{
                gap: 8,
                padding: "6px 10px",
                border: "1px solid var(--hw-line-2)",
                borderRadius: 7,
              }}
            >
              <Dot tone="green" />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
              >
                ingesting · {eventsLastHour.toLocaleString()} / hr
              </span>
            </div>
            <button className="hw-btn hw-btn-ghost" type="button">
              <Icon name="filter" size={13} /> Last 24h
            </button>
            <Link href="/integrations/new" className="hw-btn hw-btn-indigo">
              <Icon name="plug" size={13} /> New integration
            </Link>
          </>
        }
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 24,
          overflow: "auto",
          flex: 1,
        }}
      >
        {/* Hero strip */}
        <section
          className="hw-fade-up grid"
          style={{ gridTemplateColumns: "1.4fr 1fr", gap: 16 }}
        >
          <div
            className="hw-panel relative overflow-hidden"
            style={{
              padding: 28,
              background:
                "linear-gradient(180deg, rgba(129,140,248,0.05), transparent 60%), var(--hw-bg-2)",
            }}
          >
            <div
              className="flex items-start justify-between"
              style={{ gap: 24 }}
            >
              <div>
                <div className="hw-label">Revenue protected · rolling 30d</div>
                <div
                  className="hw-mono hw-num hw-display"
                  style={{ fontSize: 54, color: "var(--hw-ink)", marginTop: 10 }}
                >
                  ${revenueProtected.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div
                  className="flex items-center"
                  style={{ marginTop: 8, gap: 10, fontSize: 12 }}
                >
                  <span className="hw-chip green">{successRate.toFixed(1)}% success</span>
                  <span style={{ color: "var(--hw-ink-3)" }}>
                    <span className="hw-mono">{eventsLastHour.toLocaleString()}</span>{" "}
                    events in the last hour
                  </span>
                </div>
              </div>
              <Sparkline
                data={[0.2, 0.3, 0.25, 0.4, 0.35, 0.5, 0.55, 0.48, 0.7, 0.65, 0.82, 0.9, 0.85, 0.95]}
                width={220}
                height={64}
                gradId="rev-grad-dash"
              />
            </div>
            <div
              className="grid"
              style={{
                marginTop: 24,
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 16,
                paddingTop: 20,
                borderTop: "1px solid var(--hw-line)",
              }}
            >
              <MetricTile
                label="Gaps reconciled"
                value={gapsReconciled.toString()}
                sub="30d"
              />
              <MetricTile
                label="Replay queued"
                value={replayQueued.toString()}
                sub={replayQueued === 0 ? "all caught up" : "pending"}
              />
              <MetricTile
                label="Dedup'd dupes"
                value={dupesCount.toLocaleString()}
                sub="idempotency"
              />
              <MetricTile
                label="Open anomalies"
                value={openAnomalies.length.toString()}
                sub={openAnomalies.length === 0 ? "clean" : "investigating"}
              />
            </div>
          </div>

          <DashLiveIngest initial={eventsLastHour} failed={failedLastHour} />
        </section>

        {/* Active anomaly banner */}
        {top && (
          <section className="hw-fade-up hw-fade-up-1">
            <div
              className="hw-panel flex items-center"
              style={{
                padding: "18px 20px",
                background:
                  "linear-gradient(90deg, rgba(251,191,36,0.06), transparent 60%)",
                borderColor: "rgba(251,191,36,0.25)",
                gap: 16,
              }}
            >
              <div className="flex items-center" style={{ gap: 10 }}>
                <Dot tone="amber" />
                <span
                  className="hw-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--hw-amber)",
                    letterSpacing: "0.1em",
                  }}
                >
                  ACTIVE ANOMALY
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "var(--hw-ink)" }}>
                  {topDiagnosis ?? (
                    <>
                      <span className="hw-mono" style={{ color: "var(--hw-indigo-ink)" }}>
                        {top.type}
                      </span>{" "}
                      detected — severity {top.severity}
                    </>
                  )}
                </div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 4 }}
                >
                  INC-{top.id.slice(0, 8)} · detected{" "}
                  {new Date(top.detectedAt).toLocaleTimeString()}
                </div>
              </div>
              <Link
                href={`/anomalies/${top.id}`}
                className="hw-btn hw-btn-ghost"
              >
                Open investigation <Icon name="arrow-up-right" size={12} />
              </Link>
            </div>
          </section>
        )}

        {/* Main grid: integrations + side rail */}
        <section
          className="hw-fade-up hw-fade-up-2 grid"
          style={{ gridTemplateColumns: "1.6fr 1fr", gap: 16 }}
        >
          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--hw-line)",
              }}
            >
              <SectionHeader title="Integrations" />
              <Link
                href="/integrations"
                className="hw-btn hw-btn-ghost"
                style={{ padding: "6px 10px", fontSize: 12 }}
              >
                View all · {userIntegrations.length}
              </Link>
            </div>
            {userIntegrations.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center"
                style={{ padding: "48px 24px", textAlign: "center", gap: 12 }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "var(--hw-panel)",
                    border: "1px solid var(--hw-line)",
                  }}
                >
                  <Icon name="plug" size={20} color="var(--hw-ink-4)" />
                </div>
                <div style={{ fontSize: 14, color: "var(--hw-ink-2)" }}>
                  No integrations yet
                </div>
                <Link href="/integrations/new" className="hw-btn hw-btn-indigo">
                  Add your first integration
                </Link>
              </div>
            ) : (
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Integration</th>
                    <th>Provider</th>
                    <th>Success</th>
                    <th>p95</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {userIntegrations.slice(0, 6).map((integration) => {
                    const endpoint = endpointMap.get(integration.id);
                    const health = endpoint?.circuitState ?? "closed";
                    const success = endpoint?.successRate ?? 100;
                    const p95 = endpoint?.avgResponseMs ?? 0;
                    return (
                      <tr key={integration.id}>
                        <td>
                          <Link
                            href={`/integrations/${integration.id}`}
                            className="hw-mono"
                            style={{ fontSize: 12.5, color: "var(--hw-ink)" }}
                          >
                            {integration.name}
                          </Link>
                        </td>
                        <td>
                          <div
                            className="flex items-center"
                            style={{ gap: 8 }}
                          >
                            <ProviderMark provider={integration.provider} size={16} />
                            <span
                              style={{
                                color: "var(--hw-ink-2)",
                                textTransform: "capitalize",
                              }}
                            >
                              {integration.provider}
                            </span>
                          </div>
                        </td>
                        <td
                          className="hw-mono hw-num"
                          style={{
                            color: success < 95 ? "var(--hw-amber)" : "var(--hw-ink-2)",
                          }}
                        >
                          {success.toFixed(1)}%
                        </td>
                        <td
                          className="hw-mono hw-num"
                          style={{
                            color:
                              p95 > 400 ? "var(--hw-amber)" : "var(--hw-ink-3)",
                          }}
                        >
                          {Math.round(p95)}ms
                        </td>
                        <td>
                          {health === "closed" && (
                            <Chip tone="green">
                              <Dot tone="green" quiet /> Healthy
                            </Chip>
                          )}
                          {health === "half_open" && (
                            <Chip tone="amber">
                              <Dot tone="amber" quiet /> Degraded
                            </Chip>
                          )}
                          {health === "open" && (
                            <Chip tone="red">
                              <Dot tone="red" quiet /> Down
                            </Chip>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-col" style={{ gap: 16 }}>
            <div
              className="hw-panel"
              style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
            >
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 14 }}
              >
                <SectionHeader title="Provider health" />
                <span
                  className="hw-mono"
                  style={{ fontSize: 10, color: "var(--hw-ink-4)" }}
                >
                  cross-customer
                </span>
              </div>
              {(
                [
                  { p: "stripe", s: 99.97, tone: "green" as const },
                  { p: "shopify", s: 97.84, tone: "amber" as const },
                  { p: "github", s: 99.99, tone: "green" as const },
                ]
              ).map((x, i) => (
                <div
                  key={x.p}
                  className="flex items-center"
                  style={{
                    gap: 12,
                    padding: "10px 0",
                    borderTop: i ? "1px solid var(--hw-line)" : "none",
                  }}
                >
                  <ProviderMark provider={x.p} size={18} />
                  <span
                    style={{ flex: 1, fontSize: 13, textTransform: "capitalize" }}
                  >
                    {x.p}
                  </span>
                  <div
                    style={{
                      width: 80,
                      height: 4,
                      background: "var(--hw-ink-6)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${x.s}%`,
                        height: "100%",
                        background: `var(--hw-${x.tone})`,
                      }}
                    />
                  </div>
                  <span
                    className="hw-mono hw-num"
                    style={{ fontSize: 12, color: `var(--hw-${x.tone})` }}
                  >
                    {x.s.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            <div
              className="hw-panel overflow-hidden"
              style={{ background: "var(--hw-bg-2)" }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <SectionHeader title="Top issues" />
              </div>
              <div>
                {openAnomalies.length === 0 ? (
                  <div
                    style={{
                      padding: "28px 20px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--hw-ink-4)",
                    }}
                  >
                    No open issues. Everything is flowing.
                  </div>
                ) : (
                  openAnomalies.slice(0, 3).map((a, i) => (
                    <Link
                      key={a.id}
                      href={`/anomalies/${a.id}`}
                      className="flex items-center"
                      style={{
                        padding: "12px 20px",
                        borderTop: i ? "1px solid var(--hw-line)" : "none",
                        gap: 10,
                      }}
                    >
                      <Dot
                        tone={
                          a.severity === "critical" || a.severity === "high"
                            ? "red"
                            : a.severity === "medium"
                              ? "amber"
                              : "indigo"
                        }
                        quiet
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, color: "var(--hw-ink)" }}>
                          {a.type}
                        </div>
                        <div
                          className="hw-mono"
                          style={{
                            fontSize: 11,
                            color: "var(--hw-ink-4)",
                            marginTop: 2,
                          }}
                        >
                          sev · {a.severity} · {new Date(a.detectedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <Icon name="chevron-right" size={14} color="var(--hw-ink-5)" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom strip */}
        <section
          className="hw-fade-up hw-fade-up-3 grid"
          style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
        >
          <BottomTile
            kicker="Reconciliation"
            value={gapsReconciled.toString()}
            unit="gaps recovered · 30d"
            sub={gapsReconciled > 0 ? "running auto-poll" : "no gaps recently"}
            icon="refresh"
            tone="green"
          />
          <BottomTile
            kicker="Replay queue"
            value={replayQueued.toString()}
            unit="events waiting"
            sub={replayQueued === 0 ? "all caught up" : "delivering"}
            icon="replay"
            tone={replayQueued === 0 ? "green" : "indigo"}
          />
          <BottomTile
            kicker="AI investigations"
            value={openAnomalies.length.toString()}
            unit="active"
            sub="avg 4m to diagnosis"
            icon="brain"
            tone="indigo"
          />
        </section>
      </div>
    </>
  );
}

function MetricTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono hw-num"
        style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}
      >
        {value}
      </div>
      <div
        className="hw-mono"
        style={{ fontSize: 10, color: "var(--hw-ink-4)", marginTop: 2 }}
      >
        {sub}
      </div>
    </div>
  );
}

function BottomTile({
  kicker,
  value,
  unit,
  sub,
  icon,
  tone,
}: {
  kicker: string;
  value: string;
  unit: string;
  sub: string;
  icon: "refresh" | "replay" | "brain";
  tone: "green" | "indigo" | "amber";
}) {
  return (
    <div
      className="hw-panel"
      style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="hw-label">{kicker}</div>
          <div
            className="hw-mono hw-num"
            style={{ fontSize: 26, fontWeight: 500, marginTop: 6 }}
          >
            {value}
          </div>
          <div
            className="hw-mono"
            style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}
          >
            {unit}
          </div>
        </div>
        <Icon
          name={icon}
          size={16}
          color={tone === "indigo" ? "var(--hw-indigo-ink)" : `var(--hw-${tone})`}
        />
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--hw-ink-2)" }}>
        {sub}
      </div>
    </div>
  );
}
