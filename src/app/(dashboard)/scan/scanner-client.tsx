"use client";

import { useState } from "react";
import {
  Chip,
  Dot,
  Icon,
  ProviderMark,
  SectionHeader,
} from "@/components/hw";

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
    (i) => i.provider === provider,
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
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sortedBreakdown = report
    ? [...report.breakdown].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortAsc
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      })
    : [];

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Configure */}
      <div
        className="hw-fade-up hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <SectionHeader title="Configure scan" />
        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginTop: 14,
          }}
        >
          <Field label="Provider">
            <div className="flex" style={{ gap: 8 }}>
              {(["stripe", "shopify"] as const).map((p) => {
                const on = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className="flex items-center"
                    style={{
                      flex: 1,
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: on
                        ? "1px solid rgba(129,140,248,0.4)"
                        : "1px solid var(--hw-line-2)",
                      background: on
                        ? "rgba(129,140,248,0.1)"
                        : "var(--hw-bg-3)",
                      color: on ? "var(--hw-indigo-ink)" : "var(--hw-ink-2)",
                      fontSize: 13,
                      fontWeight: 500,
                      textTransform: "capitalize",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    <ProviderMark provider={p} size={16} />
                    {p}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field
            label={
              provider === "stripe"
                ? "Stripe secret key"
                : "Shopify access token"
            }
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === "stripe" ? "sk_test_..." : "shpat_..."
              }
              className="hw-input hw-mono"
            />
          </Field>
          {provider === "shopify" && (
            <Field label="Shop domain">
              <input
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="hw-input hw-mono"
              />
            </Field>
          )}
          {filteredIntegrations.length > 0 && (
            <Field label="Compare against (optional)">
              <select
                value={integrationId}
                onChange={(e) => setIntegrationId(e.target.value)}
                className="hw-input"
              >
                <option value="">No comparison — show all events</option>
                {filteredIntegrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div
          className="flex items-center"
          style={{ marginTop: 18, gap: 14 }}
        >
          <button
            type="button"
            onClick={handleScan}
            disabled={loading || !apiKey}
            className="hw-btn hw-btn-primary"
            style={{
              opacity: loading || !apiKey ? 0.5 : 1,
              cursor: loading || !apiKey ? "not-allowed" : "pointer",
            }}
          >
            <Icon name="search" size={13} />
            {loading ? "Scanning…" : "Run scan"}
          </button>
          {error && (
            <span
              className="hw-mono"
              style={{ fontSize: 12, color: "var(--hw-red)" }}
            >
              {error}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div
          className="hw-panel hw-fade-up"
          style={{
            padding: 48,
            background: "var(--hw-bg-2)",
            textAlign: "center",
          }}
        >
          <Dot tone="indigo" />
          <div
            className="hw-mono"
            style={{ marginTop: 10, color: "var(--hw-ink-2)" }}
          >
            Scanning your {provider} account…
          </div>
          <div
            className="hw-mono"
            style={{ marginTop: 4, fontSize: 11, color: "var(--hw-ink-4)" }}
          >
            this may take a moment for large accounts
          </div>
        </div>
      )}

      {report && !loading && (
        <div
          className="hw-fade-up flex flex-col"
          style={{ gap: 20 }}
        >
          {report.truncated && (
            <div
              className="hw-mono hw-panel"
              style={{
                padding: "10px 14px",
                fontSize: 12,
                color: "var(--hw-amber)",
                background: "rgba(251,191,36,0.06)",
                borderColor: "rgba(251,191,36,0.22)",
              }}
            >
              Account has more than 10,000 events. Showing the first 10,000.
            </div>
          )}

          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
          >
            <Stat
              label="Total events"
              value={report.totalProviderEvents.toLocaleString()}
              icon="activity"
            />
            <Stat
              label="Gaps found"
              value={report.gapsFound.toLocaleString()}
              icon="alert"
              tone={report.gapsFound > 0 ? "red" : undefined}
            />
            <Stat
              label="At risk"
              value={formatDollars(report.dollarAtRiskCents)}
              icon="dollar"
              tone={report.dollarAtRiskCents > 0 ? "amber" : undefined}
            />
            <Stat
              label="Health"
              value={`${report.healthScore}%`}
              icon="shield"
              tone={
                report.healthScore >= 95
                  ? "green"
                  : report.healthScore >= 80
                    ? "amber"
                    : "red"
              }
            />
          </div>

          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hw-line)",
              }}
            >
              <SectionHeader title="Event type breakdown" />
            </div>
            <table className="hw-table">
              <thead>
                <tr>
                  <SortTh
                    label="Event type"
                    sortKey="eventType"
                    currentSort={sortKey}
                    asc={sortAsc}
                    onClick={handleSort}
                  />
                  <SortTh
                    label="Total"
                    sortKey="totalCount"
                    currentSort={sortKey}
                    asc={sortAsc}
                    onClick={handleSort}
                  />
                  <SortTh
                    label="Gaps"
                    sortKey="gapCount"
                    currentSort={sortKey}
                    asc={sortAsc}
                    onClick={handleSort}
                  />
                  <SortTh
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
                  <tr key={row.eventType}>
                    <td
                      className="hw-mono"
                      style={{ fontSize: 12, color: "var(--hw-indigo-ink)" }}
                    >
                      {row.eventType}
                    </td>
                    <td
                      className="hw-mono hw-num"
                      style={{ color: "var(--hw-ink-2)" }}
                    >
                      {row.totalCount.toLocaleString()}
                    </td>
                    <td className="hw-mono hw-num">
                      <span
                        style={{
                          color:
                            row.gapCount > 0
                              ? "var(--hw-red)"
                              : "var(--hw-ink-3)",
                        }}
                      >
                        {row.gapCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="hw-mono hw-num">
                      <span
                        style={{
                          color:
                            row.dollarImpactCents > 0
                              ? "var(--hw-amber)"
                              : "var(--hw-ink-3)",
                          fontWeight: row.dollarImpactCents > 0 ? 500 : 400,
                        }}
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
                      style={{
                        textAlign: "center",
                        color: "var(--hw-ink-4)",
                        padding: "32px 16px",
                      }}
                    >
                      No events found in the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {report.topGaps.length > 0 && (
            <div
              className="hw-panel overflow-hidden"
              style={{ background: "var(--hw-bg-2)" }}
            >
              <button
                type="button"
                onClick={() => setShowGaps(!showGaps)}
                className="flex items-center w-full"
                style={{
                  padding: "14px 20px",
                  borderBottom: showGaps
                    ? "1px solid var(--hw-line)"
                    : "none",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <Dot tone="red" />
                <span className="hw-label">
                  TOP MISSED EVENTS · {report.topGaps.length}
                </span>
                <Icon
                  name={showGaps ? "chevron-down" : "chevron-right"}
                  size={13}
                  color="var(--hw-ink-4)"
                  style={{ marginLeft: "auto" }}
                />
              </button>
              {showGaps && (
                <div>
                  {report.topGaps.map((gap, i) => (
                    <div
                      key={gap.providerEventId}
                      className="flex items-center"
                      style={{
                        padding: "12px 20px",
                        gap: 12,
                        borderTop: i ? "1px solid var(--hw-line)" : "none",
                      }}
                    >
                      <Dot tone="red" quiet />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          className="hw-mono"
                          style={{
                            fontSize: 12,
                            color: "var(--hw-indigo-ink)",
                          }}
                        >
                          {gap.eventType}
                        </span>
                        <span
                          className="hw-mono"
                          style={{
                            marginLeft: 10,
                            fontSize: 11,
                            color: "var(--hw-ink-4)",
                          }}
                        >
                          {gap.providerEventId}
                        </span>
                      </div>
                      {gap.amountCents > 0 && (
                        <Chip tone="amber">
                          {formatDollars(gap.amountCents)}
                        </Chip>
                      )}
                      <span
                        className="hw-mono hw-num"
                        style={{
                          fontSize: 11,
                          color: "var(--hw-ink-4)",
                        }}
                      >
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
      <style jsx>{`
        :global(.hw-input) {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--hw-bg-3);
          border: 1px solid var(--hw-line-2);
          color: var(--hw-ink);
          font-size: 13px;
          transition: all 150ms;
        }
        :global(.hw-input:focus) {
          outline: none;
          border-color: rgba(129, 140, 248, 0.4);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
        }
        :global(.hw-input::placeholder) {
          color: var(--hw-ink-5);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: "activity" | "alert" | "dollar" | "shield";
  tone?: "red" | "amber" | "green";
}) {
  const color =
    tone === "red"
      ? "var(--hw-red)"
      : tone === "amber"
        ? "var(--hw-amber)"
        : tone === "green"
          ? "var(--hw-green)"
          : "var(--hw-ink)";
  const iconColor =
    tone === "red"
      ? "var(--hw-red)"
      : tone === "amber"
        ? "var(--hw-amber)"
        : tone === "green"
          ? "var(--hw-green)"
          : "var(--hw-indigo-ink)";
  return (
    <div
      className="hw-panel"
      style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="hw-label">{label}</div>
          <div
            className="hw-mono hw-num"
            style={{ fontSize: 26, fontWeight: 500, marginTop: 6, color }}
          >
            {value}
          </div>
        </div>
        <Icon name={icon} size={16} color={iconColor} />
      </div>
    </div>
  );
}

function SortTh({
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
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      <span className="inline-flex items-center" style={{ gap: 4 }}>
        {label}
        {active && (
          <Icon
            name={asc ? "chevron-down" : "chevron-right"}
            size={11}
            color="var(--hw-ink-4)"
          />
        )}
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
