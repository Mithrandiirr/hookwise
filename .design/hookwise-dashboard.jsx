/* Dashboard Overview */

const DashOverview = () => {
  const [events, setEvents] = React.useState(24318);
  React.useEffect(() => {
    const t = setInterval(() => setEvents(v => v + Math.floor(Math.random()*4+1)), 1300);
    return () => clearInterval(t);
  }, []);

  const barData = Array.from({length: 60}, (_, i) => {
    const total = 8 + Math.round(Math.sin(i/4)*4) + Math.round(Math.random()*6);
    const fail = i > 42 && i < 50 ? Math.round(total*0.7) : (Math.random() > 0.85 ? 1 : 0);
    return { total, fail };
  });

  return (
    <div className="hw-root" style={{ display: "flex", minHeight: "100%", background: "var(--hw-bg)" }}>
      <DashSidebar active="Overview" />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <DashTopbar
          title="Overview"
          subtitle="Acme Commerce · production · last 24h"
          right={<>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid var(--hw-line-2)", borderRadius: 7 }}>
              <Dot tone="green" />
              <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-2)" }}>ingesting · 18ms p95</span>
            </div>
            <button className="hw-btn hw-btn-ghost"><Icon name="filter" size={13}/> Last 24h</button>
            <button className="hw-btn hw-btn-indigo"><Icon name="plug" size={13}/> New integration</button>
          </>}
        />

        <div style={{ padding: "24px 28px 40px", display: "flex", flexDirection: "column", gap: 24, overflow: "auto" }} className="hw-scroll">
          {/* Hero strip — Revenue protected */}
          <section className="hw-fade-up" style={{
            display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16,
          }}>
            <div className="hw-panel" style={{ padding: 28, background: "linear-gradient(180deg, rgba(129,140,248,0.05), transparent 60%), var(--hw-bg-2)", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
                <div>
                  <div className="hw-label">Revenue protected · rolling 30d</div>
                  <div className="hw-mono hw-num hw-display" style={{ fontSize: 54, color: "var(--hw-ink)", marginTop: 10 }}>
                    $47,320<span style={{ fontSize: 20, color: "var(--hw-ink-4)" }}>.14</span>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <span className="hw-chip green">↑ 18.9%</span>
                    <span style={{ color: "var(--hw-ink-3)" }}>
                      <span className="hw-mono">$8,912</span> more than previous 30 days
                    </span>
                  </div>
                </div>
                <Sparkline data={[0.2,0.3,0.25,0.4,0.35,0.5,0.55,0.48,0.7,0.65,0.82,0.9,0.85,0.95]} width={220} height={64} gradId="rev-grad-dash" />
              </div>
              <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, paddingTop: 20, borderTop: "1px solid var(--hw-line)" }}>
                {[
                  { l: "Gaps reconciled", v: "142", sub: "+$1,284" },
                  { l: "Replays delivered", v: "8,904", sub: "100.0%" },
                  { l: "Dedup'd dupes", v: "318", sub: "idempotency" },
                  { l: "Incidents prevented", v: "4", sub: "this week" },
                ].map((x,i) => (
                  <div key={i}>
                    <div className="hw-label">{x.l}</div>
                    <div className="hw-mono hw-num" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>{x.v}</div>
                    <div className="hw-mono" style={{ fontSize: 10, color: "var(--hw-ink-4)", marginTop: 2 }}>{x.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live ops */}
            <div className="hw-panel" style={{ padding: 0, background: "var(--hw-bg-2)", overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--hw-line)" }}>
                <div>
                  <div className="hw-label">Live ingest</div>
                  <div className="hw-mono hw-num" style={{ fontSize: 28, fontWeight: 500, marginTop: 4 }}>
                    {events.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>p50 · p95 · p99</div>
                  <div className="hw-mono hw-num" style={{ fontSize: 12, color: "var(--hw-ink-2)", marginTop: 4 }}>
                    <span style={{ color: "var(--hw-green)" }}>11</span> · 18 · 32 <span style={{ color: "var(--hw-ink-4)" }}>ms</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: "16px 20px 18px" }}>
                <BarGrid data={barData} width={360} height={60} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }} className="hw-mono">
                  <span style={{ fontSize: 10, color: "var(--hw-ink-5)" }}>24h ago</span>
                  <span style={{ fontSize: 10, color: "var(--hw-ink-5)" }}>now</span>
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--hw-line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span className="hw-mono" style={{ color: "var(--hw-ink-3)" }}>
                  <span style={{ color: "var(--hw-red)" }}>●</span> 47 failures between 04:12–04:18 · recovered
                </span>
                <span className="hw-mono" style={{ color: "var(--hw-ink-4)" }}>view →</span>
              </div>
            </div>
          </section>

          {/* Active anomaly banner */}
          <section className="hw-fade-up hw-fade-up-1">
            <div className="hw-panel" style={{
              padding: "18px 20px",
              background: "linear-gradient(90deg, rgba(251,191,36,0.06), transparent 60%)",
              borderColor: "rgba(251,191,36,0.25)",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Dot tone="amber" />
                <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-amber)", letterSpacing: "0.1em" }}>ACTIVE ANOMALY</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "var(--hw-ink)" }}>
                  Payload schema drift on <span className="hw-mono" style={{ color: "var(--hw-indigo-ink)" }}>shopify.orders/create</span> — <span className="hw-mono">shipping_address.country_code</span> missing on 8.4% of events since 06:40.
                </div>
                <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 4 }}>
                  INC-20260422-0441 · assigned to Mira · 18 events buffered
                </div>
              </div>
              <button className="hw-btn hw-btn-ghost">Open investigation <Icon name="arrow-up-right" size={12} /></button>
            </div>
          </section>

          {/* Main grid */}
          <section className="hw-fade-up hw-fade-up-2" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
            {/* Integrations */}
            <div className="hw-panel" style={{ background: "var(--hw-bg-2)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--hw-line)" }}>
                <SectionHeader title="Integrations" />
                <button className="hw-btn hw-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>View all · 7</button>
              </div>
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Integration</th>
                    <th>Provider</th>
                    <th>Events 1h</th>
                    <th>Success</th>
                    <th>p95</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: "acme-production", p: "stripe",  e: 1824, s: 99.8, p95: 142, h: "closed" },
                    { n: "acme-subs",         p: "stripe",  e:  419, s: 99.9, p95:  98, h: "closed" },
                    { n: "acme-storefront", p: "shopify", e:  718, s: 83.4, p95: 612, h: "half_open" },
                    { n: "acme-fulfillment", p: "shopify", e:  211, s: 100,  p95: 176, h: "closed" },
                    { n: "acme-ci",            p: "github",  e:    9, s: 100,  p95:  54, h: "closed" },
                  ].map((x, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 12.5, color: "var(--hw-ink)" }}>{x.n}</div>
                      </td>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProviderMark provider={x.p} size={16} /> <span style={{ color: "var(--hw-ink-2)", textTransform: "capitalize" }}>{x.p}</span></div></td>
                      <td className="hw-mono hw-num" style={{ color: "var(--hw-ink-2)" }}>{x.e.toLocaleString()}</td>
                      <td className="hw-mono hw-num" style={{ color: x.s < 95 ? "var(--hw-amber)" : "var(--hw-ink-2)" }}>{x.s.toFixed(1)}%</td>
                      <td className="hw-mono hw-num" style={{ color: x.p95 > 400 ? "var(--hw-amber)" : "var(--hw-ink-3)" }}>{x.p95}ms</td>
                      <td>
                        {x.h === "closed" && <Chip tone="green"><Dot tone="green" quiet /> Healthy</Chip>}
                        {x.h === "half_open" && <Chip tone="amber"><Dot tone="amber" quiet /> Degraded</Chip>}
                        {x.h === "open" && <Chip tone="red"><Dot tone="red" quiet /> Down</Chip>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Provider health + top issues */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="hw-panel" style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <SectionHeader title="Provider health" />
                  <span className="hw-mono" style={{ fontSize: 10, color: "var(--hw-ink-4)" }}>cross-customer</span>
                </div>
                {[
                  { p: "stripe",  s: 99.97, tone: "green" },
                  { p: "shopify", s: 97.84, tone: "amber" },
                  { p: "github",  s: 99.99, tone: "green" },
                ].map((x, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--hw-line)" : "none" }}>
                    <ProviderMark provider={x.p} size={18} />
                    <span style={{ flex: 1, fontSize: 13, textTransform: "capitalize" }}>{x.p}</span>
                    <div style={{ width: 80, height: 4, background: "var(--hw-ink-6)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${x.s}%`, height: "100%", background: `var(--hw-${x.tone})` }} />
                    </div>
                    <span className="hw-mono hw-num" style={{ fontSize: 12, color: `var(--hw-${x.tone})` }}>{x.s.toFixed(2)}%</span>
                  </div>
                ))}
              </div>

              <div className="hw-panel" style={{ padding: 0, background: "var(--hw-bg-2)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hw-line)" }}>
                  <SectionHeader title="Top issues" />
                </div>
                <div>
                  {[
                    { t: "Schema drift", s: "shopify.orders/create", c: 18, tone: "amber" },
                    { t: "Rate limited", s: "acme-storefront · 429", c: 4, tone: "red" },
                    { t: "Slow endpoint", s: "p95 612ms", c: 118, tone: "amber" },
                  ].map((x, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderTop: i ? "1px solid var(--hw-line)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                      <Dot tone={x.tone} quiet />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, color: "var(--hw-ink)" }}>{x.t}</div>
                        <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}>{x.s}</div>
                      </div>
                      <span className="hw-mono hw-num" style={{ fontSize: 12, color: "var(--hw-ink-2)" }}>×{x.c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Bottom strip */}
          <section className="hw-fade-up hw-fade-up-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { k: "Reconciliation", v: "7", u: "gaps recovered · 2h", sub: "$284 added back", icon: "refresh", tone: "green" },
              { k: "Replay queue", v: "0", u: "events waiting", sub: "all caught up", icon: "replay", tone: "green" },
              { k: "AI investigations", v: "3", u: "active", sub: "avg 4m to diagnosis", icon: "brain", tone: "indigo" },
            ].map((x,i) => (
              <div key={i} className="hw-panel" style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div className="hw-label">{x.k}</div>
                    <div className="hw-mono hw-num" style={{ fontSize: 26, fontWeight: 500, marginTop: 6 }}>{x.v}</div>
                    <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}>{x.u}</div>
                  </div>
                  <Icon name={x.icon} size={16} color={`var(--hw-${x.tone === "indigo" ? "indigo-ink" : x.tone})`} />
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: "var(--hw-ink-2)" }}>{x.sub}</div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};

window.DashOverview = DashOverview;
