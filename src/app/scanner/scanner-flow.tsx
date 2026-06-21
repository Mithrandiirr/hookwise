"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip, Dot, Icon, ProviderMark } from "@/components/hw";

type Provider = "shopify";
type ScanState = "form" | "scanning" | "results" | "error";

interface EventTypeBreakdown {
  eventType: string;
  totalCount: number;
  gapCount: number;
  dollarImpactCents: number;
}

interface ScanReport {
  provider: Provider;
  scannedAt: string;
  periodDays: number;
  totalProviderEvents: number;
  totalHookwiseEvents: number;
  gapsFound: number;
  dollarAtRiskCents: number;
  healthScore: number;
  breakdown: EventTypeBreakdown[];
  truncated: boolean;
}

export function ScannerFlow() {
  const [state, setState] = useState<ScanState>("form");
  const [provider, setProvider] = useState<Provider>("shopify");
  const [apiKey, setApiKey] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setState("scanning");
    setErrorMessage("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          ...(provider === "shopify" ? { shopDomain: shopDomain.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Scan failed");
      }
      const data: ScanReport = await res.json();
      setReport(data);
      setState("results");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Scan failed. Try again.",
      );
      setState("error");
    }
  }

  if (state === "results" && report) {
    return (
      <ScanResults
        report={report}
        onReset={() => {
          setState("form");
          setReport(null);
          setApiKey("");
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 560, marginInline: "auto" }} className="hw-fade-up">
      <form
        onSubmit={handleScan}
        className="hw-panel"
        style={{
          padding: 28,
          background: "var(--hw-bg-2)",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)",
        }}
      >
        {/* Provider */}
        <Field label="Provider">
          <div className="flex" style={{ gap: 8 }}>
            {(["stripe", "shopify"] as const).map((p) => {
              const on = provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className="flex items-center justify-center"
                  style={{
                    flex: 1,
                    gap: 10,
                    padding: "11px 14px",
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
              : "Shopify Admin API token"
          }
          hint="Read-only access. Never stored, never logged."
        >
          <input
            type="password"
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "stripe" ? "sk_live_…" : "shpat_…"}
            className="hw-input hw-mono"
          />
        </Field>

        {provider === "shopify" && (
          <Field label="Shop domain">
            <input
              type="text"
              required
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="your-store.myshopify.com"
              className="hw-input hw-mono"
            />
          </Field>
        )}

        {state === "error" && (
          <div
            className="hw-mono"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#fdeaea",
              border: "1px solid #f4c4c4",
              color: "var(--hw-red)",
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={state === "scanning"}
          className="hw-btn hw-btn-primary"
          style={{
            width: "100%",
            padding: "14px 18px",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          {state === "scanning" ? (
            <>
              <Dot tone="indigo" /> Scanning your events…
            </>
          ) : (
            <>
              <Icon name="search" size={14} /> Run free scan
            </>
          )}
        </button>
      </form>

      <div
        className="flex items-center justify-center"
        style={{
          marginTop: 24,
          gap: 24,
          fontSize: 11,
          color: "var(--hw-ink-4)",
        }}
      >
        <span className="hw-mono inline-flex items-center" style={{ gap: 6 }}>
          <Icon name="shield" size={12} /> keys never stored
        </span>
        <span className="hw-mono inline-flex items-center" style={{ gap: 6 }}>
          <Icon name="check" size={12} /> read-only access
        </span>
        <span className="hw-mono inline-flex items-center" style={{ gap: 6 }}>
          <Icon name="clock" size={12} /> &lt; 60s
        </span>
      </div>
      <style jsx>{`
        :global(.hw-input) {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
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
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && (
        <div
          className="hw-mono"
          style={{ marginTop: 6, fontSize: 11, color: "var(--hw-ink-4)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function ScanResults({
  report,
  onReset,
}: {
  report: ScanReport;
  onReset: () => void;
}) {
  const totalEvents = report.totalProviderEvents;
  const tone =
    report.healthScore >= 95
      ? "green"
      : report.healthScore >= 80
        ? "amber"
        : "red";

  return (
    <div
      className="hw-fade-up flex flex-col"
      style={{ maxWidth: 880, marginInline: "auto", gap: 24 }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="inline-flex items-center"
          style={{
            gap: 10,
            padding: "6px 12px 6px 10px",
            border: "1px solid #c4ebd2",
            borderRadius: 999,
            background: "#e8f7ee",
            marginBottom: 18,
          }}
        >
          <Dot tone="green" />
          <span
            className="hw-mono"
            style={{ fontSize: 11, color: "var(--hw-green)" }}
          >
            SCAN COMPLETE
          </span>
        </div>
        <h2
          className="hw-display"
          style={{ fontSize: 32, color: "var(--hw-ink)" }}
        >
          Your webhook health report
        </h2>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "var(--hw-ink-3)",
          }}
        >
          last {report.periodDays} days of{" "}
          {report.provider === "stripe" ? "Stripe" : "Shopify"} events
        </p>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
      >
        <Stat label="Events found" value={totalEvents.toLocaleString()} />
        <Stat label="Event types" value={String(report.breakdown.length)} />
        <Stat
          label="Health score"
          value={`${report.healthScore}%`}
          tone={tone}
        />
      </div>

      {report.breakdown.length > 0 && (
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
            <span className="hw-label">EVENT BREAKDOWN</span>
          </div>
          <div>
            {report.breakdown.map((b, i) => (
              <div
                key={b.eventType}
                className="flex items-center justify-between"
                style={{
                  padding: "12px 20px",
                  borderTop: i ? "1px solid var(--hw-line)" : "none",
                }}
              >
                <span
                  className="hw-mono"
                  style={{
                    fontSize: 12.5,
                    color: "var(--hw-indigo-ink)",
                  }}
                >
                  {b.eventType}
                </span>
                <div
                  className="flex items-center"
                  style={{ gap: 14 }}
                >
                  <span
                    className="hw-mono hw-num"
                    style={{ fontSize: 12, color: "var(--hw-ink-3)" }}
                  >
                    {b.totalCount.toLocaleString()} events
                  </span>
                  {b.dollarImpactCents > 0 && (
                    <Chip tone="amber">
                      ${(b.dollarImpactCents / 100).toLocaleString()}
                    </Chip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.truncated && (
        <div
          className="hw-mono"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fdeada",
            border: "1px solid #f4c9ad",
            color: "var(--hw-amber)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Results truncated. More than 10,000 events — sign up for the full picture.
        </div>
      )}

      <div
        className="hw-panel relative overflow-hidden"
        style={{
          padding: 36,
          background: "var(--hw-bg-2)",
          textAlign: "center",
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.12), transparent 60%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <h3
            className="hw-display"
            style={{ fontSize: 22, color: "var(--hw-ink)" }}
          >
            Want gap detection + AI monitoring?
          </h3>
          <p
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "var(--hw-ink-3)",
              maxWidth: 460,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            Sign up to monitor your webhooks in real time. Trueline catches
            missing events, diagnoses failures, and tracks dollar impact
            automatically.
          </p>
          <div
            className="flex items-center justify-center flex-wrap"
            style={{ gap: 10, marginTop: 18 }}
          >
            <Link href="/signup" className="hw-btn hw-btn-primary">
              Start monitoring · free
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="hw-btn hw-btn-ghost"
            >
              Scan another provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
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
      style={{ padding: 20, background: "var(--hw-bg-2)", textAlign: "center" }}
    >
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono hw-num"
        style={{ marginTop: 6, fontSize: 28, fontWeight: 500, color }}
      >
        {value}
      </div>
    </div>
  );
}
