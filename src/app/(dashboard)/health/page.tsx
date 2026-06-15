export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, providerHealth, endpoints } from "@/lib/db";
import { eq, desc, inArray, gte, and } from "drizzle-orm";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Panel,
  Pill,
  ProviderTag,
} from "@/components/hw";

type Metrics = {
  p95?: number;
  p50?: number;
  failureRate?: number;
  eventVolume?: number;
  measuredAt?: Date;
};

type HealthStatus = "healthy" | "degraded" | "down" | "no-data";

function statusFromMetrics(m: Metrics): HealthStatus {
  if (m.p95 == null && m.failureRate == null) return "no-data";
  const p95 = m.p95 ?? 0;
  const fr = m.failureRate ?? 0;
  if (fr >= 0.05 || p95 >= 3000) return "down";
  if (fr >= 0.01 || p95 >= 1000) return "degraded";
  return "healthy";
}

export default async function HealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      destinationUrl: integrations.destinationUrl,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const connectedProviders = Array.from(
    new Set(userIntegrations.map((i) => i.provider)),
  );

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const healthRows =
    connectedProviders.length > 0
      ? await db
          .select()
          .from(providerHealth)
          .where(
            and(
              inArray(
                providerHealth.provider,
                connectedProviders as ("stripe" | "shopify" | "github")[],
              ),
              gte(providerHealth.measuredAt, oneDayAgo),
            ),
          )
          .orderBy(desc(providerHealth.measuredAt))
      : [];

  const endpointRows =
    integrationIds.length > 0
      ? await db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : [];

  // Reduce health rows to latest per provider per metric.
  const metricsByProvider = new Map<string, Metrics>();
  for (const row of healthRows) {
    const m = metricsByProvider.get(row.provider) ?? {};
    if (!(row.metricName in m)) {
      switch (row.metricName) {
        case "p95_latency":
          m.p95 ??= row.value;
          break;
        case "p50_latency":
          m.p50 ??= row.value;
          break;
        case "failure_rate":
          m.failureRate ??= row.value;
          break;
        case "event_volume":
          m.eventVolume ??= row.value;
          break;
      }
    }
    if (!m.measuredAt || row.measuredAt > m.measuredAt) {
      m.measuredAt = row.measuredAt;
    }
    metricsByProvider.set(row.provider, m);
  }

  const providerCards = connectedProviders.map((p) => ({
    name: p,
    metrics: metricsByProvider.get(p) ?? {},
    integrationCount: userIntegrations.filter((i) => i.provider === p).length,
    status: statusFromMetrics(metricsByProvider.get(p) ?? {}),
  }));

  // Endpoint rows mapped to integration + provider.
  const endpointDetail = endpointRows.map((ep) => {
    const integ = userIntegrations.find((i) => i.id === ep.integrationId);
    return {
      url: integ?.destinationUrl ?? ep.url,
      provider: integ?.provider ?? "unknown",
      p50: 0,
      p95: ep.avgResponseMs ?? 0,
      successRate: ep.successRate ?? 100,
      circuitState: ep.circuitState as "open" | "closed" | "half_open",
    };
  });

  const totals = {
    healthy: providerCards.filter((p) => p.status === "healthy").length,
    degraded: providerCards.filter((p) => p.status === "degraded").length,
    down: providerCards.filter((p) => p.status === "down").length,
    noData: providerCards.filter((p) => p.status === "no-data").length,
  };
  const allHealthy =
    providerCards.length > 0 &&
    providerCards.every((p) => p.status === "healthy");
  const openCircuits = endpointDetail.filter(
    (e) => e.circuitState === "open" || e.circuitState === "half_open",
  ).length;

  // Aggregate p95 + failure for the stat row
  const aggP95 = Math.max(
    0,
    ...providerCards.map((p) => p.metrics.p95 ?? 0),
  );
  const aggFailure =
    providerCards.reduce((s, p) => s + (p.metrics.failureRate ?? 0), 0) /
    Math.max(1, providerCards.length);

  return (
    <>
      <DashTopbar
        title="System health"
        subtitle="Provider status, latency, and circuit breaker state"
        right={
          <Pill
            tone={allHealthy ? "green" : totals.degraded + totals.down > 0 ? "amber" : "ink"}
          >
            {providerCards.length} provider{providerCards.length === 1 ? "" : "s"}
          </Pill>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="System health"
          title={
            providerCards.length === 0 ? (
              <>No providers <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>connected</span> yet.</>
            ) : allHealthy ? (
              <>
                All providers{" "}
                <span className="hf-serif" style={{ color: "#16a34a" }}>
                  healthy
                </span>
                .
              </>
            ) : (
              <>
                <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                  {totals.degraded + totals.down}{" "}
                  {totals.degraded + totals.down === 1 ? "provider" : "providers"}
                </span>{" "}
                need attention.
              </>
            )
          }
          sub="Live p50, p95 and failure rate for every connected provider and endpoint. Anything outside healthy thresholds triggers an investigation automatically."
          actions={
            <>
              <button type="button" className="hf-btn outline small">Last 24h ⌄</button>
              <button type="button" className="hf-btn pill small">Configure SLOs</button>
            </>
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile
            label="HEALTHY"
            value={totals.healthy}
            sub={`${providerCards.length} total`}
            color="#16a34a"
            accent="#16a34a"
          />
          <StatTile
            label="P95 LATENCY"
            value={aggP95 > 0 ? `${Math.round(aggP95)}ms` : "—"}
            sub="aggregate · ack to provider"
          />
          <StatTile
            label="FAILURE RATE"
            value={
              aggFailure > 0
                ? `${(aggFailure * 100).toFixed(2)}%`
                : "0.00%"
            }
            sub="auto-retried · 0 lost"
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
          <StatTile
            label="OPEN CIRCUITS"
            value={openCircuits}
            sub={openCircuits === 0 ? "all closed" : "half-open or open"}
            color={openCircuits === 0 ? "#16a34a" : "#d97706"}
            accent={openCircuits === 0 ? "#16a34a" : "#d97706"}
          />
        </div>

        {/* Provider grid */}
        {providerCards.length === 0 ? (
          <Panel>
            <div
              style={{
                padding: "40px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--hf-ink-4)",
              }}
            >
              Connect an integration to see health data here.
            </div>
          </Panel>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
              marginBottom: 22,
            }}
          >
            {providerCards.map((p) => (
              <ProviderHealthCard key={p.name} card={p} />
            ))}
          </div>
        )}

        {/* Endpoint health table */}
        {endpointDetail.length > 0 && (
          <Panel
            title="Endpoint health"
            right={
              <span style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>
                {endpointDetail.length} endpoint
                {endpointDetail.length === 1 ? "" : "s"}
              </span>
            }
            padded={false}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 90px 90px 110px",
                gap: 14,
                padding: "12px 24px",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10.5,
                color: "var(--hf-ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderBottom: "1px solid var(--hf-line)",
              }}
            >
              <span>Endpoint</span>
              <span>Provider</span>
              <span style={{ textAlign: "right" }}>p95</span>
              <span style={{ textAlign: "right" }}>Success</span>
              <span style={{ textAlign: "right" }}>Circuit</span>
            </div>
            {endpointDetail.map((e, i, a) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 90px 90px 110px",
                  gap: 14,
                  padding: "14px 24px",
                  borderBottom:
                    i < a.length - 1
                      ? "1px solid #f1f2f5"
                      : "none",
                  alignItems: "center",
                }}
              >
                <span
                  className="hf-mono"
                  style={{
                    fontSize: 12,
                    color: "var(--hf-ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.url}
                </span>
                <ProviderTag name={e.provider} />
                <span
                  className="hf-mono"
                  style={{
                    fontSize: 12,
                    color: e.p95 > 1000 ? "#d97706" : "var(--hf-ink-2)",
                    textAlign: "right",
                  }}
                >
                  {e.p95 > 0 ? `${Math.round(e.p95)}ms` : "—"}
                </span>
                <span
                  className="hf-mono"
                  style={{
                    fontSize: 12,
                    color: e.successRate < 99 ? "#d97706" : "#16a34a",
                    textAlign: "right",
                  }}
                >
                  {e.successRate.toFixed(2)}%
                </span>
                <span style={{ justifySelf: "end" }}>
                  <Pill
                    tone={
                      e.circuitState === "closed"
                        ? "green"
                        : e.circuitState === "half_open"
                          ? "amber"
                          : "red"
                    }
                  >
                    {e.circuitState.replace("_", "-")}
                  </Pill>
                </span>
              </div>
            ))}
          </Panel>
        )}

        <p
          className="hf-mono"
          style={{
            fontSize: 10.5,
            color: "var(--hf-ink-4)",
            letterSpacing: "0.04em",
            lineHeight: 1.55,
            marginTop: 18,
          }}
        >
          Status thresholds: healthy ≤1% failure & ≤1s p95 · degraded ≤5% & ≤3s · down beyond either.
          Aggregator samples every 5 minutes; values shown are most recent within 24h.
        </p>
      </div>
    </>
  );
}

function ProviderHealthCard({
  card,
}: {
  card: {
    name: string;
    metrics: Metrics;
    integrationCount: number;
    status: HealthStatus;
  };
}) {
  const { name, metrics, integrationCount, status } = card;
  const tone =
    status === "healthy"
      ? "green"
      : status === "degraded"
        ? "amber"
        : status === "down"
          ? "red"
          : "ink";

  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              color: "var(--hf-ink)",
              fontWeight: 500,
              letterSpacing: "-0.005em",
              textTransform: "capitalize",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--hf-ink-3)",
              marginTop: 3,
            }}
          >
            {integrationCount} integration{integrationCount === 1 ? "" : "s"} ·{" "}
            {metrics.eventVolume != null
              ? `${metrics.eventVolume.toLocaleString()} events · 24h`
              : "no samples yet"}
          </div>
        </div>
        <Pill tone={tone as "green" | "amber" | "red" | "ink"}>
          {status === "no-data" ? "no data" : status}
        </Pill>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <MiniMetric
          label="p50"
          value={metrics.p50 != null ? metrics.p50 : null}
          unit="ms"
        />
        <MiniMetric
          label="p95"
          value={metrics.p95 != null ? metrics.p95 : null}
          unit="ms"
          warn={(metrics.p95 ?? 0) >= 1000}
        />
        <MiniMetric
          label="fail"
          value={metrics.failureRate != null ? metrics.failureRate * 100 : null}
          unit="%"
          warn={(metrics.failureRate ?? 0) >= 0.01}
        />
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: number | null;
  unit: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div
        className="hf-mono"
        style={{
          fontSize: 9.5,
          color: "var(--hf-ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num hf-mono"
        style={{
          fontSize: 16,
          color: value == null ? "var(--hf-ink-4)" : warn ? "#d97706" : "var(--hf-ink)",
          fontWeight: 500,
        }}
      >
        {value == null
          ? "—"
          : unit === "%"
            ? value.toFixed(2)
            : Math.round(value)}
        {value != null && (
          <span style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{unit}</span>
        )}
      </div>
    </div>
  );
}
