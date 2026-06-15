// Day 3 — first-load dashboard moment.
// Rendered when the user just finished onboarding (no live events yet, but a completed
// back-poll left a summary). Drives the v7.1 promise: "the dashboard is full from second
// zero." No empty states, no tour, no checklist.

import Link from "next/link";
import type { BackfillSummary } from "@/lib/inngest/functions/onboarding-backfill";

export function FirstLoadView({
  summary,
  integrationId,
  provider,
  revenueTrackingEnabled,
}: {
  summary: BackfillSummary;
  integrationId: string;
  provider: string;
  revenueTrackingEnabled: boolean;
}) {
  return (
    <>
      <div
        style={{
          padding: "16px 32px",
          borderBottom: "1px solid var(--hf-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--hf-overlay)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--hf-ink-3)" }}>
          <span>acme-production</span>
          <span>/</span>
          <span style={{ color: "var(--hf-ink)" }}>First look</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            className="hf-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              border: "1px solid #c8e4f6",
              background: "#e8f4fb",
              fontSize: 11,
              color: "var(--hf-accent)",
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--hf-accent)" }} />
            backfill complete · {summary.windowDays}d window
          </span>
        </div>
      </div>

      <div
        style={{
          padding: 32,
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <Hero summary={summary} revenueTrackingEnabled={revenueTrackingEnabled} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <Tile
            label="Events scanned"
            value={summary.totalEvents.toLocaleString()}
            sub={`Last ${summary.windowDays} days · ${provider}`}
          />
          <Tile
            label="Provider failure rate"
            value={`${(summary.failureRate * 100).toFixed(2)}%`}
            sub={`${summary.failedEvents.toLocaleString()} of ${summary.totalEvents.toLocaleString()} flagged`}
            color={summary.failureRate > 0.005 ? "#d97706" : "var(--hf-ink)"}
          />
          <Tile
            label="Top failing event"
            value={summary.highestImpactFailure?.eventType ?? "none"}
            sub={
              summary.highestImpactFailure
                ? `${summary.highestImpactFailure.count.toLocaleString()} hits`
                : "no failures in window"
            }
            small={(summary.highestImpactFailure?.eventType.length ?? 0) > 18}
          />
        </div>

        <DiagnosisCard
          summary={summary}
          integrationId={integrationId}
        />

        <ConnectCta integrationId={integrationId} />

        <p
          className="hf-mono"
          style={{
            fontSize: 10.5,
            color: "var(--hf-ink-4)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
            marginTop: 4,
          }}
        >
          Numbers above are computed from a {summary.windowDays}-day back-poll of your provider&apos;s
          API. The estimates use a {(summary.assumedFailureRate * 100).toFixed(2)}% cohort-baseline
          failure rate — your actual measurement starts once you wire your webhook to Trueline.
        </p>
      </div>
    </>
  );
}

function Hero({
  summary,
  revenueTrackingEnabled,
}: {
  summary: BackfillSummary;
  revenueTrackingEnabled: boolean;
}) {
  // Tier A: dollars-at-risk framing. Tier B/C: auto-recovered count.
  const isTierA = revenueTrackingEnabled && summary.estimatedAtRiskCents != null;

  const headline = isTierA
    ? `${fmtMoney(summary.estimatedAtRiskCents!)} in revenue at risk over the last ${summary.windowDays} days.`
    : `${summary.estimatedAutoRecovered.toLocaleString()} deliveries would have been auto-recovered.`;

  const accent = isTierA ? "var(--hf-accent-warm)" : "var(--hf-accent)";

  return (
    <div className="hf-landscape" style={{ padding: "30px 36px" }}>
      <div className="hf-eyebrow">
        {isTierA ? "Revenue estimate · 30-day projection" : "Reliability estimate · 30-day projection"}
      </div>
      <h1
        className="hf-display"
        style={{
          fontSize: 32,
          margin: "10px 0 0",
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: accent }}>{headline.split(" ").slice(0, 4).join(" ")}</span>{" "}
        <span style={{ color: "var(--hf-ink)" }}>{headline.split(" ").slice(4).join(" ")}</span>
      </h1>
      <p style={{ fontSize: 13.5, color: "var(--hf-ink-3)", lineHeight: 1.55, margin: "12px 0 0", maxWidth: 680 }}>
        {isTierA
          ? "Estimated impact if your endpoint had dropped at industry-baseline rates over this window. Your actual exposure is measured the moment you wire your webhook to Trueline."
          : "Estimated count of deliveries Trueline would have caught for you over this window. Wire your webhook to start measuring."}
      </p>

      {isTierA && summary.revenueProtectedCents != null && (
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--hf-line)",
          }}
        >
          <Metric
            label="Revenue throughput"
            value={fmtMoney(summary.revenueProtectedCents)}
            sub={`${summary.windowDays}d total · now protected`}
          />
          <Metric
            label="Cohort failure rate"
            value={`${(summary.assumedFailureRate * 100).toFixed(2)}%`}
            sub="industry baseline · est."
          />
          <Metric
            label="Top failing pattern"
            value={summary.highestImpactFailure?.eventType ?? "none"}
            sub={
              summary.highestImpactFailure
                ? `${summary.highestImpactFailure.count.toLocaleString()} occurrences`
                : "—"
            }
          />
        </div>
      )}
    </div>
  );
}

function DiagnosisCard({
  summary,
  integrationId,
}: {
  summary: BackfillSummary;
  integrationId: string;
}) {
  const failure = summary.highestImpactFailure;

  if (!failure) {
    return (
      <div
        style={{
          background: "var(--hf-bg-3)",
          border: "1px solid var(--hf-line)",
          borderRadius: 14,
          padding: "22px 26px",
        }}
      >
        <div className="hf-eyebrow">AI Diagnosis</div>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--hf-ink-2)",
            margin: "10px 0 0",
            lineHeight: 1.55,
          }}
        >
          No failures detected in your {summary.windowDays}-day history. Clean run. Once you wire
          live webhooks, Trueline will diagnose anomalies in real time and surface them here.
        </p>
      </div>
    );
  }

  const remediation = remediationFor(failure.eventType);

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #efeafb, transparent 50%), var(--hf-bg-3)",
        border: "1px solid #ddd0f5",
        borderRadius: 14,
        padding: "22px 26px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          className="hf-mono"
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 999,
            background: "#efeafb",
            color: "#7c5cd6",
            border: "1px solid #ddd0f5",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ✦ AI Diagnosis
        </span>
        <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
          highest-impact failure · {failure.count.toLocaleString()} occurrences
        </span>
      </div>

      <h3
        style={{
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          margin: 0,
          color: "var(--hf-ink)",
        }}
      >
        <span className="hf-mono" style={{ color: "#7c5cd6" }}>{failure.eventType}</span>{" "}
        is your top failure pattern.
      </h3>

      <p style={{ fontSize: 13.5, color: "var(--hf-ink-2)", lineHeight: 1.6, margin: "10px 0 0" }}>
        {remediation.summary}
      </p>

      <div
        style={{
          marginTop: 16,
          padding: "12px 14px",
          border: "1px solid var(--hf-line)",
          borderRadius: 10,
          background: "#f1f2f5",
        }}
      >
        <div
          className="hf-mono"
          style={{
            fontSize: 10.5,
            color: "var(--hf-accent)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Suggested remediation
        </div>
        <p style={{ fontSize: 13, color: "var(--hf-ink)", lineHeight: 1.55, margin: 0 }}>
          {remediation.action}
        </p>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {failure.sampleEventId && (
          <Link
            href={`/events/${failure.sampleEventId}`}
            className="hf-btn outline small"
          >
            See sample event →
          </Link>
        )}
        <Link href={`/integrations/${integrationId}`} className="hf-btn ghost small">
          Configure handler →
        </Link>
      </div>
    </div>
  );
}

function ConnectCta({ integrationId }: { integrationId: string }) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        padding: "22px 26px",
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div className="hf-eyebrow">Next · live monitoring</div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            margin: "8px 0 4px",
            color: "var(--hf-ink)",
          }}
        >
          Point your webhook at Trueline.
        </h3>
        <p style={{ fontSize: 13, color: "var(--hf-ink-3)", margin: 0, lineHeight: 1.5, maxWidth: 600 }}>
          The back-poll proves the volume. Now wire your provider&apos;s webhook subscription
          to Trueline so we&apos;re catching drops the moment they happen — not 30 days late.
        </p>
      </div>
      <Link href={`/integrations/${integrationId}`} className="hf-btn pill">
        Connect for live monitoring →
      </Link>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div
        className="hf-mono"
        style={{
          fontSize: 10.5,
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
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--hf-ink)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--hf-ink-3)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  color,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        padding: "20px 22px",
      }}
    >
      <div
        className="hf-mono"
        style={{
          fontSize: 11,
          color: "var(--hf-ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: small ? 18 : 26,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: color || "var(--hf-ink)",
          marginTop: 8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(2)}`;
}

// Pattern-matched remediation copy. Day-3 ships templated answers per event-type family;
// Day 4+ wires real Claude inference for novel patterns.
function remediationFor(eventType: string): { summary: string; action: string } {
  const t = eventType.toLowerCase();

  if (t.includes("payment_intent.payment_failed") || t.includes("payment_failed")) {
    return {
      summary:
        "Failed payment intents are typically retry-able — most resolve when the customer retries with the same or a different method within 24h. The webhook firing isn't the problem; the downstream side often is.",
      action:
        "Ensure your handler is idempotent on payment_intent.id so retries don't double-charge state. Trueline dedupes by provider_event_id; if you mirror that key on your side, you're covered.",
    };
  }
  if (t.includes("charge.failed")) {
    return {
      summary:
        "Charge failures fall into two buckets: provider-side decline (card declined, fraud) and integration-side timeout (your handler took too long to ack). The breakdown is in the failure_code on each event.",
      action:
        "Group these by failure_code first — declines aren't your problem to fix; timeouts are. Trueline will start retrying with backoff once you wire live ingestion.",
    };
  }
  if (t.includes("invoice.payment_failed")) {
    return {
      summary:
        "Failed invoice payments are usually expired cards or insufficient funds. Stripe will dunning-retry per your account's retry settings, but you need the webhook to mark the subscription correctly in your DB.",
      action:
        "Verify your handler updates subscription status on invoice.payment_failed events. Trueline reconciliation will catch any of these your endpoint silently dropped.",
    };
  }
  if (t.startsWith("orders.refunded") || t.includes("refunded")) {
    return {
      summary:
        "Refunded orders need to propagate to inventory, accounting, and any downstream fulfillment systems. If your handler missed even one of these, your books and stock are out of sync.",
      action:
        "Reconcile your refund ledger against Shopify's. Trueline's reconciler will keep this aligned automatically once live, but it's worth a one-time audit now.",
    };
  }
  if (t.includes("voided")) {
    return {
      summary:
        "Voided orders typically happen pre-fulfillment — customer cancelled or fraud-flagged. The risk is that your handler already triggered fulfillment before processing the void.",
      action:
        "Confirm your handler can roll back fulfillment intent on a void. Sequencing matters: orders.voided must always be processed before orders.fulfilled for the same order id.",
    };
  }
  if (t.includes("dispute") || t.includes("chargeback")) {
    return {
      summary:
        "Disputes carry deadlines — usually 7-21 days from notification. A dropped webhook here is the worst kind of drop, because it costs you the dispute by default.",
      action:
        "Ensure dispute webhooks alert a human, not just a log line. Trueline can route these to Slack/PagerDuty once you wire live alerts.",
    };
  }
  return {
    summary: `${eventType} fired ${"multiple times"} in your history. Without delivery confirmation we can't tell whether your handler processed them — but the volume alone is a signal worth investigating.`,
    action:
      "Once you wire your webhook to Trueline, we'll measure your actual delivery success on this event type and diagnose the root cause in real time.",
  };
}
