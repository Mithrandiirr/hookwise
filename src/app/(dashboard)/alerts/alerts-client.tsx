"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Panel } from "@/components/hw";

/* ───────── line icons (1.9px stroke, accent-colored — per Daylight design) ───────── */

function TileIcon({ name, color }: { name: RuleIcon; color: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "warning":
      return (
        <svg {...common}>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "trending-down":
      return (
        <svg {...common}>
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
          <polyline points="16 17 22 17 22 11" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "document":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h8M8 9h2" />
        </svg>
      );
  }
}

type RuleIcon = "warning" | "trending-down" | "rotate" | "document";

/* ───────── new toggle: inset track + drop-shadow knob ───────── */

function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 36,
        height: 21,
        borderRadius: 999,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: on ? "var(--hf-accent)" : "#ccd1d9",
        boxShadow: on
          ? "inset 0 1px 2px rgba(2,55,85,0.35)"
          : "inset 0 1px 2px rgba(14,17,22,0.1)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 17 : 2,
          width: 17,
          height: 17,
          borderRadius: 999,
          background: "#ffffff",
          boxShadow: on
            ? "0 1px 2px rgba(14,17,22,0.28)"
            : "0 1px 2px rgba(14,17,22,0.18)",
          transition: "left 140ms ease",
        }}
      />
    </button>
  );
}

/* ───────── data ───────── */

type Rule = {
  id: string;
  icon: RuleIcon;
  accent: string;
  tileBg: string;
  title: string;
  desc: string;
  channels: string[];
  on: boolean;
};

const INITIAL_RULES: Rule[] = [
  {
    id: "degrading",
    icon: "warning",
    accent: "#dd5008",
    tileBg: "#fff8f3",
    title: "Subscription degrading",
    desc: "When p95 response > 3s or failures > 10/day on any topic — fires before Shopify auto-removes it.",
    channels: ["Slack", "Email"],
    on: true,
  },
  {
    id: "gap-burst",
    icon: "trending-down",
    accent: "#dd5008",
    tileBg: "#fff8f3",
    title: "Gap burst detected",
    desc: "When 3+ gaps are found within a single 15-minute window — usually a provider-side incident.",
    channels: ["Slack"],
    on: true,
  },
  {
    id: "recovery-failed",
    icon: "rotate",
    accent: "#b3261e",
    tileBg: "#fdecec",
    title: "Recovery failed",
    desc: "When a recovered event exhausts all 5 delivery attempts to your endpoint.",
    channels: ["Slack", "Email", "PagerDuty"],
    on: true,
  },
  {
    id: "statement",
    icon: "document",
    accent: "#0369a1",
    tileBg: "#f1f6fa",
    title: "Monthly assurance statement",
    desc: "A summary of everything recovered, emailed on the 1st — your proof of value.",
    channels: ["Email"],
    on: false,
  },
];

const RECENT: { dot: string; title: string; sub: ReactNode; at: string }[] = [
  {
    dot: "#ed8936",
    title: "orders/updated degrading",
    sub: "p95 hit 4.8s · alerted Slack + Email",
    at: "Jun 12, 23:41",
  },
  {
    dot: "#ed8936",
    title: "Gap burst · 4 in 15 min",
    sub: "all 4 recovered within 5 min",
    at: "Jun 12, 23:18",
  },
  {
    dot: "#22c55e",
    title: "Back in parity",
    sub: "orders/updated recovered to 100%",
    at: "Jun 12, 23:46",
  },
  {
    dot: "#0369a1",
    title: "May statement sent",
    sub: (
      <>
        <span style={{ color: "#dd5008", fontWeight: 600 }}>$6,204</span> assured
        in May
      </>
    ),
    at: "Jun 1, 09:00",
  },
];

/* ───────── client ───────── */

export function AlertsClient() {
  const [rules, setRules] = useState(INITIAL_RULES);

  function toggle(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, on: !r.on } : r)),
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: 10,
        alignItems: "start",
      }}
    >
      {/* rules */}
      <Panel title="Alert rules" padded={false}>
        {rules.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "center",
              padding: "16px 22px",
              borderBottom:
                i < rules.length - 1 ? "1px solid var(--hf-line)" : "none",
            }}
          >
            <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: r.tileBg,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <TileIcon name={r.icon} color={r.accent} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--hf-ink)",
                  }}
                >
                  {r.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--hf-ink-3)",
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {r.desc}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {r.channels.map((c) => (
                    <span
                      key={c}
                      className="hf-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--hf-ink-3)",
                        background: "#f1f2f5",
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Toggle on={r.on} onClick={() => toggle(r.id)} />
          </div>
        ))}
      </Panel>

      {/* recent alerts feed */}
      <Panel title="Recent alerts" padded={false}>
        {RECENT.map((a, i) => (
          <div
            key={a.title}
            style={{
              display: "flex",
              gap: 12,
              padding: "14px 22px",
              borderBottom:
                i < RECENT.length - 1 ? "1px solid var(--hf-line)" : "none",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: a.dot,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 550,
                  color: "var(--hf-ink)",
                }}
              >
                {a.title}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--hf-ink-3)",
                  lineHeight: 1.45,
                  marginTop: 2,
                }}
              >
                {a.sub}
              </div>
              <div
                className="hf-mono"
                style={{
                  fontSize: 10,
                  color: "var(--hf-ink-4)",
                  marginTop: 5,
                }}
              >
                {a.at}
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
