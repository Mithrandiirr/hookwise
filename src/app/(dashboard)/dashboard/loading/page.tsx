// Day 2 — live progress poller.
// Polls /api/onboarding/backfill/status every 2s. Renders a scanned/total counter, an
// animated bar, and the provider chip. On status === 'complete' redirects to /dashboard
// (which will read the summary tiles on Day 3).

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type StatusResp = {
  status: "pending" | "running" | "complete" | "failed";
  scanned: number;
  total: number;
  summary?: BackfillSummary | null;
  error?: string | null;
  provider?: string;
  startedAt?: string;
  completedAt?: string;
};

type BackfillSummary = {
  totalEvents: number;
  topEventTypes: Array<{ type: string; count: number }>;
  revenueProtectedCents: number | null;
  estimatedAtRiskCents: number | null;
  estimatedAutoRecovered: number;
  assumedFailureRate: number;
  windowDays: number;
};

const POLL_MS = 2_000;

export default function DashboardLoadingPage() {
  const params = useSearchParams();
  const router = useRouter();
  const integrationId = params.get("integrationId");
  const [state, setState] = useState<StatusResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const t0 = useRef<number>(Date.now());

  // 1s tick for the elapsed counter.
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // 2s poll.
  useEffect(() => {
    if (!integrationId) {
      setError("Missing integrationId in URL");
      return;
    }
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(
          `/api/onboarding/backfill/status?integrationId=${integrationId}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const body = (await res.json()) as StatusResp;
        if (cancelled) return;
        setState(body);
        if (body.status === "complete") {
          // brief pause so the user sees the 100% state before the redirect
          setTimeout(() => router.replace("/dashboard"), 600);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [integrationId, router]);

  const status = state?.status ?? "pending";
  const scanned = state?.scanned ?? 0;
  const total = Math.max(state?.total ?? 0, scanned);
  const pct = total > 0 ? Math.min(100, (scanned / total) * 100) : 0;
  const isDone = status === "complete";
  const isFailed = status === "failed";
  const isError = !!error || isFailed;

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        padding: "40px 28px",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div className="hf-eyebrow">
          {isDone ? "Done" : isError ? "Backfill failed" : "Backwards-poll in progress"}
        </div>
        <h1
          className="hf-display"
          style={{ fontSize: 32, margin: "10px 0 14px", lineHeight: 1.1 }}
        >
          {isDone
            ? "Your 30-day history is ready."
            : isError
              ? "Something went wrong."
              : "Scanning the last 30 days."}
        </h1>

        {/* Counter */}
        <div
          className="hf-mono"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginTop: 18,
            fontSize: 13,
            color: "var(--hf-ink-3)",
          }}
        >
          <span className="hf-num" style={{ fontSize: 30, color: "var(--hf-ink)", letterSpacing: "-0.02em" }}>
            {scanned.toLocaleString()}
          </span>
          <span>of</span>
          <span style={{ color: "var(--hf-ink-2)" }}>{total.toLocaleString()}</span>
          <span>events</span>
          <span style={{ marginLeft: "auto", color: "var(--hf-ink-4)" }}>{elapsed}s</span>
        </div>

        {/* Bar */}
        <div
          style={{
            marginTop: 10,
            height: 6,
            borderRadius: 4,
            background: "rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: isDone ? "100%" : `${pct}%`,
              background: isError
                ? "#f29a9a"
                : isDone
                  ? "#7ed98a"
                  : "var(--hf-accent)",
              transition: "width 600ms ease",
            }}
          />
        </div>

        {/* Sub-status chip row */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Chip>
            {state?.provider ? (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: providerColor(state.provider),
                  }}
                />
                <span>{state.provider}</span>
              </>
            ) : (
              <span style={{ color: "var(--hf-ink-4)" }}>loading…</span>
            )}
          </Chip>
          <Chip>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: isError ? "#f29a9a" : isDone ? "#7ed98a" : "#fbbf24",
              }}
            />
            <span>{status}</span>
          </Chip>
          <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
            polling every 2s · capped at {total.toLocaleString()}
          </span>
        </div>

        {/* Error detail */}
        {isError && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(242,154,154,0.3)",
              background: "rgba(242,154,154,0.06)",
              fontSize: 13,
              color: "var(--hf-ink-2)",
              lineHeight: 1.55,
            }}
          >
            {state?.error ?? error ?? "Backfill failed."}
            <div style={{ marginTop: 10 }}>
              <a href="/onboarding/connect" className="hf-link-accent" style={{ fontSize: 12 }}>
                Try a different key →
              </a>
            </div>
          </div>
        )}

        {/* Pre-redirect summary teaser */}
        {isDone && state?.summary && (
          <div
            style={{
              marginTop: 22,
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px solid var(--hf-line)",
              background: "var(--hf-bg-3)",
            }}
          >
            <div className="hf-eyebrow">{state.summary.windowDays}-day summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 12 }}>
              <Tile label="Events scanned" value={state.summary.totalEvents.toLocaleString()} />
              {state.summary.revenueProtectedCents != null ? (
                <Tile
                  label="Revenue throughput"
                  value={fmtMoney(state.summary.revenueProtectedCents)}
                  color="var(--hf-accent-warm)"
                />
              ) : (
                <Tile
                  label="Est. auto-recovered"
                  value={state.summary.estimatedAutoRecovered.toLocaleString()}
                  color="var(--hf-accent)"
                />
              )}
              <Tile
                label="Top event"
                value={state.summary.topEventTypes[0]?.type ?? "—"}
                small
              />
            </div>
            <p
              className="hf-mono"
              style={{
                marginTop: 12,
                fontSize: 10.5,
                color: "var(--hf-ink-4)",
                letterSpacing: "0.04em",
              }}
            >
              Redirecting to your dashboard…
            </p>
          </div>
        )}

        {!isError && !isDone && (
          <p
            style={{
              marginTop: 18,
              fontSize: 12.5,
              color: "var(--hf-ink-3)",
              lineHeight: 1.55,
            }}
          >
            HookWise is pulling your provider&apos;s event history. We cap at 5,000 events so this
            stays under a minute on first signup. You can leave this tab open — it&apos;ll redirect
            when the back-poll finishes.
          </p>
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid var(--hf-line)",
        background: "var(--hf-bg-3)",
        fontSize: 11.5,
        color: "var(--hf-ink-2)",
        textTransform: "lowercase",
      }}
    >
      {children}
    </span>
  );
}

function Tile({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div>
      <div
        className="hf-mono"
        style={{
          fontSize: 10,
          color: "var(--hf-ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: small ? 14 : 20,
          fontWeight: 500,
          color: color ?? "var(--hf-ink)",
          marginTop: 4,
          letterSpacing: "-0.02em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function fmtMoney(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function providerColor(p: string): string {
  switch (p) {
    case "stripe":
      return "#9ac7ff";
    case "shopify":
      return "#9ec396";
    case "clerk":
      return "#c4a5ff";
    case "resend":
      return "#f2b37a";
    case "github":
      return "#fbbf24";
    default:
      return "var(--hf-ink-3)";
  }
}
