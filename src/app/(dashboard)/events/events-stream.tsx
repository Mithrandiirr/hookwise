"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chip, Icon, ProviderMark } from "@/components/hw";

export type EventStatus = "ok" | "fail" | "retry" | "recon" | "dedup" | "hold";

export type EventRow = {
  id: string;
  providerEventId: string;
  type: string;
  provider: string;
  destination: string;
  receivedAt: string;
  latencyMs: number;
  amountCents: number | null;
  status: EventStatus;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}

function formatAmount(cents: number | null) {
  if (cents === null || cents === undefined) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

function StatusChip({ s }: { s: EventStatus }) {
  const map: Record<EventStatus, { tone: "green" | "red" | "amber" | "indigo" | "blue"; label: string }> = {
    ok: { tone: "green", label: "200" },
    fail: { tone: "red", label: "503" },
    retry: { tone: "amber", label: "retry" },
    recon: { tone: "indigo", label: "recon" },
    dedup: { tone: "blue", label: "dedup" },
    hold: { tone: "amber", label: "hold" },
  };
  const c = map[s];
  return (
    <Chip tone={c.tone} style={{ minWidth: 50, justifyContent: "center" }}>
      {c.label}
    </Chip>
  );
}

const LABEL_STYLE = {
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 10.5,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
  color: "var(--hf-ink-4)",
};

export function EventsStreamClient({ rows }: { rows: EventRow[] }) {
  const [live, setLive] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const safe = rows.length > 0 ? rows : [];
  const sel = safe[selectedIdx] ?? safe[0];

  const latencyColor = (ms: number) =>
    ms === -1
      ? "var(--hf-ink-4)"
      : ms > 2000
        ? "#dc2626"
        : ms > 500
          ? "#d97706"
          : "var(--hf-ink-3)";

  const payload = useMemo(() => {
    if (!sel) return null;
    return {
      id: sel.providerEventId,
      type: sel.type,
      livemode: true,
      data: {
        object: {
          amount: sel.amountCents,
          currency: "usd",
          customer: "cus_•••",
          status: sel.status,
        },
      },
    };
  }, [sel]);

  return (
    <div className="flex flex-col" style={{ minHeight: 0, flex: 1 }}>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 32px",
          borderBottom: "1px solid var(--hf-line)",
          background: "var(--hf-bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <Icon name="search" size={14} color="var(--hf-ink-4)" />
          <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-3)" }}>
            <span style={{ color: "var(--hf-accent)" }}>provider</span>:*{" "}
            <span style={{ color: "var(--hf-accent)" }}>status</span>:
            <span style={{ color: "#16a34a" }}>ok</span>|
            <span style={{ color: "#dc2626" }}>fail</span>{" "}
            <span style={{ color: "var(--hf-accent)" }}>amount</span>
            &gt;=0
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setLive((l) => !l)}
            className={`hf-btn small ${live ? "pill" : "outline"}`}
          >
            {live ? <span className="hf-dot-live" /> : <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--hf-ink-4)" }} />}
            {live ? "Live" : "Paused"}
          </button>
          <button type="button" className="hf-btn outline small">
            <Icon name="filter" size={13} /> Filters
          </button>
          <button type="button" className="hf-btn outline small">
            <Icon name="replay" size={13} /> Replay
          </button>
        </div>
      </div>

      {/* Split view */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 440px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Table */}
        <div
          style={{
            overflow: "auto",
            borderRight: "1px solid var(--hf-line)",
          }}
        >
          {safe.length === 0 ? (
            <div
              style={{
                padding: "64px 24px",
                textAlign: "center",
                color: "var(--hf-ink-4)",
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 14, color: "var(--hf-ink-2)", marginBottom: 8 }}>No events yet</div>
              <div style={{ color: "var(--hf-ink-4)" }}>
                Events will appear here as providers push to your integrations.
              </div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--hf-bg)", zIndex: 1 }}>
                <tr>
                  {(
                    [
                      ["Time (UTC)", 130, "left"],
                      ["Status", 76, "left"],
                      ["Event", null, "left"],
                      ["Destination", null, "left"],
                      ["Latency", null, "right"],
                      ["Amount", 110, "right"],
                    ] as const
                  ).map(([l, w, a]) => (
                    <th
                      key={l}
                      style={{
                        ...LABEL_STYLE,
                        textAlign: a,
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--hf-line)",
                        width: w ?? undefined,
                      }}
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {safe.map((r, i) => {
                  const active = i === selectedIdx;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedIdx(i)}
                      style={{
                        background: active ? "rgba(255,107,44,0.05)" : undefined,
                        boxShadow: active ? "inset 2px 0 0 0 var(--hf-accent)" : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <td
                        className="hf-mono"
                        style={{
                          color: "var(--hf-ink-4)",
                          fontSize: 11.5,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--hf-line)",
                        }}
                      >
                        {formatTime(r.receivedAt)}
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--hf-line)" }}>
                        <StatusChip s={r.status} />
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--hf-line)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ProviderMark provider={r.provider} size={16} />
                          <div>
                            <div className="hf-mono" style={{ color: "var(--hf-ink)", fontSize: 12.5 }}>
                              {r.type}
                            </div>
                            <div className="hf-mono" style={{ color: "var(--hf-ink-4)", fontSize: 11, marginTop: 1 }}>
                              {r.providerEventId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className="hf-mono"
                        style={{
                          color: "var(--hf-ink-2)",
                          fontSize: 12,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--hf-line)",
                        }}
                      >
                        {r.destination}
                      </td>
                      <td
                        className="hf-num"
                        style={{
                          color: latencyColor(r.latencyMs),
                          textAlign: "right",
                          fontSize: 12,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--hf-line)",
                        }}
                      >
                        {r.latencyMs === -1 ? "—" : `${r.latencyMs}ms`}
                      </td>
                      <td
                        className="hf-num"
                        style={{
                          color: r.amountCents ? "var(--hf-ink-2)" : "var(--hf-ink-4)",
                          textAlign: "right",
                          fontSize: 12,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--hf-line)",
                        }}
                      >
                        {formatAmount(r.amountCents) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Inspector */}
        <aside className="flex flex-col" style={{ minHeight: 0, background: "var(--hf-bg)" }}>
          {sel ? (
            <>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hf-line)" }}>
                <div style={LABEL_STYLE}>Event</div>
                <div className="hf-mono" style={{ fontSize: 13.5, color: "var(--hf-ink)", marginTop: 4 }}>
                  {sel.type}
                </div>
                <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", marginTop: 2 }}>
                  {sel.providerEventId}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", marginTop: 12, gap: 6 }}>
                  <StatusChip s={sel.status} />
                  <Chip>
                    <ProviderMark provider={sel.provider} size={11} /> {sel.provider}
                  </Chip>
                  <Chip>{sel.destination}</Chip>
                  {sel.amountCents !== null && (
                    <Chip tone="warm">
                      <Icon name="dollar" size={10} /> {formatAmount(sel.amountCents)}
                    </Chip>
                  )}
                </div>
                <Link
                  href={`/events/${sel.id}`}
                  className="hf-btn outline small"
                  style={{ marginTop: 12 }}
                >
                  Open full event <Icon name="arrow-up-right" size={11} />
                </Link>
              </div>

              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hf-line)" }}>
                <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>Delivery timeline</div>
                {(
                  [
                    { l: "Received", t: "+0ms", c: "#16a34a" },
                    { l: "Signature OK", t: "+2ms", c: "#16a34a" },
                    { l: "Dedup check", t: "+3ms", c: "#16a34a" },
                    { l: "Persisted", t: "+11ms", c: "#16a34a" },
                    {
                      l: sel.status === "ok" ? "Delivered" : "Delivery",
                      t: sel.latencyMs > 0 ? `+${sel.latencyMs}ms` : "—",
                      c:
                        sel.status === "fail"
                          ? "#dc2626"
                          : sel.status === "retry"
                            ? "#d97706"
                            : "#16a34a",
                    },
                  ]
                ).map((s, i, arr) => (
                  <div
                    key={s.l}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "16px 1fr auto",
                      gap: 10,
                      padding: "4px 0",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "relative", height: 22 }}>
                      <span
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 5,
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: s.c,
                          boxShadow: `0 0 6px ${s.c}`,
                        }}
                      />
                      {i < arr.length - 1 && (
                        <span
                          style={{
                            position: "absolute",
                            top: 14,
                            left: 7.5,
                            width: 1,
                            height: 16,
                            background: "var(--hf-line-2)",
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--hf-ink-2)" }}>{s.l}</span>
                    <span className="hf-num" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>{s.t}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: "16px 20px", flex: 1, overflow: "auto", minHeight: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={LABEL_STYLE}>Payload</span>
                  <button type="button" className="hf-btn ghost small">
                    <Icon name="copy" size={11} /> Copy
                  </button>
                </div>
                <pre
                  className="hf-mono"
                  style={{
                    margin: 0,
                    padding: 14,
                    background: "var(--hf-bg-3)",
                    border: "1px solid var(--hf-line)",
                    borderRadius: 8,
                    fontSize: 11.5,
                    lineHeight: 1.65,
                    color: "var(--hf-ink-3)",
                    whiteSpace: "pre-wrap",
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div style={{ padding: 32, textAlign: "center", color: "var(--hf-ink-4)", fontSize: 13 }}>
              Select an event to inspect.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
