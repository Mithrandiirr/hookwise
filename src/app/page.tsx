// v8 landing — one page, one CTA: "Run a free 7-day gap audit on your store."
// Lead with the gap and the dollars. Never lead with AI, MCP, buffering, or "platform".
// Price anchors against DIY reconciliation (2–3 weeks of engineering), never Hookdeck.
// No orange on this page — sky blue everywhere.

import Link from "next/link";
import { ThemeToggleFooter } from "@/components/hw/theme-toggle-footer";

const CTA_HREF = "/signup";
const CTA_LABEL = "Run a free 7-day gap audit on your store →";

/* ════════════════ Logo ════════════════ */
const HFLogo = ({ size = 18 }: { size?: number }) => (
  <div className="hf-logo">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L22 7.5 V16.5 L12 22 L2 16.5 V7.5 Z" fill="#f4f2ee" />
      <path
        d="M12 2 L12 22 M2 7.5 L22 16.5 M22 7.5 L2 16.5"
        stroke="#0a0a0a"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
    <span>HOOKWISE</span>
  </div>
);

/* ════════════════ Nav ════════════════ */
const HFNav = () => (
  <div className="hf-nav-wrap">
    <div className="hf-nav">
      <HFLogo />
      <div className="hf-nav-links">
        <Link href="#evidence">The problem</Link>
        <Link href="#how">How it works</Link>
        <Link href="#pricing">Pricing</Link>
      </div>
      <div className="hf-nav-right">
        <Link href="/login" className="hf-btn outline small">
          Sign in
        </Link>
        <Link href={CTA_HREF} className="hf-btn pill small">
          Run free audit
        </Link>
      </div>
    </div>
  </div>
);

/* ════════════════ Sample report card (hero right) ════════════════ */
const SampleReport = () => (
  <div className="hf-win" style={{ width: "100%" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "var(--hf-window-chrome)",
        borderBottom: "1px solid var(--hf-line)",
      }}
    >
      <span
        className="hf-mono"
        style={{
          fontSize: 10,
          color: "var(--hf-accent)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Gap Report · sample
      </span>
      <span style={{ width: 1, height: 14, background: "var(--hf-line)" }} />
      <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-2)" }}>
        your-store.myshopify.com
      </span>
      <div style={{ flex: 1 }} />
      <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
        7 days
      </span>
    </div>
    <div style={{ background: "var(--hf-window-content)", padding: "26px 28px" }}>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--hf-ink)", margin: 0 }}>
        Shopify created <strong>4,312</strong> orders this week.
        <br />
        Webhooks fired for <strong>4,297</strong>.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--hf-ink-2)", margin: "12px 0 0" }}>
        Here are the{" "}
        <span style={{ color: "var(--hf-accent)", fontWeight: 600 }}>15 it never told you about</span>{" "}
        — worth <strong>$2,840</strong>.
      </p>
      <div
        style={{
          marginTop: 22,
          borderTop: "1px solid var(--hf-line)",
          paddingTop: 14,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11.5,
          color: "var(--hf-ink-2)",
        }}
      >
        {[
          ["#4297", "orders/create", "never delivered", "$312.00"],
          ["#4288", "orders/create", "never delivered", "$184.50"],
          ["#4251", "orders/paid", "never delivered", "$96.00"],
        ].map(([id, type, status, amt]) => (
          <div
            key={id}
            style={{
              display: "grid",
              gridTemplateColumns: "52px 1fr auto auto",
              gap: 12,
              padding: "7px 0",
              borderBottom: "1px solid var(--hf-line)",
            }}
          >
            <span style={{ color: "var(--hf-ink-4)" }}>{id}</span>
            <span>{type}</span>
            <span style={{ color: "var(--hf-ink-3)" }}>{status}</span>
            <span style={{ color: "var(--hf-ink)" }}>{amt}</span>
          </div>
        ))}
        <div style={{ padding: "10px 0 0", color: "var(--hf-ink-4)" }}>
          + 12 more · subscription-health findings included
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ Hero ════════════════ */
const Hero = () => (
  <div style={{ padding: "40px 28px 0" }}>
    <div className="hf-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 56,
          alignItems: "center",
          minHeight: 520,
        }}
      >
        <div style={{ paddingTop: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 12px",
              borderRadius: 999,
              border: "1px solid var(--hf-line)",
              background: "var(--hf-bg-3)",
              fontSize: 12,
              color: "var(--hf-ink-2)",
              marginBottom: 28,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--hf-accent)" }} />
            <span>Webhook reconciliation for Shopify stores</span>
          </div>
          <h1 className="hf-display" style={{ fontSize: 50, margin: 0, lineHeight: 1.07 }}>
            We find the orders Shopify{" "}
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
              never told you about
            </span>
            .
          </h1>
          <p style={{ marginTop: 22, fontSize: 16, lineHeight: 1.6, color: "var(--hf-ink-2)", maxWidth: 500 }}>
            Shopify&apos;s own docs say webhook delivery &ldquo;isn&apos;t always guaranteed&rdquo; — and tell you
            to build reconciliation yourself. We are that, as a service: for 7 days we record what Shopify
            actually fires, poll the Admin API for what actually happened, and hand you the diff — in dollars.
          </p>
          <div style={{ marginTop: 32 }}>
            <Link href={CTA_HREF} className="hf-btn pill">
              {CTA_LABEL}
            </Link>
          </div>
          <p className="hf-mono" style={{ marginTop: 16, fontSize: 11.5, color: "var(--hf-ink-3)" }}>
            Read-only API key · zero infra change · never in your critical path
          </p>
        </div>

        <div className="hf-landscape" style={{ padding: 28, display: "flex", alignItems: "center" }}>
          <SampleReport />
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ Evidence ════════════════ */
const EvidenceSection = () => {
  const items = [
    {
      src: "Shopify docs",
      quote:
        "Webhook delivery “isn’t always guaranteed” — apps are told to build their own reconciliation jobs.",
    },
    {
      src: "Dec 2025 · Shopify dev forums",
      quote:
        "A 5-year-stable app lost ~10% of orders/create webhooks for a week. The dashboard logs didn’t show it.",
    },
    {
      src: "Feb 2026 · Shopify dev forums",
      quote:
        "~1,400 delivered orders in Admin vs ~400–500 fulfillment webhooks received.",
    },
    {
      src: "Shopify retry policy",
      quote:
        "Events are dropped permanently after 8 retries over ~4 hours — and failing subscriptions are removed silently.",
    },
  ];
  return (
    <div id="evidence" className="hf-section" style={{ paddingTop: 80 }}>
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 36px" }}>
          <span className="hf-eyebrow">The problem · documented</span>
          <h2 className="hf-display" style={{ fontSize: 38, margin: "14px 0 0" }}>
            Delivery is best-effort.
            <br />
            The failure is{" "}
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
              silent
            </span>
            .
          </h2>
          <p className="hf-kicker" style={{ marginTop: 14 }}>
            Low-frequency, bursty, and correlated with the moments that matter most — flash sales,
            deploys, platform bugs. You don&apos;t notice until a customer asks where their order went.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {items.map((e) => (
            <div
              key={e.src}
              style={{
                background: "var(--hf-bg-3)",
                border: "1px solid var(--hf-line)",
                borderRadius: 14,
                padding: "22px 24px",
              }}
            >
              <div
                className="hf-mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--hf-accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                {e.src}
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--hf-ink)", margin: 0 }}>{e.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ How it works ════════════════ */
const HowSection = () => {
  const steps = [
    {
      n: "01",
      title: "Install in minutes",
      body:
        "A read-only Admin API key and one additional webhook subscription pointed at us. Shopify allows multiple subscriptions per topic — your existing flow is untouched, and we are never in the critical path.",
    },
    {
      n: "02",
      title: "7 days of recording",
      body:
        "We record every webhook Shopify actually fires and poll the Admin API every 5 minutes for ground truth. Events inside Shopify's documented latency window are never flagged — when in doubt, a gap is labeled unconfirmed, not lost.",
    },
    {
      n: "03",
      title: "The Gap Report",
      body:
        "What Shopify created vs what it told you about — each missing event priced in dollars, plus subscription-health findings: degraded endpoints, removal risk, API-version warnings. White-label it and send it to merchants under your own brand.",
    },
  ];
  return (
    <div id="how" className="hf-section">
      <div className="hf-container">
        <div className="hf-landscape" style={{ padding: "48px 48px 56px" }}>
          <div style={{ maxWidth: 560, marginBottom: 36 }}>
            <span className="hf-eyebrow">How it works</span>
            <h2 className="hf-display" style={{ fontSize: 36, margin: "12px 0 0" }}>
              Subscribe. Poll.{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                Diff
              </span>
              .
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {steps.map((s) => (
              <div
                key={s.n}
                style={{
                  background: "var(--hf-bg-3)",
                  border: "1px solid var(--hf-line)",
                  borderRadius: 12,
                  padding: "22px 22px 24px",
                }}
              >
                <div
                  className="hf-mono"
                  style={{ fontSize: 11, color: "var(--hf-accent)", marginBottom: 12 }}
                >
                  {s.n}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--hf-ink)", marginBottom: 8 }}>
                  {s.title}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--hf-ink-2)", margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
          <div
            className="hf-mono"
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid var(--hf-line)",
              fontSize: 11.5,
              color: "var(--hf-ink-3)",
            }}
          >
            SUBSCRIBE (additional, non-invasive) → RECORD → POLL ground truth every 5 min → DIFF → REPORT in dollars
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Not a proxy ════════════════ */
const PositioningSection = () => (
  <div className="hf-section">
    <div className="hf-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          alignItems: "center",
          background: "var(--hf-bg-3)",
          border: "1px solid var(--hf-line)",
          borderRadius: 16,
          padding: "44px 48px",
        }}
      >
        <div>
          <span className="hf-eyebrow">Why your proxy can&apos;t see this</span>
          <h2 className="hf-display" style={{ fontSize: 32, margin: "14px 0 0" }}>
            Proxies protect events the provider{" "}
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
              actually sent
            </span>
            .
          </h2>
          <p style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.65, color: "var(--hf-ink-2)" }}>
            Gateways like Hookdeck and Svix sit in the delivery path — if Shopify never fires the
            webhook, there is nothing for them to protect. We sit against the provider&apos;s API truth and
            catch what was never delivered at all. Different layer, different job: we work alongside
            them, not against them.
          </p>
        </div>
        <div
          className="hf-mono"
          style={{ fontSize: 12, lineHeight: 2, color: "var(--hf-ink-2)" }}
        >
          <div style={{ color: "var(--hf-ink-4)" }}>{"// delivery gateway"}</div>
          <div>provider → proxy → your endpoint</div>
          <div style={{ color: "var(--hf-ink-4)", marginTop: 12 }}>{"// delivery insurance (us)"}</div>
          <div>
            provider API <span style={{ color: "var(--hf-accent)" }}>⟲ polled</span> ⇄ diff ⇄ webhooks received
          </div>
          <div style={{ marginTop: 12, color: "var(--hf-ink-3)" }}>
            gap found → recovered, tagged <span style={{ color: "var(--hf-accent)" }}>source: reconciliation</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ Pricing ════════════════ */
const PricingSection = () => (
  <div id="pricing" className="hf-section">
    <div className="hf-container">
      <div style={{ textAlign: "center", maxWidth: 580, margin: "0 auto 40px" }}>
        <span className="hf-eyebrow">Pricing</span>
        <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0" }}>
          The audit is free.
          <br />
          Staying covered is{" "}
          <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
            $29 a store
          </span>
          .
        </h2>
        <p className="hf-kicker" style={{ marginTop: 14 }}>
          Shopify&apos;s recommended alternative is building reconciliation yourself: 2–3 weeks of
          engineering, then maintaining it forever.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 820, margin: "0 auto" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid var(--hf-line)",
            borderRadius: 16,
            padding: "28px 28px 24px",
          }}
        >
          <div
            className="hf-mono"
            style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            7-Day Gap Audit
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
            <span className="hf-num" style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.035em", color: "var(--hf-ink)", lineHeight: 1 }}>
              $0
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              "Full 7-day reconciliation against the Admin API",
              "Gap Report with dollar values per missing event",
              "Subscription-health findings",
              "White-label option for agencies",
              "Shareable report link — no login needed",
            ].map((f) => (
              <li key={f} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, fontSize: 12.5, color: "var(--hf-ink-2)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--hf-accent)" }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href={CTA_HREF} className="hf-btn pill" style={{ marginTop: 22, width: "100%", justifyContent: "center", display: "inline-flex" }}>
            Run the free audit →
          </Link>
        </div>

        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line-2)",
            borderRadius: 16,
            padding: "28px 28px 24px",
          }}
        >
          <div
            className="hf-mono"
            style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Continuous Revenue Assurance
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
            <span className="hf-num" style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.035em", color: "var(--hf-ink)", lineHeight: 1 }}>
              $29
            </span>
            <span style={{ color: "var(--hf-ink-3)", fontSize: 14 }}>/store/mo</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              "Reconciliation poll every 5 minutes, forever",
              "Gaps auto-recovered and delivered to your endpoint, tagged source: reconciliation",
              "Idempotent by provider event ID — safe alongside your existing webhooks",
              "Alerts before Shopify silently removes a degraded subscription",
              "Monthly revenue-assured statement",
              "~$19/store at 10+ stores for agencies",
            ].map((f) => (
              <li key={f} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, fontSize: 12.5, color: "var(--hf-ink-2)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--hf-accent)" }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="hf-mono" style={{ marginTop: 22, fontSize: 11, color: "var(--hf-ink-4)" }}>
            Starts after your audit — only if it found something worth protecting.
          </p>
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ Honesty note ════════════════ */
const HonestySection = () => (
  <div className="hf-section" style={{ paddingTop: 20 }}>
    <div className="hf-container" style={{ maxWidth: 720 }}>
      <div
        style={{
          border: "1px solid var(--hf-line)",
          borderRadius: 14,
          padding: "24px 28px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <div
          className="hf-mono"
          style={{ fontSize: 10.5, color: "var(--hf-accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}
        >
          What if the audit finds nothing?
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--hf-ink-2)", margin: 0 }}>
          Then you get a clean report proving your delivery is healthy — free, with the data to show
          for it. Gap loss is bursty: stores run clean for months, then a flash sale or a platform bug
          eats a week of orders. That&apos;s why the paid product exists; it&apos;s insurance, and the audit
          shows you your actual premium-vs-risk math instead of a hypothetical.
        </p>
      </div>
    </div>
  </div>
);

/* ════════════════ Final CTA ════════════════ */
const FinalCta = () => (
  <div className="hf-section-lg" style={{ textAlign: "center" }}>
    <div className="hf-container">
      <h2 className="hf-final">
        Audit before you{" "}
        <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
          trust
        </span>
        .
      </h2>
      <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
        <Link href={CTA_HREF} className="hf-btn pill">
          {CTA_LABEL}
        </Link>
      </div>
      <div className="hf-mono" style={{ marginTop: 18, fontSize: 12.5, color: "var(--hf-ink-3)" }}>
        read-only key · 7 days · report in dollars · free
      </div>
    </div>
  </div>
);

/* ════════════════ Footer ════════════════ */
const Footer = () => (
  <div className="hf-footer">
    <div className="hf-footer-grid hf-footer-3col">
      <div>
        <HFLogo />
        <p style={{ fontSize: 13, color: "var(--hf-ink-3)", marginTop: 14, maxWidth: 300, lineHeight: 1.55 }}>
          Continuous webhook reconciliation. We find what your provider never delivered — and recover it.
        </p>
      </div>
      <div>
        <div className="hf-footer-head">Product</div>
        <ul>
          <li>
            <Link href={CTA_HREF}>Free Gap Audit</Link>
          </li>
          <li>
            <Link href="#pricing">Pricing</Link>
          </li>
          <li>
            <Link href="/status">Status</Link>
          </li>
        </ul>
      </div>
      <div>
        <div className="hf-footer-head">Company</div>
        <ul>
          <li>
            <Link href="/login">Sign in</Link>
          </li>
          <li>
            <a href="mailto:hello@hookwise.dev">Contact</a>
          </li>
        </ul>
      </div>
    </div>
    <div className="hf-footer-bottom">
      <span>© 2026 HookWise</span>
      <ThemeToggleFooter />
      <span className="hf-mono">works alongside Hookdeck &amp; Svix — different layer</span>
    </div>
  </div>
);

/* ════════════════ Page ════════════════ */
export default function LandingPage() {
  return (
    <div className="hf-root">
      <HFNav />
      <Hero />
      <EvidenceSection />
      <HowSection />
      <PositioningSection />
      <PricingSection />
      <HonestySection />
      <FinalCta />
      <Footer />
    </div>
  );
}
