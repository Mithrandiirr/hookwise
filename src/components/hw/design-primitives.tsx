// Shared dashboard primitives lifted from .design/hookwise-f-pages.jsx.
// PageHead, StatTile, Panel, Pill, ProviderTag — used across the rebuilt pages.

import type { ReactNode } from "react";

/* ───────── PageHead ───────── */

export function PageHead({
  crumb,
  title,
  sub,
  actions,
  tone = "ember",
}: {
  crumb: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  tone?: "ember" | "amber" | "blue";
}) {
  return (
    <div
      className={
        "hf-landscape" + (tone === "amber" ? " amber" : tone === "blue" ? " blue" : "")
      }
      style={{ padding: "32px 36px 30px", marginBottom: 22 }}
    >
      <div className="hf-eyebrow" style={{ marginBottom: 10 }}>
        {crumb}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 480px", minWidth: 0 }}>
          <h1
            className="hf-display"
            style={{
              fontSize: 32,
              margin: 0,
              fontWeight: 450,
              letterSpacing: "-0.028em",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {sub && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 14.5,
                color: "var(--hf-ink-2)",
                maxWidth: 620,
                lineHeight: 1.55,
              }}
            >
              {sub}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ───────── StatTile ───────── */

export function StatTile({
  label,
  value,
  sub,
  color,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        padding: "18px 20px 16px",
        borderLeft: accent ? `3px solid ${accent}` : "1px solid var(--hf-line)",
      }}
    >
      <div
        className="hf-mono"
        style={{
          fontSize: 10.5,
          color: "var(--hf-ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: color || "var(--hf-ink)",
          marginTop: 6,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "var(--hf-ink-3)",
            marginTop: 7,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* ───────── Panel ───────── */

export function Panel({
  title,
  right,
  children,
  padded = true,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--hf-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: 15.5,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              margin: 0,
              color: "var(--hf-ink)",
            }}
          >
            {title}
          </h2>
          {right}
        </div>
      )}
      <div style={{ padding: padded ? "18px 22px" : 0 }}>{children}</div>
    </div>
  );
}

/* ───────── Pill ───────── */

export type PillTone = "green" | "amber" | "red" | "violet" | "ember" | "ink";

const PILL_MAP: Record<PillTone, [string, string]> = {
  green: ["rgba(126,217,138,0.10)", "#7ed98a"],
  amber: ["rgba(251,191,36,0.10)", "#fbbf24"],
  red: ["rgba(242,154,154,0.10)", "#f29a9a"],
  violet: ["rgba(196,165,255,0.10)", "#c4a5ff"],
  ember: ["rgba(163,230,53,0.12)", "var(--hf-accent)"],
  ink: ["rgba(255,255,255,0.04)", "var(--hf-ink-2)"],
};

export function Pill({
  tone = "ink",
  children,
  dot = true,
}: {
  tone?: PillTone;
  children: ReactNode;
  dot?: boolean;
}) {
  const [bg, fg] = PILL_MAP[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        padding: "3px 9px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{ width: 5, height: 5, borderRadius: 999, background: fg }}
        />
      )}
      {children}
    </span>
  );
}

/* ───────── ProviderTag (minimal, .design-style — colored square + mono name) ───────── */

const PROVIDER_TAG_COLOR: Record<string, string> = {
  stripe: "#f2b37a",
  shopify: "#9ec396",
  clerk: "#c4a5ff",
  resend: "#e89f6b",
  github: "#fbbf24",
};

export function ProviderTag({ name }: { name: string }) {
  const c = PROVIDER_TAG_COLOR[name] ?? "var(--hf-ink-2)";
  return (
    <span
      className="hf-mono"
      style={{
        fontSize: 11,
        color: c,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 2, background: c }} />
      {name}
    </span>
  );
}

/* ───────── fmtAgo ───────── */

export function fmtAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}
