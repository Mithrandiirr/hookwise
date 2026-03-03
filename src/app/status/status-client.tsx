"use client";

import { useEffect, useState, useCallback } from "react";
import type { StatusData, StatusProviderData } from "./page";

const STATUS_COLORS = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  outage: "bg-red-500",
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
      setAgo("No data");
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

  return <span className="text-[var(--text-tertiary)] text-xs">{ago}</span>;
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

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[data.status]}`} />
          <h3 className="text-base font-semibold">{PROVIDER_LABELS[name] ?? name}</h3>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          data.status === "operational"
            ? "bg-emerald-500/10 text-emerald-400"
            : data.status === "degraded"
            ? "bg-amber-500/10 text-amber-400"
            : "bg-red-500/10 text-red-400"
        }`}>
          {STATUS_LABELS[data.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Latency</p>
          <p className="text-sm font-mono">{formatMs(avgLatency)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Failure Rate</p>
          <p className="text-sm font-mono">{formatPercent(failureRate)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">P50 / P95</p>
          <p className="text-sm font-mono">
            {formatMs(p50)} / {formatMs(p95)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Event Volume (5m)</p>
          <p className="text-sm font-mono">{eventVolume.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
        <TimeAgo date={data.updatedAt} />
      </div>
    </div>
  );
}

export function StatusClient({ initialData }: { initialData: StatusData }) {
  const [data, setData] = useState(initialData);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail — keep showing stale data
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const overallColor =
    data.overallStatus === "operational"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : data.overallStatus === "degraded"
      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
      : "bg-red-500/10 border-red-500/20 text-red-400";

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          HookWise Status
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Real-time webhook provider health across the HookWise network
        </p>
      </div>

      {/* Overall status banner */}
      <div
        className={`rounded-xl border px-6 py-4 mb-8 ${overallColor}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${STATUS_COLORS[data.overallStatus]}`}
          />
          <span className="text-lg font-semibold">
            {data.overallStatus === "operational"
              ? "All Systems Operational"
              : data.overallStatus === "degraded"
              ? "Some Systems Degraded"
              : "System Outage Detected"}
          </span>
        </div>
      </div>

      {/* Provider cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-10">
        {Object.entries(data.providers).map(([name, providerData]) => (
          <ProviderCard key={name} name={name} data={providerData} />
        ))}
      </div>

      {/* Benchmarks table */}
      {data.benchmarks.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">
            Benchmarks by Event Type
          </h2>
          <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    Provider
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    Event Type
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    P50
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    P95
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    Failure Rate
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    Samples
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.benchmarks.map((b, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {PROVIDER_LABELS[b.provider] ?? b.provider}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">
                      {b.eventType}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatMs(b.p50Latency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatMs(b.p95Latency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatPercent(b.failureRate)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[var(--text-secondary)]">
                      {b.sampleSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-[var(--text-tertiary)] pb-8">
        <p>
          Updated every 5 minutes. Last generated:{" "}
          <TimeAgo date={data.generatedAt} />
        </p>
        <p className="mt-1">Powered by HookWise</p>
      </div>
    </>
  );
}
