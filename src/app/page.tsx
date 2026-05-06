import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Dot, Icon, ProviderMark, Sparkline } from "@/components/hw";
import { LiveCounter } from "@/components/hw/live-counter";

export default function LandingPage() {
  return (
    <div
      className="hw-root relative overflow-hidden"
      style={{ minHeight: "100vh", background: "var(--hw-bg)" }}
    >
      {/* Background */}
      <div
        className="hw-grid-bg absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.55,
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, #000 40%, transparent 85%)",
          maskImage: "radial-gradient(ellipse at 50% 0%, #000 40%, transparent 85%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1000,
          height: 600,
          background:
            "radial-gradient(ellipse at center, rgba(129,140,248,0.14) 0%, rgba(129,140,248,0.04) 40%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav
        className="relative mx-auto flex items-center justify-between"
        style={{ zIndex: 2, maxWidth: 1200, padding: "24px 40px" }}
      >
        <Logo />
        <div
          className="flex items-center"
          style={{ gap: 24, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <Link href="#product" className="text-[13px]" style={{ color: "var(--hw-ink-3)" }}>Product</Link>
          <Link href="#loop" className="text-[13px]" style={{ color: "var(--hw-ink-3)" }}>Intelligence</Link>
          <Link href="#pricing" className="text-[13px]" style={{ color: "var(--hw-ink-3)" }}>Pricing</Link>
          <Link href="/docs" className="text-[13px]" style={{ color: "var(--hw-ink-3)" }}>Docs</Link>
          <span style={{ width: 1, height: 16, background: "var(--hw-line)" }} />
          <Link href="/login" className="text-[13px]" style={{ color: "var(--hw-ink-3)" }}>Sign in</Link>
          <Link
            href="/scanner"
            className="hw-btn hw-btn-primary"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            <span>Start free scan</span>
            <Icon name="arrow-up-right" size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative mx-auto"
        style={{ zIndex: 2, maxWidth: 1200, padding: "60px 40px 40px" }}
      >
        <div
          className="grid items-start"
          style={{ gridTemplateColumns: "1.1fr 0.9fr", gap: 64 }}
        >
          <div className="hw-fade-up">
            <div
              className="inline-flex items-center"
              style={{
                gap: 10,
                padding: "6px 12px 6px 10px",
                border: "1px solid var(--hw-line-2)",
                borderRadius: 999,
                background: "var(--hw-panel)",
                marginBottom: 32,
              }}
            >
              <Dot tone="green" />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-2)", letterSpacing: "0.05em" }}
              >
                LIVE ·{" "}
                <span style={{ color: "var(--hw-ink)" }}>
                  <LiveCounter />
                </span>{" "}
                events reconciled in the last minute
              </span>
            </div>

            <h1
              className="hw-display"
              style={{ fontSize: 78, margin: 0, color: "var(--hw-ink)" }}
            >
              Every webhook.
              <br />
              <span style={{ color: "var(--hw-ink-3)" }}>Delivered. Explained.</span>
            </h1>

            <p
              style={{
                marginTop: 28,
                fontSize: 18,
                lineHeight: 1.55,
                color: "var(--hw-ink-2)",
                maxWidth: 560,
              }}
            >
              Providers drop events. Endpoints crash. Payloads change silently. HookWise is the
              operations layer that guarantees delivery and tells you the root cause the moment
              something breaks.
            </p>

            <div className="flex items-center" style={{ marginTop: 36, gap: 12 }}>
              <Link
                href="/scanner"
                className="hw-btn hw-btn-primary"
                style={{ padding: "12px 18px", fontSize: 14 }}
              >
                Scan your webhooks · free <Icon name="arrow-right" size={14} />
              </Link>
              <Link
                href="/docs"
                className="hw-btn hw-btn-ghost"
                style={{ padding: "12px 18px", fontSize: 14 }}
              >
                <Icon name="terminal" size={14} /> Watch a 90s tour
              </Link>
            </div>

            <div
              className="flex items-center flex-wrap"
              style={{ marginTop: 40, gap: 24 }}
            >
              <span className="hw-label">Native providers</span>
              <div
                className="flex items-center"
                style={{ gap: 14, color: "var(--hw-ink-3)", fontSize: 13 }}
              >
                <ProviderMark provider="stripe" size={18} /> Stripe
                <ProviderMark provider="shopify" size={18} /> Shopify
                <ProviderMark provider="github" size={18} /> GitHub
                <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>
                  + generic HTTP
                </span>
              </div>
            </div>
          </div>

          {/* Investigation terminal panel */}
          <div className="hw-fade-up hw-fade-up-2 relative">
            <div
              className="absolute pointer-events-none"
              style={{
                inset: -24,
                background:
                  "radial-gradient(ellipse at 70% 30%, rgba(129,140,248,0.10), transparent 70%)",
              }}
            />
            <div
              className="hw-panel relative overflow-hidden"
              style={{
                background: "var(--hw-bg-2)",
                boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
              }}
            >
              <div
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <Dot tone="red" />
                <span
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
                >
                  anomaly · stripe · payment_intent.succeeded
                </span>
                <span
                  className="hw-mono"
                  style={{ marginLeft: "auto", fontSize: 11, color: "var(--hw-ink-4)" }}
                >
                  07:42:18 UTC
                </span>
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                {(
                  [
                    { l: "Failure rate", v: "83.4", u: "%", tone: "red" },
                    { l: "At risk", v: "$403.88", u: "", tone: "amber" },
                    { l: "MTTR est.", v: "6", u: "min", tone: "indigo" },
                  ] as const
                ).map((m, i) => (
                  <div
                    key={m.l}
                    style={{
                      padding: "16px 16px 14px",
                      borderRight: i < 2 ? "1px solid var(--hw-line)" : "none",
                    }}
                  >
                    <div className="hw-label" style={{ marginBottom: 6 }}>
                      {m.l}
                    </div>
                    <div
                      className="hw-mono hw-num"
                      style={{
                        fontSize: 22,
                        fontWeight: 500,
                        color:
                          m.tone === "red"
                            ? "var(--hw-red)"
                            : m.tone === "amber"
                              ? "var(--hw-amber)"
                              : "var(--hw-ink)",
                      }}
                    >
                      {m.v}
                      <span
                        style={{ color: "var(--hw-ink-4)", fontSize: 13, marginLeft: 2 }}
                      >
                        {m.u}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="hw-mono"
                style={{
                  padding: 16,
                  fontSize: 12,
                  lineHeight: 1.75,
                  color: "var(--hw-ink-3)",
                }}
              >
                <InvestigationStep tone="indigo" label="observe" text="failure_surge across acme-production" />
                <InvestigationStep tone="quiet" label="step 01" text="query_delivery_history → 83% 503 in 4 min" />
                <InvestigationStep tone="quiet" label="step 02" text="query_endpoint_health → circuit: open" />
                <InvestigationStep tone="quiet" label="step 03" text="query_provider_health → stripe: ok" />
                <InvestigationStep tone="quiet" label="step 04" text="query_similar_incidents → 1 match (2026-03-18)" />
                <div style={{ height: 10 }} />
                <div
                  style={{ borderTop: "1px dashed var(--hw-line-2)", paddingTop: 10 }}
                >
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "var(--hw-indigo-ink)" }}>diagnose</span>
                    <span style={{ color: "var(--hw-ink)" }}>
                      endpoint db pool exhausted (same as Mar 18)
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <span style={{ color: "var(--hw-green)" }}>remediate</span>
                    <span style={{ color: "var(--hw-ink-2)" }}>
                      queued replay · reconciliation started · paged on-call
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-between"
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid var(--hw-line)",
                  background: "var(--hw-bg-3)",
                }}
              >
                <span
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                >
                  incident · INC-20260422-0441
                </span>
                <div className="flex" style={{ gap: 6 }}>
                  <span className="hw-kbd">J</span>
                  <span className="hw-kbd">K</span>
                  <span style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>step</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem strip */}
      <section
        className="relative mx-auto"
        style={{
          zIndex: 2,
          maxWidth: 1200,
          padding: "80px 40px",
          borderTop: "1px solid var(--hw-line)",
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 0,
            borderTop: "1px solid var(--hw-line)",
            borderBottom: "1px solid var(--hw-line)",
          }}
        >
          {[
            { v: "2–5%", l: "of Stripe & Shopify webhooks fail silently during normal operation" },
            { v: "26 h", l: "median time customers take to notice a missing webhook" },
            { v: "$4,200", l: "monthly revenue at risk per integration, on average" },
            { v: "12%", l: "of API incidents trace back to a webhook vulnerability" },
          ].map((x, i) => (
            <div
              key={x.v}
              style={{
                padding: "32px 28px",
                borderRight: i < 3 ? "1px solid var(--hw-line)" : "none",
              }}
            >
              <div
                className="hw-mono hw-num hw-display"
                style={{ fontSize: 42, color: "var(--hw-ink)" }}
              >
                {x.v}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "var(--hw-ink-3)",
                  lineHeight: 1.5,
                }}
              >
                {x.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Value loop */}
      <section
        id="loop"
        className="relative mx-auto"
        style={{ zIndex: 2, maxWidth: 1200, padding: "40px 40px 80px" }}
      >
        <div style={{ maxWidth: 680 }}>
          <div className="hw-kicker">The loop</div>
          <h2
            className="hw-display"
            style={{ fontSize: 40, marginTop: 14, color: "var(--hw-ink)" }}
          >
            Five layers between the provider and your code.
          </h2>
          <p
            style={{
              marginTop: 14,
              fontSize: 15,
              color: "var(--hw-ink-3)",
              lineHeight: 1.6,
            }}
          >
            Hookdeck is the Vercel of webhooks — plumbing. HookWise is the Datadog: ingestion that
            can&apos;t drop, delivery that can&apos;t skip, and an AI that watches the whole loop.
          </p>
        </div>

        <div
          className="grid"
          style={{
            marginTop: 48,
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 1,
            background: "var(--hw-line)",
            border: "1px solid var(--hw-line)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {(
            [
              { step: "01", title: "Ingest", sub: "200 in <50ms", desc: "Hono on Edge verifies signature, persists to Postgres, fails over to Redis, then Axiom.", icon: "plug" },
              { step: "02", title: "Protect", sub: "circuit + dedup", desc: "3-state circuit breaker with sliding window. Idempotency-as-a-service deduplicates on provider_event_id.", icon: "shield" },
              { step: "03", title: "Deliver", sub: "ordered replay", desc: "Enriched payloads. Event sequencer reorders by business logic. HTTP, SQS, Kafka, Pub/Sub.", icon: "bolt" },
              { step: "04", title: "Understand", sub: "AI diagnosis", desc: "Pattern learning, anomaly detection, root cause with evidence from 7 query sources.", icon: "brain" },
              { step: "05", title: "Improve", sub: "every week", desc: "Cross-customer benchmarks, contract testing, chaos drills. Reliability compounds.", icon: "chart" },
            ] as const
          ).map((x) => (
            <div
              key={x.step}
              className="flex flex-col"
              style={{
                background: "var(--hw-bg-2)",
                padding: "24px 22px",
                gap: 14,
                minHeight: 220,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>
                  {x.step}
                </span>
                <Icon name={x.icon} size={16} color="var(--hw-indigo-ink)" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--hw-ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {x.title}
                </div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-indigo-ink)", marginTop: 2 }}
                >
                  {x.sub}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--hw-ink-3)",
                  lineHeight: 1.55,
                }}
              >
                {x.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature mosaic */}
      <section
        id="product"
        className="relative mx-auto"
        style={{ zIndex: 2, maxWidth: 1200, padding: "40px 40px 80px" }}
      >
        <div className="hw-kicker">Why teams switch</div>
        <h2
          className="hw-display"
          style={{ fontSize: 40, marginTop: 14, color: "var(--hw-ink)", maxWidth: 780 }}
        >
          Three things competitors literally can&apos;t do.
        </h2>

        <div
          className="grid"
          style={{ marginTop: 40, gridTemplateColumns: "1.4fr 1fr", gap: 20 }}
        >
          <FeatureCard
            span
            title="Reconciliation Engine"
            lead="If Stripe never sent it, we fetch it anyway."
            body="Every 5 minutes we poll the provider's API, diff against our ingestion log, and auto-ingest the gap. Proxy-only tools can't see what was never routed through them."
            accent="emerald"
            artwork={<ReconArtwork />}
          />
          <FeatureCard
            title="Cross-provider Intelligence"
            lead="One incident view across Stripe + Shopify."
            body="We parse payloads, correlate by order, customer, amount. A Shopify fulfillment can be traced to the Stripe charge that paid for it."
            accent="indigo"
            artwork={<CorrelateArtwork />}
          />
          <FeatureCard
            title="Revenue Impact"
            lead="Dollars, not just dots."
            body="Every event carries a parsed amount. When your endpoint flatlines, the dashboard says $18,432 in payment notifications delayed — not 'some errors.'"
            accent="amber"
            artwork={<RevenueArtwork />}
          />
          <FeatureCard
            span
            title="AI Investigation — every anomaly, ten seconds in"
            lead="Anomaly detected → 7 sources queried → root cause with evidence."
            body="Our AI runs a fixed investigation: delivery history, endpoint health, provider status, payload schema, similar past incidents, flow state, revenue at risk. By the time you open the alert, the hypothesis is already there — with a link to the exact failed delivery and the fix that worked last time."
            accent="indigo"
            artwork={<InvestigationArtwork />}
          />
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="relative mx-auto"
        style={{
          zIndex: 2,
          maxWidth: 1200,
          padding: "40px 40px 40px",
          borderTop: "1px solid var(--hw-line)",
        }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: "260px 1fr", gap: 48, alignItems: "start" }}
        >
          <div>
            <div className="hw-kicker">Pricing</div>
            <h2
              className="hw-display"
              style={{ fontSize: 30, marginTop: 12, color: "var(--hw-ink)" }}
            >
              Starts free.
              <br />
              Compounds with events.
            </h2>
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 0,
              border: "1px solid var(--hw-line)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {(
              [
                { t: "Free", p: "$0", e: "1K events/mo", perks: ["Smart Buffer", "Idempotency"], hi: false },
                { t: "Starter", p: "$29", e: "50K events/mo", perks: ["+ Smart Retry"], hi: false },
                { t: "Pro", p: "$79", e: "500K events/mo", perks: ["+ Reconciliation", "+ AI Diagnosis"], hi: true },
                { t: "Team", p: "$199", e: "2M events/mo", perks: ["+ Sequencer", "+ Alerting"], hi: false },
                { t: "Business", p: "$499", e: "10M events/mo", perks: ["+ Security Scanner", "+ Audit Trail"], hi: false },
              ] as const
            ).map((x, i) => (
              <div
                key={x.t}
                style={{
                  padding: "20px 18px",
                  background: x.hi ? "var(--hw-panel-raised)" : "var(--hw-bg-2)",
                  borderRight: i < 4 ? "1px solid var(--hw-line)" : "none",
                  position: "relative",
                }}
              >
                {x.hi && (
                  <span
                    className="hw-chip indigo"
                    style={{ position: "absolute", top: 10, right: 10, fontSize: 10 }}
                  >
                    POPULAR
                  </span>
                )}
                <div style={{ fontSize: 13, color: "var(--hw-ink-2)", fontWeight: 500 }}>
                  {x.t}
                </div>
                <div
                  className="hw-mono hw-num"
                  style={{
                    fontSize: 26,
                    fontWeight: 500,
                    color: "var(--hw-ink)",
                    marginTop: 6,
                  }}
                >
                  {x.p}
                  <span
                    style={{ fontSize: 11, color: "var(--hw-ink-4)", marginLeft: 2 }}
                  >
                    /mo
                  </span>
                </div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 4 }}
                >
                  {x.e}
                </div>
                <div
                  className="flex flex-col"
                  style={{ marginTop: 14, gap: 6 }}
                >
                  {x.perks.map((p) => (
                    <div
                      key={p}
                      className="flex items-center"
                      style={{ gap: 7, fontSize: 11.5, color: "var(--hw-ink-3)" }}
                    >
                      <Icon name="check" size={12} color="var(--hw-green)" /> {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative mx-auto"
        style={{ zIndex: 2, maxWidth: 1200, padding: "80px 40px 100px" }}
      >
        <div
          className="hw-panel relative overflow-hidden flex items-center justify-between"
          style={{ padding: "56px 48px", gap: 32 }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              inset: 0,
              background:
                "radial-gradient(ellipse at 80% 50%, rgba(129,140,248,0.12), transparent 60%)",
            }}
          />
          <div style={{ position: "relative", maxWidth: 620 }}>
            <div className="hw-kicker">Start with a scan</div>
            <h2
              className="hw-display"
              style={{ fontSize: 38, marginTop: 10, color: "var(--hw-ink)" }}
            >
              See the money you&apos;re leaking in 60 seconds.
            </h2>
            <p
              style={{
                marginTop: 14,
                fontSize: 15,
                color: "var(--hw-ink-3)",
                lineHeight: 1.55,
              }}
            >
              Connect a read-only API key. We diff your provider&apos;s history against what your
              app actually received and show you the gap — dollar amounts included. No signup.
            </p>
          </div>
          <div
            className="relative flex flex-col"
            style={{ gap: 10 }}
          >
            <Link
              href="/scanner"
              className="hw-btn hw-btn-primary"
              style={{ padding: "14px 22px", fontSize: 14 }}
            >
              hookwise scan --stripe <Icon name="arrow-right" size={14} />
            </Link>
            <span
              className="hw-mono"
              style={{ fontSize: 11, color: "var(--hw-ink-4)", textAlign: "center" }}
            >
              or brew install hookwise
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative mx-auto flex items-center justify-between"
        style={{
          zIndex: 2,
          borderTop: "1px solid var(--hw-line)",
          padding: "32px 40px",
          maxWidth: 1200,
        }}
      >
        <Logo />
        <div className="flex" style={{ gap: 24, fontSize: 12, color: "var(--hw-ink-4)" }}>
          <Link href="/scanner">Scanner</Link>
          <Link href="/status">Status</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/security">Security</Link>
        </div>
        <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-5)" }}>
          © 2026 · The Datadog of webhooks
        </div>
      </footer>
    </div>
  );
}

function InvestigationStep({
  tone,
  label,
  text,
}: {
  tone: "indigo" | "red" | "quiet";
  label: string;
  text: string;
}) {
  return (
    <div
      className="grid items-baseline"
      style={{ gridTemplateColumns: "88px 1fr", gap: 14 }}
    >
      <span
        style={{
          color:
            tone === "indigo"
              ? "var(--hw-indigo-ink)"
              : tone === "red"
                ? "var(--hw-red)"
                : "var(--hw-ink-5)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--hw-ink-2)",
          minWidth: 0,
          wordBreak: "break-word",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function FeatureCard({
  title,
  lead,
  body,
  artwork,
  span,
  accent,
}: {
  title: string;
  lead: string;
  body: string;
  artwork: ReactNode;
  span?: boolean;
  accent: "emerald" | "indigo" | "amber" | "red";
}) {
  const accentMap = {
    emerald: "var(--hw-green)",
    indigo: "var(--hw-indigo-ink)",
    amber: "var(--hw-amber)",
    red: "var(--hw-red)",
  } as const;
  return (
    <div
      className="hw-panel grid items-center"
      style={{
        gridColumn: span ? "span 2" : "span 1",
        padding: 28,
        background: "var(--hw-bg-2)",
        gridTemplateColumns: span ? "1.1fr 1fr" : "1fr",
        gap: 28,
        minHeight: 260,
      }}
    >
      <div>
        <div
          className="flex items-center"
          style={{ gap: 10, marginBottom: 18 }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: accentMap[accent],
            }}
          />
          <span
            className="hw-mono"
            style={{
              fontSize: 11,
              color: "var(--hw-ink-4)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            capability
          </span>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--hw-ink)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 15,
            color: "var(--hw-ink)",
            fontStyle: "italic",
            letterSpacing: "-0.005em",
          }}
        >
          {lead}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 13.5,
            color: "var(--hw-ink-3)",
            lineHeight: 1.6,
          }}
        >
          {body}
        </div>
      </div>
      <div
        className="flex items-center justify-center"
        style={{ minHeight: 160 }}
      >
        {artwork}
      </div>
    </div>
  );
}

function ReconArtwork() {
  return (
    <div
      className="hw-mono"
      style={{
        fontSize: 11,
        lineHeight: 1.9,
        color: "var(--hw-ink-3)",
        width: "100%",
      }}
    >
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "auto 1fr auto", gap: "4px 12px" }}
      >
        <span style={{ color: "var(--hw-ink-5)" }}>stripe</span>
        <span style={{ height: 1, background: "var(--hw-line-2)" }} />
        <span style={{ color: "var(--hw-ink-3)" }}>3,412 events</span>

        <span style={{ color: "var(--hw-ink-5)" }}>hookwise</span>
        <span style={{ height: 1, background: "var(--hw-line-2)" }} />
        <span style={{ color: "var(--hw-ink-3)" }}>3,405 received</span>

        <span style={{ color: "var(--hw-red)" }}>gap</span>
        <span style={{ height: 1, background: "rgba(248,113,113,0.35)" }} />
        <span style={{ color: "var(--hw-red)" }}>7 missing</span>

        <span style={{ color: "var(--hw-green)" }}>action</span>
        <span style={{ height: 1, background: "rgba(74,222,128,0.35)" }} />
        <span style={{ color: "var(--hw-green)" }}>fetched · delivered</span>
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px dashed var(--hw-line-2)",
          borderRadius: 8,
        }}
      >
        <div style={{ color: "var(--hw-ink-4)" }}>
          $ hookwise reconcile --stripe --last=24h
        </div>
        <div style={{ color: "var(--hw-green)" }}>→ 7 events recovered · $1,284.00</div>
      </div>
    </div>
  );
}

function CorrelateArtwork() {
  return (
    <svg width="100%" height="160" viewBox="0 0 280 160">
      <defs>
        <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L6 4 L0 8" fill="none" stroke="#818cf8" strokeWidth="1" />
        </marker>
      </defs>
      <g fontFamily="var(--font-geist-mono), monospace" fontSize="10" fill="#a5b4fc">
        <rect x="10" y="20" width="90" height="28" rx="6" fill="rgba(129,140,248,0.08)" stroke="rgba(129,140,248,0.3)" />
        <text x="55" y="38" textAnchor="middle">stripe.charge</text>
        <rect x="10" y="110" width="90" height="28" rx="6" fill="rgba(129,140,248,0.08)" stroke="rgba(129,140,248,0.3)" />
        <text x="55" y="128" textAnchor="middle">shopify.order</text>
        <rect x="180" y="66" width="90" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.3)" />
        <text x="225" y="84" textAnchor="middle" fill="#4ade80">correlated</text>
        <path d="M100 34 Q150 50 180 76" stroke="#818cf8" strokeWidth="1" fill="none" markerEnd="url(#arrow-end)" />
        <path d="M100 124 Q150 100 180 82" stroke="#818cf8" strokeWidth="1" fill="none" markerEnd="url(#arrow-end)" />
        <text x="140" y="160" textAnchor="middle" fill="rgba(231,236,242,0.45)">
          match: order_id · amount · email
        </text>
      </g>
    </svg>
  );
}

function RevenueArtwork() {
  return (
    <div style={{ width: "100%" }}>
      <div className="flex items-baseline" style={{ gap: 8 }}>
        <span className="hw-label">Protected this month</span>
      </div>
      <div
        className="hw-mono hw-num hw-display"
        style={{ fontSize: 42, color: "var(--hw-ink)", marginTop: 6 }}
      >
        $47,320
      </div>
      <Sparkline
        data={[0.2, 0.3, 0.25, 0.4, 0.35, 0.5, 0.55, 0.48, 0.7, 0.65, 0.82, 0.9]}
        width={240}
        height={44}
        gradId="rev-grad"
      />
      <div
        className="hw-mono"
        style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 4 }}
      >
        vs <span style={{ color: "var(--hw-green)" }}>+$8,912</span> last week
      </div>
    </div>
  );
}

function InvestigationArtwork() {
  const rows: Array<[string, string, "red" | "quiet" | "indigo" | "green"]> = [
    ["observe", "anomaly · failure_surge", "red"],
    ["query 1/7", "delivery_history → 83% fail (4 min)", "quiet"],
    ["query 2/7", "endpoint_health → circuit: open", "quiet"],
    ["query 3/7", "provider_status → stripe: ok", "quiet"],
    ["query 4/7", "payload_schema → no drift", "quiet"],
    ["query 5/7", "similar_incidents → INC-0318 (db pool)", "quiet"],
    ["diagnose", "root_cause: db pool exhausted", "indigo"],
    ["remediate", "replay queued · on-call paged", "green"],
  ];
  return (
    <div
      className="hw-mono"
      style={{ fontSize: 11, color: "var(--hw-ink-3)", width: "100%" }}
    >
      <div className="flex flex-col" style={{ gap: 6 }}>
        {rows.map(([l, t, tone]) => (
          <div
            key={l}
            className="grid items-baseline"
            style={{ gridTemplateColumns: "74px 1fr", gap: 12 }}
          >
            <span
              style={{
                color:
                  tone === "red"
                    ? "var(--hw-red)"
                    : tone === "indigo"
                      ? "var(--hw-indigo-ink)"
                      : tone === "green"
                        ? "var(--hw-green)"
                        : "var(--hw-ink-5)",
              }}
            >
              {l}
            </span>
            <span
              style={{
                color: tone === "quiet" ? "var(--hw-ink-3)" : "var(--hw-ink)",
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
