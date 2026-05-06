/* Anomaly detail — AI investigation */

const AnomalyDetail = () => {
  const queries = [
    { i: 1, name: "delivery_history",   result: "83.4% 5xx in last 4 min", tone: "red" },
    { i: 2, name: "endpoint_health",    result: "circuit: open · pool saturated", tone: "red" },
    { i: 3, name: "provider_health",    result: "stripe: 99.97% (ok)", tone: "green" },
    { i: 4, name: "payload_schema",     result: "no drift detected", tone: "green" },
    { i: 5, name: "similar_incidents",  result: "1 match · INC-20260318-0912", tone: "indigo" },
    { i: 6, name: "flow_state",         result: "8 sequences mid-hold", tone: "amber" },
    { i: 7, name: "revenue_at_risk",    result: "$403.88 buffered, $1,284 follow-on", tone: "amber" },
  ];

  return (
    <div className="hw-root" style={{ display: "flex", minHeight: "100%", background: "var(--hw-bg)" }}>
      <DashSidebar active="Anomalies" />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <DashTopbar
          title={<span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "var(--hw-ink-4)", fontWeight: 500, fontSize: 14 }}>Anomalies /</span>
            <span>INC-20260422-0441</span>
          </span>}
          subtitle={<span className="hw-mono" style={{ fontSize: 12, color: "var(--hw-ink-3)" }}>
            failure_surge · acme-production · stripe · payment_intent.succeeded
          </span>}
          right={<>
            <button className="hw-btn hw-btn-ghost"><Icon name="replay" size={13}/> Replay 112 events</button>
            <button className="hw-btn hw-btn-ghost"><Icon name="bell" size={13}/> Snooze</button>
            <button className="hw-btn hw-btn-primary"><Icon name="check" size={13}/> Mark resolved</button>
          </>}
        />

        <div style={{ padding: "24px 28px 40px", display: "flex", flexDirection: "column", gap: 20, overflow: "auto", flex: 1 }} className="hw-scroll">
          {/* Summary hero */}
          <section className="hw-fade-up" style={{
            display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16,
          }}>
            <div className="hw-panel" style={{ padding: 26, background: "linear-gradient(180deg, rgba(248,113,113,0.04), transparent 60%), var(--hw-bg-2)", borderColor: "rgba(248,113,113,0.20)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Dot tone="red" />
                <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-red)", letterSpacing: "0.14em" }}>SEVERITY 2 · OPEN · 04:12 UTC</span>
                <span style={{ marginLeft: "auto" }} className="hw-mono hw-num">
                  <span style={{ color: "var(--hw-ink-4)", fontSize: 11 }}>duration</span> <span style={{ color: "var(--hw-ink)", fontSize: 13 }}>00:13:42</span>
                </span>
              </div>
              <div className="hw-display" style={{ fontSize: 30, color: "var(--hw-ink)" }}>
                Endpoint DB pool exhausted — {" "}
                <span style={{ color: "var(--hw-ink-3)" }}>same signature as INC-20260318-0912.</span>
              </div>
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, paddingTop: 18, borderTop: "1px solid var(--hw-line)" }}>
                <Metric l="Failure rate" v="83.4" u="%" tone="red" />
                <Metric l="Events buffered" v="112" u="queued" tone="amber" />
                <Metric l="Revenue at risk" v="$403.88" u="in buffer" tone="amber" />
                <Metric l="Confidence" v="94" u="% match" tone="indigo" />
              </div>
            </div>

            {/* Diagnosis panel */}
            <div className="hw-panel" style={{ padding: 0, background: "var(--hw-bg-2)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hw-line)", display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="brain" size={14} color="var(--hw-indigo-ink)" />
                <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-2)", letterSpacing: "0.1em" }}>AI DIAGNOSIS</span>
                <span className="hw-chip indigo" style={{ marginLeft: "auto" }}>Claude · 4.6s</span>
              </div>
              <div style={{ padding: "18px 20px", flex: 1 }}>
                <div style={{ fontSize: 14, color: "var(--hw-ink)", lineHeight: 1.5 }}>
                  The endpoint&apos;s database connection pool is exhausted. Every <span className="hw-mono" style={{ color: "var(--hw-indigo-ink)" }}>payment_intent.succeeded</span> triggers a synchronous write; queue grew faster than it could drain.
                </div>
                <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--hw-ink-3)", lineHeight: 1.55 }}>
                  Provider status is clean. Payload schema is unchanged. The only signal that moved is endpoint latency (61ms → 4,012ms p95 in 90s), which matches the March 18 incident resolved by scaling DB max_connections from 20 to 60.
                </div>
              </div>
              <div style={{ padding: "14px 20px", borderTop: "1px solid var(--hw-line)", display: "flex", gap: 8 }}>
                <button className="hw-btn hw-btn-indigo" style={{ flex: 1, justifyContent: "center" }}>
                  Apply fix from INC-0318
                </button>
                <button className="hw-btn hw-btn-ghost" style={{ flex: 1, justifyContent: "center" }}>Ask follow-up</button>
              </div>
            </div>
          </section>

          {/* Investigation trace + side rail */}
          <section className="hw-fade-up hw-fade-up-1" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
            {/* Trace */}
            <div className="hw-panel" style={{ padding: 0, background: "var(--hw-bg-2)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hw-line)", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="hw-label">INVESTIGATION TRACE · 7 QUERIES · 4.6s</span>
                <span style={{ marginLeft: "auto" }} className="hw-mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--hw-ink-4)" }}>expand all →</span>
              </div>
              <div style={{ padding: "18px 20px" }}>
                {queries.map((q, i) => (
                  <div key={q.i} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--hw-line)" : "none", alignItems: "center" }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      background: "var(--hw-bg-3)", border: "1px solid var(--hw-line-2)",
                      display: "grid", placeItems: "center",
                      fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--hw-ink-3)",
                    }}>{q.i}</div>
                    <div>
                      <div className="hw-mono" style={{ fontSize: 12.5, color: "var(--hw-ink)" }}>{q.name}</div>
                      <div style={{ fontSize: 12, color: `var(--hw-${q.tone === "indigo" ? "indigo-ink" : q.tone})`, marginTop: 2 }}>{q.result}</div>
                    </div>
                    <Chip tone={q.tone}>{q.tone === "green" ? "clean" : q.tone === "red" ? "hot" : q.tone === "amber" ? "warn" : "note"}</Chip>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: 14, background: "var(--hw-bg-3)", borderRadius: 8, border: "1px dashed var(--hw-line-2)", fontFamily: "Geist Mono, monospace", fontSize: 12, color: "var(--hw-ink-2)" }}>
                  <div style={{ color: "var(--hw-indigo-ink)" }}>diagnose()</div>
                  <div style={{ marginTop: 4, color: "var(--hw-ink)" }}>→ <span style={{ color: "var(--hw-green)" }}>endpoint.db_pool.exhausted</span> (conf 0.94)</div>
                  <div style={{ color: "var(--hw-ink-3)" }}>→ prior_match = INC-20260318-0912</div>
                  <div style={{ color: "var(--hw-ink-3)" }}>→ recommend = scale_db_connections(60) · replay(112)</div>
                </div>
              </div>
            </div>

            {/* Side rail — affected + failure pattern */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Latency chart */}
              <div className="hw-panel" style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div>
                    <div className="hw-label">p95 latency</div>
                    <div className="hw-mono hw-num" style={{ fontSize: 22, marginTop: 4, color: "var(--hw-red)" }}>4,012<span style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>ms</span></div>
                  </div>
                  <Chip tone="red">↑ 65×</Chip>
                </div>
                <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="inc-grad" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#f87171" stopOpacity="0.4" />
                      <stop offset="1" stopColor="#f87171" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 68 L40 66 L80 64 L120 60 L160 58 L200 50 L210 10 L240 8 L270 12 L300 14 L300 80 L0 80 Z" fill="url(#inc-grad)" />
                  <path d="M0 68 L40 66 L80 64 L120 60 L160 58 L200 50 L210 10 L240 8 L270 12 L300 14" stroke="#f87171" strokeWidth="1.25" fill="none" />
                  <line x1="200" y1="0" x2="200" y2="80" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2,3" opacity="0.7" />
                  <text x="202" y="10" fill="#fbbf24" fontFamily="Geist Mono, monospace" fontSize="9">trigger 04:12</text>
                </svg>
              </div>

              {/* Affected */}
              <div className="hw-panel" style={{ padding: 0, background: "var(--hw-bg-2)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hw-line)" }}>
                  <span className="hw-label">AFFECTED EVENTS · 112</span>
                </div>
                <div style={{ maxHeight: 220, overflow: "auto" }} className="hw-scroll">
                  {[
                    { id: "evt_3PqL9x2eZ…", amt: "$248.00", st: "buffered" },
                    { id: "evt_3PqL9t1aY…", amt: "$89.00",  st: "buffered" },
                    { id: "evt_3PqL9r6fK…", amt: "$1,240.00", st: "replay" },
                    { id: "evt_3PqL9p3bQ…", amt: "$19.00",  st: "buffered" },
                    { id: "evt_3PqL9n8cR…", amt: "$412.00", st: "replay" },
                    { id: "evt_3PqL9l2fK…", amt: "$58.90",  st: "buffered" },
                    { id: "evt_3PqL9k1aY…", amt: "$129.00", st: "replay" },
                  ].map((e, i) => (
                    <div key={i} style={{ padding: "10px 20px", borderTop: i ? "1px solid var(--hw-line)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="hw-mono" style={{ fontSize: 11.5, color: "var(--hw-ink-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{e.id}</span>
                      <span className="hw-mono hw-num" style={{ fontSize: 11.5, color: "var(--hw-ink-2)" }}>{e.amt}</span>
                      <Chip tone={e.st === "replay" ? "indigo" : "amber"}>{e.st}</Chip>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 20px", borderTop: "1px solid var(--hw-line)", textAlign: "center" }}>
                  <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>+ 105 more</span>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline strip */}
          <section className="hw-fade-up hw-fade-up-2" className="hw-panel" style={{ padding: "18px 22px", background: "var(--hw-bg-2)" }}>
            <div className="hw-label" style={{ marginBottom: 14 }}>INCIDENT TIMELINE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, position: "relative" }}>
              <div style={{ position: "absolute", top: 9, left: 6, right: 6, height: 1, background: "var(--hw-line-2)" }} />
              {[
                { t: "04:12:04", l: "Anomaly detected",  d: "baseline exceeded · +3σ",    tone: "red" },
                { t: "04:12:08", l: "AI investigating",  d: "7 queries in flight",         tone: "indigo" },
                { t: "04:12:13", l: "Diagnosis ready",   d: "db_pool_exhausted · 0.94",    tone: "indigo" },
                { t: "04:12:15", l: "On-call paged",     d: "mira@acme.co · pd:p2",        tone: "amber" },
                { t: "04:12:16", l: "Replay queued",     d: "112 events · dedup on",        tone: "green" },
              ].map((s, i) => (
                <div key={i} style={{ position: "relative", paddingTop: 24 }}>
                  <span style={{ position: "absolute", top: 4, left: 0, width: 10, height: 10, borderRadius: 999, background: `var(--hw-${s.tone === "indigo" ? "indigo" : s.tone})`, boxShadow: `0 0 10px var(--hw-${s.tone === "indigo" ? "indigo" : s.tone})` }} />
                  <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: "var(--hw-ink)", marginTop: 2, fontWeight: 500 }}>{s.l}</div>
                  <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-3)", marginTop: 2 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

const Metric = ({ l, v, u, tone }) => (
  <div>
    <div className="hw-label">{l}</div>
    <div className="hw-mono hw-num" style={{ fontSize: 22, marginTop: 4, color: tone === "red" ? "var(--hw-red)" : tone === "amber" ? "var(--hw-amber)" : tone === "indigo" ? "var(--hw-indigo-ink)" : "var(--hw-ink)" }}>
      {v}<span style={{ fontSize: 11, color: "var(--hw-ink-4)", marginLeft: 2 }}>{u}</span>
    </div>
  </div>
);

window.AnomalyDetail = AnomalyDetail;
