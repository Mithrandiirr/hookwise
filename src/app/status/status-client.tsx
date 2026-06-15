"use client";

import { useEffect, useState, useCallback } from "react";
import { Chip, Dot, ProviderMark } from "@/components/hw";
import type { StatusData, StatusProviderData, IncidentEntry } from "./page";

const STATUS_TONE = {
  operational: "green",
  degraded: "amber",
  outage: "red",
} as const;

const STATUS_LABELS = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
} as const;

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  shopify: "Shopify",
  github: "GitHub",
};

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatPercent(val: number): string {
  return `${val.toFixed(2)}%`;
}

function TimeAgo({ date }: { date: string | null }) {
  const [ago, setAgo] = useState("");
  useEffect(() => {
    if (!date) {
      setAgo("no data");
      return;
    }
    function update() {
      const diff = Math.floor((Date.now() - new Date(date!).getTime()) / 1000);
      if (diff < 60) setAgo(`${diff}s ago`);
      else if (diff < 3600) setAgo(`${Math.floor(diff / 60)}m ago`);
      else setAgo(`${Math.floor(diff / 3600)}h ago`);
    }
    update();
    const interval = setInterval(update, 10_000);
    return () => clearInterval(interval);
  }, [date]);
  return (
    <span
      className="hw-mono"
      style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
    >
      {ago}
    </span>
  );
}

function ProviderCard({
  name,
  data,
}: {
  name: string;
  data: StatusProviderData;
}) {
  const avgLatency = data.metrics["avg_latency"]?.value ?? 0;
  const failureRate = data.metrics["failure_rate"]?.value ?? 0;
  const eventVolume = data.metrics["event_volume"]?.value ?? 0;
  const p50 = data.metrics["p50_latency"]?.value ?? 0;
  const p95 = data.metrics["p95_latency"]?.value ?? 0;
  const tone = STATUS_TONE[data.status];

  return (
    <div
      className="hw-panel"
      style={{ padding: 22, background: "var(--hw-bg-2)" }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 18 }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <ProviderMark provider={name} size={20} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--hw-ink)" }}>
            {PROVIDER_LABELS[name] ?? name}
          </span>
        </div>
        <Chip tone={tone}>
          <Dot tone={tone} quiet />
          {STATUS_LABELS[data.status]}
        </Chip>
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        <Metric label="Avg latency" value={formatMs(avgLatency)} />
        <Metric label="Failure rate" value={formatPercent(failureRate)} />
        <Metric
          label="p50 / p95"
          value={`${formatMs(p50)} / ${formatMs(p95)}`}
        />
        <Metric label="Volume · 5m" value={eventVolume.toLocaleString()} />
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--hw-line)",
        }}
      >
        <TimeAgo date={data.updatedAt} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono hw-num"
        style={{ marginTop: 4, fontSize: 13, color: "var(--hw-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function StatusClient({ initialData }: { initialData: StatusData }) {
  const [data, setData] = useState(initialData);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) setData(await res.json());
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const overallTone = STATUS_TONE[data.overallStatus];

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      {/* Header */}
      <div className="hw-fade-up">
        <div className="hw-kicker">PUBLIC STATUS</div>
        <h1
          className="hw-display"
          style={{ marginTop: 12, fontSize: 32, color: "var(--hw-ink)" }}
        >
          Trueline network status
        </h1>
        <p
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "var(--hw-ink-3)",
          }}
        >
          Real-time webhook provider health across the Trueline network.
        </p>
      </div>

      {/* Overall banner */}
      <div
        className="hw-fade-up hw-fade-up-1 hw-panel flex items-center"
        style={{
          padding: "18px 22px",
          gap: 14,
          borderColor:
            overallTone === "green"
              ? "#c4ebd2"
              : overallTone === "amber"
                ? "#f4c9ad"
                : "#f4c4c4",
          background:
            overallTone === "green"
              ? "#e8f7ee"
              : overallTone === "amber"
                ? "#fdeada"
                : "#fdeaea",
        }}
      >
        <Dot tone={overallTone} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: `var(--hw-${overallTone})`,
          }}
        >
          {data.overallStatus === "operational"
            ? "All systems operational"
            : data.overallStatus === "degraded"
              ? "Some systems degraded"
              : "System outage detected"}
        </span>
      </div>

      {/* Provider cards */}
      <div
        className="hw-fade-up hw-fade-up-2 grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
      >
        {Object.entries(data.providers).map(([name, providerData]) => (
          <ProviderCard key={name} name={name} data={providerData} />
        ))}
      </div>

      {/* Benchmarks */}
      {data.benchmarks.length > 0 && (
        <div className="hw-fade-up hw-fade-up-3">
          <div className="hw-label" style={{ marginBottom: 10 }}>
            BENCHMARKS BY EVENT TYPE
          </div>
          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            <table className="hw-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Event type</th>
                  <th style={{ textAlign: "right" }}>p50</th>
                  <th style={{ textAlign: "right" }}>p95</th>
                  <th style={{ textAlign: "right" }}>Failure</th>
                  <th style={{ textAlign: "right" }}>Samples</th>
                </tr>
              </thead>
              <tbody>
                {data.benchmarks.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <div
                        className="flex items-center"
                        style={{ gap: 8 }}
                      >
                        <ProviderMark provider={b.provider} size={14} />
                        <span style={{ fontSize: 12.5, color: "var(--hw-ink)" }}>
                          {PROVIDER_LABELS[b.provider] ?? b.provider}
                        </span>
                      </div>
                    </td>
                    <td
                      className="hw-mono"
                      style={{ fontSize: 11.5, color: "var(--hw-indigo-ink)" }}
                    >
                      {b.eventType}
                    </td>
                    <td
                      className="hw-mono hw-num"
                      style={{ textAlign: "right", color: "var(--hw-ink-3)" }}
                    >
                      {formatMs(b.p50Latency)}
                    </td>
                    <td
                      className="hw-mono hw-num"
                      style={{ textAlign: "right", color: "var(--hw-ink-3)" }}
                    >
                      {formatMs(b.p95Latency)}
                    </td>
                    <td
                      className="hw-mono hw-num"
                      style={{
                        textAlign: "right",
                        color:
                          b.failureRate > 1
                            ? "var(--hw-amber)"
                            : "var(--hw-ink-3)",
                      }}
                    >
                      {formatPercent(b.failureRate)}
                    </td>
                    <td
                      className="hw-mono hw-num"
                      style={{ textAlign: "right", color: "var(--hw-ink-4)" }}
                    >
                      {b.sampleSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Network stats */}
      {data.networkStats && (
        <div className="hw-fade-up hw-fade-up-4">
          <div className="hw-label" style={{ marginBottom: 10 }}>
            NETWORK HEALTH
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
          >
            <StatPanel
              label="Providers monitored"
              value={data.networkStats.totalProviders.toString()}
            />
            <StatPanel
              label="Uptime · 24h avg"
              value={`${data.networkStats.uptimePercent}%`}
              tone={
                data.networkStats.uptimePercent >= 99
                  ? "green"
                  : data.networkStats.uptimePercent >= 95
                    ? "amber"
                    : "red"
              }
            />
            <StatPanel
              label="Health samples"
              value={data.networkStats.totalEventsProcessed.toLocaleString()}
            />
          </div>
        </div>
      )}

      {/* Incidents */}
      <div className="hw-fade-up hw-fade-up-5">
        <div className="hw-label" style={{ marginBottom: 10 }}>
          RECENT INCIDENTS · 24H
        </div>
        {data.incidents && data.incidents.length > 0 ? (
          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            {data.incidents
              .slice(0, 20)
              .map((incident: IncidentEntry, i: number) => {
                const tone = STATUS_TONE[incident.status];
                return (
                  <div
                    key={i}
                    className="flex items-center"
                    style={{
                      padding: "12px 20px",
                      borderTop: i ? "1px solid var(--hw-line)" : "none",
                      gap: 14,
                    }}
                  >
                    <Dot tone={tone} quiet />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        width: 80,
                        color: "var(--hw-ink)",
                      }}
                    >
                      {PROVIDER_LABELS[incident.provider] ?? incident.provider}
                    </span>
                    <Chip tone={tone}>{STATUS_LABELS[incident.status]}</Chip>
                    <span
                      className="hw-mono hw-num"
                      style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                    >
                      {formatPercent(incident.failureRate)} failure rate
                    </span>
                    <span style={{ marginLeft: "auto" }}>
                      <TimeAgo date={incident.time} />
                    </span>
                  </div>
                );
              })}
          </div>
        ) : (
          <div
            className="hw-panel flex items-center"
            style={{
              padding: "16px 22px",
              background: "#e8f7ee",
              borderColor: "#c4ebd2",
              gap: 12,
            }}
          >
            <Dot tone="green" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--hw-green)",
              }}
            >
              No incidents in the last 24 hours.
            </span>
          </div>
        )}
      </div>

      <div
        className="hw-mono"
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "var(--hw-ink-5)",
          paddingTop: 16,
          borderTop: "1px solid var(--hw-line)",
        }}
      >
        Updated every 5 min · last <TimeAgo date={data.generatedAt} />
      </div>
    </div>
  );
}

function StatPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "var(--hw-green)"
      : tone === "amber"
        ? "var(--hw-amber)"
        : tone === "red"
          ? "var(--hw-red)"
          : "var(--hw-ink)";
  return (
    <div
      className="hw-panel"
      style={{ padding: "20px 22px", background: "var(--hw-bg-2)" }}
    >
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono hw-num"
        style={{ marginTop: 6, fontSize: 26, fontWeight: 500, color }}
      >
        {value}
      </div>
    </div>
  );
}
