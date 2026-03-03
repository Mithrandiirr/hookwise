"use client";

import { useState } from "react";
import {
  Search,
  AlertTriangle,
  DollarSign,
  Activity,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface IntegrationOption {
  id: string;
  name: string;
  provider: string;
}

interface EventTypeBreakdown {
  eventType: string;
  totalCount: number;
  gapCount: number;
  dollarImpactCents: number;
}

interface ScanEventSummary {
  providerEventId: string;
  eventType: string;
  createdAt: string;
  amountCents: number;
  isGap: boolean;
}

interface ScanReport {
  provider: string;
  scannedAt: string;
  periodDays: number;
  totalProviderEvents: number;
  totalHookwiseEvents: number;
  gapsFound: number;
  dollarAtRiskCents: number;
  healthScore: number;
  breakdown: EventTypeBreakdown[];
  topGaps: ScanEventSummary[];
  truncated: boolean;
  integrationId?: string;
}

type SortKey = "eventType" | "totalCount" | "gapCount" | "dollarImpactCents";

export function ScannerClient({
  integrations,
}: {
  integrations: IntegrationOption[];
}) {
  const [provider, setProvider] = useState<"stripe" | "shopify">("stripe");
  const [apiKey, setApiKey] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("dollarImpactCents");
  const [sortAsc, setSortAsc] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const filteredIntegrations = integrations.filter(
    (i) => i.provider === provider
  );

  async function handleScan() {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          shopDomain: provider === "shopify" ? shopDomain : undefined,
          integrationId: integrationId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Scan failed" }));
        setError(data.error ?? "Scan failed");
        return;
      }

      const data: ScanReport = await res.json();
      setReport(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sortedBreakdown = report
    ? [...report.breakdown].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortAsc
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sortAsc
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Scan Form */}
      <div className="glass rounded-xl p-6 fade-up fade-up-1">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
            Configure Scan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Provider */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Provider
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setProvider("stripe")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  provider === "stripe"
                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                    : "bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                Stripe
              </button>
              <button
                onClick={() => setProvider("shopify")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  provider === "shopify"
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "bg-[var(--bg-surface)] text-[var(--text-tertiary)] border border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                Shopify
              </button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              {provider === "stripe" ? "Stripe Secret Key" : "Shopify Access Token"}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === "stripe" ? "sk_test_..." : "shpat_..."
              }
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[13px] font-mono placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Shop Domain (Shopify only) */}
          {provider === "shopify" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                Shop Domain
              </label>
              <input
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[13px] font-mono placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          )}

          {/* Compare against integration */}
          {filteredIntegrations.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                Compare Against (optional)
              </label>
              <select
                value={integrationId}
                onChange={(e) => setIntegrationId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[13px] focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                <option value="">No comparison — show all events</option>
                {filteredIntegrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scan Button */}
        <div className="mt-6">
          <button
            onClick={handleScan}
            disabled={loading || !apiKey}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-500 text-white text-[13px] font-semibold hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Run Scan
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="glass rounded-xl p-16 text-center fade-up">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-[15px] font-medium">
            Scanning your {provider} account...
          </p>
          <p className="text-[var(--text-faint)] text-[13px] mt-1">
            This may take a moment for large accounts
          </p>
        </div>
      )}

      {/* Results */}
      {report && !loading && (
        <div className="space-y-6 fade-up">
          {report.truncated && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[13px] text-amber-400">
                Your account has more than 10,000 events. Results show the first
                10,000 events only.
              </p>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 fade-up fade-up-1">
            <StatCard
              icon={<Activity className="h-4 w-4 text-indigo-400" />}
              label="Total Events"
              value={report.totalProviderEvents.toLocaleString()}
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
              label="Gaps Found"
              value={report.gapsFound.toLocaleString()}
              accent={report.gapsFound > 0 ? "red" : undefined}
            />
            <StatCard
              icon={<DollarSign className="h-4 w-4 text-amber-400" />}
              label="$ At Risk"
              value={formatDollars(report.dollarAtRiskCents)}
              accent={report.dollarAtRiskCents > 0 ? "amber" : undefined}
            />
            <StatCard
              icon={<Shield className="h-4 w-4 text-emerald-400" />}
              label="Health Score"
              value={`${report.healthScore}%`}
              accent={
                report.healthScore >= 95
                  ? "emerald"
                  : report.healthScore >= 80
                    ? "amber"
                    : "red"
              }
            />
          </div>

          {/* Event Type Breakdown */}
          <div className="fade-up fade-up-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 rounded-full bg-indigo-500" />
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
                Event Type Breakdown
              </h2>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <SortHeader
                      label="Event Type"
                      sortKey="eventType"
                      currentSort={sortKey}
                      asc={sortAsc}
                      onClick={handleSort}
                    />
                    <SortHeader
                      label="Total"
                      sortKey="totalCount"
                      currentSort={sortKey}
                      asc={sortAsc}
                      onClick={handleSort}
                    />
                    <SortHeader
                      label="Gaps"
                      sortKey="gapCount"
                      currentSort={sortKey}
                      asc={sortAsc}
                      onClick={handleSort}
                    />
                    <SortHeader
                      label="$ Impact"
                      sortKey="dollarImpactCents"
                      currentSort={sortKey}
                      asc={sortAsc}
                      onClick={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedBreakdown.map((row) => (
                    <tr
                      key={row.eventType}
                      className="border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <td className="px-5 py-3.5 font-mono text-[12px] text-indigo-400">
                        {row.eventType}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)] tabular-nums">
                        {row.totalCount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <span
                          className={
                            row.gapCount > 0
                              ? "text-red-400"
                              : "text-[var(--text-tertiary)]"
                          }
                        >
                          {row.gapCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <span
                          className={
                            row.dollarImpactCents > 0
                              ? "text-amber-400 font-medium"
                              : "text-[var(--text-tertiary)]"
                          }
                        >
                          {formatDollars(row.dollarImpactCents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedBreakdown.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-[var(--text-tertiary)]"
                      >
                        No events found in the last 30 days
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Gaps */}
          {report.topGaps.length > 0 && (
            <div className="fade-up fade-up-3">
              <button
                onClick={() => setShowGaps(!showGaps)}
                className="flex items-center gap-2 mb-5 group"
              >
                <div className="w-1 h-4 rounded-full bg-red-500" />
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
                  Top Missed Events
                </h2>
                <span className="text-[11px] text-[var(--text-faint)] ml-1">
                  ({report.topGaps.length})
                </span>
                {showGaps ? (
                  <ChevronUp className="h-4 w-4 text-[var(--text-faint)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--text-faint)]" />
                )}
              </button>

              {showGaps && (
                <div className="space-y-2">
                  {report.topGaps.map((gap) => (
                    <div
                      key={gap.providerEventId}
                      className="glass rounded-xl p-4 flex items-center gap-4"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-400 glow-red shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-mono text-indigo-400">
                          {gap.eventType}
                        </span>
                        <span className="text-[11px] text-[var(--text-faint)] ml-3">
                          {gap.providerEventId}
                        </span>
                      </div>
                      {gap.amountCents > 0 && (
                        <span className="text-[12px] text-amber-400 font-medium tabular-nums shrink-0">
                          {formatDollars(gap.amountCents)}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--text-ghost)] tabular-nums shrink-0">
                        {new Date(gap.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "red" | "amber" | "emerald";
}) {
  const valueColor =
    accent === "red"
      ? "text-red-400"
      : accent === "amber"
        ? "text-amber-400"
        : accent === "emerald"
          ? "text-emerald-400"
          : "text-[var(--text-primary)]";

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </span>
      </div>
      <p className={`text-3xl font-bold tabular-nums stat-value ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentSort,
  asc,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  asc: boolean;
  onClick: (key: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-tertiary)] transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (asc ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </span>
    </th>
  );
}

function formatDollars(cents: number): string {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
