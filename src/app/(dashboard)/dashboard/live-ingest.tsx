"use client";

import { useEffect, useState } from "react";
import { BarGrid } from "@/components/hw";

// Deterministic baseline shown during SSR and first client render.
const BASELINE_BARS = Array.from({ length: 60 }, (_, i) => ({
  total: 8 + Math.round(Math.sin(i / 4) * 4),
  fail: 0,
}));

export function DashLiveIngest({
  initial,
  failed,
}: {
  initial: number;
  failed: number;
}) {
  const [events, setEvents] = useState(initial);
  const [barData, setBarData] = useState(BASELINE_BARS);

  useEffect(() => {
    setBarData(
      Array.from({ length: 60 }, (_, i) => {
        const total =
          8 + Math.round(Math.sin(i / 4) * 4) + Math.round(Math.random() * 6);
        const fail =
          i > 42 && i < 50
            ? Math.round(total * 0.7)
            : Math.random() > 0.85
              ? 1
              : 0;
        return { total, fail };
      }),
    );
    const t = setInterval(() => {
      setEvents((v) => v + Math.floor(Math.random() * 4 + 1));
    }, 1300);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="hw-panel overflow-hidden"
      style={{ padding: 0, background: "var(--hw-bg-2)" }}
    >
      <div
        className="flex justify-between items-center"
        style={{
          padding: "18px 20px 12px",
          borderBottom: "1px solid var(--hw-line)",
        }}
      >
        <div>
          <div className="hw-label">Live ingest</div>
          <div
            className="hw-mono hw-num"
            style={{ fontSize: 28, fontWeight: 500, marginTop: 4 }}
          >
            {events.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="hw-mono"
            style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
          >
            p50 · p95 · p99
          </div>
          <div
            className="hw-mono hw-num"
            style={{ fontSize: 12, color: "var(--hw-ink-2)", marginTop: 4 }}
          >
            <span style={{ color: "var(--hw-green)" }}>11</span> · 18 · 32{" "}
            <span style={{ color: "var(--hw-ink-4)" }}>ms</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 20px 18px" }}>
        <BarGrid data={barData} width={360} height={60} />
        <div
          className="flex justify-between hw-mono"
          style={{ marginTop: 8 }}
        >
          <span style={{ fontSize: 10, color: "var(--hw-ink-5)" }}>24h ago</span>
          <span style={{ fontSize: 10, color: "var(--hw-ink-5)" }}>now</span>
        </div>
      </div>
      <div
        className="flex justify-between items-center"
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--hw-line)",
          fontSize: 12,
        }}
      >
        <span className="hw-mono" style={{ color: "var(--hw-ink-3)" }}>
          <span style={{ color: failed > 0 ? "var(--hw-red)" : "var(--hw-green)" }}>
            ●
          </span>{" "}
          {failed > 0 ? `${failed} failures in the last hour` : "no failures in the last hour"}
        </span>
        <span className="hw-mono" style={{ color: "var(--hw-ink-4)" }}>
          view →
        </span>
      </div>
    </div>
  );
}
