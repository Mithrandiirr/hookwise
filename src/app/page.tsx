"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggleFooter } from "@/components/hw/theme-toggle-footer";

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
        <Link href="#platform">Platform</Link>
        <Link href="#investigation">Intelligence</Link>
        <Link href="#providers">Providers</Link>
        <Link href="#pricing">Pricing</Link>
        <Link href="/docs">Docs</Link>
        <Link href="/status">
          Status{" "}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#7ed98a",
              display: "inline-block",
              marginLeft: 4,
            }}
          />
        </Link>
      </div>
      <div className="hf-nav-right">
        <Link href="/dashboard" className="hf-btn ghost small">
          Open dashboard
        </Link>
        <Link href="/login" className="hf-btn outline small">
          Sign in
        </Link>
        <Link href="/scanner" className="hf-btn pill small">
          Start free
        </Link>
      </div>
    </div>
  </div>
);

/* ════════════════ Live counter ════════════════ */
const LiveCounter = () => {
  const [n, setN] = useState(82419);
  useEffect(() => {
    const id = setInterval(
      () => setN((v) => v + Math.floor(2 + Math.random() * 5)),
      1500,
    );
    return () => clearInterval(id);
  }, []);
  return <span className="hf-num">{n.toLocaleString()}</span>;
};

/* ════════════════ Hero feed ════════════════ */
type FeedRow = [string, string, string, string, string, string, string];
const HeroFeed = () => {
  const rows: FeedRow[] = [
    ["00:14.802", "200", "#7ed98a", "payment_intent.succeeded · stripe", "$248.00", "18ms", ""],
    ["00:14.412", "200", "#7ed98a", "charge.succeeded · stripe", "$248.00", "12ms", "↻ deduped"],
    ["00:13.998", "200", "#7ed98a", "orders.paid · shopify", "$58.00", "22ms", ""],
    ["00:13.502", "retry", "#fbbf24", "orders.create · shopify", "$192.00", "—", "2/8"],
    ["00:13.211", "recon", "#c4a5ff", "payment_intent.created · stripe", "$19.00", "—", "+ recovered"],
    ["00:12.918", "200", "#7ed98a", "charge.refunded · stripe", "-$12.00", "16ms", ""],
    ["00:12.604", "503", "#f29a9a", "orders.create · shopify", "$412.00", "4012ms", "↻ retry"],
    ["00:12.302", "200", "#7ed98a", "checkout.session.completed · stripe", "$75.00", "14ms", ""],
    ["00:11.911", "200", "#7ed98a", "user.subscription.updated · clerk", "—", "20ms", ""],
    ["00:11.480", "200", "#7ed98a", "payment_intent.succeeded · stripe", "$92.00", "18ms", ""],
    ["00:11.211", "200", "#7ed98a", "email.delivered · resend", "—", "12ms", ""],
    ["00:10.840", "hold", "#9ac7ff", "orders.create · shopify", "$140.00", "—", "seq wait"],
    ["00:10.502", "200", "#7ed98a", "payment_intent.succeeded · stripe", "$340.00", "16ms", ""],
    ["00:10.140", "200", "#7ed98a", "deploy.success · github", "—", "28ms", ""],
    ["00:09.812", "200", "#7ed98a", "payment_intent.succeeded · stripe", "$58.00", "16ms", ""],
  ];
  return (
    <div className="hf-win" style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 16px",
          background: "var(--hf-window-chrome)",
          borderBottom: "1px solid var(--hf-line)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(126,217,138,0.08)",
            border: "1px solid rgba(126,217,138,0.18)",
          }}
        >
          <span className="hf-dot-live" />
          <span
            className="hf-mono"
            style={{ fontSize: 10, color: "#7ed98a", letterSpacing: "0.1em" }}
          >
            LIVE
          </span>
        </div>
        <span style={{ fontSize: 13, color: "var(--hf-ink)", fontWeight: 500 }}>acme-production</span>
        <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>/ live feed</span>
        <div style={{ flex: 1 }} />
        <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)" }}>2,318 / hr</span>
        <span
          className="hf-mono"
          style={{
            fontSize: 10,
            color: "var(--hf-ink-3)",
            background: "rgba(255,255,255,0.04)",
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid var(--hf-line)",
          }}
        >
          ⌘K
        </span>
      </div>
      <div style={{ background: "var(--hf-window-content)", padding: "14px 0", height: "calc(100% - 49px)", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 70px 1fr 90px 60px",
            gap: 8,
            padding: "0 18px 8px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 9.5,
            color: "var(--hf-ink-4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderBottom: "1px solid var(--hf-line)",
          }}
        >
          <span>Time</span>
          <span>Status</span>
          <span>Event · Provider</span>
          <span style={{ textAlign: "right" }}>Amount</span>
          <span style={{ textAlign: "right" }}>p95</span>
        </div>
        <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "var(--hf-ink-2)" }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 70px 1fr 90px 60px",
                gap: 8,
                padding: "6px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.025)",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--hf-ink-4)" }}>{r[0]}</span>
              <span style={{ color: r[2], fontSize: 10 }}>{r[1]}</span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: i === 0 ? "var(--hf-ink)" : "var(--hf-ink-2)",
                }}
              >
                {r[3]}{" "}
                {r[6] && <span style={{ color: r[2], opacity: 0.7, marginLeft: 4 }}>{r[6]}</span>}
              </span>
              <span style={{ color: "var(--hf-ink-3)", textAlign: "right" }}>{r[4]}</span>
              <span style={{ color: "var(--hf-ink-4)", textAlign: "right", fontSize: 10.5 }}>{r[5]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Hero ════════════════ */
const Hero = () => (
  <div style={{ padding: "40px 28px 0" }}>
    <div className="hf-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr",
          gap: 56,
          alignItems: "stretch",
          minHeight: 540,
        }}
      >
        {/* LEFT */}
        <div style={{ paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
              alignSelf: "flex-start",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--hf-accent)" }} />
            <span>v0.4 · AI Investigation in public beta</span>
            <span style={{ color: "var(--hf-accent)" }}>→</span>
          </div>
          <h1 className="hf-display" style={{ fontSize: 52, margin: 0, lineHeight: 1.05 }}>
            Webhooks that don&apos;t drop.
            <br />
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Built for agents</span>.
          </h1>
          <p style={{ marginTop: 22, fontSize: 16, lineHeight: 1.55, color: "var(--hf-ink-2)", maxWidth: 480 }}>
            HookWise sits on top of your webhooks — Stripe, Shopify, GitHub, Clerk, Resend, anything that
            fires HTTP events. We catch what providers miss, diagnose failures with payload-aware AI, and
            reconcile against the provider&apos;s own truth.
          </p>
          <div style={{ marginTop: 32, display: "flex", gap: 14, alignItems: "center" }}>
            <Link href="/scanner" className="hf-btn pill">
              Start for free →
            </Link>
            <a className="hf-link-accent" style={{ cursor: "pointer" }}>
              Watch 90s demo →
            </a>
          </div>

          <div
            style={{
              marginTop: 40,
              padding: "20px 24px",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <div
              className="hf-mono"
              style={{
                fontSize: 10.5,
                color: "var(--hf-ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Events processed in the last 24h{" "}
              <span style={{ color: "#7ed98a", marginLeft: 6 }}>● live</span>
            </div>
            <div
              className="hf-num"
              style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--hf-ink)", marginTop: 4 }}
            >
              <LiveCounter />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 14, fontSize: 12 }}>
              <div>
                <div style={{ color: "var(--hf-ink-3)" }}>Delivered</div>
                <div className="hf-num" style={{ color: "#7ed98a", fontWeight: 500, fontSize: 13 }}>99.99%</div>
              </div>
              <div>
                <div style={{ color: "var(--hf-ink-3)" }}>Auto-recovered</div>
                <div className="hf-num" style={{ color: "var(--hf-accent)", fontWeight: 500, fontSize: 13 }}>312</div>
              </div>
              <div>
                <div style={{ color: "var(--hf-ink-3)" }}>p95 ack</div>
                <div className="hf-num" style={{ color: "var(--hf-ink)", fontWeight: 500, fontSize: 13 }}>18ms</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="hf-landscape" style={{ padding: 32, display: "flex", alignItems: "stretch" }}>
          <HeroFeed />
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ Trust strip ════════════════ */
const TrustStrip = () => (
  <div style={{ padding: "60px 28px 40px" }}>
    <div className="hf-container" style={{ display: "flex", alignItems: "center", gap: 40 }}>
      <div
        className="hf-mono"
        style={{
          fontSize: 12,
          color: "var(--hf-ink-3)",
          maxWidth: 200,
          lineHeight: 1.45,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Trusted by 1,200+ engineering teams →
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 48,
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--hf-ink-3)",
        }}
      >
        {["Ramp", "Linear", "Vercel", "Figma", "Cal.com", "Raycast", "PostHog", "Clerk"].map((n) => (
          <span key={n} style={{ opacity: 0.7 }}>{n}</span>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════ Pipeline ════════════════ */
const PipelineStage = ({
  icon,
  name,
  count,
  sub,
  status,
  color,
}: {
  icon: string;
  name: string;
  count: string;
  sub: string;
  status: string;
  color: string;
}) => (
  <div
    style={{
      flex: 1,
      background: "var(--hf-bg-3)",
      border: "1px solid var(--hf-line)",
      borderRadius: 12,
      padding: "18px 18px 16px",
      position: "relative",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--hf-line)",
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          color,
        }}
      >
        {icon}
      </span>
      <span
        className="hf-mono"
        style={{
          fontSize: 9.5,
          padding: "2px 6px",
          borderRadius: 999,
          background: status === "live" ? "rgba(126,217,138,0.1)" : "rgba(255,255,255,0.04)",
          color: status === "live" ? "#7ed98a" : "var(--hf-ink-3)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {status}
      </span>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--hf-ink)", letterSpacing: "-0.01em" }}>{name}</div>
    <div className="hf-num" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.025em", color, marginTop: 6 }}>
      {count}
    </div>
    <div style={{ fontSize: 11, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>
  </div>
);

const PipelineSection = () => {
  const stages = [
    { i: "⤓", n: "Smart Buffer", c: "82,419", s: "ack <50ms · 0 dropped", st: "live", cl: "#9ac7ff" },
    { i: "✓", n: "Idempotency", c: "412", s: "duplicates blocked", st: "live", cl: "#c4a5ff" },
    { i: "↻", n: "Smart Retry", c: "47", s: "in flight · 24h backoff", st: "live", cl: "#fbbf24" },
    { i: "◐", n: "Circuit Breaker", c: "0", s: "endpoints open · 1 half-open", st: "live", cl: "#f2b37a" },
    { i: "⟲", n: "Reconciler", c: "+7", s: "events recovered today", st: "live", cl: "#9ec396" },
  ];
  return (
    <div id="platform" className="hf-section" style={{ paddingTop: 60 }}>
      <div className="hf-container">
        <div className="hf-landscape" style={{ padding: "48px 48px 56px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, gap: 40 }}>
            <div style={{ flex: 1 }}>
              <span className="hf-eyebrow">Pipeline</span>
              <h2 className="hf-display" style={{ fontSize: 36, margin: "12px 0 0" }}>
                Five stages between provider and your{" "}
                <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>code</span>.
              </h2>
            </div>
            <p className="hf-kicker" style={{ maxWidth: 360, marginBottom: 4 }}>
              Each stage instrumented, queryable, replayable. Click any stage to drill into its metrics
              and last-failed events.
            </p>
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "stretch", gap: 0 }}>
            {stages.map((s, i) => (
              <span key={s.n} style={{ display: "contents" }}>
                <PipelineStage icon={s.i} name={s.n} count={s.c} sub={s.s} status={s.st} color={s.cl} />
                {i < stages.length - 1 && (
                  <div
                    className="hf-mono"
                    style={{ display: "grid", placeItems: "center", padding: "0 6px", color: "var(--hf-ink-4)", fontSize: 16 }}
                  >
                    →
                  </div>
                )}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 20,
              borderTop: "1px solid var(--hf-line)",
            }}
          >
            <div className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>
              provider → <span style={{ color: "var(--hf-ink-2)" }}>HookWise</span> → your handler · ack within 50ms always, processed asynchronously
            </div>
            <a className="hf-link-accent" style={{ cursor: "pointer" }}>Architecture deep-dive →</a>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Day timeline ════════════════ */
const DayTimeline = () => {
  const rows = [
    { t: "09:42:01", p: "clerk", pc: "#c4a5ff", e: "user.created", a: "—", n: "Maya signed up" },
    { t: "09:42:08", p: "stripe", pc: "#9ac7ff", e: "customer.created", a: "—", n: "Stripe customer linked" },
    { t: "09:43:14", p: "shopify", pc: "#9ec396", e: "checkout.session.completed", a: "$248", n: "Bouquet · same-day delivery" },
    { t: "09:43:14", p: "stripe", pc: "#9ac7ff", e: "payment_intent.succeeded", a: "$248", n: "" },
    { t: "09:43:15", p: "shopify", pc: "#9ec396", e: "orders.paid", a: "—", n: "fulfillment kicked off" },
    { t: "09:43:18", p: "resend", pc: "#f2b37a", e: "email.delivered", a: "receipt", n: "" },
    { t: "14:22:09", p: "shopify", pc: "#9ec396", e: "orders.create", a: "$192", n: "Second order · returning customer" },
    { t: "14:22:09", p: "shopify", pc: "#fbbf24", e: "orders.create", a: "↻ 2/8", n: "Endpoint 503 — Smart Retry took over", warn: true },
    { t: "14:22:14", p: "shopify", pc: "#9ec396", e: "orders.create", a: "delivered", n: "Recovered after 5s" },
    { t: "16:08:02", p: "stripe", pc: "#9ac7ff", e: "payment_intent.succeeded", a: "$192", n: "" },
    { t: "23:11:48", p: "stripe", pc: "#c4a5ff", e: "payment_intent.created", a: "+ recovered", n: "Reconciler poll · provider missed firing", warn: true },
    { t: "23:11:48", p: "stripe", pc: "#9ac7ff", e: "payment_intent.succeeded", a: "$58", n: "Recovered before customer noticed" },
  ];
  return (
    <div className="hf-win" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
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
          Customer Timeline
        </span>
        <span style={{ width: 1, height: 14, background: "var(--hf-line)" }} />
        <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-2)" }}>cus_OqA1m9</span>
        <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>maya@thursdaybloom.co</span>
        <div style={{ flex: 1 }} />
        <span
          className="hf-mono"
          style={{
            fontSize: 11,
            color: "var(--hf-ink-2)",
            padding: "3px 8px",
            border: "1px solid var(--hf-line)",
            borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          Last 24h ⌄
        </span>
      </div>
      <div style={{ background: "var(--hf-window-content)", padding: "26px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center", marginBottom: 20 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "linear-gradient(135deg, #ff8a50, #c94a1a)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            M
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink)" }}>Maya R. — Thursday Bloom</div>
            <div className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>
              customer since 2024-08 · LTV $2,418 · 3 providers linked
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="hf-change-chip" style={{ color: "#9ac7ff" }}>stripe</span>
            <span className="hf-change-chip" style={{ color: "#9ec396" }}>shopify</span>
            <span className="hf-change-chip" style={{ color: "#c4a5ff" }}>clerk</span>
          </div>
        </div>

        <div style={{ position: "relative", marginTop: 8 }}>
          <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 1.5, background: "var(--hf-line-2)" }} />
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 80px 90px 1fr auto",
                gap: 14,
                padding: "10px 0",
                alignItems: "center",
                borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: r.pc,
                  marginLeft: 2,
                  zIndex: 1,
                  boxShadow: "0 0 0 3px var(--hf-window-content)",
                }}
              />
              <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{r.t}</span>
              <span className="hf-mono" style={{ fontSize: 11, color: r.pc }}>{r.p}</span>
              <div>
                <div style={{ fontSize: 13, color: "var(--hf-ink)" }}>{r.e}</div>
                {r.n && (
                  <div style={{ fontSize: 11.5, color: r.warn ? "#fbbf24" : "var(--hf-ink-3)", marginTop: 2 }}>{r.n}</div>
                )}
              </div>
              <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r.a}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--hf-line)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {[
            ["Events delivered", "6 / 6", "#7ed98a"],
            ["Auto-recovered", "1", "var(--hf-accent)"],
            ["Failures auto-handled", "2", "var(--hf-ink)"],
            ["Engineer time", "0 min", "var(--hf-ink)"],
          ].map(([l, v, c]) => (
            <div key={l}>
              <div
                className="hf-mono"
                style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                {l}
              </div>
              <div className="hf-num" style={{ fontSize: 19, fontWeight: 500, color: c, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DaySection = () => (
  <div className="hf-section">
    <div className="hf-container">
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 36px" }}>
        <span className="hf-eyebrow">A day in the life</span>
        <h2 className="hf-display" style={{ fontSize: 40, margin: "14px 0 0" }}>
          One customer. Three providers.
          <br />
          <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Zero engineer minutes</span>.
        </h2>
        <p className="hf-kicker" style={{ marginTop: 16, maxWidth: 540, marginLeft: "auto", marginRight: "auto" }}>
          A real timeline from acme-production. Two failures handled, one provider gap recovered —
          the kind of incident proxy tools never even surface.
        </p>
      </div>
      <DayTimeline />
    </div>
  </div>
);

/* ════════════════ Compare ════════════════ */
const CompareSection = () => {
  const rows: Array<[string, string, string, string]> = [
    ["Webhook ingest with <50ms ack", "✓", "✓", "—"],
    ["Automatic retries with backoff", "✓", "✓", "DIY"],
    ["Idempotency / dedup", "✓", "partial", "DIY"],
    ["Reconciliation against provider's truth", "✓", "—", "—"],
    ["Cross-provider customer graph", "✓", "—", "—"],
    ["AI diagnosis with payload-aware reasoning", "✓", "—", "—"],
    ["Append-only audit log + replay history", "✓", "partial", "DIY"],
    ["Free webhook health scanner", "✓", "—", "—"],
  ];
  return (
    <div id="reconciler" className="hf-section">
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          <span className="hf-eyebrow">Vs the alternatives</span>
          <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0" }}>
            Proxy tools show the <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>traffic</span>.
            <br />
            We show the <span className="hf-serif" style={{ color: "#9ac7ff" }}>truth</span>.
          </h2>
        </div>

        <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 16, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              padding: "20px 28px",
              borderBottom: "1px solid var(--hf-line-2)",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <span
              className="hf-mono"
              style={{ fontSize: 12, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Capability
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-accent)", textAlign: "center" }}>HookWise</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink-2)", textAlign: "center" }}>Hookdeck / Svix</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink-2)", textAlign: "center" }}>DIY queue</span>
          </div>
          {rows.map(([cap, hw, px, dy], i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "16px 28px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--hf-line)" : "none",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13.5, color: "var(--hf-ink)" }}>{cap}</span>
              {[hw, px, dy].map((v, j) => {
                const isWeak = v === "DIY" || v === "partial";
                return (
                  <span
                    key={j}
                    style={{
                      textAlign: "center",
                      fontFamily: isWeak ? "var(--font-jetbrains-mono), monospace" : "var(--font-inter), sans-serif",
                      color:
                        v === "✓"
                          ? j === 0
                            ? "var(--hf-accent)"
                            : "#7ed98a"
                          : v === "—"
                            ? "var(--hf-ink-4)"
                            : "#fbbf24",
                      fontSize: isWeak ? 11.5 : 16,
                      fontWeight: 500,
                    }}
                  >
                    {v}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Investigation ════════════════ */
const InvestigationSection = () => (
  <div id="investigation" className="hf-section">
    <div className="hf-container">
      <div className="hf-landscape blue" style={{ padding: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 56, alignItems: "center" }}>
          <div>
            <span className="hf-eyebrow" style={{ color: "#9ac7ff" }}>AI Investigation</span>
            <h2 className="hf-display" style={{ fontSize: 34, margin: "14px 0 0" }}>
              <span className="hf-serif" style={{ color: "#9ac7ff" }}>Ask</span> your webhooks.
            </h2>
            <p className="hf-kicker" style={{ marginTop: 16 }}>
              Investigation queries delivery history, endpoint health, provider status, schema drift,
              prior incidents, flow state, and revenue impact in parallel — and returns a root cause
              with a one-click fix.
            </p>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["MTTR p50", "4.6s", "var(--hf-accent)"],
                ["Confidence", "0.94", "var(--hf-ink)"],
                ["Fix reuse", "62%", "#9ac7ff"],
                ["Sources", "7", "var(--hf-ink)"],
              ].map(([l, v, c]) => (
                <div
                  key={l}
                  style={{
                    border: "1px solid var(--hf-line)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div
                    className="hf-mono"
                    style={{ fontSize: 10, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    {l}
                  </div>
                  <div className="hf-num" style={{ fontSize: 22, fontWeight: 500, color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hf-win">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                background: "var(--hf-window-chrome)",
                borderBottom: "1px solid var(--hf-line)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.22)",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#fbbf24" }} />
                <span
                  className="hf-mono"
                  style={{ fontSize: 10, color: "#fbbf24", letterSpacing: "0.1em" }}
                >
                  INC-0441
                </span>
              </div>
              <span style={{ fontSize: 13, color: "var(--hf-ink)", fontWeight: 500 }}>Investigation</span>
              <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>· 04:12 UTC</span>
              <div style={{ flex: 1 }} />
              <span
                className="hf-mono"
                style={{
                  fontSize: 11,
                  color: "#9ac7ff",
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(154,199,255,0.08)",
                  border: "1px solid rgba(154,199,255,0.22)",
                }}
              >
                94% match
              </span>
            </div>
            <div style={{ background: "var(--hf-window-content)", padding: "22px 24px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                <span style={{ color: "var(--hf-accent)", marginTop: 2 }}>›</span>
                <span style={{ color: "var(--hf-ink)" }}>why did orders.create start 503ing at 04:12?</span>
              </div>

              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--hf-line)" }}>
                <div
                  className="hf-mono"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                    fontSize: 11,
                    color: "var(--hf-ink-3)",
                  }}
                >
                  <span style={{ color: "var(--hf-accent)" }}>✦ HookWise</span>
                  <span>·</span>
                  <span>queried 7 sources</span>
                  <span>·</span>
                  <span>4.6s</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--hf-ink-2)", margin: 0 }}>
                  DB pool exhausted on <span style={{ color: "var(--hf-ink)" }}>acme-production</span>.
                  Stripe is clean (99.97% parity). Endpoint latency jumped{" "}
                  <span style={{ color: "#fbbf24" }}>61ms → 4,012ms</span> at 04:12 — matches prior incident{" "}
                  <span className="hf-mono" style={{ color: "#c4a5ff" }}>INC-0318</span> at{" "}
                  <span style={{ color: "var(--hf-ink)" }}>94% confidence</span>. That one was fixed by
                  scaling pg connections 20 → 60. The patch applies unchanged.
                </p>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: "12px 14px",
                  border: "1px solid var(--hf-line)",
                  borderRadius: 10,
                  background: "rgba(255,107,44,0.06)",
                }}
              >
                <div
                  className="hf-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--hf-accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Suggested fix
                </div>
                <code className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink)" }}>
                  DATABASE_POOL_MAX=20 → <span style={{ color: "#7ed98a" }}>60</span>
                </code>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button className="hf-btn pill small">Apply fix</button>
                <button className="hf-btn outline small">Open INC-0318</button>
                <button className="hf-btn ghost small">Why this match?</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ Install ════════════════ */
type CodeLine = string[];
type CodeTab = { title: string; lines: CodeLine[] };
const InstallSection = () => {
  const [tab, setTab] = useState(0);
  const code: CodeTab[] = [
    {
      title: "Node.js",
      lines: [
        ["import", " ", "{ HookWise }", " ", "from", " ", "'hookwise'"],
        [],
        ["const", " ", "hw", " ", "=", " ", "new", " ", "HookWise", "({"],
        ["  ", "key:", " ", "process.env.HOOKWISE_KEY,"],
        ["  ", "providers:", " ", "['stripe',", " ", "'shopify',", " ", "'clerk']"],
        ["})"],
        [],
        ["app.post(", "'/webhook'", ", ", "hw.handler())"],
      ],
    },
    {
      title: "Python",
      lines: [
        ["from", " ", "hookwise", " ", "import", " ", "HookWise"],
        [],
        ["hw", " ", "=", " ", "HookWise("],
        ["  ", "key=os.environ[", "'HOOKWISE_KEY'", "],"],
        ["  ", "providers=[", "'stripe'", ", ", "'shopify'", ", ", "'clerk'", "]"],
        [")"],
        [],
        ["app.add_route(", "'/webhook'", ", ", "hw.handler())"],
      ],
    },
    {
      title: "Curl",
      lines: [
        ["curl", " ", "-X", " ", "POST", " ", "https://api.hookwise.com/v1/endpoints", " ", "\\"],
        ["  ", "-H", " ", "'Authorization: Bearer $HW_KEY'", " ", "\\"],
        ["  ", "-d", " ", "'{\"provider\":\"stripe\",\"url\":\"https://acme.com/wh\"}'"],
      ],
    },
  ];

  const KEYWORDS = [
    "import", "from", "const", "new", "app.post", "def", "return", "await",
    "async", "let", "var", "function", "app.add_route", "curl", "-X", "-H", "-d", "POST",
  ];

  return (
    <div className="hf-section">
      <div className="hf-container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          <div>
            <span className="hf-eyebrow">Install</span>
            <h2 className="hf-display" style={{ fontSize: 38, margin: "14px 0 0" }}>
              60 seconds.
              <br />
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>One env var</span>.
            </h2>
            <p className="hf-kicker" style={{ marginTop: 16 }}>
              Drop in our handler, point your provider webhooks at HookWise, and watch the live feed light up.
              No data migration, no breaking changes.
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <Link href="/scanner" className="hf-btn pill">Get your key →</Link>
              <a className="hf-link-accent" style={{ cursor: "pointer" }}>Read full docs →</a>
            </div>
          </div>

          <div className="hf-win">
            <div className="hf-win-tb">
              <div className="hf-lights"><span /><span /><span /></div>
              <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 4 }}>
                {code.map((c, i) => (
                  <button
                    key={c.title}
                    onClick={() => setTab(i)}
                    className="hf-mono"
                    style={{
                      background: i === tab ? "rgba(255,255,255,0.06)" : "transparent",
                      color: i === tab ? "var(--hf-ink)" : "var(--hf-ink-3)",
                      border: "1px solid " + (i === tab ? "var(--hf-line-2)" : "transparent"),
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="hf-code" style={{ padding: "18px 20px", minHeight: 200, background: "var(--hf-code-bg)" }}>
              {code[tab].lines.map((ln, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", color: "var(--hf-ink-2)", lineHeight: 1.7 }}>
                  <span style={{ color: "var(--hf-ink-4)", textAlign: "right", paddingRight: 10, userSelect: "none", fontSize: 11 }}>
                    {i + 1}
                  </span>
                  <span>
                    {ln.map((tk, j) => {
                      const k = tk.trim();
                      const isKw = KEYWORDS.some((w) => k.startsWith(w));
                      const isStr =
                        (k.startsWith("'") || k.startsWith('"')) && (k.endsWith("'") || k.endsWith('"'));
                      const isFn = ["HookWise", "handler", "handler()"].includes(k.replace(/[(){}]/g, ""));
                      return (
                        <span
                          key={j}
                          style={{
                            color: isKw
                              ? "#c4a5ff"
                              : isStr
                                ? "#98d59a"
                                : isFn
                                  ? "#9ac7ff"
                                  : "var(--hf-ink-2)",
                          }}
                        >
                          {tk}
                        </span>
                      );
                    })}
                  </span>
                </div>
              ))}
              <div
                className="hf-mono"
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  background: "rgba(126,217,138,0.08)",
                  border: "1px solid rgba(126,217,138,0.2)",
                  borderRadius: 6,
                  color: "#7ed98a",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>✓</span>
                <span>HookWise endpoint registered. First event acked in 18ms.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Stats row ════════════════ */
const StatsRow = () => (
  <div className="hf-section" style={{ padding: "60px 28px" }}>
    <div className="hf-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          borderTop: "1px solid var(--hf-line)",
          borderBottom: "1px solid var(--hf-line)",
        }}
      >
        {[
          ["480M", "events processed in May", "var(--hf-ink)"],
          ["38,419", "events auto-recovered by reconciler", "var(--hf-accent)"],
          ["99.997%", "delivery rate — last 30 days", "#7ed98a"],
          ["4.6s", "median MTTR with AI diagnosis", "#9ac7ff"],
        ].map(([v, l, c], i) => (
          <div key={i} style={{ padding: "32px 28px", borderRight: i < 3 ? "1px solid var(--hf-line)" : "none" }}>
            <div className="hf-num" style={{ fontSize: 42, fontWeight: 500, color: c, letterSpacing: "-0.035em", lineHeight: 1 }}>
              {v}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 10, lineHeight: 1.4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════ Testimonials ════════════════ */
const TestimonialStrip = () => {
  const items = [
    { q: "Found three weeks of silent order failures in our first hour. Paid for itself by lunch.", n: "Maya R.", r: "CTO · Thursday Bloom" },
    { q: "Investigation matched a prior incident and linked the exact PR that fixed it. Wild.", n: "Devon K.", r: "Staff Eng · Lattice Pay" },
    { q: "Replaced three internal tools. Dashboards in dollars instead of opaque counts. Finally.", n: "Priya S.", r: "Head of Platform · Cove" },
    { q: "Reconciler caught a Stripe gap during their incident week. Six-figure save before we noticed.", n: "Theo L.", r: "Eng Lead · Northwind" },
    { q: "Cross-provider timeline is the dashboard I've wanted for five years.", n: "Sasha B.", r: "Founder · Onset" },
    { q: "Our incident MTTR dropped from 47 minutes to under 6.", n: "Erik N.", r: "VP Eng · Glance" },
  ];
  return (
    <div className="hf-section" style={{ padding: "80px 0" }}>
      <div style={{ textAlign: "center", padding: "0 28px 40px" }}>
        <span className="hf-eyebrow">Customers</span>
        <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0" }}>
          Built for teams that&apos;ve{" "}
          <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>lost webhooks</span> at 3am.
        </h2>
      </div>
      <div className="hf-tt-strip">
        <div className="hf-tt-track">
          {[...items, ...items].map((t, i) => (
            <div key={i} className="hf-tt-card">
              <p className="hf-tt-quote">&ldquo;{t.q}&rdquo;</p>
              <div className="hf-tt-author">
                <span className="avatar">{t.n[0]}</span>
                <div>
                  <div className="hf-tt-name">{t.n}</div>
                  <div className="hf-tt-role">{t.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Pricing ════════════════ */
type PricingTier = {
  name: string;
  price: string;
  blurb: string;
  events: string;
  retention: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const PricingSection = () => {
  const tiers: PricingTier[] = [
    {
      name: "Free",
      price: "$0",
      blurb: "For trying HookWise on a single integration.",
      events: "10K events / mo",
      retention: "7-day retention",
      features: [
        "Smart Buffer + Idempotency + Retry + Circuit Breaker",
        "Reconciler — 1 provider",
        "AI Diagnosis · 10/mo",
        "Cross-provider event graph",
        "Dashboard tiles",
      ],
      cta: "Start free",
    },
    {
      name: "Pro",
      price: "$79",
      blurb: "For teams shipping production webhooks.",
      events: "500K events / mo",
      retention: "30-day retention",
      features: [
        "Everything in Free",
        "Unlimited integrations",
        "Reconciler — all supported providers",
        "AI Diagnosis · unlimited",
        "Anomaly detection + weekly report",
        "Alerting (Slack / email / webhook)",
        "3 team seats",
      ],
      cta: "Choose Pro",
      highlight: true,
    },
    {
      name: "Business",
      price: "$299",
      blurb: "For teams with compliance and audit needs.",
      events: "5M events / mo",
      retention: "1-year retention",
      features: [
        "Everything in Pro",
        "Compliance audit trail + exports",
        "Security scanner",
        "Custom retention",
        "Unlimited team seats",
        "Priority support + Slack",
      ],
      cta: "Talk to sales",
    },
  ];

  return (
    <div id="pricing" className="hf-section">
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 580, margin: "0 auto 40px" }}>
          <span className="hf-eyebrow">Pricing</span>
          <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0" }}>
            Three plans.{" "}
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>One product</span>.
          </h2>
          <p className="hf-kicker" style={{ marginTop: 14 }}>
            Same pipeline, same reconciler, same AI diagnosis at every tier. Pay for events and
            retention, not seats.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {tiers.map((t) => (
            <div
              key={t.name}
              style={{
                background: t.highlight ? "var(--hf-bg-3)" : "rgba(255,255,255,0.015)",
                border: t.highlight
                  ? "1px solid var(--hf-accent-soft, rgba(154,199,255,0.35))"
                  : "1px solid var(--hf-line)",
                borderRadius: 16,
                padding: "28px 28px 24px",
                position: "relative",
                boxShadow: t.highlight ? "0 0 0 1px var(--hf-accent), 0 24px 60px -30px rgba(154,199,255,0.45)" : "none",
              }}
            >
              {t.highlight && (
                <span
                  className="hf-mono"
                  style={{
                    position: "absolute",
                    top: -10,
                    left: 24,
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "var(--hf-accent)",
                    color: "var(--hf-bg)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Most popular
                </span>
              )}
              <div
                className="hf-mono"
                style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {t.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
                <span
                  className="hf-num"
                  style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.035em", color: "var(--hf-ink)", lineHeight: 1 }}
                >
                  {t.price}
                </span>
                <span style={{ color: "var(--hf-ink-3)", fontSize: 14 }}>/mo</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--hf-ink-3)", marginTop: 10, lineHeight: 1.5 }}>{t.blurb}</p>
              <div
                className="hf-mono"
                style={{
                  marginTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 11.5,
                  color: "var(--hf-ink-2)",
                }}
              >
                <span>{t.events}</span>
                <span>{t.retention}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 9 }}>
                {t.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "16px 1fr",
                      gap: 8,
                      fontSize: 12.5,
                      color: "var(--hf-ink-2)",
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ color: "var(--hf-accent)" }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={t.highlight ? "hf-btn pill" : "hf-btn outline"}
                style={{ marginTop: 22, width: "100%", justifyContent: "center" }}
              >
                {t.cta} →
              </button>
            </div>
          ))}
        </div>

        <p
          className="hf-mono"
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 11.5,
            color: "var(--hf-ink-4)",
            letterSpacing: "0.04em",
          }}
        >
          Money providers (Stripe, Shopify, Paddle, Chargebee, Lemon Squeezy) on Business can opt into
          revenue-protected pricing — 1% of reconciled revenue, capped at $999/mo. Sales conversation.
        </p>
      </div>
    </div>
  );
};

/* ════════════════ Three Pillars ════════════════ */
const ThreePillarsSection = () => {
  const pillars = [
    {
      eyebrow: "Pillar 1",
      title: "Reliability",
      tagline: "Never lose an event.",
      body:
        "Smart Buffer ack at <50ms on Vercel Edge. Idempotency dedup by provider event ID. Smart Retry per error type. Three-state circuit breaker. Reconciler polls the provider's own events API and auto-ingests gaps.",
      metric: ["99.997%", "delivery rate · 30d"],
      color: "var(--hf-accent)",
    },
    {
      eyebrow: "Pillar 2",
      title: "Intelligence",
      tagline: "Know what broke and why.",
      body:
        "On any anomaly, Claude is given seven structured inputs in parallel — payload, endpoint history, provider known issues, prior incidents, schema diff, correlated events, provider reliability score — and returns a root cause with a one-click fix.",
      metric: ["4.6s", "median MTTR"],
      color: "#9ac7ff",
    },
    {
      eyebrow: "Pillar 3",
      title: "Universal",
      tagline: "Any webhook source. No lock-in.",
      body:
        "Stripe, Shopify, GitHub, Clerk, Resend, or any provider firing HTTP events — same pipeline, same diagnosis, same dashboard. Reconciliation activates wherever the provider exposes a queryable Events API. The capability matrix is honest, not marketing.",
      metric: ["any", "webhook source"],
      color: "#9ec396",
    },
  ];

  return (
    <div id="platform" className="hf-section" style={{ paddingTop: 80 }}>
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 36px" }}>
          <span className="hf-eyebrow">Three pillars</span>
          <h2 className="hf-display" style={{ fontSize: 38, margin: "14px 0 0" }}>
            Reliable.{" "}
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Intelligent</span>.
            <br />
            Universal.
          </h2>
          <p className="hf-kicker" style={{ marginTop: 14 }}>
            Three things every webhook system needs and almost none have. Universal across any provider —
            payments, ops, infra, custom.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {pillars.map((p) => (
            <div
              key={p.title}
              style={{
                background: "var(--hf-bg-3)",
                border: "1px solid var(--hf-line)",
                borderRadius: 16,
                padding: "26px 26px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle at top right, ${p.color}1a, transparent 60%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <span
                  className="hf-mono"
                  style={{
                    fontSize: 10,
                    color: p.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {p.eyebrow}
                </span>
                <h3
                  style={{
                    fontSize: 24,
                    margin: "8px 0 4px",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: "var(--hf-ink)",
                  }}
                >
                  {p.title}
                </h3>
                <div
                  className="hf-serif"
                  style={{ fontSize: 16, fontStyle: "italic", color: p.color, marginBottom: 10 }}
                >
                  {p.tagline}
                </div>
                <p style={{ fontSize: 13, color: "var(--hf-ink-2)", lineHeight: 1.55, margin: 0 }}>
                  {p.body}
                </p>
              </div>
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: 18,
                  borderTop: "1px solid var(--hf-line)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <span className="hf-num" style={{ fontSize: 22, fontWeight: 500, color: "var(--hf-ink)", letterSpacing: "-0.02em" }}>
                  {p.metric[0]}
                </span>
                <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)" }}>
                  {p.metric[1]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Provider matrix ════════════════ */
const ProviderMatrixSection = () => {
  type Mark = "y" | "n" | "p" | "d";
  const Cell = ({ v }: { v: Mark }) => {
    const map: Record<Mark, { ch: string; c: string }> = {
      y: { ch: "✓", c: "#7ed98a" },
      n: { ch: "—", c: "var(--hf-ink-4)" },
      p: { ch: "partial", c: "#fbbf24" },
      d: { ch: "depends", c: "var(--hf-ink-3)" },
    };
    const { ch, c } = map[v];
    return (
      <span
        style={{
          display: "block",
          textAlign: "center",
          color: c,
          fontFamily: v === "p" || v === "d" ? "var(--font-jetbrains-mono), monospace" : "var(--font-inter), sans-serif",
          fontSize: v === "p" || v === "d" ? 11 : 14,
        }}
      >
        {ch}
      </span>
    );
  };

  const cols: Array<{ name: string; sub?: string }> = [
    { name: "Stripe" },
    { name: "Shopify" },
    { name: "Paddle / Chargebee /\nLemon Squeezy", sub: "Tier A" },
    { name: "Clerk" },
    { name: "Resend" },
    { name: "GitHub" },
    { name: "Linear / Sentry /\nGeneric", sub: "Tier C" },
  ];

  type Row = [string, Mark, Mark, Mark, Mark, Mark, Mark, Mark];
  const rows: Row[] = [
    ["Smart Buffer + Idempotency + Retry", "y", "y", "y", "y", "y", "y", "y"],
    ["Circuit Breaker + Replay", "y", "y", "y", "y", "y", "y", "y"],
    ["AI Diagnosis (payload-aware)", "y", "y", "y", "y", "y", "y", "y"],
    ["Append-only audit log", "y", "y", "y", "y", "y", "y", "y"],
    ["Reconciliation Engine", "y", "y", "p", "y", "y", "p", "d"],
    ["Revenue tiles in dashboard", "y", "y", "y", "n", "n", "n", "n"],
  ];

  return (
    <div id="providers" className="hf-section">
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
          <span className="hf-eyebrow">Per-provider capabilities</span>
          <h2 className="hf-display" style={{ fontSize: 32, margin: "14px 0 0" }}>
            Honest about what works{" "}
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>where</span>.
          </h2>
          <p className="hf-kicker" style={{ marginTop: 14 }}>
            Reliability and AI Diagnosis work for any webhook source. Reconciliation needs a queryable
            Events API. Revenue tiles only render when a money provider is connected.
          </p>
        </div>

        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `2fr repeat(${cols.length}, 1fr)`,
              padding: "16px 24px",
              borderBottom: "1px solid var(--hf-line-2)",
              background: "rgba(255,255,255,0.015)",
              alignItems: "end",
            }}
          >
            <span
              className="hf-mono"
              style={{ fontSize: 11, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Capability
            </span>
            {cols.map((c) => (
              <div key={c.name} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--hf-ink-2)",
                    whiteSpace: "pre-line",
                    lineHeight: 1.25,
                  }}
                >
                  {c.name}
                </div>
                {c.sub && (
                  <div
                    className="hf-mono"
                    style={{ fontSize: 9.5, color: "var(--hf-ink-4)", marginTop: 2, letterSpacing: "0.06em" }}
                  >
                    {c.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
          {rows.map((r, i) => {
            const [cap, ...marks] = r;
            return (
              <div
                key={cap}
                style={{
                  display: "grid",
                  gridTemplateColumns: `2fr repeat(${cols.length}, 1fr)`,
                  padding: "14px 24px",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--hf-line)" : "none",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--hf-ink)" }}>{cap}</span>
                {marks.map((m, j) => (
                  <Cell key={j} v={m as Mark} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ Final CTA ════════════════ */
const FinalCta = () => (
  <div className="hf-section-lg" style={{ textAlign: "center" }}>
    <div className="hf-container">
      <h2 className="hf-final">
        Ship faster.
        <br />
        <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Lose nothing</span>.
      </h2>
      <div style={{ marginTop: 36, display: "flex", gap: 10, justifyContent: "center" }}>
        <Link href="/scanner" className="hf-btn pill">Start for free</Link>
        <button className="hf-btn outline">Book a demo →</button>
      </div>
      <div
        className="hf-mono"
        style={{ marginTop: 18, fontSize: 12.5, color: "var(--hf-ink-3)" }}
      >
        10K events/mo free · 60-second install · works with any webhook source
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
        <p style={{ fontSize: 13, color: "var(--hf-ink-3)", marginTop: 14, maxWidth: 280, lineHeight: 1.55 }}>
          The observability layer for webhooks. Built in SF.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          {["X", "GH", "in", "YT"].map((s) => (
            <span
              key={s}
              className="hf-mono"
              style={{
                width: 30,
                height: 30,
                border: "1px solid var(--hf-line)",
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                color: "var(--hf-ink-3)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      {([
        ["Platform", ["Reliability", "AI Diagnosis", "Reconciler", "Cross-provider graph", "Health scanner"]],
        ["Resources", ["Docs", "Changelog", "Status", "Pricing", "Blog"]],
        ["Company", ["About", "Customers", "Careers", "Trust", "Contact"]],
      ] as Array<[string, string[]]>).map(([h, items]) => (
        <div key={h}>
          <div className="hf-footer-head">{h}</div>
          <ul>
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="hf-footer-bottom">
      <span>© 2026 HookWise, Inc.</span>
      <ThemeToggleFooter />
      <span className="hf-mono">v0.4.1 · build 4f2a1c · SOC 2 Type I in progress</span>
    </div>
  </div>
);

/* ════════════════ Page ════════════════ */
export default function LandingPage() {
  return (
    <div className="hf-root">
      <HFNav />
      <Hero />
      <TrustStrip />
      <ThreePillarsSection />
      <PipelineSection />
      <DaySection />
      <CompareSection />
      <InvestigationSection />
      <ProviderMatrixSection />
      <InstallSection />
      <StatsRow />
      <TestimonialStrip />
      <PricingSection />
      <FinalCta />
      <Footer />
    </div>
  );
}
