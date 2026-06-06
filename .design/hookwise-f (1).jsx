/* HookWise — Approach F: Cursor-inspired DNA, HookWise-native architecture
   Cursor's contribution: pitch-black + warm landscape panels + Instrument Serif
   italic accents + restrained scale + orange/blue accent system.
   HookWise's architecture: asymmetric hero, pipeline diorama, customer-day timeline,
   compare table, metric wall, install snippet, scrolling testimonials, calculator pricing.
*/

const HFLogo = ({ size = 18 }) => (
  <div className="hf-logo">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L22 7.5 V16.5 L12 22 L2 16.5 V7.5 Z" fill="#f4f2ee" />
      <path d="M12 2 L12 22 M2 7.5 L22 16.5 M22 7.5 L2 16.5" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.5" />
    </svg>
    <span>HOOKWISE</span>
  </div>
);

/* ════════════════ NAV ════════════════ */
const HFNav = ({ onView }) => (
  <div className="hf-nav-wrap">
    <div className="hf-nav">
      <HFLogo />
      <div className="hf-nav-links">
        <a>Platform</a>
        <a>Reconciler</a>
        <a>Investigation</a>
        <a>Pricing</a>
        <a>Docs</a>
        <a>Status <span style={{ width: 6, height: 6, borderRadius: 999, background: "#7ed98a", display: "inline-block", marginLeft: 4 }} /></a>
      </div>
      <div className="hf-nav-right">
        <a className="hf-btn ghost small" style={{ textDecoration: "none", cursor: "pointer" }} onClick={() => onView("dash")}>Open dashboard</a>
        <button className="hf-btn outline small">Sign in</button>
        <button className="hf-btn pill small">Start free</button>
      </div>
    </div>
  </div>
);

/* ════════════════ HERO — asymmetric split ════════════════ */

const LiveCounter = () => {
  const [n, setN] = React.useState(82419);
  React.useEffect(() => {
    const id = setInterval(() => setN(v => v + Math.floor(2 + Math.random() * 5)), 1500);
    return () => clearInterval(id);
  }, []);
  return <span className="hf-num">{n.toLocaleString()}</span>;
};

const HeroFeed = () => (
  <div className="hf-win" style={{ width: "100%", height: "100%" }}>
    <div className="hf-win-tb">
      <div className="hf-lights"><span/><span/><span/></div>
      <span className="hf-win-title">acme-production · live feed</span>
      <span className="hf-mono" style={{ fontSize: 10.5, opacity: 0.5 }}>⌘K</span>
    </div>
    <div style={{ background: "#1c1b19", padding: "14px 0", height: "calc(100% - 36px)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "70px 70px 1fr 90px 60px", gap: 8, padding: "0 18px 8px", fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>Time</span><span>Status</span><span>Event · Provider</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>p95</span>
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--hf-ink-2)" }}>
        {[
          ["00:14.802", "200",   "#7ed98a", "payment_intent.succeeded · stripe",      "$248.00", "18ms",  ""],
          ["00:14.412", "200",   "#7ed98a", "charge.succeeded · stripe",              "$248.00", "12ms",  "↻ deduped"],
          ["00:13.998", "200",   "#7ed98a", "orders.paid · shopify",                  "$58.00",  "22ms",  ""],
          ["00:13.502", "retry", "#fbbf24", "orders.create · shopify",                "$192.00", "—",     "2/8"],
          ["00:13.211", "recon", "#c4a5ff", "payment_intent.created · stripe",        "$19.00",  "—",     "+ recovered"],
          ["00:12.918", "200",   "#7ed98a", "charge.refunded · stripe",               "-$12.00", "16ms",  ""],
          ["00:12.604", "503",   "#f29a9a", "orders.create · shopify",                "$412.00", "4012ms","↻ retry"],
          ["00:12.302", "200",   "#7ed98a", "checkout.session.completed · stripe",    "$75.00",  "14ms",  ""],
          ["00:11.911", "200",   "#7ed98a", "user.subscription.updated · clerk",      "—",       "20ms",  ""],
          ["00:11.480", "200",   "#7ed98a", "payment_intent.succeeded · stripe",      "$92.00",  "18ms",  ""],
          ["00:11.211", "200",   "#7ed98a", "email.delivered · resend",               "—",       "12ms",  ""],
          ["00:10.840", "hold",  "#9ac7ff", "orders.create · shopify",                "$140.00", "—",     "seq wait"],
          ["00:10.502", "200",   "#7ed98a", "payment_intent.succeeded · stripe",      "$340.00", "16ms",  ""],
          ["00:10.140", "200",   "#7ed98a", "deploy.success · github",                "—",       "28ms",  ""],
          ["00:09.812", "200",   "#7ed98a", "payment_intent.succeeded · stripe",      "$58.00",  "16ms",  ""],
        ].map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 70px 1fr 90px 60px", gap: 8, padding: "6px 18px", borderBottom: "1px solid rgba(255,255,255,0.025)", alignItems: "center" }}>
            <span style={{ color: "var(--hf-ink-4)" }}>{r[0]}</span>
            <span style={{ color: r[2], fontSize: 10 }}>{r[1]}</span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: i === 0 ? "var(--hf-ink)" : "var(--hf-ink-2)" }}>
              {r[3]} {r[6] && <span style={{ color: r[2], opacity: 0.7, marginLeft: 4 }}>{r[6]}</span>}
            </span>
            <span style={{ color: "var(--hf-ink-3)", textAlign: "right" }}>{r[4]}</span>
            <span style={{ color: "var(--hf-ink-4)", textAlign: "right", fontSize: 10.5 }}>{r[5]}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Hero = ({ headline }) => {
  const lines = (headline || "The observability layer\nfor webhooks.").split("\n");
  return (
    <div style={{ padding: "40px 28px 0" }}>
      <div className="hf-container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 56, alignItems: "stretch", minHeight: 540 }}>
          {/* LEFT — copy */}
          <div style={{ paddingTop: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "5px 12px", borderRadius: 999, border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", fontSize: 12, color: "var(--hf-ink-2)", marginBottom: 28, alignSelf: "flex-start" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--hf-accent)" }} />
              <span>v0.4 · AI Investigation in public beta</span>
              <span style={{ color: "var(--hf-accent)" }}>→</span>
            </div>
            <h1 className="hf-display" style={{ fontSize: 56, margin: 0, fontWeight: 450, letterSpacing: "-0.035em", lineHeight: 1.02 }}>
              {lines[0]}
              {lines[1] && <><br/><span className="hf-serif" style={{ color: "var(--hf-accent)", fontStyle: "italic", fontWeight: 400 }}>{lines[1]}</span></>}
            </h1>
            <p style={{ marginTop: 22, fontSize: 16, lineHeight: 1.5, color: "var(--hf-ink-2)", maxWidth: 460 }}>
              Every Stripe, Shopify, and Clerk event guaranteed delivered, reconciled
              to the provider&apos;s truth, and diagnosed by AI when something breaks.
            </p>
            <div style={{ marginTop: 32, display: "flex", gap: 14, alignItems: "center" }}>
              <button className="hf-btn pill">Start for free →</button>
              <a className="hf-link-accent" style={{ cursor: "pointer" }}>Watch 90s demo →</a>
            </div>

            {/* live counter strip */}
            <div style={{ marginTop: 40, padding: "20px 24px", border: "1px solid var(--hf-line)", borderRadius: 14, background: "rgba(255,255,255,0.015)" }}>
              <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Events processed in the last 24h <span style={{ color: "#7ed98a", marginLeft: 6 }}>● live</span>
              </div>
              <div className="hf-num" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--hf-ink)", marginTop: 4 }}>
                <LiveCounter />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 14, fontSize: 12 }}>
                <div>
                  <div style={{ color: "var(--hf-ink-3)" }}>Delivered</div>
                  <div style={{ color: "#7ed98a", fontWeight: 500, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>99.99%</div>
                </div>
                <div>
                  <div style={{ color: "var(--hf-ink-3)" }}>Recovered</div>
                  <div style={{ color: "var(--hf-accent)", fontWeight: 500, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>$1,284</div>
                </div>
                <div>
                  <div style={{ color: "var(--hf-ink-3)" }}>p95 ack</div>
                  <div style={{ color: "var(--hf-ink)", fontWeight: 500, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>18ms</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — feed in landscape */}
          <div className="hf-landscape" style={{ padding: 32, display: "flex", alignItems: "stretch" }}>
            <HeroFeed />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════ TRUSTED BY (compact strip, not 8-tile grid) ════════════════ */
const TrustStrip = () => (
  <div style={{ padding: "60px 28px 40px" }}>
    <div className="hf-container" style={{ display: "flex", alignItems: "center", gap: 40 }}>
      <div style={{ fontSize: 12, color: "var(--hf-ink-3)", maxWidth: 200, lineHeight: 1.45, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Trusted by 1,200+ engineering teams →
      </div>
      <div style={{ flex: 1, display: "flex", gap: 48, justifyContent: "space-between", alignItems: "center", fontSize: 18, fontWeight: 500, color: "var(--hf-ink-3)" }}>
        {["Ramp", "Linear", "Vercel", "Figma", "Cal.com", "Raycast", "PostHog", "Clerk"].map(n => (
          <span key={n} style={{ opacity: 0.7 }}>{n}</span>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════ PIPELINE DIORAMA — horizontal flow diagram ════════════════ */
const PipelineStage = ({ icon, name, count, sub, status, color }) => (
  <div style={{ flex: 1, background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 18px 16px", position: "relative" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--hf-line)", display: "grid", placeItems: "center", fontSize: 14, color: color }}>{icon}</span>
      <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 999, background: status === "live" ? "rgba(126,217,138,0.1)" : "rgba(255,255,255,0.04)", color: status === "live" ? "#7ed98a" : "var(--hf-ink-3)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.04em", textTransform: "uppercase" }}>{status}</span>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--hf-ink)", letterSpacing: "-0.01em" }}>{name}</div>
    <div className="hf-num hf-mono" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.025em", color: color, marginTop: 6 }}>{count}</div>
    <div style={{ fontSize: 11, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>
  </div>
);

const PipelineSection = () => (
  <div className="hf-section" style={{ paddingTop: 60 }}>
    <div className="hf-container">
      <div className="hf-landscape" style={{ padding: "48px 48px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, gap: 40 }}>
          <div style={{ flex: 1 }}>
            <span className="hf-eyebrow">Pipeline</span>
            <h2 className="hf-display" style={{ fontSize: 36, margin: "12px 0 0", fontWeight: 450, letterSpacing: "-0.025em" }}>
              Five stages between provider and your <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>code</span>.
            </h2>
          </div>
          <p className="hf-kicker" style={{ maxWidth: 360, marginBottom: 4 }}>
            Each stage instrumented, queryable, replayable. Click any stage to drill into
            its metrics and last-failed events.
          </p>
        </div>

        {/* arrow flow */}
        <div style={{ position: "relative", display: "flex", alignItems: "stretch", gap: 0 }}>
          {[
            { i: "⤓", n: "Buffer",       c: "82,419", s: "ack <50ms · 0 dropped",    st: "live", cl: "#9ac7ff" },
            { i: "✓", n: "Idempotency",  c: "412",    s: "duplicates blocked",        st: "live", cl: "#c4a5ff" },
            { i: "↻", n: "Smart Retry",  c: "47",     s: "in flight · 24h backoff",   st: "live", cl: "#fbbf24" },
            { i: "⟲", n: "Reconciler",   c: "+7",     s: "events recovered today",    st: "live", cl: "#9ec396" },
            { i: "⇆", n: "Sequencer",    c: "8",      s: "holds · ordered release",   st: "live", cl: "#f2b37a" },
          ].map((s, i, a) => (
            <React.Fragment key={s.n}>
              <PipelineStage icon={s.i} name={s.n} count={s.c} sub={s.s} status={s.st} color={s.cl} />
              {i < a.length - 1 && (
                <div style={{ display: "grid", placeItems: "center", padding: "0 6px", color: "var(--hf-ink-4)", fontSize: 16, fontFamily: "JetBrains Mono, monospace" }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--hf-line)" }}>
          <div className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>
            provider → <span style={{ color: "var(--hf-ink-2)" }}>HookWise</span> → your handler · ack within 50ms always, processed asynchronously
          </div>
          <a className="hf-link-accent" style={{ fontSize: 13, cursor: "pointer" }}>Architecture deep-dive →</a>
        </div>
      </div>
    </div>
  </div>
);

/* ════════════════ DAY IN THE LIFE — single tall narrative panel ════════════════ */
const DayTimeline = () => (
  <div className="hf-win" style={{ width: "100%" }}>
    <div className="hf-win-tb">
      <div className="hf-lights"><span/><span/><span/></div>
      <span className="hf-win-title">cus_OqA1m9 · maya@thursdaybloom.co · last 24h</span>
    </div>
    <div style={{ background: "#1c1b19", padding: "26px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center", marginBottom: 20 }}>
        <span style={{ width: 36, height: 36, borderRadius: 999, background: "linear-gradient(135deg, #ff8a50, #c94a1a)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 600, fontSize: 13 }}>M</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink)" }}>Maya R. — Thursday Bloom</div>
          <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", fontFamily: "JetBrains Mono, monospace" }}>customer since 2024-08 · LTV $2,418 · 3 providers linked</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="hf-change-chip" style={{ color: "#9ac7ff" }}>stripe</span>
          <span className="hf-change-chip" style={{ color: "#9ec396" }}>shopify</span>
          <span className="hf-change-chip" style={{ color: "#c4a5ff" }}>clerk</span>
        </div>
      </div>

      <div style={{ position: "relative", marginTop: 8 }}>
        <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 1.5, background: "var(--hf-line-2)" }} />
        {[
          { t: "09:42:01", p: "clerk",   pc: "#c4a5ff", e: "user.created",                a: "—",       n: "Maya signed up" },
          { t: "09:42:08", p: "stripe",  pc: "#9ac7ff", e: "customer.created",            a: "—",       n: "Stripe customer linked" },
          { t: "09:43:14", p: "shopify", pc: "#9ec396", e: "checkout.session.completed",  a: "$248",    n: "Bouquet · same-day delivery" },
          { t: "09:43:14", p: "stripe",  pc: "#9ac7ff", e: "payment_intent.succeeded",    a: "$248",    n: "" },
          { t: "09:43:15", p: "shopify", pc: "#9ec396", e: "orders.paid",                 a: "—",       n: "fulfillment kicked off" },
          { t: "09:43:18", p: "resend",  pc: "#f2b37a", e: "email.delivered",             a: "receipt", n: "" },
          { t: "14:22:09", p: "shopify", pc: "#9ec396", e: "orders.create",               a: "$192",    n: "Second order · returning customer" },
          { t: "14:22:09", p: "shopify", pc: "#fbbf24", e: "orders.create",               a: "↻ 2/8",   n: "Endpoint 503 — Smart Retry took over", warn: true },
          { t: "14:22:14", p: "shopify", pc: "#9ec396", e: "orders.create",               a: "delivered", n: "Recovered after 5s" },
          { t: "16:08:02", p: "stripe",  pc: "#9ac7ff", e: "payment_intent.succeeded",    a: "$192",    n: "" },
          { t: "23:11:48", p: "stripe",  pc: "#c4a5ff", e: "payment_intent.created",      a: "+ recovered", n: "Reconciler poll · provider missed firing", warn: true },
          { t: "23:11:48", p: "stripe",  pc: "#9ac7ff", e: "payment_intent.succeeded",    a: "$58",     n: "Recovered before customer noticed" },
        ].map((r, i, a) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 80px 90px 1fr auto", gap: 14, padding: "10px 0", paddingLeft: 0, alignItems: "center", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: r.pc, marginLeft: 2, zIndex: 1, boxShadow: "0 0 0 3px #1c1b19" }} />
            <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{r.t}</span>
            <span className="hf-mono" style={{ fontSize: 11, color: r.pc }}>{r.p}</span>
            <div>
              <div style={{ fontSize: 13, color: "var(--hf-ink)" }}>{r.e}</div>
              {r.n && <div style={{ fontSize: 11.5, color: r.warn ? "#fbbf24" : "var(--hf-ink-3)", marginTop: 2 }}>{r.n}</div>}
            </div>
            <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r.a}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--hf-line)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div>
          <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue booked</div>
          <div className="hf-num" style={{ fontSize: 19, fontWeight: 500, color: "#7ed98a", marginTop: 3 }}>$498.00</div>
        </div>
        <div>
          <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recovered by HookWise</div>
          <div className="hf-num" style={{ fontSize: 19, fontWeight: 500, color: "var(--hf-accent)", marginTop: 3 }}>$58.00</div>
        </div>
        <div>
          <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Failures auto-handled</div>
          <div className="hf-num" style={{ fontSize: 19, fontWeight: 500, color: "var(--hf-ink)", marginTop: 3 }}>2</div>
        </div>
        <div>
          <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Engineer time</div>
          <div className="hf-num" style={{ fontSize: 19, fontWeight: 500, color: "var(--hf-ink)", marginTop: 3 }}>0 min</div>
        </div>
      </div>
    </div>
  </div>
);

const DaySection = () => (
  <div className="hf-section">
    <div className="hf-container">
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 36px" }}>
        <span className="hf-eyebrow">A day in the life</span>
        <h2 className="hf-display" style={{ fontSize: 40, margin: "14px 0 0", fontWeight: 450, letterSpacing: "-0.028em" }}>
          One customer. Three providers.<br/>
          <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Zero engineer minutes</span>.
        </h2>
        <p className="hf-kicker" style={{ marginTop: 16, maxWidth: 540, marginLeft: "auto", marginRight: "auto" }}>
          A real timeline from acme-production. Two failures handled, one provider gap recovered,
          $58 saved that no proxy tool would have caught.
        </p>
      </div>
      <DayTimeline />
    </div>
  </div>
);

/* ════════════════ COMPARE TABLE — data-dense, original to HookWise ════════════════ */
const CompareSection = () => {
  const rows = [
    ["Webhook ingest with <50ms ack",    "✓",  "✓",  "—"],
    ["Automatic retries with backoff",   "✓",  "✓",  "DIY"],
    ["Idempotency / dedup",              "✓",  "partial", "DIY"],
    ["Reconciliation against provider",  "✓",  "—",  "—"],
    ["Cross-provider customer graph",    "✓",  "—",  "—"],
    ["Event ordering / sequencing",      "✓",  "—",  "DIY"],
    ["AI investigation + RCA",           "✓",  "—",  "—"],
    ["Revenue parsed per event",         "✓",  "—",  "—"],
    ["Free security scanner",            "✓",  "—",  "—"],
  ];
  return (
    <div className="hf-section">
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          <span className="hf-eyebrow">Vs the alternatives</span>
          <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0", fontWeight: 450 }}>
            Proxy tools show the <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>traffic</span>.<br/>
            We show the <span className="hf-serif" style={{ color: "#f2b37a" }}>truth</span>.
          </h2>
        </div>

        <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "20px 28px", borderBottom: "1px solid var(--hf-line-2)", background: "rgba(255,255,255,0.015)" }}>
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Capability</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-accent)", textAlign: "center" }}>HookWise</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink-2)", textAlign: "center" }}>Proxy tools</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink-2)", textAlign: "center" }}>DIY queue</span>
          </div>
          {rows.map(([cap, hw, px, dy], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "16px 28px", borderBottom: i < rows.length - 1 ? "1px solid var(--hf-line)" : "none", alignItems: "center" }}>
              <span style={{ fontSize: 13.5, color: "var(--hf-ink)" }}>{cap}</span>
              {[hw, px, dy].map((v, j) => (
                <span key={j} style={{
                  fontSize: 14, fontWeight: 500, textAlign: "center",
                  fontFamily: v === "DIY" || v === "partial" ? "JetBrains Mono, monospace" : "Inter, sans-serif",
                  color: v === "✓" ? (j === 0 ? "var(--hf-accent)" : "#7ed98a") : v === "—" ? "var(--hf-ink-4)" : "#fbbf24",
                  fontSize: v === "DIY" || v === "partial" ? 11.5 : 16,
                }}>{v}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════ INVESTIGATION — single panel, blue landscape ════════════════ */
const InvestigationSection = () => (
  <div className="hf-section">
    <div className="hf-container">
      <div className="hf-landscape blue">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 56, alignItems: "center" }}>
          <div>
            <span className="hf-eyebrow">AI Investigation</span>
            <h2 className="hf-display" style={{ fontSize: 34, margin: "14px 0 0", fontWeight: 450, letterSpacing: "-0.025em" }}>
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Ask</span> your webhooks.
            </h2>
            <p className="hf-kicker" style={{ marginTop: 16 }}>
              Investigation queries delivery history, endpoint health, provider status, schema
              drift, prior incidents, flow state, and revenue impact in parallel — and returns
              a root cause with a one-click fix.
            </p>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["MTTR p50",   "4.6s",     "var(--hf-accent)"],
                ["Confidence", "0.94",     "var(--hf-ink)"],
                ["Fix reuse",  "62%",      "#9ac7ff"],
                ["Sources",    "7",        "var(--hf-ink)"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ border: "1px solid var(--hf-line)", borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
                  <div className="hf-mono" style={{ fontSize: 10, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
                  <div className="hf-num" style={{ fontSize: 22, fontWeight: 500, color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hf-win">
            <div className="hf-win-tb">
              <div className="hf-lights"><span/><span/><span/></div>
              <span className="hf-win-title">Ask HookWise · INC-0441</span>
            </div>
            <div style={{ background: "#1c1b19", padding: "22px 24px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                <span style={{ color: "var(--hf-accent)", marginTop: 2 }}>›</span>
                <span style={{ color: "var(--hf-ink)" }}>why did orders.create start 503ing at 04:12?</span>
              </div>

              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--hf-line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--hf-ink-3)" }}>
                  <span style={{ color: "var(--hf-accent)" }}>✦ HookWise</span>
                  <span>·</span><span>queried 7 sources</span>
                  <span>·</span><span>4.6s</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--hf-ink-2)", margin: 0 }}>
                  DB pool exhausted on <span style={{ color: "var(--hf-ink)" }}>acme-production</span>.
                  Stripe is clean (99.97% parity). Endpoint latency jumped{" "}
                  <span style={{ color: "#fbbf24" }}>61ms → 4,012ms</span> at 04:12 — matches prior
                  incident <span className="hf-mono" style={{ color: "#c4a5ff" }}>INC-0318</span> at{" "}
                  <span style={{ color: "var(--hf-ink)" }}>94% confidence</span>. That one was
                  fixed by scaling pg connections 20 → 60. The patch applies unchanged.
                </p>
              </div>

              <div style={{ marginTop: 18, padding: "12px 14px", border: "1px solid var(--hf-line)", borderRadius: 10, background: "rgba(255,107,44,0.06)" }}>
                <div style={{ fontSize: 11, color: "var(--hf-accent)", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Suggested fix</div>
                <code style={{ fontSize: 12, color: "var(--hf-ink)", fontFamily: "JetBrains Mono, monospace" }}>
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

/* ════════════════ INSTALL — code-first CTA ════════════════ */
const InstallSection = () => {
  const [tab, setTab] = React.useState(0);
  const code = [
    {
      title: "Node.js",
      lines: [
        ["import",    " ", "{ HookWise }", " ", "from", " ", "'hookwise'"],
        [],
        ["const",     " ", "hw", " ", "=", " ", "new", " ", "HookWise", "({"],
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
        ["from",     " ", "hookwise", " ", "import", " ", "HookWise"],
        [],
        ["hw", " ", "=", " ", "HookWise(", ],
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

  return (
    <div className="hf-section">
      <div className="hf-container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          <div>
            <span className="hf-eyebrow">Install</span>
            <h2 className="hf-display" style={{ fontSize: 38, margin: "14px 0 0", fontWeight: 450, letterSpacing: "-0.028em" }}>
              60 seconds.<br/>
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>One env var</span>.
            </h2>
            <p className="hf-kicker" style={{ marginTop: 16 }}>
              Drop in our handler, point your provider webhooks at HookWise, and watch
              the live feed light up. No data migration, no breaking changes.
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <button className="hf-btn pill">Get your key →</button>
              <a className="hf-link-accent" style={{ cursor: "pointer" }}>Read full docs →</a>
            </div>
          </div>

          <div className="hf-win">
            <div className="hf-win-tb">
              <div className="hf-lights"><span/><span/><span/></div>
              <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 4 }}>
                {code.map((c, i) => (
                  <button key={c.title} onClick={() => setTab(i)} style={{
                    background: i === tab ? "rgba(255,255,255,0.06)" : "transparent",
                    color: i === tab ? "var(--hf-ink)" : "var(--hf-ink-3)",
                    border: "1px solid " + (i === tab ? "var(--hf-line-2)" : "transparent"),
                    fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                  }}>{c.title}</button>
                ))}
              </div>
            </div>
            <div className="hf-code" style={{ padding: "18px 20px", minHeight: 200, background: "#141312" }}>
              {code[tab].lines.map((ln, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", color: "var(--hf-ink-2)", lineHeight: 1.7 }}>
                  <span style={{ color: "var(--hf-ink-4)", textAlign: "right", paddingRight: 10, userSelect: "none", fontSize: 11 }}>{i + 1}</span>
                  <span>
                    {ln.map((tk, j) => {
                      const k = tk.trim();
                      const isKw = ["import","from","const","new","app.post","def","return","await","async","let","var","function","app.add_route","curl","-X","-H","-d","POST"].some(w => k.startsWith(w));
                      const isStr = (k.startsWith("'") || k.startsWith("\"")) && (k.endsWith("'") || k.endsWith("\""));
                      const isFn = ["HookWise","handler","handler()"].includes(k.replace(/[(){}]/g, ""));
                      return <span key={j} style={{
                        color: isKw ? "#c4a5ff" : isStr ? "#98d59a" : isFn ? "#9ac7ff" : "var(--hf-ink-2)",
                      }}>{tk}</span>;
                    })}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(126,217,138,0.08)", border: "1px solid rgba(126,217,138,0.2)", borderRadius: 6, color: "#7ed98a", fontSize: 11, fontFamily: "JetBrains Mono, monospace", display: "flex", alignItems: "center", gap: 8 }}>
                <span>✓</span><span>HookWise endpoint registered. First event acked in 18ms.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════ TESTIMONIALS — auto-scrolling strip ════════════════ */
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
        <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0", fontWeight: 450 }}>
          Built for teams that&apos;ve <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>lost webhooks</span> at 3am.
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

/* ════════════════ PRICING CALCULATOR — single tile, not 4 ════════════════ */
const PricingCalculator = () => {
  const [evts, setEvts] = React.useState(500000);
  const tiers = [
    { name: "Free",    cap: 1000,    price: 0 },
    { name: "Starter", cap: 50000,   price: 29 },
    { name: "Pro",     cap: 500000,  price: 79 },
    { name: "Team",    cap: 2000000, price: 199 },
    { name: "Scale",   cap: 10000000,price: 499 },
  ];
  const tier = tiers.find(t => evts <= t.cap) || tiers[tiers.length - 1];
  const fmt = (n) => n >= 1000000 ? (n/1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M" : n >= 1000 ? (n/1000).toFixed(n % 1000 === 0 ? 0 : 0) + "K" : n;

  return (
    <div className="hf-section">
      <div className="hf-container">
        <div style={{ textAlign: "center", maxWidth: 540, margin: "0 auto 36px" }}>
          <span className="hf-eyebrow">Pricing</span>
          <h2 className="hf-display" style={{ fontSize: 36, margin: "14px 0 0", fontWeight: 450 }}>
            Pay for events, <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>not seats</span>.
          </h2>
        </div>

        <div className="hf-landscape" style={{ padding: "48px 56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
            <div>
              <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your monthly events</div>
              <div className="hf-num" style={{ fontSize: 56, fontWeight: 500, letterSpacing: "-0.035em", color: "var(--hf-ink)", marginTop: 6, lineHeight: 1 }}>
                {fmt(evts)}<span style={{ fontSize: 22, color: "var(--hf-ink-3)", fontWeight: 400, marginLeft: 8 }}>events / mo</span>
              </div>
              <input
                type="range"
                min="0"
                max="9000000"
                step="50000"
                value={evts}
                onChange={(e) => setEvts(parseInt(e.target.value, 10))}
                className="hf-slider"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", marginTop: 6 }}>
                <span>0</span><span>1M</span><span>5M</span><span>10M+</span>
              </div>
              <div style={{ marginTop: 24, fontSize: 13.5, color: "var(--hf-ink-2)", lineHeight: 1.6 }}>
                Includes Smart Buffer, Idempotency, Smart Retry, Reconciler, AI Investigation,
                Sequencer, Cross-provider graph, and the security scanner.
              </div>
            </div>

            <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line-2)", borderRadius: 16, padding: "32px 32px 28px" }}>
              <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recommended plan</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--hf-ink)", marginTop: 6, letterSpacing: "-0.02em" }}>{tier.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 16 }}>
                <span className="hf-num" style={{ fontSize: 56, fontWeight: 500, letterSpacing: "-0.035em", color: "var(--hf-accent)", lineHeight: 1 }}>${tier.price}</span>
                <span style={{ color: "var(--hf-ink-3)", fontSize: 14 }}>/mo</span>
              </div>
              <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", marginTop: 6 }}>up to {fmt(tier.cap)} events / mo</div>
              <button className="hf-btn pill" style={{ marginTop: 20, width: "100%", justifyContent: "center" }}>
                {tier.name === "Free" ? "Start free" : `Choose ${tier.name}`} →
              </button>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--hf-ink-3)", fontFamily: "JetBrains Mono, monospace" }}>
                <span>cancel anytime</span>
                <span>no seats</span>
                <span>SOC 2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════ STATS ROW ════════════════ */
const StatsRow = () => (
  <div className="hf-section" style={{ padding: "60px 28px" }}>
    <div className="hf-container">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: "1px solid var(--hf-line)", borderBottom: "1px solid var(--hf-line)" }}>
        {[
          ["480M",      "events processed in May",          "var(--hf-ink)"],
          ["$2.1M",     "revenue recovered for customers",  "var(--hf-accent)"],
          ["99.997%",   "delivery rate — last 30 days",     "#7ed98a"],
          ["4.6s",      "median MTTR with AI investigation","#f2b37a"],
        ].map(([v, l, c], i) => (
          <div key={i} style={{ padding: "32px 28px", borderRight: i < 3 ? "1px solid var(--hf-line)" : "none" }}>
            <div className="hf-num" style={{ fontSize: 42, fontWeight: 500, color: c, letterSpacing: "-0.035em", lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 10, lineHeight: 1.4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════ FINAL CTA + FOOTER ════════════════ */
const FinalCta = () => (
  <div className="hf-section-lg" style={{ textAlign: "center" }}>
    <div className="hf-container">
      <h2 className="hf-final">Ship faster.<br/><span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Lose nothing</span>.</h2>
      <div style={{ marginTop: 36, display: "flex", gap: 10, justifyContent: "center" }}>
        <button className="hf-btn pill">Start for free</button>
        <button className="hf-btn outline">Book a demo →</button>
      </div>
      <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--hf-ink-3)", fontFamily: "JetBrains Mono, monospace" }}>
        1K events/mo free · 60-second install · SOC 2 certified
      </div>
    </div>
  </div>
);

const Footer = () => (
  <div className="hf-footer">
    <div className="hf-footer-grid hf-footer-3col">
      <div>
        <HFLogo />
        <p style={{ fontSize: 13, color: "var(--hf-ink-3)", marginTop: 14, maxWidth: 280, lineHeight: 1.55 }}>
          The observability layer for webhooks. Built in SF.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          {["X", "GH", "in", "YT"].map(s => (
            <span key={s} style={{ width: 30, height: 30, border: "1px solid var(--hf-line)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 11, color: "var(--hf-ink-3)", fontFamily: "JetBrains Mono, monospace" }}>{s}</span>
          ))}
        </div>
      </div>
      {[
        ["Platform",  ["Reconciler", "AI Investigation", "Sequencer", "Cross-provider graph", "Security scanner"]],
        ["Resources", ["Docs", "Changelog", "Status", "Pricing", "Blog"]],
        ["Company",   ["About", "Customers", "Careers", "Trust", "Contact"]],
      ].map(([h, items]) => (
        <div key={h}>
          <div className="hf-footer-head">{h}</div>
          <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
        </div>
      ))}
    </div>
    <div className="hf-footer-bottom">
      <span>© 2026 HookWise, Inc.</span>
      <span className="hf-mono">v0.4.1 · build 4f2a1c · ✓ SOC 2 Type II</span>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
/*                          DASHBOARD                                */
/* ════════════════════════════════════════════════════════════════ */

const DASH_NAV = [
  ["MAIN", [
    ["▤", "Overview",       "overview"],
    ["✦", "Investigations", "investigations", "2"],
    ["⚡", "Anomalies",      "anomalies",      "6"],
    ["⟲", "Reconciler",     "reconciler"],
    ["♥", "Health",         "health"],
    ["⚑", "Activity",       "activity"],
  ]],
  ["DATA", [
    ["⟿", "Endpoints", "endpoints"],
    ["☷", "Customers", "customers"],
    ["⌗", "Schemas",   "schemas"],
    ["⏱", "Retries",   "retries", "4"],
  ]],
  ["SETTINGS", [
    ["⚙", "Project",  "project"],
    ["⚿", "API keys", "keys"],
    ["✉", "Alerts",   "alerts"],
    ["☰", "Members",  "members"],
  ]],
];

const DashSidebar = ({ route, setRoute }) => (
  <div style={{ width: 220, borderRight: "1px solid var(--hf-line)", padding: "20px 0", background: "#0c0c0c", display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ padding: "0 18px 16px" }}><HFLogo /></div>
    <div style={{ padding: "0 12px 14px" }}>
      <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--hf-ink-2)" }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(135deg, var(--hf-accent), #c94a1a)" }} />
        <span style={{ flex: 1 }}>acme-production</span>
        <span style={{ color: "var(--hf-ink-4)" }}>⌄</span>
      </div>
    </div>
    {DASH_NAV.map(([h, items], i) => (
      <div key={i} style={{ padding: "8px 0" }}>
        <div className="hf-sb-head" style={{ padding: "6px 18px 4px" }}>{h}</div>
        {items.map(([ic, l, key, badge]) => {
          const active = route === key;
          return (
            <button key={key} onClick={() => setRoute(key)} style={{
              all: "unset", cursor: "pointer", display: "grid",
              gridTemplateColumns: "20px 1fr auto", gap: 10,
              alignItems: "center", padding: "7px 18px", fontSize: 13,
              color: active ? "var(--hf-ink)" : "var(--hf-ink-2)",
              background: active ? "var(--hf-bg-3)" : "transparent",
              borderLeft: active ? "2px solid var(--hf-accent)" : "2px solid transparent",
              paddingLeft: active ? 16 : 18,
              width: "calc(100% - 0px)",
            }}>
              <span style={{ color: active ? "var(--hf-accent)" : "var(--hf-ink-3)" }}>{ic}</span>
              <span>{l}</span>
              {badge && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "var(--hf-accent)", color: "#1a0d04", fontWeight: 600 }}>{badge}</span>}
            </button>
          );
        })}
      </div>
    ))}
    <div style={{ flex: 1 }} />
    <div style={{ padding: "16px 18px", borderTop: "1px solid var(--hf-line)", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: "linear-gradient(135deg, #ff8a50, #c94a1a)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>M</span>
      <div style={{ flex: 1, fontSize: 12 }}>
        <div style={{ color: "var(--hf-ink)", fontWeight: 500 }}>Maya R.</div>
        <div style={{ color: "var(--hf-ink-3)", fontSize: 11 }}>Pro plan</div>
      </div>
      <span style={{ color: "var(--hf-ink-3)" }}>⋯</span>
    </div>
  </div>
);

const Stat = ({ l, v, sub, color }) => (
  <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, padding: "20px 22px" }}>
    <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
    <div className="hf-num" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.03em", color: color || "var(--hf-ink)", marginTop: 8 }}>{v}</div>
    {sub && <div style={{ fontSize: 12, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>}
  </div>
);

const DeliveryChart = () => {
  const points = [22,28,24,30,34,40,38,46,44,52,48,56,60,58,64,68,72,76,72,80,84,80,88,92,88,96,100,96,104,108,104,112,116,112,120,118,124,122,128,124];
  const max = 130;
  const W = 760, H = 200, P = 20;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${P + (i * (W - 2*P)) / (points.length - 1)} ${H - P - (p / max) * (H - 2*P)}`).join(" ");
  const fill = path + ` L ${W - P} ${H - P} L ${P} ${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200 }}>
      <defs>
        <linearGradient id="hf-chart-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--hf-accent)" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="var(--hf-accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={P} x2={W-P} y1={P + t * (H - 2*P)} y2={P + t * (H - 2*P)} stroke="rgba(255,255,255,0.04)" />
      ))}
      <path d={fill} fill="url(#hf-chart-grad)" />
      <path d={path} fill="none" stroke="var(--hf-accent)" strokeWidth="1.5" />
    </svg>
  );
};

const ProviderRow = ({ name, color, count, parity, p95, status }) => (
  <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 90px 90px 90px 100px", gap: 16, alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--hf-line)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span style={{ fontWeight: 500, color: "var(--hf-ink)", fontSize: 13.5 }}>{name}</span>
    </div>
    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: parity, background: color }} />
    </div>
    <span className="hf-num hf-mono" style={{ fontSize: 12.5, color: "var(--hf-ink-2)", textAlign: "right" }}>{count}</span>
    <span className="hf-num hf-mono" style={{ fontSize: 12.5, color: "var(--hf-ink)", textAlign: "right" }}>{parity}</span>
    <span className="hf-num hf-mono" style={{ fontSize: 12.5, color: "var(--hf-ink-2)", textAlign: "right" }}>{p95}</span>
    <span style={{
      fontSize: 11, padding: "3px 8px", borderRadius: 999, justifySelf: "end",
      background: status === "healthy" ? "rgba(126,217,138,0.1)" : status === "degraded" ? "rgba(251,191,36,0.1)" : "rgba(242,154,154,0.1)",
      color: status === "healthy" ? "#7ed98a" : status === "degraded" ? "#fbbf24" : "#f29a9a",
      fontWeight: 500,
    }}>● {status}</span>
  </div>
);

const ROUTE_LABELS = {
  overview: "Overview", investigations: "Investigations", anomalies: "Anomalies",
  reconciler: "Reconciler", health: "Health", activity: "Activity",
  endpoints: "Endpoints", customers: "Customers", schemas: "Schemas", retries: "Retries",
  project: "Project", keys: "API keys", alerts: "Alerts", members: "Members",
};

const HeroBars = () => {
  const bars = [22,28,24,30,34,40,38,46,44,52,48,56,60,58,64,68,72,76,72,80,84,80,88,92,88,96,100,96,104,108,104,112,116,112,120,118,124,122,128,124,130,128,134,138,134,142,138,144,140,142];
  const max = 150;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 72, padding: "0 0 6px" }}>
      {bars.map((b, i) => {
        const isLast = i >= bars.length - 3;
        return (
          <div key={i} style={{
            flex: 1,
            height: `${(b / max) * 100}%`,
            background: isLast ? "var(--hf-accent)" : "rgba(255,255,255,0.16)",
            borderRadius: 1,
            transition: "background 200ms",
          }} />
        );
      })}
    </div>
  );
};

const OverviewPage = () => (
  <div style={{ padding: "32px" }}>
    {/* HERO · flat control-board · no gradient */}
    <section style={{
      border: "1px solid var(--hf-line)",
      borderRadius: 16,
      background: "var(--hf-bg-2)",
      marginBottom: 24,
      overflow: "hidden",
    }}>
      {/* meta strip */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 28px",
        borderBottom: "1px solid var(--hf-line)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11, color: "var(--hf-ink-4)",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <span>acme-production</span>
          <span style={{ color: "var(--hf-ink-5)" }}>·</span>
          <span>last 24h</span>
          <span style={{ color: "var(--hf-ink-5)" }}>·</span>
          <span>region us-east-1</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--hf-ink-2)" }}>
            <span className="hf-dot-live" /> live
          </span>
          <span>updated <span style={{ color: "var(--hf-ink-2)" }}>just now</span></span>
        </div>
      </div>

      {/* display block — number, label, mini-chart */}
      <div style={{ padding: "32px 32px 28px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "flex-end" }}>
        <div>
          <div className="hf-eyebrow" style={{ marginBottom: 10 }}>events processed</div>
          <div className="hf-num" style={{ fontSize: 84, fontWeight: 450, letterSpacing: "-0.045em", lineHeight: 0.9, color: "var(--hf-ink)" }}>
            82,419
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 14, alignItems: "center", fontSize: 13, color: "var(--hf-ink-3)" }}>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center", color: "var(--hf-accent)", fontWeight: 500 }}>
              <span style={{ fontSize: 10 }}>▲</span> 12.4%
            </span>
            <span>vs prior 24h</span>
            <span style={{ color: "var(--hf-ink-5)" }}>·</span>
            <span>0 incidents</span>
            <span style={{ color: "var(--hf-ink-5)" }}>·</span>
            <span>0 in DLQ</span>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <span>ingest rate · 60 min buckets</span>
            <span><span style={{ color: "var(--hf-accent)" }}>●</span> current window</span>
          </div>
          <HeroBars />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--hf-ink-5)", marginTop: 6 }}>
            <span>−24h</span><span>−18h</span><span>−12h</span><span>−6h</span><span>now</span>
          </div>
        </div>
      </div>

      {/* KPI row — flat, hairline-separated */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid var(--hf-line)",
      }}>
        {[
          { l: "DELIVERED",          v: "82,412",  sub: "99.99% rate",                 color: "#a3e635" },
          { l: "REVENUE PROTECTED",  v: "$47.3K",  sub: "+$1,284 via reconciler",      color: "var(--hf-ink)" },
          { l: "P95 LATENCY",        v: "18",      unit: "ms", sub: "ack to provider", color: "var(--hf-ink)" },
          { l: "MTTR",               v: "4.6",     unit: "s",  sub: "median diagnose", color: "var(--hf-accent)" },
        ].map((k, i) => (
          <div key={k.l} style={{
            padding: "20px 28px",
            borderLeft: i > 0 ? "1px solid var(--hf-line)" : "none",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{k.l}</div>
            <div className="hf-num" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", color: k.color, display: "flex", alignItems: "baseline", gap: 4 }}>
              {k.v}
              {k.unit && <span style={{ fontSize: 14, color: "var(--hf-ink-4)", fontWeight: 400 }}>{k.unit}</span>}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* status rail — single-line "all systems" board */}
      <div style={{
        display: "flex", gap: 24, padding: "12px 28px",
        borderTop: "1px solid var(--hf-line)",
        background: "var(--hf-bg)",
        fontFamily: "JetBrains Mono, monospace", fontSize: 11,
        color: "var(--hf-ink-3)", letterSpacing: "0.02em",
        flexWrap: "wrap",
      }}>
        {[
          ["ingest",     "nominal",  "#a3e635"],
          ["reconciler", "synced",   "#a3e635"],
          ["replay",     "0 queued", "#a3e635"],
          ["dlq",        "empty",    "#a3e635"],
          ["anomalies",  "0 active", "#a3e635"],
          ["alerts",     "armed",    "var(--hf-accent)"],
        ].map(([n, s, c]) => (
          <span key={n} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: c, fontSize: 8 }}>●</span>
            <span style={{ color: "var(--hf-ink-4)" }}>{n}</span>
            <span style={{ color: "var(--hf-ink-2)" }}>{s}</span>
          </span>
        ))}
      </div>
    </section>

    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}>
      <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, padding: "22px 24px" }}>
        <div className="hf-section-intro" style={{ marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>By provider</h2>
          <a className="hf-link-accent" style={{ fontSize: 13 }}>All endpoints →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 90px 90px 90px 100px", gap: 16, padding: "14px 0 8px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
          <span>Provider</span><span>Parity</span>
          <span style={{ textAlign: "right" }}>Events</span>
          <span style={{ textAlign: "right" }}>Parity %</span>
          <span style={{ textAlign: "right" }}>p95</span>
          <span style={{ justifySelf: "end" }}>Status</span>
        </div>
        <ProviderRow name="stripe.live"      color="#f2b37a" count="38,402" parity="100.00%" p95="18ms" status="healthy" />
        <ProviderRow name="shopify.orders"   color="#9ec396" count="22,118" parity="99.98%"  p95="22ms" status="healthy" />
        <ProviderRow name="clerk.user"       color="#c4a5ff" count="14,041" parity="98.21%"  p95="84ms" status="degraded" />
        <ProviderRow name="resend.email"     color="#e89f6b" count="6,201"  parity="100.00%" p95="14ms" status="healthy" />
        <ProviderRow name="github.deploy"    color="#fbbf24" count="1,657"  parity="99.94%"  p95="34ms" status="healthy" />
      </div>

      <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, padding: "22px 24px" }}>
        <div className="hf-section-intro" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>Activity</h2>
          <a className="hf-link-accent" style={{ fontSize: 13 }}>All →</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["✦", "var(--hf-accent)",  "Investigation matched INC-0318 · 94% confidence", "4m"],
            ["⟲", "#9ec396",           "Reconciler recovered 7 events · +$1,284",          "12m"],
            ["⏱", "#fbbf24",           "clerk.user retrying · attempt 2/8",                 "18m"],
            ["✉", "var(--hf-ink-2)",   "Alert sent to #ops-webhooks",                       "23m"],
            ["⇆", "#c4a5ff",           "Sequencer released 3 held orders.create",          "47m"],
            ["✓", "#7ed98a",           "Schema drift cleared on shopify.orders",            "1h"],
            ["✦", "var(--hf-accent)",  "Asked: 'why did checkouts dip at 02:14?'",          "2h"],
          ].map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 12, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color: r[1], fontSize: 14, paddingTop: 1 }}>{r[0]}</span>
              <span style={{ fontSize: 12.5, color: "var(--hf-ink-2)", lineHeight: 1.45 }}>{r[2]}</span>
              <span style={{ fontSize: 11, color: "var(--hf-ink-4)", fontFamily: "JetBrains Mono, monospace", paddingTop: 2 }}>{r[3]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const StubPage = ({ title }) => (
  <div style={{ padding: "32px" }}>
    <div className="hf-landscape" style={{ padding: "48px 36px", textAlign: "center" }}>
      <div className="hf-eyebrow" style={{ marginBottom: 10 }}>Coming soon</div>
      <h1 className="hf-display" style={{ fontSize: 28, margin: 0, fontWeight: 450 }}>{title}</h1>
      <p style={{ marginTop: 12, fontSize: 14, color: "var(--hf-ink-3)" }}>This section is under construction.</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [route, setRoute] = React.useState("overview");
  const P = window.DashPages || {};
  const page = (() => {
    switch (route) {
      case "overview":       return <OverviewPage />;
      case "investigations": return P.InvestigationsPage ? <P.InvestigationsPage /> : <StubPage title="Investigations" />;
      case "anomalies":      return P.AnomaliesPage      ? <P.AnomaliesPage />      : <StubPage title="Anomalies" />;
      case "reconciler":     return P.ReconcilerPage     ? <P.ReconcilerPage />     : <StubPage title="Reconciler" />;
      case "health":         return P.HealthPage         ? <P.HealthPage />         : <StubPage title="Health" />;
      case "activity":       return P.ActivityPage       ? <P.ActivityPage />       : <StubPage title="Activity" />;
      case "endpoints":      return P.EndpointsPage      ? <P.EndpointsPage />      : <StubPage title="Endpoints" />;
      case "customers":      return P.CustomersPage      ? <P.CustomersPage />      : <StubPage title="Customers" />;
      case "schemas":        return P.SchemasPage        ? <P.SchemasPage />        : <StubPage title="Schemas" />;
      case "retries":        return P.RetriesPage        ? <P.RetriesPage />        : <StubPage title="Retries" />;
      case "project":        return P.ProjectPage        ? <P.ProjectPage />        : <StubPage title="Project" />;
      case "keys":           return P.KeysPage           ? <P.KeysPage />           : <StubPage title="API keys" />;
      case "alerts":         return P.AlertsPage         ? <P.AlertsPage />         : <StubPage title="Alerts" />;
      case "members":        return P.MembersPage        ? <P.MembersPage />        : <StubPage title="Members" />;
      default:               return <StubPage title={ROUTE_LABELS[route] || "HookWise"} />;
    }
  })();
  return (
  <div className="hf-root" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "220px 1fr" }}>
    <DashSidebar route={route} setRoute={setRoute} />
    <div style={{ overflow: "auto" }}>
      <div style={{ padding: "16px 32px", borderBottom: "1px solid var(--hf-line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(10,10,10,0.85)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--hf-ink-3)" }}>
          <span>acme-production</span><span>/</span><span style={{ color: "var(--hf-ink)" }}>{ROUTE_LABELS[route] || "Overview"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--hf-ink-3)", fontFamily: "JetBrains Mono, monospace", minWidth: 320 }}>
            <span>⌕</span>
            <span style={{ flex: 1 }}>Search events, customers, endpoints…</span>
            <span style={{ background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>⌘K</span>
          </div>
          <button className="hf-btn outline small">Last 24h ⌄</button>
          <button className="hf-btn pill small">+ Endpoint</button>
        </div>
      </div>

      {page}
    </div>
  </div>
  );
};

/* ════════════════ ROOT ════════════════ */
const Landing = ({ onView, headline, showLogoWall, showPricing, showCompare }) => (
  <div className="hf-root">
    <HFNav onView={onView} />
    <Hero headline={headline} />
    {showLogoWall !== false && <TrustStrip />}
    <PipelineSection />
    <DaySection />
    {showCompare !== false && <CompareSection />}
    <InvestigationSection />
    <InstallSection />
    <StatsRow />
    <TestimonialStrip />
    {showPricing !== false && <PricingCalculator />}
    <FinalCta />
    <Footer />
  </div>
);

window.Landing = Landing;
window.Dashboard = Dashboard;
