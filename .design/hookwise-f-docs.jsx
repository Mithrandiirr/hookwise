/* ════════════════════════════════════════════════════════════════ */
/*                       HOOKWISE · DOCS                              */
/* ════════════════════════════════════════════════════════════════ */

const DOCS_NAV = [
  ["GETTING STARTED", [
    ["Introduction",     "intro"],
    ["Quickstart · 4 min", "quickstart", true],
    ["Core concepts",    "concepts"],
    ["Authentication",   "auth"],
  ]],
  ["INGEST", [
    ["Receiving events", "receiving"],
    ["Signature verification", "signatures"],
    ["Idempotency",      "idempotency"],
    ["Schema enforcement", "schemas"],
  ]],
  ["RELIABILITY", [
    ["Smart retry",      "retry"],
    ["Dead-letter queue", "dlq"],
    ["The reconciler",   "reconciler"],
    ["Replay",           "replay"],
  ]],
  ["OBSERVABILITY", [
    ["Anomalies",        "anomalies"],
    ["Investigations",   "investigations"],
    ["Alerts & routing", "alerts"],
    ["Audit log",        "audit"],
  ]],
  ["INTEGRATIONS", [
    ["Stripe",           "stripe"],
    ["Shopify",          "shopify"],
    ["Clerk",            "clerk"],
    ["GitHub",           "github"],
    ["Custom providers", "custom"],
  ]],
  ["API REFERENCE", [
    ["REST API",         "rest"],
    ["SDKs",             "sdks"],
    ["Webhook URL spec", "url-spec"],
    ["Errors",           "errors"],
  ]],
];

const TOC = [
  ["The 4-minute path",      "the-4-minute-path"],
  ["1 · Add the endpoint",   "add-endpoint"],
  ["2 · Verify signatures",  "verify"],
  ["3 · Handle the payload", "handle"],
  ["4 · Confirm in dashboard","confirm"],
  ["What just happened",     "what-happened"],
  ["Next: harden it",        "next"],
];

const CodeBlock = ({ lang = "ts", title, lines }) => (
  <div style={{
    border: "1px solid var(--hf-line)",
    borderRadius: 12,
    overflow: "hidden",
    background: "#0b0d09",
    margin: "20px 0",
  }}>
    {title && (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid var(--hf-line)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11, color: "var(--hf-ink-3)",
        letterSpacing: "0.04em",
      }}>
        <span>{title}</span>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ color: "var(--hf-accent)" }}>{lang}</span>
          <span style={{ color: "var(--hf-ink-4)", cursor: "pointer" }}>copy</span>
        </div>
      </div>
    )}
    <pre style={{
      margin: 0, padding: "16px 18px",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 12.5, lineHeight: 1.7,
      color: "var(--hf-ink)",
      overflowX: "auto",
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12 }}>
          <span style={{ color: "var(--hf-ink-5)", textAlign: "right", userSelect: "none" }}>{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: l }} />
        </div>
      ))}
    </pre>
  </div>
);

const Callout = ({ kind = "tip", title, children }) => {
  const palette = {
    tip:     { c: "var(--hf-accent)", bg: "rgba(163,230,53,0.05)", border: "rgba(163,230,53,0.25)", icon: "✦" },
    note:    { c: "#c4a5ff",          bg: "rgba(196,165,255,0.05)", border: "rgba(196,165,255,0.25)", icon: "ℹ" },
    warn:    { c: "#fbbf24",          bg: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.25)", icon: "⚠" },
  }[kind];
  return (
    <div style={{
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      borderRadius: 12,
      padding: "16px 20px",
      margin: "20px 0",
      display: "flex",
      gap: 14,
    }}>
      <span style={{ color: palette.c, fontSize: 16, paddingTop: 1, flexShrink: 0 }}>{palette.icon}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontSize: 13, color: "var(--hf-ink)", fontWeight: 500, marginBottom: 4 }}>{title}</div>}
        <div style={{ fontSize: 13, color: "var(--hf-ink-2)", lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
};

const H2 = ({ id, children }) => (
  <h2 id={id} style={{
    fontSize: 24,
    fontWeight: 450,
    letterSpacing: "-0.02em",
    color: "var(--hf-ink)",
    margin: "44px 0 14px",
    scrollMarginTop: 80,
  }}>{children}</h2>
);

const H3 = ({ id, children }) => (
  <h3 id={id} style={{
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: "-0.005em",
    color: "var(--hf-ink)",
    margin: "32px 0 10px",
    scrollMarginTop: 80,
  }}>{children}</h3>
);

const P = ({ children }) => (
  <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--hf-ink-2)", margin: "12px 0", textWrap: "pretty" }}>{children}</p>
);

const Mono = ({ children }) => (
  <code style={{
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.88em",
    background: "var(--hf-bg-3)",
    border: "1px solid var(--hf-line)",
    color: "var(--hf-ink)",
    padding: "1px 6px",
    borderRadius: 5,
  }}>{children}</code>
);

/* syntax-coloring helpers — minimal, hand-tuned for these snippets */
const k = (s) => `<span style="color:#c4a5ff">${s}</span>`;          // keyword / lavender
const s = (s) => `<span style="color:#a3e635">${s}</span>`;          // string / accent
const c = (s) => `<span style="color:#5a5d52">${s}</span>`;          // comment
const f = (s) => `<span style="color:#f2b37a">${s}</span>`;          // function / warm
const n = (s) => `<span style="color:#7ed98a">${s}</span>`;          // number / green
const t = (s) => `<span style="color:#e89f6b">${s}</span>`;          // type / amber

const QUICKSTART_LINES = [
  `${k("import")} { ${f("createHookWise")} } ${k("from")} ${s("'@hookwise/sdk'")};`,
  ``,
  `${k("const")} hw = ${f("createHookWise")}({`,
  `  apiKey: process.${k("env")}.HW_KEY,`,
  `  project: ${s("'acme-production'")},`,
  `});`,
  ``,
  `${c("// Express, Hono, Next — same shape everywhere.")}`,
  `app.${f("post")}(${s("'/webhooks/stripe'")}, hw.${f("handler")}({`,
  `  provider: ${s("'stripe'")},`,
  `  ${f("async")} onEvent(event) {`,
  `    ${c("// idempotent · already deduped by HookWise")}`,
  `    ${k("await")} ${f("processOrder")}(event.data.object);`,
  `  },`,
  `}));`,
];

const VERIFY_LINES = [
  `${c("// HookWise verifies signatures before your handler runs.")}`,
  `${c("// Failed verifications never hit your code — they go to /quarantine.")}`,
  ``,
  `${f("createHookWise")}({`,
  `  apiKey: process.${k("env")}.HW_KEY,`,
  `  verify: {`,
  `    stripe:  { secret: process.${k("env")}.STRIPE_WEBHOOK_SECRET },`,
  `    shopify: { secret: process.${k("env")}.SHOPIFY_WEBHOOK_SECRET },`,
  `  },`,
  `  ${f("onUnverified")}(req) {`,
  `    ${k("return")} { quarantine: ${k("true")}, reason: ${s("'bad signature'")} };`,
  `  },`,
  `});`,
];

const RECONCILER_LINES = [
  `${c("// The reconciler runs every 5 min against the provider's API")}`,
  `${c("// and replays anything you missed — atomically, idempotently.")}`,
  ``,
  `hw.${f("reconciler")}({`,
  `  provider: ${s("'stripe'")},`,
  `  resource: ${s("'charges'")},`,
  `  window: ${s("'15m'")},                    ${c("// look-back window")}`,
  `  ${f("async")} ${f("match")}(charge) {`,
  `    ${k("const")} row = ${k("await")} db.charges.${f("find")}({ id: charge.id });`,
  `    ${k("return")} { found: !!row, replay: !row };`,
  `  },`,
  `});`,
];

const DocsSidebar = ({ active, onPick }) => (
  <aside style={{
    width: 260,
    borderRight: "1px solid var(--hf-line)",
    padding: "24px 0",
    background: "#0c0c0c",
    height: "100vh",
    position: "sticky", top: 0,
    overflowY: "auto",
  }}>
    <div style={{ padding: "0 20px 18px" }}>
      <HFLogo />
    </div>
    <div style={{ padding: "0 14px 18px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px",
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 8,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11.5, color: "var(--hf-ink-4)",
      }}>
        <span>⌕</span>
        <span style={{ flex: 1 }}>Search docs</span>
        <span style={{ padding: "1px 5px", border: "1px solid var(--hf-line-2)", borderRadius: 4, fontSize: 10 }}>⌘K</span>
      </div>
    </div>
    {DOCS_NAV.map(([heading, items], i) => (
      <div key={i} style={{ padding: "10px 0" }}>
        <div className="hf-sb-head" style={{ padding: "8px 20px 6px" }}>{heading}</div>
        {items.map(([label, slug, isNew]) => {
          const isActive = active === slug;
          return (
            <button
              key={slug}
              onClick={() => onPick(slug)}
              style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 20px",
                width: "100%", boxSizing: "border-box",
                fontSize: 13,
                color: isActive ? "var(--hf-ink)" : "var(--hf-ink-3)",
                background: isActive ? "var(--hf-bg-3)" : "transparent",
                borderLeft: isActive ? "2px solid var(--hf-accent)" : "2px solid transparent",
                paddingLeft: isActive ? 18 : 20,
              }}
            >
              <span style={{ flex: 1 }}>{label}</span>
              {isNew && <span style={{
                fontSize: 9.5,
                padding: "1px 6px",
                borderRadius: 999,
                background: "rgba(163,230,53,0.12)",
                color: "var(--hf-accent)",
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.06em",
              }}>NEW</span>}
            </button>
          );
        })}
      </div>
    ))}
    <div style={{ padding: "20px", marginTop: 20, borderTop: "1px solid var(--hf-line)" }}>
      <div style={{ fontSize: 12, color: "var(--hf-ink-3)", marginBottom: 6 }}>v2026.04 · stable</div>
      <a className="hf-link-accent" style={{ fontSize: 12 }}>Changelog →</a>
    </div>
  </aside>
);

const DocsTopbar = ({ onLanding, onDash }) => (
  <div style={{
    position: "sticky", top: 0, zIndex: 5,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 40px",
    borderBottom: "1px solid var(--hf-line)",
    background: "rgba(10,10,10,0.85)",
    backdropFilter: "blur(8px)",
  }}>
    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--hf-ink-3)" }}>
      <span>Docs</span><span>/</span>
      <span>Getting started</span><span>/</span>
      <span style={{ color: "var(--hf-ink)" }}>Quickstart</span>
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button className="hf-btn ghost small" onClick={onLanding}>← Landing</button>
      <button className="hf-btn outline small">GitHub</button>
      <button className="hf-btn pill small" onClick={onDash}>Open dashboard →</button>
    </div>
  </div>
);

const DocsToc = () => {
  const [active, setActive] = React.useState("the-4-minute-path");
  return (
    <aside style={{
      width: 220,
      padding: "32px 24px",
      position: "sticky", top: 60, alignSelf: "flex-start",
    }}>
      <div className="hf-mono" style={{
        fontSize: 10.5, color: "var(--hf-ink-4)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 14,
      }}>On this page</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {TOC.map(([label, slug]) => (
          <li key={slug}>
            <a
              href={`#${slug}`}
              onClick={() => setActive(slug)}
              style={{
                display: "block",
                fontSize: 12.5,
                lineHeight: 1.5,
                color: active === slug ? "var(--hf-ink)" : "var(--hf-ink-3)",
                textDecoration: "none",
                paddingLeft: 10,
                borderLeft: `2px solid ${active === slug ? "var(--hf-accent)" : "var(--hf-line)"}`,
                paddingTop: 2, paddingBottom: 2,
              }}
            >{label}</a>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--hf-line)" }}>
        <div className="hf-mono" style={{
          fontSize: 10.5, color: "var(--hf-ink-4)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 10,
        }}>Resources</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Edit on GitHub",      "↗"],
            ["Report an issue",     "↗"],
            ["Ask in Discord",      "↗"],
            ["Schedule onboarding", "→"],
          ].map(([l, ic]) => (
            <a key={l} style={{ fontSize: 12.5, color: "var(--hf-ink-3)", textDecoration: "none", display: "flex", justifyContent: "space-between" }}>
              <span>{l}</span><span style={{ color: "var(--hf-ink-5)" }}>{ic}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
};

const DocsArticle = () => (
  <article style={{ flex: 1, padding: "40px 56px 80px", maxWidth: 760 }}>
    <div className="hf-eyebrow" style={{ marginBottom: 12 }}>Getting started</div>
    <h1 className="hf-display" style={{ fontSize: 44, fontWeight: 450, letterSpacing: "-0.025em", lineHeight: 1.08, margin: 0 }}>
      Quickstart.<br/>
      <span style={{ color: "var(--hf-ink-3)" }}>From zero to your first observed webhook in </span>
      <span className="hf-serif" style={{ color: "var(--hf-accent)", fontStyle: "italic" }}>four minutes</span>
      <span style={{ color: "var(--hf-ink-3)" }}>.</span>
    </h1>

    <div style={{
      display: "flex", gap: 14, alignItems: "center",
      margin: "24px 0 8px",
      paddingBottom: 24,
      borderBottom: "1px solid var(--hf-line)",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 11.5,
      color: "var(--hf-ink-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    }}>
      <span>4 min read</span>
      <span style={{ color: "var(--hf-ink-5)" }}>·</span>
      <span>updated 3d ago</span>
      <span style={{ color: "var(--hf-ink-5)" }}>·</span>
      <span>node, deno, bun, edge</span>
    </div>

    <H2 id="the-4-minute-path">The 4-minute path</H2>
    <P>
      HookWise sits in front of your webhook endpoint as a thin handler. It verifies signatures, dedupes events,
      retries failures with circuit breakers, and reconciles silently against the provider so you never lose data.
      You write the same business logic you would anyway — we handle the boring parts.
    </P>
    <P>
      This guide gets you from a fresh project to a fully observed Stripe webhook with reconciliation enabled.
      No code generation, no schema files, no migrations.
    </P>

    <Callout kind="tip" title="Prerequisites">
      A Node 18+ runtime, a Stripe webhook secret, and a HookWise project. Sign up at
      {" "}<Mono>hookwise.dev/signup</Mono> if you don't have one — it takes 30 seconds.
    </Callout>

    <H2 id="add-endpoint">1 · Add the endpoint</H2>
    <P>
      Install the SDK and wrap your existing handler. The shape is the same on every framework — Express, Hono,
      Next App Router, Fastify, Bun, edge — because HookWise speaks plain Web <Mono>Request</Mono>/<Mono>Response</Mono>.
    </P>

    <CodeBlock lang="ts" title="api/webhooks/stripe.ts" lines={QUICKSTART_LINES} />

    <P>
      That's it. The endpoint is now ingesting events, deduping by Stripe's <Mono>idempotency-key</Mono>, and
      writing every payload to your project's event store. You can already open the dashboard and see them stream in.
    </P>

    <H2 id="verify">2 · Verify signatures</H2>
    <P>
      Add your provider secrets to the configuration. HookWise verifies before your handler runs — failed verifications
      go straight to a quarantine bucket you can review later. They never wake on-call.
    </P>

    <CodeBlock lang="ts" title="lib/hookwise.ts" lines={VERIFY_LINES} />

    <Callout kind="note" title="Why not just verify in your handler?">
      Two reasons. First, by the time your handler runs, the request has already been parsed and routed —
      which is where most slow-loris attacks happen. Second, quarantined events still show up in the dashboard
      with full context, so you can tell the difference between a misconfigured secret and an actual attack.
    </Callout>

    <H2 id="handle">3 · Handle the payload</H2>
    <P>
      The <Mono>onEvent</Mono> callback receives a typed event. HookWise has already verified the signature, deduped
      the delivery, and parsed the schema. If your callback throws, the event gets queued for retry with exponential
      backoff — up to 8 attempts over 24 hours, then DLQ.
    </P>

    <CodeBlock lang="ts" title="reconciler · stripe charges" lines={RECONCILER_LINES} />

    <Callout kind="warn" title="One catch">
      Make your handler idempotent. HookWise dedupes by signature, but if Stripe sends the same event twice
      under different signatures (rare, but it happens during their incidents), you'll still see it twice.
      Use the <Mono>event.id</Mono> as your idempotency key in the database.
    </Callout>

    <H2 id="confirm">4 · Confirm in the dashboard</H2>
    <P>
      Open <Mono>app.hookwise.dev</Mono> and you should see events flowing in within a few seconds. The Overview
      page shows delivery rate, latency, and revenue protected. Click any event to see the full payload, headers,
      and the timeline of every retry and replay.
    </P>

    <div style={{
      border: "1px solid var(--hf-line)",
      borderRadius: 12,
      background: "var(--hf-bg-3)",
      padding: "20px 24px",
      margin: "24px 0",
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: 20,
      alignItems: "center",
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, rgba(163,230,53,0.3), rgba(163,230,53,0.05))", display: "grid", placeItems: "center", fontSize: 26, color: "var(--hf-accent)" }}>✓</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-ink)", marginBottom: 4 }}>You should see your first event within 5 seconds.</div>
        <div style={{ fontSize: 13, color: "var(--hf-ink-3)" }}>If you don't, check the troubleshooting checklist — usually it's the webhook URL pointing at the old endpoint.</div>
      </div>
    </div>

    <H2 id="what-happened">What just happened</H2>
    <P>
      In about four minutes you got: signature verification, idempotency, exponential retry with circuit breaker,
      a DLQ for permanent failures, full event history with replay, schema drift detection, p95 latency tracking,
      and a reconciler that catches anything your provider's webhook system drops.
    </P>
    <P style={{ color: "var(--hf-ink-3)" }}>
      Most teams build that over 6–18 months of incident-driven engineering. You skipped that part.
    </P>

    <H2 id="next">Next: harden it</H2>

    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "20px 0 0",
    }}>
      {[
        ["Reconciliation",     "Catch the events providers silently drop — runs every 5 min, atomically.", "reconciler"],
        ["Alerting",           "Route anomalies to PagerDuty, Slack, or email by severity.",              "alerts"],
        ["Schema enforcement", "Reject payloads that don't match — or version your handlers.",            "schemas"],
        ["Custom providers",   "Bring your own webhooks. Same SDK, same observability.",                  "custom"],
      ].map(([title, sub, slug]) => (
        <a key={slug} style={{
          textDecoration: "none",
          padding: "18px 20px",
          border: "1px solid var(--hf-line)",
          borderRadius: 12,
          background: "var(--hf-bg-3)",
          display: "block",
          transition: "border-color 140ms, background 140ms",
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = "var(--hf-line-2)"; e.currentTarget.style.background = "var(--hf-bg-4)"; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = "var(--hf-line)"; e.currentTarget.style.background = "var(--hf-bg-3)"; }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 14, color: "var(--hf-ink)", fontWeight: 500, letterSpacing: "-0.005em" }}>{title}</span>
            <span style={{ color: "var(--hf-accent)" }}>→</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", lineHeight: 1.5 }}>{sub}</div>
        </a>
      ))}
    </div>

    {/* footer nav */}
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 56,
      paddingTop: 24,
      borderTop: "1px solid var(--hf-line)",
    }}>
      <a style={{
        textDecoration: "none",
        border: "1px solid var(--hf-line)", borderRadius: 12,
        padding: "16px 20px",
        background: "var(--hf-bg-3)",
      }}>
        <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>← previous</div>
        <div style={{ fontSize: 14, color: "var(--hf-ink)", marginTop: 4 }}>Introduction</div>
      </a>
      <a style={{
        textDecoration: "none",
        border: "1px solid var(--hf-line)", borderRadius: 12,
        padding: "16px 20px",
        background: "var(--hf-bg-3)",
        textAlign: "right",
      }}>
        <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>next →</div>
        <div style={{ fontSize: 14, color: "var(--hf-ink)", marginTop: 4 }}>Core concepts</div>
      </a>
    </div>
  </article>
);

const Docs = ({ onView }) => {
  const [active, setActive] = React.useState("quickstart");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh", background: "var(--hf-bg)" }}>
      <DocsSidebar active={active} onPick={setActive} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <DocsTopbar onLanding={() => onView("landing")} onDash={() => onView("dash")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 0 }}>
          <DocsArticle />
          <DocsToc />
        </div>
      </div>
    </div>
  );
};

window.Docs = Docs;
