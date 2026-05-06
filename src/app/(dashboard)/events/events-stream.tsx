"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chip, Dot, Icon, ProviderMark } from "@/components/hw";

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
  const map: Record<EventStatus, { tone: "green" | "red" | "amber" | "indigo"; label: string }> = {
    ok: { tone: "green", label: "200" },
    fail: { tone: "red", label: "503" },
    retry: { tone: "amber", label: "retry" },
    recon: { tone: "indigo", label: "recon" },
    dedup: { tone: "indigo", label: "dedup" },
    hold: { tone: "amber", label: "hold" },
  };
  const c = map[s];
  return (
    <Chip
      tone={c.tone}
      style={{ minWidth: 50, justifyContent: "center" }}
    >
      {c.label}
    </Chip>
  );
}

export function EventsStreamClient({ rows }: { rows: EventRow[] }) {
  const [live, setLive] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const safe = rows.length > 0 ? rows : [];
  const sel = safe[selectedIdx] ?? safe[0];

  const latencyColor = (ms: number) =>
    ms === -1
      ? "var(--hw-ink-5)"
      : ms > 2000
        ? "var(--hw-red)"
        : ms > 500
          ? "var(--hw-amber)"
          : "var(--hw-ink-3)";

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
      <div
        className="flex items-center justify-between"
        style={{
          gap: 10,
          padding: "12px 28px",
          borderBottom: "1px solid var(--hw-line)",
        }}
      >
        <div className="flex items-center" style={{ gap: 10, flex: 1 }}>
          <Icon name="search" size={14} color="var(--hw-ink-4)" />
          <span
            className="hw-mono"
            style={{ fontSize: 12, color: "var(--hw-ink-3)" }}
          >
            <span style={{ color: "var(--hw-indigo-ink)" }}>provider</span>:*{" "}
            <span style={{ color: "var(--hw-indigo-ink)" }}>status</span>:
            <span style={{ color: "var(--hw-green)" }}>ok</span>|
            <span style={{ color: "var(--hw-red)" }}>fail</span>{" "}
            <span style={{ color: "var(--hw-indigo-ink)" }}>amount</span>
            &gt;=0
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={() => setLive((l) => !l)}
            className={`hw-btn ${live ? "hw-btn-indigo" : "hw-btn-ghost"}`}
          >
            <Dot tone={live ? "indigo" : "quiet"} quiet={!live} />
            {live ? "Live" : "Paused"}
          </button>
          <button type="button" className="hw-btn hw-btn-ghost">
            <Icon name="filter" size={13} /> Filters
          </button>
          <button type="button" className="hw-btn hw-btn-ghost">
            <Icon name="replay" size={13} /> Replay selection
          </button>
        </div>
      </div>

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
          className="hw-scroll"
          style={{
            overflow: "auto",
            borderRight: "1px solid var(--hw-line)",
          }}
        >
          {safe.length === 0 ? (
            <div
              style={{
                padding: "64px 24px",
                textAlign: "center",
                color: "var(--hw-ink-4)",
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 14, color: "var(--hw-ink-2)", marginBottom: 8 }}>
                No events yet
              </div>
              <div style={{ color: "var(--hw-ink-4)" }}>
                Events will appear here as providers push to your integrations.
              </div>
            </div>
          ) : (
            <table className="hw-table">
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "var(--hw-bg)",
                  zIndex: 1,
                }}
              >
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
                {safe.map((r, i) => {
                  const active = i === selectedIdx;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedIdx(i)}
                      style={{
                        background: active ? "rgba(129,140,248,0.06)" : undefined,
                        boxShadow: active
                          ? "inset 2px 0 0 0 var(--hw-indigo)"
                          : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <td
                        className="hw-mono"
                        style={{ color: "var(--hw-ink-4)", fontSize: 11.5 }}
                      >
                        {formatTime(r.receivedAt)}
                      </td>
                      <td>
                        <StatusChip s={r.status} />
                      </td>
                      <td>
                        <div className="flex items-center" style={{ gap: 10 }}>
                          <ProviderMark provider={r.provider} size={16} />
                          <div>
                            <div
                              className="hw-mono"
                              style={{
                                color: "var(--hw-ink)",
                                fontSize: 12.5,
                              }}
                            >
                              {r.type}
                            </div>
                            <div
                              className="hw-mono"
                              style={{
                                color: "var(--hw-ink-5)",
                                fontSize: 11,
                                marginTop: 1,
                              }}
                            >
                              {r.providerEventId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className="hw-mono"
                        style={{ color: "var(--hw-ink-2)", fontSize: 12 }}
                      >
                        {r.destination}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{
                          color: latencyColor(r.latencyMs),
                          textAlign: "right",
                          fontSize: 12,
                        }}
                      >
                        {r.latencyMs === -1 ? "—" : `${r.latencyMs}ms`}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{
                          color: r.amountCents
                            ? "var(--hw-ink-2)"
                            : "var(--hw-ink-5)",
                          textAlign: "right",
                          fontSize: 12,
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
        <aside className="flex flex-col" style={{ minHeight: 0 }}>
          {sel ? (
            <>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <div className="hw-label">Event</div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 13.5, color: "var(--hw-ink)", marginTop: 4 }}
                >
                  {sel.type}
                </div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}
                >
                  {sel.providerEventId}
                </div>
                <div
                  className="flex flex-wrap"
                  style={{ marginTop: 12, gap: 6 }}
                >
                  <StatusChip s={sel.status} />
                  <Chip>
                    <ProviderMark provider={sel.provider} size={11} /> {sel.provider}
                  </Chip>
                  <Chip>{sel.destination}</Chip>
                  {sel.amountCents !== null && (
                    <Chip tone="indigo">
                      <Icon name="dollar" size={10} /> {formatAmount(sel.amountCents)}
                    </Chip>
                  )}
                </div>
                <Link
                  href={`/events/${sel.id}`}
                  className="hw-btn hw-btn-ghost"
                  style={{
                    marginTop: 12,
                    padding: "6px 10px",
                    fontSize: 11.5,
                  }}
                >
                  Open full event <Icon name="arrow-up-right" size={11} />
                </Link>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <div className="hw-label" style={{ marginBottom: 10 }}>
                  Delivery timeline
                </div>
                {(
                  [
                    { l: "Received", t: "+0ms", tone: "green" as const },
                    { l: "Signature OK", t: "+2ms", tone: "green" as const },
                    { l: "Dedup check", t: "+3ms", tone: "green" as const },
                    { l: "Persisted", t: "+11ms", tone: "green" as const },
                    {
                      l: sel.status === "ok" ? "Delivered" : "Delivery",
                      t: sel.latencyMs > 0 ? `+${sel.latencyMs}ms` : "—",
                      tone:
                        sel.status === "fail"
                          ? ("red" as const)
                          : sel.status === "retry"
                            ? ("amber" as const)
                            : ("green" as const),
                    },
                  ]
                ).map((s, i, arr) => (
                  <div
                    key={s.l}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: "16px 1fr auto",
                      gap: 10,
                      padding: "4px 0",
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
                          background: `var(--hw-${s.tone})`,
                          boxShadow: `0 0 6px var(--hw-${s.tone})`,
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
                            background: "var(--hw-line-2)",
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--hw-ink-2)" }}>
                      {s.l}
                    </span>
                    <span
                      className="hw-mono hw-num"
                      style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                    >
                      {s.t}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="hw-scroll"
                style={{
                  padding: "16px 20px",
                  flex: 1,
                  overflow: "auto",
                  minHeight: 0,
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: 10 }}
                >
                  <span className="hw-label">Payload</span>
                  <button
                    type="button"
                    className="hw-btn hw-btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 11 }}
                  >
                    <Icon name="copy" size={11} /> Copy
                  </button>
                </div>
                <pre
                  className="hw-mono"
                  style={{
                    margin: 0,
                    padding: 14,
                    background: "var(--hw-bg-3)",
                    border: "1px solid var(--hw-line)",
                    borderRadius: 8,
                    fontSize: 11.5,
                    lineHeight: 1.65,
                    color: "var(--hw-ink-3)",
                    whiteSpace: "pre-wrap",
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--hw-ink-4)",
                fontSize: 13,
              }}
            >
              Select an event to inspect.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
