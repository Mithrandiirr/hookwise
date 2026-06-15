"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

export type ReplayItem = {
  id: string;
  eventId: string;
  endpointId: string;
  status: "pending" | "delivered";
  attempts: number;
  eventType: string;
  providerEventId: string | null;
  amountCents: number | null;
  endpointUrl: string | null;
};

export function ReplayClient({ queue }: { queue: ReplayItem[] }) {
  const firstPending = queue.find((q) => q.status === "pending") ?? queue[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(firstPending?.id);
  const selected = queue.find((q) => q.id === selectedId) ?? firstPending;

  const cols = "1fr 96px 110px 96px";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 10, alignItems: "start" }}>
      {/* queue */}
      <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--hf-line-soft)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Replay queue</div>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-ink-4)" }}>recent</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 20px", borderBottom: "1px solid var(--hf-line-soft)", background: "var(--hf-bg-2)", fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-ink-4)" }}>
          <div>Event · Order</div><div style={{ textAlign: "center" }}>Attempts</div><div style={{ textAlign: "center" }}>Endpoint</div><div style={{ textAlign: "right" }}>State</div>
        </div>
        {queue.length === 0 ? (
          <div style={{ padding: "20px", fontSize: 12.5, color: "var(--hf-ink-4)" }}>Nothing queued — recovered events are re-delivered automatically and land here.</div>
        ) : (
          queue.map((q, i) => {
            const isSel = selected && q.id === selected.id;
            const pending = q.status === "pending";
            return (
              <div
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 20px",
                  borderBottom: i < queue.length - 1 ? "1px solid var(--hf-line-soft)" : "none",
                  fontSize: 12.5,
                  cursor: "pointer",
                  background: isSel ? "var(--hf-warm-bg)" : "transparent",
                  boxShadow: isSel ? "inset 2px 0 0 var(--hf-accent-warm)" : "none",
                }}
              >
                <div>
                  <div style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 600 }}>{(q.providerEventId ?? q.eventId).slice(0, 10)}</div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-ink-4)" }}>{q.eventType}</div>
                </div>
                <div style={{ textAlign: "center", fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)" }}>{q.attempts} / 5</div>
                <div style={{ textAlign: "center" }}>
                  {pending ? (
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-warm)", background: "var(--hf-warm-bg)", borderRadius: 999, padding: "2px 8px" }}>queued</span>
                  ) : (
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-green)", background: "var(--hf-green-bg)", borderRadius: 999, padding: "2px 8px" }}>200 OK</span>
                  )}
                </div>
                <div style={{ textAlign: "right", fontFamily: mono, fontSize: 10, color: pending ? "var(--hf-warm)" : "var(--hf-green)" }}>{pending ? "pending" : "delivered"}</div>
              </div>
            );
          })
        )}
      </div>

      {/* detail panel */}
      <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden" }}>
        {selected ? (
          <>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hf-line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600 }}>{(selected.providerEventId ?? selected.eventId).slice(0, 10)}</div>
              <span style={{ fontFamily: mono, fontSize: 10, color: selected.status === "pending" ? "var(--hf-warm)" : "var(--hf-green)", background: selected.status === "pending" ? "var(--hf-warm-bg)" : "var(--hf-green-bg)", borderRadius: 999, padding: "2px 8px" }}>
                {selected.status === "pending" ? "queued for replay" : "delivered"}
              </span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Idempotency key">
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-2)", background: "var(--hf-code-bg)", border: "1px solid var(--hf-line-soft)", borderRadius: 7, padding: "8px 10px", wordBreak: "break-all" }}>
                  rec_{selected.eventId.slice(0, 8)}-{selected.eventType.replace(/\//g, "-")}
                </div>
              </Field>
              <Field label="Payload preview">
                <div style={{ fontFamily: mono, fontSize: 10.5, lineHeight: 1.6, background: "#0e1116", borderRadius: 8, padding: "12px 14px", color: "#c4cad2" }}>
                  <div><span style={{ color: "#7dd3fc" }}>&quot;event_id&quot;</span>: <span style={{ color: "#9ae6b4" }}>&quot;{(selected.providerEventId ?? selected.eventId).slice(0, 12)}&quot;</span>,</div>
                  <div><span style={{ color: "#7dd3fc" }}>&quot;topic&quot;</span>: <span style={{ color: "#9ae6b4" }}>&quot;{selected.eventType}&quot;</span>,</div>
                  {selected.amountCents ? (
                    <div><span style={{ color: "#7dd3fc" }}>&quot;total_price&quot;</span>: <span style={{ color: "#9ae6b4" }}>&quot;{(selected.amountCents / 100).toFixed(2)}&quot;</span>,</div>
                  ) : null}
                  <div><span style={{ color: "#7dd3fc" }}>&quot;source&quot;</span>: <span style={{ color: "#9ae6b4" }}>&quot;reconciliation&quot;</span></div>
                </div>
              </Field>
              <Field label="Delivery target">
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-2)", display: "flex", alignItems: "center", gap: 8, wordBreak: "break-all" }}>
                  <span style={{ color: "var(--hf-green)" }}>POST</span> {selected.endpointUrl ?? "your endpoint"}
                </div>
              </Field>
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <div className="hf-btn pill" style={{ flex: 1, justifyContent: "center", fontSize: 13 }}>Replay now</div>
                <div className="hf-btn outline" style={{ fontSize: 13 }}>Skip</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: "24px 20px", fontSize: 12.5, color: "var(--hf-ink-4)" }}>Select a queued event to see its payload and delivery target.</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-ink-4)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
