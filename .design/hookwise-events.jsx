/* Events stream — live log */

const EventsStream = () => {
  const baseRows = [
    { t: "07:42:18.104", s: "ok",     pm: "stripe",  type: "payment_intent.succeeded", id: "evt_3PqL9x2eZ…", dst: "acme-production",   ms:  112, amt: "$248.00" },
    { t: "07:42:17.862", s: "ok",     pm: "shopify", type: "orders/paid",               id: "shp_ord_882114", dst: "acme-storefront",   ms:  189, amt: "$58.90" },
    { t: "07:42:17.501", s: "retry",  pm: "shopify", type: "orders/create",             id: "shp_ord_882113", dst: "acme-storefront",   ms: 4012, amt: "$192.40" },
    { t: "07:42:17.338", s: "ok",     pm: "stripe",  type: "charge.succeeded",          id: "evt_3PqL9v1aY…", dst: "acme-production",   ms:   98, amt: "$89.00" },
    { t: "07:42:17.104", s: "recon",  pm: "stripe",  type: "invoice.paid",              id: "evt_3PqL9t7fK…", dst: "acme-subs",         ms:   -1, amt: "$19.00" },
    { t: "07:42:16.984", s: "ok",     pm: "shopify", type: "fulfillments/create",       id: "shp_fl_00413",   dst: "acme-fulfillment",  ms:  176, amt: null },
    { t: "07:42:16.812", s: "fail",   pm: "shopify", type: "orders/create",             id: "shp_ord_882112", dst: "acme-storefront",   ms: 8001, amt: "$412.00" },
    { t: "07:42:16.719", s: "dedup",  pm: "stripe",  type: "payment_intent.succeeded", id: "evt_3PqL9m2eZ…", dst: "acme-production",   ms:   -1, amt: "$248.00" },
    { t: "07:42:16.504", s: "ok",     pm: "stripe",  type: "customer.updated",          id: "evt_3PqL9k4bQ…", dst: "acme-production",   ms:   74, amt: null },
    { t: "07:42:16.302", s: "ok",     pm: "shopify", type: "orders/paid",               id: "shp_ord_882111", dst: "acme-storefront",   ms:  134, amt: "$24.00" },
    { t: "07:42:16.101", s: "ok",     pm: "stripe",  type: "payment_intent.created",    id: "evt_3PqL9i9cR…", dst: "acme-production",   ms:   61, amt: null },
    { t: "07:42:15.902", s: "hold",   pm: "stripe",  type: "invoice.finalized",         id: "evt_3PqL9g2fK…", dst: "acme-subs",         ms:   -1, amt: "$29.00" },
    { t: "07:42:15.704", s: "ok",     pm: "shopify", type: "orders/updated",            id: "shp_ord_882110", dst: "acme-storefront",   ms:  208, amt: null },
    { t: "07:42:15.501", s: "ok",     pm: "stripe",  type: "charge.succeeded",          id: "evt_3PqL9e1aY…", dst: "acme-production",   ms:   91, amt: "$129.00" },
    { t: "07:42:15.218", s: "ok",     pm: "stripe",  type: "customer.created",          id: "evt_3PqL9d0aX…", dst: "acme-production",   ms:   53, amt: null },
  ];
  const [rows, setRows] = React.useState(baseRows);
  const [selected, setSelected] = React.useState(0);
  const [live, setLive] = React.useState(true);

  React.useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const pool = ["payment_intent.succeeded","charge.succeeded","orders/paid","orders/create","customer.updated"];
      const prov = Math.random() > 0.5 ? "stripe" : "shopify";
      const statuses = ["ok","ok","ok","ok","ok","retry","dedup"];
      const now = new Date();
      const pad = (n, z=2) => String(n).padStart(z, "0");
      const tstr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${pad(now.getUTCMilliseconds(),3)}`;
      const newRow = {
        t: tstr,
        s: statuses[Math.floor(Math.random()*statuses.length)],
        pm: prov,
        type: pool[Math.floor(Math.random()*pool.length)],
        id: (prov === "stripe" ? "evt_3Pq" : "shp_") + Math.random().toString(36).slice(2,10),
        dst: prov === "stripe" ? "acme-production" : "acme-storefront",
        ms: Math.floor(40 + Math.random()*180),
        amt: Math.random() > 0.4 ? `$${(Math.random()*400+10).toFixed(2)}` : null,
        fresh: true,
      };
      setRows(r => [newRow, ...r].slice(0, 18));
    }, 1800);
    return () => clearInterval(t);
  }, [live]);

  const sel = rows[selected] || rows[0];

  const statusChip = (s) => {
    const map = {
      ok:    { t: "green",  l: "200" },
      fail:  { t: "red",    l: "503" },
      retry: { t: "amber",  l: "retry" },
      recon: { t: "indigo", l: "recon" },
      dedup: { t: "indigo", l: "dedup" },
      hold:  { t: "amber",  l: "hold" },
    };
    const c = map[s] || map.ok;
    return <span className={`hw-chip ${c.t}`} style={{ minWidth: 50, justifyContent: "center" }}>{c.l}</span>;
  };

  return (
    <div className="hw-root" style={{ display: "flex", minHeight: "100%", background: "var(--hw-bg)" }}>
      <DashSidebar active="Events" />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <DashTopbar
          title="Events"
          subtitle="every webhook, every delivery, every hook into your app"
          right={<>
            <button
              onClick={() => setLive(l => !l)}
              className={`hw-btn ${live ? "hw-btn-indigo" : "hw-btn-ghost"}`}
            >
              <Dot tone={live ? "indigo" : "quiet"} quiet={!live} />
              {live ? "Live" : "Paused"}
            </button>
            <button className="hw-btn hw-btn-ghost"><Icon name="filter" size={13}/> Filters</button>
            <button className="hw-btn hw-btn-ghost"><Icon name="replay" size={13}/> Replay selection</button>
          </>}
        />

        {/* Query bar */}
        <div style={{ display: "flex", gap: 10, padding: "12px 28px", borderBottom: "1px solid var(--hw-line)", alignItems: "center" }}>
          <Icon name="search" size={14} color="var(--hw-ink-4)" />
          <span className="hw-mono" style={{ fontSize: 12, color: "var(--hw-ink-3)", flex: 1 }}>
            <span style={{ color: "var(--hw-indigo-ink)" }}>provider</span>:stripe <span style={{ color: "var(--hw-indigo-ink)" }}>status</span>:<span style={{ color: "var(--hw-green)" }}>ok</span>|<span style={{ color: "var(--hw-red)" }}>fail</span> <span style={{ color: "var(--hw-indigo-ink)" }}>amount</span>&gt;=100
          </span>
          <span className="hw-kbd">/</span>
          <span style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>to search</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", flex: 1, minHeight: 0 }}>
          {/* Table */}
          <div style={{ overflow: "auto", borderRight: "1px solid var(--hw-line)" }} className="hw-scroll">
            <table className="hw-table">
              <thead style={{ position: "sticky", top: 0, background: "var(--hw-bg)", zIndex: 1 }}>
                <tr>
                  <th style={{ width: 130 }}>Time (UTC)</th>
                  <th style={{ width: 76 }}>Status</th>
                  <th>Event</th>
                  <th>Destination</th>
                  <th style={{ textAlign: "right" }}>Latency</th>
                  <th style={{ textAlign: "right", width: 110 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const active = i === selected;
                  return (
                    <tr
                      key={r.id + r.t}
                      onClick={() => setSelected(i)}
                      className={r.fresh ? "hw-ticker-row" : ""}
                      style={{
                        background: active ? "rgba(129,140,248,0.06)" : undefined,
                        boxShadow: active ? "inset 2px 0 0 0 var(--hw-indigo)" : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <td className="hw-mono" style={{ color: "var(--hw-ink-4)", fontSize: 11.5 }}>{r.t}</td>
                      <td>{statusChip(r.s)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ProviderMark provider={r.pm} size={16} />
                          <div>
                            <div className="hw-mono" style={{ color: "var(--hw-ink)", fontSize: 12.5 }}>{r.type}</div>
                            <div className="hw-mono" style={{ color: "var(--hw-ink-5)", fontSize: 11, marginTop: 1 }}>{r.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hw-mono" style={{ color: "var(--hw-ink-2)", fontSize: 12 }}>{r.dst}</td>
                      <td className="hw-mono hw-num" style={{ color: r.ms === -1 ? "var(--hw-ink-5)" : (r.ms > 2000 ? "var(--hw-red)" : r.ms > 500 ? "var(--hw-amber)" : "var(--hw-ink-3)"), textAlign: "right", fontSize: 12 }}>
                        {r.ms === -1 ? "—" : `${r.ms}ms`}
                      </td>
                      <td className="hw-mono hw-num" style={{ color: r.amt ? "var(--hw-ink-2)" : "var(--hw-ink-5)", textAlign: "right", fontSize: 12 }}>
                        {r.amt || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Inspector */}
          <aside style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hw-line)" }}>
              <div className="hw-label">Event</div>
              <div className="hw-mono" style={{ fontSize: 13.5, color: "var(--hw-ink)", marginTop: 4 }}>{sel.type}</div>
              <div className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}>{sel.id}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {statusChip(sel.s)}
                <Chip><ProviderMark provider={sel.pm} size={11} /> {sel.pm}</Chip>
                <Chip>{sel.dst}</Chip>
                {sel.amt && <Chip tone="indigo"><Icon name="dollar" size={10} /> {sel.amt}</Chip>}
              </div>
            </div>

            {/* Timeline */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hw-line)" }}>
              <div className="hw-label" style={{ marginBottom: 10 }}>Delivery timeline</div>
              {[
                { l: "Received",       t: "+0ms",    tone: "green"  },
                { l: "Signature OK",   t: "+2ms",    tone: "green"  },
                { l: "Dedup check",    t: "+3ms",    tone: "green"  },
                { l: "Persisted",      t: "+11ms",   tone: "green"  },
                { l: "Enriched",       t: "+34ms",   tone: "green"  },
                { l: "Delivered 200",  t: "+112ms",  tone: "green"  },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto", gap: 10, alignItems: "center", padding: "4px 0", position: "relative" }}>
                  <div style={{ position: "relative", height: 22 }}>
                    <span style={{ position: "absolute", top: 8, left: 5, width: 6, height: 6, borderRadius: 999, background: `var(--hw-${s.tone})`, boxShadow: `0 0 6px var(--hw-${s.tone})` }} />
                    {i < arr.length - 1 && <span style={{ position: "absolute", top: 14, left: 7.5, width: 1, height: 16, background: "var(--hw-line-2)" }} />}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--hw-ink-2)" }}>{s.l}</span>
                  <span className="hw-mono hw-num" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>{s.t}</span>
                </div>
              ))}
            </div>

            {/* Payload */}
            <div style={{ padding: "16px 20px", flex: 1, overflow: "auto", minHeight: 0 }} className="hw-scroll">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span className="hw-label">Payload</span>
                <button className="hw-btn hw-btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}><Icon name="copy" size={11} /> Copy</button>
              </div>
              <pre className="hw-mono" style={{ margin: 0, padding: 14, background: "var(--hw-bg-3)", border: "1px solid var(--hw-line)", borderRadius: 8, fontSize: 11.5, lineHeight: 1.65, color: "var(--hw-ink-3)", whiteSpace: "pre-wrap", overflow: "auto" }}>
{`{`}
  <span style={{ color: "var(--hw-indigo-ink)" }}>"id"</span>: <span style={{ color: "var(--hw-green)" }}>"{sel.id}"</span>,
  <span style={{ color: "var(--hw-indigo-ink)" }}>"type"</span>: <span style={{ color: "var(--hw-green)" }}>"{sel.type}"</span>,
  <span style={{ color: "var(--hw-indigo-ink)" }}>"livemode"</span>: <span style={{ color: "var(--hw-amber)" }}>true</span>,
  <span style={{ color: "var(--hw-indigo-ink)" }}>"data"</span>: {`{`}
    <span style={{ color: "var(--hw-indigo-ink)" }}>"object"</span>: {`{`}
      <span style={{ color: "var(--hw-indigo-ink)" }}>"amount"</span>: <span style={{ color: "var(--hw-amber)" }}>24800</span>,
      <span style={{ color: "var(--hw-indigo-ink)" }}>"currency"</span>: <span style={{ color: "var(--hw-green)" }}>"usd"</span>,
      <span style={{ color: "var(--hw-indigo-ink)" }}>"customer"</span>: <span style={{ color: "var(--hw-green)" }}>"cus_PqK…"</span>,
      <span style={{ color: "var(--hw-indigo-ink)" }}>"status"</span>: <span style={{ color: "var(--hw-green)" }}>"succeeded"</span>
    {`}`}
  {`}`}
{`}`}
              </pre>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

window.EventsStream = EventsStream;
