// v8 landing — Daylight (.design/HookWise Phase 0, Section 1).
// One page, one CTA: "Run a free 7-day gap audit."
// Sky blue (var(--hf-accent)) is the only action color; orange (var(--hf-accent-warm)) appears
// exclusively on dollar amounts. Lead with the gap and the dollars.

import Link from "next/link";
import { LogoMark } from "@/components/hw/logo";
import { ThemeToggleFooter } from "@/components/hw/theme-toggle-footer";

const CTA_HREF = "/signup";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

/* ════════════════ Nav ════════════════ */
const Nav = () => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "200px 1fr 240px",
      alignItems: "center",
      padding: "18px 32px",
      borderBottom: "1px solid var(--hf-line-soft)",
      maxWidth: 1280,
      margin: "0 auto",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <LogoMark size={22} />
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.03em" }}>trueline</div>
    </div>
    <div className="hf-nav-links" style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      <Link href="#how">How it works</Link>
      <Link href="#evidence">Evidence</Link>
      <Link href="#pricing">Pricing</Link>
    </div>
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
      <Link
        href="/login"
        style={{
          color: "var(--hf-ink-2)",
          fontSize: 13.5,
          fontWeight: 500,
          padding: "8px 14px",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Sign in
      </Link>
      <Link href={CTA_HREF} className="hf-btn pill small" style={{ fontSize: 13.5, padding: "9px 18px" }}>
        Run free audit
      </Link>
    </div>
  </div>
);

/* ════════════════ Diff ledger visual (hero right) ════════════════ */

function OkRow({ id, amount, received, last }: { id: string; amount: string; received: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 44px 1fr",
        alignItems: "center",
        padding: "11px 18px",
        borderBottom: last ? "none" : "1px solid var(--hf-line-soft)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500 }}>{id}</span>
        <span className="hf-num" style={{ fontFamily: mono, fontSize: 11.5, color: "var(--hf-ink-3)" }}>
          {amount}
        </span>
      </div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--hf-green-bg)",
            color: "var(--hf-green)",
            display: "grid",
            placeItems: "center",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)" }}>received {received}</div>
    </div>
  );
}

function GapRow({ id, amount, recoveredAt }: { id: string; amount: string; recoveredAt: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 44px 1fr",
        alignItems: "center",
        padding: "11px 18px",
        borderBottom: "1px solid var(--hf-line-soft)",
        background: "var(--hf-warm-bg)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500 }}>{id}</span>
        <span className="hf-num" style={{ fontFamily: mono, fontSize: 11.5, color: "var(--hf-accent-warm)", fontWeight: 600 }}>
          {amount}
        </span>
      </div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--hf-warm-bg)",
            color: "var(--hf-accent-warm)",
            display: "grid",
            placeItems: "center",
            fontSize: 10.5,
            fontWeight: 700,
          }}
        >
          !
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-warm)" }}>— never delivered</div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--hf-accent)",
            background: "var(--hf-accent-soft)",
            border: "1px solid var(--hf-accent-border)",
            borderRadius: 999,
            padding: "2px 9px",
          }}
        >
          ↻ recovered {recoveredAt} · source: reconciliation
        </div>
      </div>
    </div>
  );
}

const DiffLedger = () => (
  <div style={{ position: "relative" }}>
    <div
      style={{
        position: "absolute",
        inset: "-56px -48px -64px",
        background:
          "radial-gradient(58% 55% at 72% 24%, rgba(56,189,248,0.20) 0%, transparent 70%), radial-gradient(45% 45% at 12% 88%, rgba(221,80,8,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />

    <div
      style={{
        position: "relative",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        background: "var(--hf-bg-3)",
        overflow: "hidden",
        boxShadow:
          "0 1px 2px rgba(14,17,22,0.05), 0 12px 28px -16px rgba(3,105,161,0.18), 0 32px 72px -32px rgba(14,17,22,0.22)",
      }}
    >
      {/* card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: "1px solid var(--hf-line-soft)",
          background: "var(--hf-bg-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="hw-pulse-sky" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--hf-accent)" }} />
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: "var(--hf-ink)" }}>
            brightloom.myshopify.com
          </div>
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--hf-ink-4)",
          }}
        >
          live reconciliation
        </div>
      </div>

      {/* column heads */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 44px 1fr",
          alignItems: "center",
          padding: "10px 18px 8px",
          borderBottom: "1px solid var(--hf-bg-4)",
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--hf-accent)",
          }}
        >
          Admin API · truth
        </div>
        <div />
        <div
          style={{
            fontFamily: mono,
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--hf-ink-4)",
          }}
        >
          Your endpoint
        </div>
      </div>

      <OkRow id="#45-2379" amount="$74.00" received="09:11:42" />
      <GapRow id="#45-2381" amount="$214.50" recoveredAt="09:18:02" />
      <OkRow id="#45-2383" amount="$129.95" received="09:13:08" />
      <GapRow id="#45-2386" amount="$89.00" recoveredAt="09:18:02" />
      <OkRow id="#45-2390" amount="$56.20" received="09:16:51" last />

      {/* footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "11px 18px",
          background: "var(--hf-bg-2)",
          borderTop: "1px solid var(--hf-line-soft)",
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-ink-4)" }}>
          diff by provider_event_id · polled every 5 min
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--hf-accent)" }}>
          2 gaps · <span className="hf-num" style={{ color: "var(--hf-accent-warm)" }}>$303.50</span> recovered
        </div>
      </div>
    </div>

    {/* floating recovered badge */}
    <div
      style={{
        position: "absolute",
        right: -18,
        bottom: -26,
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 1px 2px rgba(14,17,22,0.05), 0 16px 40px -16px rgba(14,17,22,0.25)",
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--hf-ink-4)",
          marginBottom: 4,
        }}
      >
        Recovered this week
      </div>
      <div className="hf-num" style={{ fontSize: 18, fontWeight: 650, letterSpacing: "-0.02em", color: "var(--hf-accent-warm)" }}>
        $1,127.40
      </div>
    </div>
  </div>
);

/* ════════════════ Hero ════════════════ */
const Hero = () => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1.08fr",
      gap: 64,
      alignItems: "center",
      padding: "84px 64px 88px",
      maxWidth: 1280,
      margin: "0 auto",
    }}
  >
    <div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--hf-accent)",
          marginBottom: 22,
        }}
      >
        Shopify · Free 7-day gap audit
      </div>
      <h1
        style={{
          margin: "0 0 20px",
          fontSize: 50,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.06,
          textWrap: "balance",
        }}
      >
        Your store had 4,312 orders. Your webhooks say 4,297.
      </h1>
      <p style={{ margin: "0 0 32px", fontSize: 16.5, lineHeight: 1.55, color: "var(--hf-ink-2)", maxWidth: 480, textWrap: "pretty" }}>
        Shopify drops webhooks — their own docs tell you to build reconciliation. We are that, as a
        service: we diff what was fired against what actually happened, and recover the rest.
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Link href={CTA_HREF} className="hf-btn pill" style={{ fontSize: 14.5, padding: "12px 22px", borderRadius: 9 }}>
          Run a free 7-day gap audit
        </Link>
        <Link href={CTA_HREF} style={{ color: "var(--hf-accent)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
          See a sample report →
        </Link>
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 10.5,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--hf-ink-4)",
          marginTop: 24,
        }}
      >
        Read-only · zero infra change · never in your critical path
      </div>
    </div>

    <DiffLedger />
  </div>
);

/* ════════════════ Evidence band ════════════════ */
const EVIDENCE = [
  {
    quote: "Delivery “isn’t always guaranteed.” Their docs tell you to build reconciliation yourself.",
    src: "shopify.dev docs",
  },
  {
    quote: "~10% of orders/create missing for a week — on a five-year-stable app. Logs showed nothing.",
    src: "community forums · dec 2025",
  },
  {
    quote: "8 retries over ~4 hours, then the event is gone. Failing subscriptions are removed silently.",
    src: "delivery policy",
  },
];

const EvidenceBand = () => (
  <div id="evidence" style={{ borderTop: "1px solid var(--hf-line-soft)", borderBottom: "1px solid var(--hf-line-soft)", background: "var(--hf-bg-2)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", maxWidth: 1280, margin: "0 auto" }}>
      {EVIDENCE.map((e, i) => (
        <div key={e.src} style={{ padding: "28px 32px", borderRight: i < 2 ? "1px solid var(--hf-line-soft)" : "none" }}>
          <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.5, color: "var(--hf-ink)" }}>{e.quote}</p>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--hf-ink-4)",
            }}
          >
            {e.src}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ════════════════ How it works ════════════════ */
const STEPS: Array<{ n: string; title: string; body: React.ReactNode; active?: boolean }> = [
  {
    n: "01 — Subscribe",
    title: "",
    body: "An additional webhook subscription. Shopify allows multiple per topic — yours is untouched.",
    active: true,
  },
  {
    n: "02 — Record",
    title: "",
    body: "We log every webhook Shopify actually fires, keyed by provider event ID.",
  },
  {
    n: "03 — Poll",
    title: "",
    body: "A read-only poll of your Admin API every 5 minutes establishes ground truth.",
  },
  {
    n: "04 — Diff & recover",
    title: "",
    body: (
      <>
        Gaps are re-delivered, idempotent and tagged{" "}
        <span style={{ fontFamily: mono, fontSize: 12 }}>source: &#39;reconciliation&#39;</span>.
      </>
    ),
  },
];

const HowSection = () => (
  <div id="how" style={{ padding: "80px 64px 64px", maxWidth: 1280, margin: "0 auto" }}>
    <h2 style={{ margin: "0 0 36px", fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em" }}>
      Four steps. None of them touch your existing flow.
    </h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
      {STEPS.map((s) => (
        <div key={s.n} style={{ borderTop: `2px solid ${s.active ? "var(--hf-accent)" : "var(--hf-line-2)"}`, paddingTop: 16 }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 600,
              color: s.active ? "var(--hf-accent)" : "var(--hf-ink)",
              marginBottom: 8,
            }}
          >
            {s.n}
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--hf-ink-2)" }}>{s.body}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ════════════════ Pricing band ════════════════ */
const PricingBand = () => (
  <div id="pricing" style={{ maxWidth: 1280, margin: "0 auto" }}>
    <div
      style={{
        margin: "0 64px",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div style={{ padding: "36px 40px", borderRight: "1px solid var(--hf-line-soft)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>7-Day Gap Audit</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Free</div>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, lineHeight: 1.55, color: "var(--hf-ink-2)" }}>
          Every missed event on your store, in dollars. Subscription-health findings included.
          White-label for agencies.
        </p>
        <Link
          href={CTA_HREF}
          style={{
            display: "inline-block",
            border: "1px solid var(--hf-line-2)",
            color: "var(--hf-ink)",
            fontSize: 13.5,
            fontWeight: 550,
            padding: "9px 18px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Run free audit
        </Link>
      </div>
      <div style={{ padding: "36px 40px", background: "var(--hf-accent-tint)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Revenue Assurance</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
            $29
            <span style={{ fontSize: 12.5, color: "var(--hf-ink-4)", fontWeight: 450 }}> /store/mo</span>
          </div>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, lineHeight: 1.55, color: "var(--hf-ink-2)" }}>
          Continuous 5-minute reconciliation, automatic recovery, degraded-subscription alerts,
          monthly statement. $19/store at 10+.
        </p>
        <Link href={CTA_HREF} className="hf-btn pill" style={{ fontSize: 13.5 }}>
          Start monitoring
        </Link>
      </div>
    </div>
    <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-4)", textAlign: "center", padding: "16px 0 0" }}>
      vs. DIY per Shopify&#39;s docs: 2–3 weeks of engineering + maintenance, forever
    </div>
  </div>
);

/* ════════════════ Final CTA + footer ════════════════ */
const FinalCta = () => (
  <div style={{ textAlign: "center", padding: "88px 64px 56px", maxWidth: 1280, margin: "0 auto" }}>
    <div
      style={{
        fontSize: 48,
        fontWeight: 600,
        letterSpacing: "-0.032em",
        lineHeight: 1.1,
        marginBottom: 28,
        textWrap: "balance",
      }}
    >
      Run the audit. Read the receipts.
    </div>
    <Link href={CTA_HREF} className="hf-btn pill" style={{ fontSize: 14.5, padding: "12px 24px", borderRadius: 9 }}>
      Run a free 7-day gap audit
    </Link>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 72,
        paddingTop: 18,
        borderTop: "1px solid var(--hf-line-soft)",
        fontSize: 12,
        color: "var(--hf-ink-4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LogoMark size={16} />© 2026 trueline
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <span>Privacy</span>
        <span>Security</span>
        <Link href="/status" style={{ color: "inherit", textDecoration: "none" }}>
          Status
        </Link>
        <ThemeToggleFooter />
      </div>
    </div>
  </div>
);

/* ════════════════ Page ════════════════ */
export default function LandingPage() {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--hf-ink)",
        letterSpacing: "-0.011em",
        minHeight: "100vh",
        fontFamily: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Nav />
      <Hero />
      <EvidenceBand />
      <HowSection />
      <PricingBand />
      <FinalCta />
    </div>
  );
}
