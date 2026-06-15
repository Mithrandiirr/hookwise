"use client";

import { useState } from "react";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

export type Run = {
  id: string;
  ranAt: string;
  providerEventsFound: number;
  hookwiseEventsFound: number;
  gapsDetected: number;
  gapsResolved: number;
};

const cols = "96px 1fr 96px 110px";

export function ReconciliationRuns({ runs }: { runs: Run[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--hf-line-soft)" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Reconciliation runs</div>
        <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-ink-4)" }}>most recent first</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 20px", borderBottom: "1px solid var(--hf-line-soft)", background: "var(--hf-bg-2)", fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-ink-4)" }}>
        <div>Run</div><div>Window polled</div><div style={{ textAlign: "right" }}>Compared</div><div style={{ textAlign: "right" }}>Gaps</div>
      </div>
      {runs.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 12.5, color: "var(--hf-ink-4)" }}>No reconciliation runs yet — the poller runs every 5 minutes once your audit starts.</div>
      ) : (
        runs.map((r, i) => {
          const fixed = r.gapsResolved > 0;
          const end = new Date(r.ranAt);
          const start = new Date(end.getTime() - 7 * 60_000);
          const open = openId === r.id;
          const last = i === runs.length - 1;
          return (
            <div key={r.id} style={{ borderBottom: !last && !open ? "1px solid var(--hf-line-soft)" : "none" }}>
              <div
                onClick={() => setOpenId(open ? null : r.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 20px",
                  fontSize: 12.5,
                  cursor: "pointer",
                  background: open ? "var(--hf-accent-tint)" : fixed ? "var(--hf-warm-bg)" : "transparent",
                  boxShadow: open ? "inset 2px 0 0 var(--hf-accent)" : "none",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "var(--hf-ink-4)", transform: open ? "rotate(90deg)" : "none", transition: "transform 120ms", display: "inline-block" }}>▸</span>
                  {hhmm(end)}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)" }}>{hhmm(start)}–{hhmm(end)}</div>
                <div className="hf-num" style={{ textAlign: "right" }}>{r.providerEventsFound.toLocaleString()}</div>
                <div style={{ textAlign: "right" }}>
                  {r.gapsDetected === 0 ? (
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-green)", background: "var(--hf-green-bg)", borderRadius: 999, padding: "2px 8px" }}>0</span>
                  ) : (
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-warm)", background: "var(--hf-warm-bg)", borderRadius: 999, padding: "2px 8px" }}>{r.gapsResolved} → fixed</span>
                  )}
                </div>
              </div>
              {open && (
                <div style={{ padding: "4px 20px 16px 38px", borderBottom: !last ? "1px solid var(--hf-line-soft)" : "none" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 24px", maxWidth: 460 }}>
                    <DetailRow label="Admin API (truth)" value={r.providerEventsFound.toLocaleString()} />
                    <DetailRow label="Delivered webhooks" value={r.hookwiseEventsFound.toLocaleString()} />
                    <DetailRow label="Gaps detected" value={r.gapsDetected.toLocaleString()} tone={r.gapsDetected > 0 ? "warm" : "green"} />
                    <DetailRow label="Gaps recovered" value={r.gapsResolved.toLocaleString()} tone={r.gapsResolved > 0 ? "warm" : "green"} />
                    <DetailRow label="Matched on" value="provider_event_id" mono />
                    <DetailRow
                      label="Outcome"
                      value={r.gapsDetected === r.gapsResolved ? "in parity" : `${r.gapsDetected - r.gapsResolved} outstanding`}
                      tone={r.gapsDetected === r.gapsResolved ? "green" : "warm"}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function DetailRow({ label, value, tone, mono: isMono }: { label: string; value: string; tone?: "green" | "warm"; mono?: boolean }) {
  const color = tone === "green" ? "var(--hf-green)" : tone === "warm" ? "var(--hf-warm)" : "var(--hf-ink)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}>{label}</span>
      <span style={{ fontFamily: isMono ? mono : undefined, fontSize: isMono ? 10.5 : 12.5, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function hhmm(d: Date): string {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}
