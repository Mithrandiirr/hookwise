/* HookWise — Approach F · Dashboard pages
   Investigations, Anomalies (w/ AI prompt), Reconciler, Health, Activity,
   and the All-Data section (Endpoints, Customers, Schemas, Retries).
   Designed for readability: generous breathing room, clear typography
   hierarchy, scannable tables, and ember-warm accents that match the
   HookWise brand. */

/* ── Shared atoms ────────────────────────────────────────────── */

const PageHead = ({ crumb, title, sub, actions, tone = "ember" }) => (
  <div className={"hf-landscape " + (tone === "amber" ? "amber" : "")} style={{ padding: "32px 36px 30px", marginBottom: 22 }}>
    <div className="hf-eyebrow" style={{ marginBottom: 10 }}>{crumb}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 480px", minWidth: 0 }}>
        <h1 className="hf-display" style={{ fontSize: 32, margin: 0, fontWeight: 450, letterSpacing: "-0.028em", lineHeight: 1.1 }}>
          {title}
        </h1>
        {sub && <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "var(--hf-ink-2)", maxWidth: 620, lineHeight: 1.55 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  </div>
);

const StatTile = ({ label, value, sub, color, accent }) => (
  <div style={{
    background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)",
    borderRadius: 14, padding: "18px 20px 16px",
    borderLeft: accent ? `3px solid ${accent}` : "1px solid var(--hf-line)",
  }}>
    <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    <div className="hf-num" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.03em", color: color || "var(--hf-ink)", marginTop: 6, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "var(--hf-ink-3)", marginTop: 7, lineHeight: 1.4 }}>{sub}</div>}
  </div>
);

const Panel = ({ title, right, children, padded = true }) => (
  <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, overflow: "hidden" }}>
    {title && (
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--hf-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: "-0.01em", margin: 0, color: "var(--hf-ink)" }}>{title}</h2>
        {right}
      </div>
    )}
    <div style={{ padding: padded ? "18px 22px" : 0 }}>{children}</div>
  </div>
);

const Pill = ({ tone = "ink", children, dot = true }) => {
  const map = {
    green:  ["rgba(126,217,138,0.10)", "#7ed98a"],
    amber:  ["rgba(251,191,36,0.10)",  "#fbbf24"],
    red:    ["rgba(242,154,154,0.10)", "#f29a9a"],
    violet: ["rgba(196,165,255,0.10)", "#c4a5ff"],
    ember:  ["rgba(255,107,44,0.10)",  "var(--hf-accent)"],
    ink:    ["rgba(255,255,255,0.04)", "var(--hf-ink-2)"],
  };
  const [bg, fg] = map[tone] || map.ink;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontWeight: 500, lineHeight: 1.4, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: 999, background: fg }} />}
      {children}
    </span>
  );
};

const SeverityBadge = ({ s }) => {
  const tone = s === "critical" ? "red" : s === "high" ? "red" : s === "medium" ? "amber" : "violet";
  return <Pill tone={tone}>{s}</Pill>;
};

const ProviderTag = ({ name }) => {
  const colors = { stripe: "#f2b37a", shopify: "#9ec396", clerk: "#c4a5ff", resend: "#e89f6b", github: "#fbbf24" };
  const c = colors[name] || "var(--hf-ink-2)";
  return (
    <span className="hf-mono" style={{ fontSize: 11, color: c, display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: c }} />
      {name}
    </span>
  );
};

const fmtAgo = (mins) => mins < 1 ? "now" : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h` : `${Math.floor(mins/1440)}d`;

/* ════════════════════════════════════════════════════════════════ */
/*                       INVESTIGATIONS PAGE                          */
/* ════════════════════════════════════════════════════════════════ */

const INVESTIGATIONS = [
  { id: "INC-0441", title: "orders.create 503ing on acme-production", status: "open",      confidence: 0.94, rootCause: "DB pool exhaustion", impact: "$1,284", mttr: "4.6s",  ts: 4,    sources: 7, provider: "shopify", prior: "INC-0318" },
  { id: "INC-0440", title: "Schema drift on clerk.user payloads",       status: "resolved", confidence: 0.88, rootCause: "Added `phone_verified` field", impact: "0",      mttr: "11.2s", ts: 47,   sources: 5, provider: "clerk",   prior: null },
  { id: "INC-0439", title: "Stripe webhook signature mismatch",          status: "open",      confidence: 0.71, rootCause: "Endpoint rotated secret w/o updating HookWise", impact: "$240",   mttr: "—",     ts: 124,  sources: 4, provider: "stripe",  prior: "INC-0277" },
  { id: "INC-0438", title: "Reconciler gap on payment_intent.created",  status: "resolved", confidence: 0.96, rootCause: "Provider missed firing event",  impact: "$58",    mttr: "3.1s",  ts: 380,  sources: 6, provider: "stripe",  prior: null },
  { id: "INC-0437", title: "orders.create p95 jumped 18ms → 4s",        status: "monitoring", confidence: 0.82, rootCause: "Downstream Postgres connection storm", impact: "$2,100", mttr: "6.2s",  ts: 540,  sources: 8, provider: "shopify", prior: "INC-0318" },
  { id: "INC-0436", title: "checkout.session.completed dedup explosion",status: "resolved", confidence: 0.97, rootCause: "Provider replay storm after their incident", impact: "0",      mttr: "2.4s",  ts: 1280, sources: 5, provider: "stripe",  prior: null },
];

const InvestigationRow = ({ inv, selected, onSelect }) => (
  <button
    onClick={() => onSelect(inv.id)}
    style={{
      width: "100%", textAlign: "left", background: selected ? "rgba(255,107,44,0.05)" : "transparent",
      border: "none", borderBottom: "1px solid var(--hf-line)",
      borderLeft: selected ? "3px solid var(--hf-accent)" : "3px solid transparent",
      padding: "18px 22px 18px " + (selected ? "19px" : "22px"),
      cursor: "pointer", color: "inherit", display: "block",
      transition: "background 120ms ease",
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{inv.id}</span>
      <Pill tone={inv.status === "open" ? "red" : inv.status === "monitoring" ? "amber" : "green"}>{inv.status}</Pill>
    </div>
    <div style={{ fontSize: 14, color: "var(--hf-ink)", fontWeight: 450, lineHeight: 1.35, marginBottom: 10, letterSpacing: "-0.005em" }}>
      {inv.title}
    </div>
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 11.5, color: "var(--hf-ink-3)" }}>
      <ProviderTag name={inv.provider} />
      <span>· {fmtAgo(inv.ts)} ago</span>
      <span>· {inv.sources} sources</span>
      <span>· confidence <span className="hf-num hf-mono" style={{ color: inv.confidence > 0.9 ? "#7ed98a" : inv.confidence > 0.8 ? "var(--hf-accent)" : "#fbbf24" }}>{inv.confidence.toFixed(2)}</span></span>
    </div>
  </button>
);

const InvestigationDetail = ({ inv }) => (
  <div style={{ padding: "26px 28px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, marginBottom: 22 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{inv.id}</span>
          <Pill tone={inv.status === "open" ? "red" : inv.status === "monitoring" ? "amber" : "green"}>{inv.status}</Pill>
          <ProviderTag name={inv.provider} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.25, color: "var(--hf-ink)" }}>
          {inv.title}
        </h2>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button className="hf-btn outline small">Share</button>
        <button className="hf-btn pill small">Apply fix</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="Confidence" value={inv.confidence.toFixed(2)} color="var(--hf-accent)" />
      <StatTile label="MTTR" value={inv.mttr} />
      <StatTile label="Revenue at risk" value={inv.impact} color={inv.impact === "0" ? "#7ed98a" : "#fbbf24"} />
      <StatTile label="Sources queried" value={inv.sources} />
    </div>

    {/* Root cause card */}
    <div style={{ border: "1px solid var(--hf-line)", borderRadius: 12, padding: "20px 22px", marginBottom: 18, background: "var(--hf-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ color: "var(--hf-accent)" }}>✦</span>
        <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Root cause · HookWise AI</span>
      </div>
      <div style={{ fontSize: 15, color: "var(--hf-ink)", fontWeight: 450, marginBottom: 10, letterSpacing: "-0.01em" }}>
        {inv.rootCause}
      </div>
      <p style={{ fontSize: 13.5, color: "var(--hf-ink-2)", lineHeight: 1.65, margin: 0 }}>
        Endpoint latency for <span style={{ color: "var(--hf-ink)" }}>{inv.provider}.live</span> jumped from
        baseline <span className="hf-mono" style={{ color: "var(--hf-ink-2)" }}>61ms</span> to
        <span className="hf-mono" style={{ color: "#fbbf24" }}> 4,012ms</span> at the moment errors began.
        {inv.prior && (
          <> Matches prior incident <span className="hf-mono" style={{ color: "var(--hf-accent)" }}>{inv.prior}</span> at <span style={{ color: "var(--hf-ink)" }}>{Math.round(inv.confidence * 100)}%</span> confidence — the patch from that one applies unchanged.</>
        )}
      </p>
    </div>

    {/* Evidence timeline */}
    <div style={{ border: "1px solid var(--hf-line)", borderRadius: 12, marginBottom: 18, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hf-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Evidence trail</div>
        <span style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}>{inv.sources} signals · queried in parallel</span>
      </div>
      <div>
        {[
          ["04:12:18", "spike",     "var(--hf-accent)", "Endpoint latency p95 spiked 61ms → 4,012ms",        "shopify.orders"],
          ["04:12:20", "circuit",   "#fbbf24",           "Smart Retry activated for orders.create",            "shopify.orders"],
          ["04:12:22", "match",     "#c4a5ff",           "Pattern matched INC-0318 (94% similarity)",          "memory"],
          ["04:12:25", "external",  "var(--hf-ink-2)",   "Stripe status: operational · 99.97% parity",         "stripe.status"],
          ["04:12:26", "diagnosis", "#7ed98a",           "Root cause confirmed: DB pool exhaustion",           "ai"],
        ].map((r, i, a) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 78px 1fr 120px", gap: 14, padding: "12px 20px", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center" }}>
            <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{r[0]}</span>
            <Pill tone={r[1] === "spike" ? "ember" : r[1] === "circuit" ? "amber" : r[1] === "diagnosis" ? "green" : r[1] === "match" ? "violet" : "ink"} dot={false}>{r[1]}</Pill>
            <span style={{ fontSize: 13, color: "var(--hf-ink)" }}>{r[3]}</span>
            <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textAlign: "right" }}>{r[4]}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Suggested fix */}
    <div style={{ border: "1px solid rgba(255,107,44,0.25)", borderRadius: 12, padding: "18px 20px", background: "rgba(255,107,44,0.04)" }}>
      <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Suggested fix · one click</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12.5, color: "var(--hf-ink-2)", lineHeight: 1.7, padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.4)", marginBottom: 14 }}>
        <span style={{ color: "var(--hf-ink-4)" }}>{"// .env.production"}</span><br/>
        DATABASE_POOL_MAX=<span style={{ color: "#f29a9a", textDecoration: "line-through" }}>20</span> <span style={{ color: "#7ed98a" }}>60</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="hf-btn pill small">Apply &amp; redeploy</button>
        <button className="hf-btn outline small">Open PR</button>
        <button className="hf-btn ghost small">Snooze 1h</button>
      </div>
    </div>
  </div>
);

const InvestigationsPage = () => {
  const [filter, setFilter] = React.useState("all");
  const [selected, setSelected] = React.useState(INVESTIGATIONS[0].id);
  const filtered = INVESTIGATIONS.filter(i => filter === "all" ? true : i.status === filter);
  const cur = INVESTIGATIONS.find(i => i.id === selected) || filtered[0] || INVESTIGATIONS[0];
  const counts = INVESTIGATIONS.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});

  return (
    <div style={{ padding: "26px 32px 40px" }}>
      <PageHead
        crumb="AI Investigations"
        title={<>Six investigations.{" "}<span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Two need you</span>.</>}
        sub="Every anomaly automatically diagnosed against delivery history, endpoint health, provider status, schema drift, prior incidents, and revenue impact — in parallel."
        actions={<>
          <button className="hf-btn outline small">Filters</button>
          <button className="hf-btn pill small">+ Ask</button>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        <StatTile label="OPEN"        value={counts.open || 0}       sub="awaiting action" color="#f29a9a" accent="#f29a9a" />
        <StatTile label="MONITORING"  value={counts.monitoring || 0} sub="fix applied · watching" color="#fbbf24" accent="#fbbf24" />
        <StatTile label="RESOLVED 24h" value={counts.resolved || 0}  sub="closed automatically" color="#7ed98a" accent="#7ed98a" />
        <StatTile label="MEDIAN MTTR" value="4.6s"                   sub="across last 30 days" color="var(--hf-accent)" accent="var(--hf-accent)" />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["all","All"],["open","Open"],["monitoring","Monitoring"],["resolved","Resolved"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className="hf-change-chip" style={{
            cursor: "pointer", padding: "5px 12px",
            background: filter === k ? "var(--hf-bg-4)" : "transparent",
            color: filter === k ? "var(--hf-ink)" : "var(--hf-ink-3)",
            borderColor: filter === k ? "var(--hf-line-2)" : "var(--hf-line)",
          }}>{l} <span style={{ marginLeft: 6, color: "var(--hf-ink-4)" }}>{k === "all" ? INVESTIGATIONS.length : (counts[k] || 0)}</span></button>
        ))}
      </div>

      {/* List + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 18, alignItems: "start" }}>
        <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, overflow: "hidden" }}>
          {filtered.map(inv => (
            <InvestigationRow key={inv.id} inv={inv} selected={selected === inv.id} onSelect={setSelected} />
          ))}
        </div>
        <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, position: "sticky", top: 86 }}>
          <InvestigationDetail inv={cur} />
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */
/*                          ANOMALIES PAGE                            */
/*  (with interactive AI agent prompt at the top)                     */
/* ════════════════════════════════════════════════════════════════ */

const ANOMALIES = [
  { id: "an_8a21", title: "Delivery failure spike on shopify.orders", sev: "critical", revenue: 2100,  detected: 8,    provider: "shopify", endpoint: "/wh/shopify",      diagnosed: true,  pattern: "DB pool exhaustion · matches INC-0318" },
  { id: "an_8a20", title: "Schema drift detected on clerk.user",      sev: "medium",   revenue: 0,     detected: 47,   provider: "clerk",   endpoint: "/wh/clerk",        diagnosed: true,  pattern: "Added field: phone_verified · backward compatible" },
  { id: "an_8a19", title: "stripe.live signature mismatch",            sev: "high",     revenue: 240,   detected: 124,  provider: "stripe",  endpoint: "/wh/stripe",       diagnosed: true,  pattern: "Provider secret rotated · update needed" },
  { id: "an_8a18", title: "Reconciler gap · payment_intent.created",  sev: "low",      revenue: 58,    detected: 380,  provider: "stripe",  endpoint: "—",                diagnosed: true,  pattern: "Provider missed firing · recovered" },
  { id: "an_8a17", title: "Latency drift on resend.email",             sev: "medium",   revenue: 0,     detected: 720,  provider: "resend",  endpoint: "/wh/resend",       diagnosed: false, pattern: "p95 14ms → 84ms over 6h" },
  { id: "an_8a16", title: "Dedup explosion on checkout.session",       sev: "low",      revenue: 0,     detected: 1280, provider: "stripe",  endpoint: "/wh/stripe",       diagnosed: true,  pattern: "Provider replay storm · self-healing" },
];

const SUGGESTED_PROMPTS = [
  "Why did checkouts dip at 02:14?",
  "Compare this week's parity vs last week",
  "Show endpoints with rising p95",
  "What's the root cause of an_8a21?",
];

const AnomalyAIPrompt = () => {
  const [input, setInput] = React.useState("");
  const [thread, setThread] = React.useState([
    {
      role: "ai",
      text: "I'm watching 6 anomalies across 5 providers. Ask me anything about delivery failures, schema drift, or revenue at risk — I'll query the relevant signals in parallel and explain what I find.",
      meta: "queries 7+ sources · cites every claim · suggests one-click fixes",
    },
  ]);

  const send = (q) => {
    if (!q.trim()) return;
    const text = q.trim();
    setThread(t => [...t, { role: "user", text }]);
    setInput("");
    // simulated response
    setTimeout(() => {
      setThread(t => [...t, {
        role: "ai",
        text: "Looking into shopify.orders for the last hour — endpoint p95 climbed from 61ms to 4,012ms at 04:12. Pattern matches incident INC-0318 (94% confidence). The fix from that incident — scaling DATABASE_POOL_MAX from 20 → 60 — applies unchanged here.",
        meta: "queried 7 sources · 4.6s · confidence 0.94",
        actions: ["Apply the fix", "Open INC-0318", "Why this match?"],
      }]);
    }, 600);
  };

  return (
    <div className="hf-landscape amber" style={{ padding: "30px 32px", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 24 }}>
        <div>
          <div className="hf-eyebrow" style={{ marginBottom: 10 }}>Ask HookWise · AI agent</div>
          <h1 className="hf-display" style={{ fontSize: 28, margin: 0, fontWeight: 450, letterSpacing: "-0.025em", lineHeight: 1.15 }}>
            <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Ask</span> your webhooks. Get a root cause in seconds.
          </h1>
        </div>
        <Pill tone="green">agent online</Pill>
      </div>

      {/* Thread */}
      <div style={{ background: "rgba(0,0,0,0.35)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "16px 18px", marginBottom: 14, maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {thread.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600,
              background: m.role === "ai" ? "rgba(255,107,44,0.15)" : "rgba(255,255,255,0.06)",
              color: m.role === "ai" ? "var(--hf-accent)" : "var(--hf-ink-2)",
            }}>{m.role === "ai" ? "✦" : "M"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: m.role === "ai" ? "var(--hf-ink)" : "var(--hf-ink-2)", lineHeight: 1.65 }}>{m.text}</div>
              {m.meta && <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", marginTop: 6, letterSpacing: "0.04em" }}>{m.meta}</div>}
              {m.actions && (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {m.actions.map((a, j) => (
                    <button key={j} className={j === 0 ? "hf-btn pill small" : "hf-btn outline small"}>{a}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(0,0,0,0.5)", border: "1px solid var(--hf-line-2)", borderRadius: 12, padding: "10px 14px" }}>
        <span style={{ color: "var(--hf-accent)" }}>›</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
          placeholder="e.g. why did orders.create start failing at 04:12?"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--hf-ink)", fontFamily: "Inter, sans-serif", fontSize: 14, letterSpacing: "-0.005em" }}
        />
        <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", padding: "2px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>⌘ ↵</span>
        <button className="hf-btn pill small" onClick={() => send(input)}>Ask</button>
      </div>

      {/* Suggestions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {SUGGESTED_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)} className="hf-change-chip" style={{ cursor: "pointer", padding: "5px 12px", background: "rgba(255,255,255,0.02)" }}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};

const AnomalyRow = ({ a }) => (
  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 100px 110px 80px", gap: 16, padding: "16px 22px", borderBottom: "1px solid var(--hf-line)", alignItems: "center" }}>
    <SeverityBadge s={a.sev} />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13.5, color: "var(--hf-ink)", fontWeight: 450, marginBottom: 4, letterSpacing: "-0.005em" }}>{a.title}</div>
      <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>
        {a.diagnosed ? <span style={{ color: "var(--hf-accent)" }}>✦ </span> : null}{a.pattern}
      </div>
    </div>
    <ProviderTag name={a.provider} />
    <span className="hf-mono" style={{ fontSize: 12, color: a.revenue > 0 ? "#fbbf24" : "var(--hf-ink-4)", textAlign: "right" }}>
      {a.revenue > 0 ? `$${a.revenue.toLocaleString()}` : "—"}
    </span>
    <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)", textAlign: "right" }}>{fmtAgo(a.detected)} ago</span>
    <button className="hf-btn ghost small" style={{ padding: "4px 10px", justifySelf: "end" }}>Open →</button>
  </div>
);

const AnomaliesPage = () => {
  const [sev, setSev] = React.useState("all");
  const filtered = ANOMALIES.filter(a => sev === "all" ? true : a.sev === sev);
  const totalRevenue = ANOMALIES.reduce((s, a) => s + a.revenue, 0);

  return (
    <div style={{ padding: "26px 32px 40px" }}>
      <AnomalyAIPrompt />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        <StatTile label="ACTIVE" value="6" sub="across 5 providers" color="var(--hf-ink)" />
        <StatTile label="REVENUE AT RISK" value={`$${totalRevenue.toLocaleString()}`} sub="auto-quantified" color="#fbbf24" accent="#fbbf24" />
        <StatTile label="DIAGNOSED" value="5 of 6" sub="83% with root cause" color="var(--hf-accent)" accent="var(--hf-accent)" />
        <StatTile label="MEAN AGE" value="9m" sub="time since first signal" />
      </div>

      <Panel
        title="Detected anomalies"
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {[["all","All"],["critical","Critical"],["high","High"],["medium","Medium"],["low","Low"]].map(([k, l]) => (
              <button key={k} onClick={() => setSev(k)} className="hf-change-chip" style={{
                cursor: "pointer", padding: "4px 10px",
                background: sev === k ? "var(--hf-bg-4)" : "transparent",
                color: sev === k ? "var(--hf-ink)" : "var(--hf-ink-3)",
                borderColor: sev === k ? "var(--hf-line-2)" : "var(--hf-line)",
              }}>{l}</button>
            ))}
          </div>
        }
        padded={false}
      >
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 100px 110px 80px", gap: 16, padding: "12px 22px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
          <span>Severity</span><span>Anomaly</span><span>Provider</span>
          <span style={{ textAlign: "right" }}>$ at risk</span>
          <span style={{ textAlign: "right" }}>Detected</span>
          <span></span>
        </div>
        {filtered.map(a => <AnomalyRow key={a.id} a={a} />)}
      </Panel>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */
/*                          RECONCILER PAGE                            */
/* ════════════════════════════════════════════════════════════════ */

const RECON_RUNS = [
  { ts: 4,   provider: "stripe",  scanned: 12480, gaps: 2, recovered: 2, revenue: 196,  status: "ok" },
  { ts: 64,  provider: "shopify", scanned: 8210,  gaps: 0, recovered: 0, revenue: 0,    status: "ok" },
  { ts: 124, provider: "stripe",  scanned: 12420, gaps: 1, recovered: 1, revenue: 58,   status: "ok" },
  { ts: 184, provider: "clerk",   scanned: 4810,  gaps: 0, recovered: 0, revenue: 0,    status: "ok" },
  { ts: 244, provider: "shopify", scanned: 8290,  gaps: 4, recovered: 3, revenue: 412,  status: "partial" },
  { ts: 304, provider: "stripe",  scanned: 12380, gaps: 0, recovered: 0, revenue: 0,    status: "ok" },
  { ts: 364, provider: "github",  scanned: 1670,  gaps: 0, recovered: 0, revenue: 0,    status: "ok" },
  { ts: 424, provider: "shopify", scanned: 8240,  gaps: 1, recovered: 1, revenue: 248,  status: "ok" },
];

const ReconcilerPage = () => {
  const totRecov = RECON_RUNS.reduce((s, r) => s + r.recovered, 0);
  const totRevenue = RECON_RUNS.reduce((s, r) => s + r.revenue, 0);
  const totScanned = RECON_RUNS.reduce((s, r) => s + r.scanned, 0);

  return (
    <div style={{ padding: "26px 32px 40px" }}>
      <PageHead
        crumb="Reconciler"
        title={<>HookWise found <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>{totRecov} events</span> the provider missed.</>}
        sub="Every five minutes we poll Stripe, Shopify, Clerk, Resend and GitHub APIs, diff against our ingest log, and quietly recover anything that fell through the cracks."
        actions={<>
          <button className="hf-btn outline small">Schedule</button>
          <button className="hf-btn pill small">Run now ↻</button>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        <StatTile label="EVENTS RECOVERED" value={totRecov} sub="last 30 days" color="var(--hf-accent)" accent="var(--hf-accent)" />
        <StatTile label="REVENUE PROTECTED" value={`$${totRevenue.toLocaleString()}`} sub="quantified per recovery" color="#7ed98a" accent="#7ed98a" />
        <StatTile label="PROVIDER EVENTS SCANNED" value={`${(totScanned/1000).toFixed(1)}K`} sub="across 5 integrations" />
        <StatTile label="PARITY · 24H" value="99.98%" sub="ingest log vs provider truth" />
      </div>

      {/* Live status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
        {[
          { p: "stripe",  c: "#f2b37a", parity: "100.00%", nextIn: "3m 12s" },
          { p: "shopify", c: "#9ec396", parity: "99.95%",  nextIn: "1m 48s" },
          { p: "clerk",   c: "#c4a5ff", parity: "99.94%",  nextIn: "2m 04s" },
          { p: "resend",  c: "#e89f6b", parity: "100.00%", nextIn: "4m 22s" },
          { p: "github",  c: "#fbbf24", parity: "99.94%",  nextIn: "0m 41s" },
        ].map(r => (
          <div key={r.p} style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="hf-mono" style={{ fontSize: 11.5, color: r.c }}>● {r.p}</span>
              <span style={{ fontSize: 10.5, color: "var(--hf-ink-4)" }}>next in {r.nextIn}</span>
            </div>
            <div className="hf-num hf-mono" style={{ fontSize: 22, fontWeight: 500, color: "var(--hf-ink)", letterSpacing: "-0.025em" }}>{r.parity}</div>
            <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 4 }}>parity · last 24h</div>
          </div>
        ))}
      </div>

      <Panel
        title="Reconciliation runs"
        right={<span style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>last 8 hours</span>}
        padded={false}
      >
        <div style={{ display: "grid", gridTemplateColumns: "90px 110px 1fr 90px 90px 110px 100px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
          <span>Time</span><span>Provider</span><span>Coverage</span>
          <span style={{ textAlign: "right" }}>Scanned</span>
          <span style={{ textAlign: "right" }}>Recovered</span>
          <span style={{ textAlign: "right" }}>Revenue</span>
          <span style={{ textAlign: "right" }}>Status</span>
        </div>
        {RECON_RUNS.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 110px 1fr 90px 90px 110px 100px", gap: 14, padding: "14px 24px", borderBottom: i < RECON_RUNS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
            <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}>{fmtAgo(r.ts)} ago</span>
            <ProviderTag name={r.provider} />
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{ width: `${(1 - (r.gaps - r.recovered) / Math.max(r.scanned, 1)) * 100}%`, height: "100%", background: r.gaps === r.recovered ? "#7ed98a" : "var(--hf-accent)" }} />
            </div>
            <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r.scanned.toLocaleString()}</span>
            <span className="hf-num hf-mono" style={{ fontSize: 12.5, color: r.recovered > 0 ? "var(--hf-accent)" : "var(--hf-ink-4)", textAlign: "right", fontWeight: 500 }}>
              {r.recovered > 0 ? `+${r.recovered}` : "—"}
            </span>
            <span className="hf-num hf-mono" style={{ fontSize: 12, color: r.revenue > 0 ? "#7ed98a" : "var(--hf-ink-4)", textAlign: "right" }}>
              {r.revenue > 0 ? `$${r.revenue}` : "—"}
            </span>
            <span style={{ justifySelf: "end" }}>
              <Pill tone={r.status === "ok" ? "green" : "amber"}>{r.status}</Pill>
            </span>
          </div>
        ))}
      </Panel>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */
/*                            HEALTH PAGE                              */
/* ════════════════════════════════════════════════════════════════ */

const HEALTH_PROVIDERS = [
  { name: "stripe.live",     c: "#f2b37a", p50: 12, p95: 18,  fail: 0.001, vol: 38402, status: "healthy" },
  { name: "shopify.orders",  c: "#9ec396", p50: 14, p95: 22,  fail: 0.002, vol: 22118, status: "healthy" },
  { name: "clerk.user",      c: "#c4a5ff", p50: 36, p95: 84,  fail: 0.018, vol: 14041, status: "degraded" },
  { name: "resend.email",    c: "#e89f6b", p50: 9,  p95: 14,  fail: 0.000, vol: 6201,  status: "healthy" },
  { name: "github.deploy",   c: "#fbbf24", p50: 18, p95: 34,  fail: 0.001, vol: 1657,  status: "healthy" },
];

const Sparkline = ({ data, color, height = 36 }) => {
  const W = 120, H = height, P = 2;
  const max = Math.max(...data, 1);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"} ${P + (i * (W - 2*P)) / (data.length - 1)} ${H - P - (v / max) * (H - 2*P)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

const HealthPage = () => {
  const allHealthy = HEALTH_PROVIDERS.every(p => p.status === "healthy");
  return (
    <div style={{ padding: "26px 32px 40px" }}>
      <PageHead
        crumb="System health"
        title={<>{allHealthy ? <>All providers <span className="hf-serif" style={{ color: "#7ed98a" }}>healthy</span>.</> : <><span className="hf-serif" style={{ color: "var(--hf-accent)" }}>One provider</span> degraded.</>}</>}
        sub="Live p50, p95 and failure rate for every connected provider and endpoint. Anything outside healthy thresholds triggers an investigation automatically."
        actions={<>
          <button className="hf-btn outline small">Last 24h ⌄</button>
          <button className="hf-btn pill small">Configure SLOs</button>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        <StatTile label="UPTIME" value="99.997%" sub="last 30 days" color="#7ed98a" accent="#7ed98a" />
        <StatTile label="P95 LATENCY" value="22ms" sub="ack to provider" />
        <StatTile label="FAILURE RATE" value="0.42%" sub="auto-retried · 0 lost" color="var(--hf-accent)" accent="var(--hf-accent)" />
        <StatTile label="OPEN CIRCUITS" value="1" sub="clerk.user · half-open" color="#fbbf24" accent="#fbbf24" />
      </div>

      {/* Provider grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
        {HEALTH_PROVIDERS.map(p => {
          const tone = p.status === "healthy" ? "green" : p.status === "degraded" ? "amber" : "red";
          const trend = p.status === "degraded" ? [12,14,18,22,24,38,52,68,84] : [14,12,13,16,14,15,14,13,15];
          return (
            <div key={p.name} style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, color: "var(--hf-ink)", fontWeight: 500, letterSpacing: "-0.005em" }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 3 }}>{p.vol.toLocaleString()} events · 24h</div>
                </div>
                <Pill tone={tone}>{p.status}</Pill>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <div className="hf-mono" style={{ fontSize: 9.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>p50</div>
                  <div className="hf-num hf-mono" style={{ fontSize: 16, color: "var(--hf-ink)", fontWeight: 500 }}>{p.p50}<span style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>ms</span></div>
                </div>
                <div>
                  <div className="hf-mono" style={{ fontSize: 9.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>p95</div>
                  <div className="hf-num hf-mono" style={{ fontSize: 16, color: tone === "amber" ? "#fbbf24" : "var(--hf-ink)", fontWeight: 500 }}>{p.p95}<span style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>ms</span></div>
                </div>
                <div>
                  <div className="hf-mono" style={{ fontSize: 9.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>fail</div>
                  <div className="hf-num hf-mono" style={{ fontSize: 16, color: p.fail > 0.01 ? "#fbbf24" : "var(--hf-ink)", fontWeight: 500 }}>{(p.fail * 100).toFixed(2)}<span style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>%</span></div>
                </div>
              </div>
              <Sparkline data={trend} color={p.c} />
            </div>
          );
        })}
      </div>

      <Panel title="Endpoint health" right={<a className="hf-link-accent" style={{ fontSize: 13 }}>All endpoints →</a>} padded={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 90px 90px 90px 110px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
          <span>Endpoint</span><span>Provider</span>
          <span style={{ textAlign: "right" }}>p50</span>
          <span style={{ textAlign: "right" }}>p95</span>
          <span style={{ textAlign: "right" }}>Fail</span>
          <span style={{ textAlign: "right" }}>Circuit</span>
        </div>
        {[
          ["https://api.acme.com/wh/stripe",   "stripe",  12, 18,  "0.10%", "closed"],
          ["https://api.acme.com/wh/shopify",  "shopify", 14, 22,  "0.20%", "closed"],
          ["https://api.acme.com/wh/clerk",    "clerk",   36, 84,  "1.82%", "half-open"],
          ["https://api.acme.com/wh/resend",   "resend",  9,  14,  "0.00%", "closed"],
          ["https://api.acme.com/wh/github",   "github",  18, 34,  "0.06%", "closed"],
        ].map((r, i, a) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 90px 90px 90px 110px", gap: 14, padding: "14px 24px", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
            <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink)" }}>{r[0]}</span>
            <ProviderTag name={r[1]} />
            <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r[2]}ms</span>
            <span className="hf-mono" style={{ fontSize: 12, color: r[3] > 50 ? "#fbbf24" : "var(--hf-ink-2)", textAlign: "right" }}>{r[3]}ms</span>
            <span className="hf-mono" style={{ fontSize: 12, color: parseFloat(r[4]) > 1 ? "#fbbf24" : "var(--hf-ink-2)", textAlign: "right" }}>{r[4]}</span>
            <span style={{ justifySelf: "end" }}>
              <Pill tone={r[5] === "closed" ? "green" : r[5] === "half-open" ? "amber" : "red"}>{r[5]}</Pill>
            </span>
          </div>
        ))}
      </Panel>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */
/*                          ACTIVITY PAGE                              */
/* ════════════════════════════════════════════════════════════════ */

const ACTIVITY = [
  { ts: 4,    cat: "investigation", icon: "✦", tone: "ember",  text: "Investigation INC-0441 opened on shopify.orders",   meta: "94% confidence · matched INC-0318",  who: "AI" },
  { ts: 12,   cat: "recon",         icon: "⟲", tone: "green",  text: "Reconciler recovered 7 events from stripe.live",     meta: "+$1,284 revenue protected",          who: "system" },
  { ts: 18,   cat: "retry",         icon: "↻", tone: "amber",  text: "Smart Retry: clerk.user attempt 2/8",                meta: "backoff 60s",                        who: "system" },
  { ts: 23,   cat: "alert",         icon: "✉", tone: "ink",    text: "Alert delivered to #ops-webhooks (Slack)",           meta: "rule: critical anomalies",           who: "system" },
  { ts: 47,   cat: "sequencer",     icon: "⇆", tone: "violet", text: "Sequencer released 3 held orders.create",            meta: "ordered after payment_intent",       who: "system" },
  { ts: 64,   cat: "schema",        icon: "⌗", tone: "violet", text: "Schema drift cleared on shopify.orders",             meta: "auto-merged on next ingest",         who: "system" },
  { ts: 124,  cat: "investigation", icon: "✦", tone: "ember",  text: "Asked: 'why did checkouts dip at 02:14?'",           meta: "answered in 3.2s · 6 sources",       who: "Maya R." },
  { ts: 240,  cat: "integration",   icon: "+", tone: "violet", text: "Endpoint registered: github.deploy",                  meta: "verified signature · live",          who: "Maya R." },
  { ts: 480,  cat: "circuit",       icon: "⊘", tone: "amber",  text: "Circuit half-open: clerk.user",                       meta: "probing · 1 success of 1",           who: "system" },
  { ts: 720,  cat: "delivery",      icon: "✓", tone: "green",  text: "12,418 events delivered in last hour",                meta: "p95 18ms · 0 lost",                  who: "system" },
  { ts: 1280, cat: "scan",          icon: "⌕", tone: "violet", text: "Security scan completed for acme-production",         meta: "0 critical · 1 informational",       who: "AI" },
];

const ACTIVITY_CATEGORIES = [
  ["all",            "All",            null],
  ["investigation",  "AI",             "ember"],
  ["recon",          "Reconciler",     "green"],
  ["retry",          "Retries",        "amber"],
  ["sequencer",      "Sequencer",      "violet"],
  ["delivery",       "Deliveries",     "green"],
  ["integration",    "Integrations",   "violet"],
  ["alert",          "Alerts",         "ink"],
];

const ActivityPage = () => {
  const [cat, setCat] = React.useState("all");
  const filtered = ACTIVITY.filter(a => cat === "all" ? true : a.cat === cat);

  // group by day-ish (today vs yesterday)
  const today = filtered.filter(a => a.ts < 1440);
  const earlier = filtered.filter(a => a.ts >= 1440);

  return (
    <div style={{ padding: "26px 32px 40px" }}>
      <PageHead
        crumb="Activity log"
        title={<>Every action, every signal. <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>One feed</span>.</>}
        sub="A chronological log of every event HookWise handled, every retry it absorbed, every investigation it ran, and every action a teammate took — searchable and exportable."
        actions={<>
          <button className="hf-btn outline small">Export CSV</button>
          <button className="hf-btn pill small">Stream</button>
        </>}
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {ACTIVITY_CATEGORIES.map(([k, l, tone]) => (
          <button key={k} onClick={() => setCat(k)} className="hf-change-chip" style={{
            cursor: "pointer", padding: "5px 12px",
            background: cat === k ? "var(--hf-bg-4)" : "transparent",
            color: cat === k ? "var(--hf-ink)" : "var(--hf-ink-3)",
            borderColor: cat === k ? "var(--hf-line-2)" : "var(--hf-line)",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {tone && <span style={{ width: 5, height: 5, borderRadius: 999, background: tone === "ember" ? "var(--hf-accent)" : tone === "green" ? "#7ed98a" : tone === "amber" ? "#fbbf24" : tone === "violet" ? "#c4a5ff" : "var(--hf-ink-3)" }} />}
            {l}
          </button>
        ))}
      </div>

      <Panel padded={false}>
        {[
          ["TODAY", today],
          ["EARLIER", earlier],
        ].map(([head, rows]) => rows.length > 0 && (
          <div key={head}>
            <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "16px 24px 10px", borderBottom: "1px solid var(--hf-line)", background: "rgba(0,0,0,0.2)" }}>
              {head} · {rows.length}
            </div>
            {rows.map((a, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "28px 1fr 100px 80px",
                gap: 14, padding: "14px 24px",
                borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                alignItems: "center",
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: a.tone === "ember" ? "rgba(255,107,44,0.10)" :
                              a.tone === "green" ? "rgba(126,217,138,0.10)" :
                              a.tone === "amber" ? "rgba(251,191,36,0.10)" :
                              a.tone === "violet" ? "rgba(196,165,255,0.10)" :
                              "rgba(255,255,255,0.04)",
                  color: a.tone === "ember" ? "var(--hf-accent)" :
                         a.tone === "green" ? "#7ed98a" :
                         a.tone === "amber" ? "#fbbf24" :
                         a.tone === "violet" ? "#c4a5ff" :
                         "var(--hf-ink-2)",
                  display: "grid", placeItems: "center", fontSize: 13,
                }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--hf-ink)", lineHeight: 1.4, letterSpacing: "-0.005em" }}>{a.text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 3 }}>{a.meta}</div>
                </div>
                <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textAlign: "right" }}>{a.who}</span>
                <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", textAlign: "right" }}>{fmtAgo(a.ts)} ago</span>
              </div>
            ))}
          </div>
        ))}
      </Panel>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */
/*                       ALL DATA — Endpoints                          */
/* ════════════════════════════════════════════════════════════════ */

const EndpointsPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Data · Endpoints"
      title={<>Five endpoints, <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>one truth</span>.</>}
      sub="Every URL HookWise delivers to, with live latency, success rate, and the circuit breaker state. Click any row to inspect recent payloads."
      actions={<>
        <button className="hf-btn outline small">Filter</button>
        <button className="hf-btn pill small">+ Endpoint</button>
      </>}
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="ENDPOINTS" value="5" sub="across 5 providers" />
      <StatTile label="DELIVERIES · 24H" value="82,419" sub="99.99% success" color="#7ed98a" accent="#7ed98a" />
      <StatTile label="P95 LATENCY" value="22ms" sub="aggregate" />
      <StatTile label="RETRIES IN FLIGHT" value="4" sub="exponential backoff" color="#fbbf24" accent="#fbbf24" />
    </div>

    <Panel padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 110px 100px 110px 110px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>URL</span><span>Provider · path</span>
        <span style={{ textAlign: "right" }}>24h volume</span>
        <span style={{ textAlign: "right" }}>p95</span>
        <span style={{ textAlign: "right" }}>Success</span>
        <span style={{ textAlign: "right" }}>Circuit</span>
      </div>
      {[
        ["https://api.acme.com/wh/stripe",   "stripe",  "/payments",  38402, "18ms", "99.99%", "closed"],
        ["https://api.acme.com/wh/shopify",  "shopify", "/orders",    22118, "22ms", "99.80%", "closed"],
        ["https://api.acme.com/wh/clerk",    "clerk",   "/users",     14041, "84ms", "98.21%", "half-open"],
        ["https://api.acme.com/wh/resend",   "resend",  "/email",     6201,  "14ms", "100.0%", "closed"],
        ["https://api.acme.com/wh/github",   "github",  "/deploys",   1657,  "34ms", "99.94%", "closed"],
      ].map((r, i, a) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 110px 100px 110px 110px", gap: 14, padding: "14px 24px", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink)" }}>{r[0]}</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ProviderTag name={r[1]} />
            <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{r[2]}</span>
          </span>
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r[3].toLocaleString()}</span>
          <span className="hf-mono" style={{ fontSize: 12, color: parseInt(r[4]) > 50 ? "#fbbf24" : "var(--hf-ink-2)", textAlign: "right" }}>{r[4]}</span>
          <span className="hf-mono" style={{ fontSize: 12, color: parseFloat(r[5]) < 99 ? "#fbbf24" : "#7ed98a", textAlign: "right" }}>{r[5]}</span>
          <span style={{ justifySelf: "end" }}>
            <Pill tone={r[6] === "closed" ? "green" : r[6] === "half-open" ? "amber" : "red"}>{r[6]}</Pill>
          </span>
        </div>
      ))}
    </Panel>
  </div>
);

/* ────────── Customers ────────── */

const CustomersPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Data · Customers"
      title={<>1,284 customers, <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>stitched</span> across providers.</>}
      sub="HookWise resolves each customer's identity across Stripe, Shopify, Clerk, and Resend — even when IDs don't match — so you see one unified timeline per person."
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="CUSTOMERS" value="1,284" sub="active in last 30 days" />
      <StatTile label="STITCHED" value="98.4%" sub="cross-provider matched" color="var(--hf-accent)" accent="var(--hf-accent)" />
      <StatTile label="LTV TRACKED" value="$2.1M" sub="across all integrations" color="#7ed98a" accent="#7ed98a" />
      <StatTile label="EVENTS / CUSTOMER" value="64" sub="median" />
    </div>

    <Panel padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 100px 100px 100px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>Customer</span><span>Linked providers</span>
        <span style={{ textAlign: "right" }}>Events</span>
        <span style={{ textAlign: "right" }}>LTV</span>
        <span style={{ textAlign: "right" }}>Last seen</span>
        <span style={{ textAlign: "right" }}>Status</span>
      </div>
      {[
        ["Maya R.",     "maya@thursdaybloom.co",    ["stripe","shopify","clerk"],  248, 2418, 4,    "active"],
        ["Devon K.",    "devon@lattice.pay",        ["stripe","clerk"],            512, 4810, 12,   "active"],
        ["Priya S.",    "priya@cove.io",            ["stripe","shopify"],          184, 1820, 47,   "active"],
        ["Theo L.",     "theo@northwind.app",       ["stripe","shopify","resend"], 320, 6210, 124,  "active"],
        ["Sasha B.",    "sasha@onset.co",           ["stripe"],                    98,  890,  380,  "active"],
        ["Erik N.",     "erik@glance.io",           ["stripe","clerk","resend"],   412, 3280, 720,  "lapsed"],
      ].map((r, i, a) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 100px 100px 100px", gap: 14, padding: "14px 24px", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13.5, color: "var(--hf-ink)", fontWeight: 500, letterSpacing: "-0.005em" }}>{r[0]}</div>
            <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", marginTop: 2 }}>{r[1]}</div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {r[2].map(p => <ProviderTag key={p} name={p} />)}
          </div>
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r[3]}</span>
          <span className="hf-num hf-mono" style={{ fontSize: 12.5, color: "#7ed98a", textAlign: "right", fontWeight: 500 }}>${r[4].toLocaleString()}</span>
          <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", textAlign: "right" }}>{fmtAgo(r[5])} ago</span>
          <span style={{ justifySelf: "end" }}>
            <Pill tone={r[6] === "active" ? "green" : "ink"}>{r[6]}</Pill>
          </span>
        </div>
      ))}
    </Panel>
  </div>
);

/* ────────── Schemas ────────── */

const SchemasPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Data · Schemas"
      title={<>Schemas, <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>versioned</span> over time.</>}
      sub="Every event payload shape we've seen, when it appeared, and what changed. Drift is detected automatically and flagged before it breaks your code."
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="ACTIVE SCHEMAS" value="42" sub="across 5 providers" />
      <StatTile label="DRIFT THIS WEEK" value="3" sub="all backward compatible" color="#fbbf24" accent="#fbbf24" />
      <StatTile label="BREAKING" value="0" sub="last 90 days" color="#7ed98a" accent="#7ed98a" />
      <StatTile label="COVERAGE" value="100%" sub="every event typed" color="var(--hf-accent)" accent="var(--hf-accent)" />
    </div>

    <Panel padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 100px 1fr 90px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>Event type</span><span>Provider</span>
        <span style={{ textAlign: "right" }}>Versions</span>
        <span>Last change</span>
        <span style={{ textAlign: "right" }}>Status</span>
      </div>
      {[
        ["payment_intent.succeeded",       "stripe",  4, "added latest_charge.id",            64,   "stable"],
        ["orders.create",                  "shopify", 7, "tax_lines now array (compat)",      240,  "stable"],
        ["user.created",                   "clerk",   3, "added phone_verified",              47,   "drift"],
        ["email.delivered",                "resend",  2, "no change · 30d",                   43200,"stable"],
        ["checkout.session.completed",     "stripe",  6, "shipping_address optional",         720,  "stable"],
        ["deploy.success",                 "github",  2, "added artifact_url",                380,  "stable"],
        ["payment_intent.payment_failed",  "stripe",  4, "added last_payment_error.decline_code", 1280, "stable"],
      ].map((r, i, a) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 100px 1fr 90px", gap: 14, padding: "14px 24px", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
          <span className="hf-mono" style={{ fontSize: 12.5, color: "var(--hf-ink)" }}>{r[0]}</span>
          <ProviderTag name={r[1]} />
          <span className="hf-num hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>v{r[2]}</span>
          <span style={{ fontSize: 12.5, color: "var(--hf-ink-3)" }}>
            <span className="hf-mono" style={{ color: "var(--hf-ink-4)", marginRight: 8 }}>{fmtAgo(r[3])} ago</span>
            {r[4]}
          </span>
          <span style={{ justifySelf: "end" }}>
            <Pill tone={r[5] === "stable" ? "green" : r[5] === "drift" ? "amber" : "red"}>{r[5]}</Pill>
          </span>
        </div>
      ))}
    </Panel>
  </div>
);

/* ────────── Retries ────────── */

const RetriesPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Data · Retries"
      title={<>Four retries in flight. <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Zero lost</span>.</>}
      sub="Every retry HookWise is actively running, with backoff state, attempt count, and the original event for replay. Nothing dies in a queue."
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="IN FLIGHT" value="4" sub="exponential backoff" color="#fbbf24" accent="#fbbf24" />
      <StatTile label="SUCCEEDED · 24H" value="218" sub="auto-recovered" color="#7ed98a" accent="#7ed98a" />
      <StatTile label="EXHAUSTED" value="0" sub="reached 8 attempts" color="#7ed98a" />
      <StatTile label="DLQ DEPTH" value="0" sub="manual review queue" />
    </div>

    <Panel padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 90px 100px 90px 100px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>Event ID</span><span>Endpoint</span>
        <span style={{ textAlign: "right" }}>Attempt</span>
        <span style={{ textAlign: "right" }}>Backoff</span>
        <span style={{ textAlign: "right" }}>Last err</span>
        <span style={{ textAlign: "right" }}>Action</span>
      </div>
      {[
        ["evt_8a21_c9", "/wh/shopify · orders.create",     "2/8",  "60s",  "503",   "retrying"],
        ["evt_8a21_d4", "/wh/shopify · orders.create",     "3/8",  "120s", "503",   "retrying"],
        ["evt_8a22_a1", "/wh/clerk · user.updated",        "4/8",  "240s", "timeout", "retrying"],
        ["evt_8a22_b3", "/wh/clerk · user.updated",        "2/8",  "60s",  "429",   "retrying"],
      ].map((r, i, a) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 90px 100px 90px 100px", gap: 14, padding: "14px 24px", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
          <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-2)" }}>{r[0]}</span>
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink)" }}>{r[1]}</span>
          <span className="hf-num hf-mono" style={{ fontSize: 12, color: "#fbbf24", textAlign: "right", fontWeight: 500 }}>{r[2]}</span>
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", textAlign: "right" }}>{r[3]}</span>
          <span className="hf-mono" style={{ fontSize: 12, color: "#f29a9a", textAlign: "right" }}>{r[4]}</span>
          <button className="hf-btn ghost small" style={{ padding: "3px 10px", justifySelf: "end" }}>Replay</button>
        </div>
      ))}
    </Panel>
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
/*                          SETTINGS · PROJECT                         */
/* ════════════════════════════════════════════════════════════════ */

const Field = ({ label, hint, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32, padding: "22px 0", borderBottom: "1px solid var(--hf-line)", alignItems: "flex-start" }}>
    <div>
      <div style={{ fontSize: 13.5, color: "var(--hf-ink)", fontWeight: 500, letterSpacing: "-0.005em" }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--hf-ink-3)", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);

const Input = ({ value, mono, suffix, width = "100%" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--hf-bg)", border: "1px solid var(--hf-line)", borderRadius: 8, padding: "8px 12px", width, maxWidth: 460, fontFamily: mono ? "JetBrains Mono, monospace" : "Inter, sans-serif", fontSize: 13, color: "var(--hf-ink)" }}>
    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    {suffix}
  </div>
);

const Toggle = ({ on = true, label }) => (
  <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
    <span style={{ width: 30, height: 18, borderRadius: 999, background: on ? "var(--hf-accent)" : "rgba(255,255,255,0.10)", position: "relative", transition: "background 140ms" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 14 : 2, width: 14, height: 14, borderRadius: 999, background: "#fff", transition: "left 140ms" }} />
    </span>
    {label && <span style={{ fontSize: 13, color: "var(--hf-ink-2)" }}>{label}</span>}
  </label>
);

const ProjectPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Settings · Project"
      title={<>Project <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>settings</span>.</>}
      sub="Configuration that applies to every endpoint, every event, every integration in acme-production."
      actions={<button className="hf-btn pill small">Save changes</button>}
    />

    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
      <Panel title="General">
        <Field label="Project name" hint="Shown in the dashboard switcher.">
          <Input value="acme-production" />
        </Field>
        <Field label="Environment" hint="Affects log retention and alert routing.">
          <div style={{ display: "flex", gap: 6 }}>
            {["production","staging","dev"].map(e => (
              <button key={e} className="hf-change-chip" style={{ cursor: "pointer", padding: "6px 14px", background: e === "production" ? "var(--hf-bg-4)" : "transparent", color: e === "production" ? "var(--hf-ink)" : "var(--hf-ink-3)", borderColor: e === "production" ? "var(--hf-line-2)" : "var(--hf-line)" }}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Region" hint="Where ingest, replay buffer, and reconciler run.">
          <Input value="us-east-1 · Virginia" suffix={<span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)" }}>p95 11ms</span>} />
        </Field>
        <Field label="Project ID" hint="Used in API requests and webhook URLs.">
          <Input value="proj_8a21c9d4f2a1" mono suffix={<button className="hf-btn ghost small" style={{ padding: "2px 8px" }}>Copy</button>} />
        </Field>
        <div style={{ padding: "22px 0 4px" }}>
          <div style={{ fontSize: 13, color: "#f29a9a", fontWeight: 500, marginBottom: 4 }}>Danger zone</div>
          <div style={{ fontSize: 12, color: "var(--hf-ink-3)", marginBottom: 14 }}>Destructive actions. Cannot be undone.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="hf-btn outline small">Transfer ownership</button>
            <button className="hf-btn outline small" style={{ color: "#f29a9a", borderColor: "rgba(242,154,154,0.3)" }}>Delete project</button>
          </div>
        </div>
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Panel title="Plan & usage">
          <div style={{ fontSize: 26, fontWeight: 500, color: "var(--hf-ink)", letterSpacing: "-0.02em", marginBottom: 4 }}>Pro</div>
          <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-3)", marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.06em" }}>5M events / mo · $399</div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: "48%", height: "100%", background: "var(--hf-accent)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--hf-ink-3)" }}>
            <span><span className="hf-num" style={{ color: "var(--hf-ink)" }}>2.4M</span> used</span>
            <span>5.0M cap</span>
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
            <button className="hf-btn outline small">View invoice</button>
            <button className="hf-btn pill small">Upgrade</button>
          </div>
        </Panel>

        <Panel title="Features">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["Smart Retry",        "8 attempts · exponential backoff", true],
              ["Reconciler",         "every 5 minutes",                  true],
              ["AI Investigation",   "auto-diagnose anomalies",          true],
              ["Sequencer",          "ordering for related events",      true],
              ["Security scanner",   "weekly · ISO 27001 baseline",      false],
            ].map(([n, sub, on]) => (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--hf-ink)", fontWeight: 500 }}>{n}</div>
                  <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 2 }}>{sub}</div>
                </div>
                <Toggle on={on} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
/*                          SETTINGS · API KEYS                        */
/* ════════════════════════════════════════════════════════════════ */

const KeyRow = ({ name, prefix, scope, created, lastUsed, by, env }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 90px 110px 110px 100px", gap: 14, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
    <div>
      <div style={{ fontSize: 13.5, color: "var(--hf-ink)", fontWeight: 500 }}>{name}</div>
      <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", marginTop: 3 }}>{prefix}••••••••••••</div>
    </div>
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {scope.map(s => (
        <span key={s} className="hf-change-chip" style={{ fontSize: 10, padding: "1px 7px", color: "var(--hf-ink-2)" }}>{s}</span>
      ))}
    </div>
    <Pill tone={env === "prod" ? "ember" : env === "staging" ? "amber" : "violet"} dot={false}>{env}</Pill>
    <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)", textAlign: "right" }}>{created}</span>
    <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-2)", textAlign: "right" }}>{lastUsed}</span>
    <div style={{ justifySelf: "end", display: "flex", gap: 4 }}>
      <button className="hf-btn ghost small" style={{ padding: "3px 8px" }}>Roll</button>
      <button className="hf-btn ghost small" style={{ padding: "3px 8px", color: "#f29a9a" }}>Revoke</button>
    </div>
  </div>
);

const KeysPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Settings · API keys"
      title={<>Six keys, <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>scoped</span> by intent.</>}
      sub="Every key is environment-bound, scope-limited, and audit-logged. Rolling a key never drops in-flight requests — old keys remain valid for 60 seconds while clients pick up the new one."
      actions={<>
        <button className="hf-btn outline small">Audit log</button>
        <button className="hf-btn pill small">+ Generate key</button>
      </>}
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="ACTIVE KEYS" value="6" sub="across 3 environments" />
      <StatTile label="EXPIRING SOON" value="1" sub="rotate within 14 days" color="#fbbf24" accent="#fbbf24" />
      <StatTile label="LAST ROTATED" value="11d" sub="prod-server · auto" />
      <StatTile label="REQUESTS · 24H" value="82.4K" sub="all keys" color="var(--hf-accent)" accent="var(--hf-accent)" />
    </div>

    <Panel padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 90px 110px 110px 100px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>Name · prefix</span><span>Scope</span><span>Env</span>
        <span style={{ textAlign: "right" }}>Created</span>
        <span style={{ textAlign: "right" }}>Last used</span>
        <span></span>
      </div>
      <KeyRow name="prod-server"     prefix="hw_live_8a21" scope={["ingest","read","reconcile"]} env="prod"    created="11d ago" lastUsed="2m ago"   by="Maya R." />
      <KeyRow name="prod-edge"       prefix="hw_live_d4c2" scope={["ingest"]}                    env="prod"    created="64d ago" lastUsed="just now" by="Devon K." />
      <KeyRow name="ci-deploys"      prefix="hw_live_f4a1" scope={["read","admin"]}              env="prod"    created="91d ago" lastUsed="3h ago"   by="Theo L." />
      <KeyRow name="staging-server"  prefix="hw_test_c9d4" scope={["ingest","read"]}             env="staging" created="22d ago" lastUsed="14m ago"  by="Priya S." />
      <KeyRow name="local-dev · maya" prefix="hw_test_a1b3" scope={["ingest","read"]}            env="dev"     created="3d ago"  lastUsed="6m ago"   by="Maya R." />
      <KeyRow name="analytics-readonly" prefix="hw_live_e7f2" scope={["read"]}                  env="prod"    created="180d ago" lastUsed="2d ago"  by="Sasha B." />
    </Panel>

    <div style={{ marginTop: 18, background: "rgba(255,107,44,0.04)", border: "1px solid rgba(255,107,44,0.20)", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ color: "var(--hf-accent)", fontSize: 16, paddingTop: 1 }}>✦</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--hf-ink)", fontWeight: 500, marginBottom: 3 }}>HookWise recommends rotating <span className="hf-mono">analytics-readonly</span> within 14 days.</div>
        <div style={{ fontSize: 12, color: "var(--hf-ink-3)" }}>It's been 180 days since last rotation. Auto-rotate is available with zero downtime — old keys stay valid for 60s.</div>
      </div>
      <button className="hf-btn pill small">Enable auto-rotate</button>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
/*                          SETTINGS · ALERTS                          */
/* ════════════════════════════════════════════════════════════════ */

const ALERT_CHANNELS = [
  { name: "#ops-webhooks",     kind: "slack",       icon: "S", color: "#7ed98a", events: 4, status: "connected" },
  { name: "ops@acme.com",      kind: "email",       icon: "✉", color: "var(--hf-ink-2)", events: 1, status: "connected" },
  { name: "PagerDuty · P1",    kind: "pagerduty",   icon: "P", color: "#7ed98a", events: 2, status: "connected" },
  { name: "+1 (415) 555-0114", kind: "sms",         icon: "✆", color: "#fbbf24", events: 0, status: "needs verify" },
];

const ALERT_RULES = [
  { name: "Critical anomaly opened",             trigger: "severity = critical",                channels: ["slack","pagerduty"], on: true,  fires: 3 },
  { name: "Reconciler gap unrecovered > 5min",   trigger: "recon_gap_age > 5m",                 channels: ["slack","email"],     on: true,  fires: 0 },
  { name: "Endpoint p95 > 500ms for 3 min",      trigger: "endpoint.p95 > 500ms · 3m",          channels: ["slack"],             on: true,  fires: 1 },
  { name: "Circuit opened",                      trigger: "circuit.state changes to open",      channels: ["slack","pagerduty"], on: true,  fires: 0 },
  { name: "Schema drift · breaking",             trigger: "schema.drift = breaking",            channels: ["slack","email"],     on: true,  fires: 0 },
  { name: "DLQ depth > 0",                       trigger: "dlq.depth > 0",                      channels: ["pagerduty"],         on: false, fires: 0 },
  { name: "Daily summary · 09:00 PT",            trigger: "schedule · weekday 09:00 America/Los_Angeles", channels: ["email"],    on: true,  fires: 1 },
];

const AlertsPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Settings · Alerts"
      title={<>Wake the <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>right person</span> at the right time.</>}
      sub="HookWise routes anomalies to the channel that fits their severity. Investigations attach to alerts automatically, so on-call gets root cause and a fix — not just a notification."
      actions={<>
        <button className="hf-btn outline small">Test alert</button>
        <button className="hf-btn pill small">+ Rule</button>
      </>}
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="ACTIVE RULES" value="6 of 7" sub="1 paused" color="var(--hf-accent)" accent="var(--hf-accent)" />
      <StatTile label="FIRED · 24H" value="5" sub="auto-resolved: 4" />
      <StatTile label="CHANNELS" value="4" sub="3 connected · 1 pending" />
      <StatTile label="MEAN ACK" value="2m 14s" sub="from fire to acknowledge" color="#7ed98a" accent="#7ed98a" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
      <Panel title="Routing rules" right={<a className="hf-link-accent" style={{ fontSize: 13 }}>Templates →</a>} padded={false}>
        {ALERT_RULES.map((r, i) => (
          <div key={i} style={{ padding: "18px 24px", borderBottom: i < ALERT_RULES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: "var(--hf-ink)", fontWeight: 500, letterSpacing: "-0.005em" }}>{r.name}</span>
                {r.fires > 0 && <Pill tone="ember" dot={false}>fired {r.fires}× · 24h</Pill>}
              </div>
              <div className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginBottom: 10, lineHeight: 1.5 }}>
                <span style={{ color: "var(--hf-ink-4)" }}>when</span> {r.trigger}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.channels.map(c => (
                  <span key={c} className="hf-change-chip" style={{ fontSize: 10.5, padding: "2px 8px", color: "var(--hf-ink-2)", display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <span style={{ width: 4, height: 4, borderRadius: 999, background: c === "pagerduty" ? "#7ed98a" : c === "slack" ? "#c4a5ff" : c === "sms" ? "#fbbf24" : "var(--hf-ink-3)" }} />
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <Toggle on={r.on} />
          </div>
        ))}
      </Panel>

      <Panel title="Channels">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ALERT_CHANNELS.map(c => (
            <div key={c.name} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, alignItems: "center", paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--hf-bg)", border: "1px solid var(--hf-line)", display: "grid", placeItems: "center", color: c.color, fontSize: 13, fontWeight: 600 }}>{c.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--hf-ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--hf-ink-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>{c.kind} · {c.events} rule{c.events === 1 ? "" : "s"}</div>
              </div>
              <Pill tone={c.status === "connected" ? "green" : "amber"}>{c.status}</Pill>
            </div>
          ))}
          <button className="hf-btn outline small" style={{ width: "100%", justifyContent: "center" }}>+ Connect channel</button>
        </div>
      </Panel>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
/*                          SETTINGS · MEMBERS                         */
/* ════════════════════════════════════════════════════════════════ */

const MEMBERS = [
  { name: "Maya R.",   email: "maya@acme.com",   role: "owner",  joined: 380,  lastActive: 2,    avatar: "linear-gradient(135deg, #ff8a50, #c94a1a)", initials: "MR" },
  { name: "Devon K.",  email: "devon@acme.com",  role: "admin",  joined: 220,  lastActive: 18,   avatar: "linear-gradient(135deg, #9ec396, #5a8a55)", initials: "DK" },
  { name: "Priya S.",  email: "priya@acme.com",  role: "member", joined: 124,  lastActive: 64,   avatar: "linear-gradient(135deg, #c4a5ff, #7a5ad9)", initials: "PS" },
  { name: "Theo L.",   email: "theo@acme.com",   role: "member", joined: 47,   lastActive: 124,  avatar: "linear-gradient(135deg, #f2b37a, #c97a30)", initials: "TL" },
  { name: "Sasha B.",  email: "sasha@acme.com",  role: "viewer", joined: 12,   lastActive: 720,  avatar: "linear-gradient(135deg, #fbbf24, #c98a14)", initials: "SB" },
];

const PENDING = [
  { email: "erik@acme.com",  role: "member", sent: 18 },
  { email: "leah@acme.com",  role: "admin",  sent: 64 },
];

const MembersPage = () => (
  <div style={{ padding: "26px 32px 40px" }}>
    <PageHead
      crumb="Settings · Members"
      title={<>Five teammates. <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>Two invites</span> pending.</>}
      sub="Roles map to a least-privilege model: viewers can read, members can replay, admins can rotate keys, owners can transfer. Every action is in the audit log."
      actions={<>
        <button className="hf-btn outline small">Audit log</button>
        <button className="hf-btn pill small">+ Invite</button>
      </>}
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
      <StatTile label="MEMBERS" value="5" sub="2 admins · 1 owner" />
      <StatTile label="PENDING" value="2" sub="invites awaiting accept" color="#fbbf24" accent="#fbbf24" />
      <StatTile label="SSO" value="enforced" sub="Google Workspace" color="#7ed98a" accent="#7ed98a" />
      <StatTile label="MFA COVERAGE" value="100%" sub="all members enrolled" color="var(--hf-accent)" accent="var(--hf-accent)" />
    </div>

    <Panel padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 120px 110px 100px 80px", gap: 14, padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--hf-ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--hf-line)" }}>
        <span>Member</span><span>Email</span><span>Role</span>
        <span style={{ textAlign: "right" }}>Joined</span>
        <span style={{ textAlign: "right" }}>Last active</span>
        <span></span>
      </div>
      {MEMBERS.map((m, i) => (
        <div key={m.email} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 120px 110px 100px 80px", gap: 14, padding: "14px 24px", borderBottom: i < MEMBERS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: m.avatar, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{m.initials}</span>
            <span style={{ fontSize: 13.5, color: "var(--hf-ink)", fontWeight: 500, letterSpacing: "-0.005em" }}>{m.name}</span>
          </div>
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)" }}>{m.email}</span>
          <Pill tone={m.role === "owner" ? "ember" : m.role === "admin" ? "amber" : m.role === "member" ? "violet" : "ink"} dot={false}>{m.role}</Pill>
          <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)", textAlign: "right" }}>{fmtAgo(m.joined)} ago</span>
          <span className="hf-mono" style={{ fontSize: 11.5, color: m.lastActive < 60 ? "#7ed98a" : "var(--hf-ink-3)", textAlign: "right" }}>{fmtAgo(m.lastActive)} ago</span>
          <button className="hf-btn ghost small" style={{ padding: "3px 10px", justifySelf: "end" }}>⋯</button>
        </div>
      ))}
    </Panel>

    {PENDING.length > 0 && (
      <div style={{ marginTop: 22 }}>
        <Panel title="Pending invites" right={<span style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>{PENDING.length} awaiting</span>} padded={false}>
          {PENDING.map((p, i) => (
            <div key={p.email} style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px 180px", gap: 14, padding: "14px 24px", borderBottom: i < PENDING.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
              <span className="hf-mono" style={{ fontSize: 12.5, color: "var(--hf-ink)" }}>{p.email}</span>
              <Pill tone={p.role === "admin" ? "amber" : "violet"} dot={false}>{p.role}</Pill>
              <span className="hf-mono" style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>sent {fmtAgo(p.sent)} ago</span>
              <div style={{ display: "flex", gap: 6, justifySelf: "end" }}>
                <button className="hf-btn ghost small">Resend</button>
                <button className="hf-btn outline small" style={{ color: "#f29a9a", borderColor: "rgba(242,154,154,0.3)" }}>Revoke</button>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    )}

    <div style={{ marginTop: 22, background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 14, padding: "22px 24px" }}>
      <div className="hf-section-intro" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: "-0.01em", margin: 0 }}>Roles &amp; permissions</h2>
        <a className="hf-link-accent" style={{ fontSize: 13 }}>Customize →</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          ["Owner",  "ember",  ["Full access", "Billing", "Transfer & delete"]],
          ["Admin",  "amber",  ["Manage members", "Rotate API keys", "Configure alerts"]],
          ["Member", "violet", ["Replay events", "Open investigations", "Read all data"]],
          ["Viewer", "ink",    ["Read-only access", "Subscribe to alerts", "Export reports"]],
        ].map(([n, t, perms]) => (
          <div key={n} style={{ border: "1px solid var(--hf-line)", borderRadius: 10, padding: "14px 16px" }}>
            <Pill tone={t} dot={false}>{n}</Pill>
            <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {perms.map(p => (
                <li key={p} style={{ fontSize: 12, color: "var(--hf-ink-2)", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#7ed98a", fontSize: 10 }}>✓</span>{p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
/*                      EXPORT TO WINDOW                              */
/* ════════════════════════════════════════════════════════════════ */

window.DashPages = {
  InvestigationsPage,
  AnomaliesPage,
  ReconcilerPage,
  HealthPage,
  ActivityPage,
  EndpointsPage,
  CustomersPage,
  SchemasPage,
  RetriesPage,
  ProjectPage,
  KeysPage,
  AlertsPage,
  MembersPage,
};
