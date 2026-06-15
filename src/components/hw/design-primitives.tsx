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
  green: ["#e8f7ee", "#16a34a"],
  amber: ["#fdeada", "#b35418"],
  red: ["#fdeaea", "#dc2626"],
  violet: ["#efeafb", "#7c5cd6"],
  ember: ["#e8f4fb", "var(--hf-accent)"],
  ink: ["#f1f2f5", "var(--hf-ink-2)"],
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
  stripe: "#635bff",
  shopify: "#16a34a",
  clerk: "#7c5cd6",
  resend: "#b35418",
  github: "#0e1116",
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

/* ───────── Toggle (Daylight — inset track + drop-shadow knob) ───────── */

export function Toggle({ on = false, size = "md" }: { on?: boolean; size?: "sm" | "md" }) {
  const w = size === "sm" ? 33 : 36;
  const h = size === "sm" ? 19 : 21;
  const k = size === "sm" ? 15 : 17;
  return (
    <span
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        background: on ? "var(--hf-accent)" : "#ccd1d9",
        boxShadow: on
          ? "inset 0 1px 2px rgba(2,55,85,0.35)"
          : "inset 0 1px 2px rgba(14,17,22,0.1)",
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? w - k - 2 : 2,
          width: k,
          height: k,
          borderRadius: 999,
          background: "#ffffff",
          boxShadow: on
            ? "0 1px 2px rgba(14,17,22,0.28)"
            : "0 1px 2px rgba(14,17,22,0.18)",
        }}
      />
    </span>
  );
}

/* ───────── LineIcon (1.9px stroke, accent-colored — per Daylight design) ───────── */

export type LineIconName =
  | "database"
  | "envelope"
  | "chat"
  | "warning"
  | "trending-down"
  | "rotate"
  | "document"
  | "plus"
  | "arrow-down-right";

export function LineIcon({
  name,
  color = "currentColor",
  size = 17,
  stroke = 1.9,
}: {
  name: LineIconName;
  color?: string;
  size?: number;
  stroke?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </svg>
      );
    case "envelope":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
        </svg>
      );
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
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow-down-right":
      return (
        <svg {...common}>
          <path d="M7 7l10 10M17 9v8h-8" />
        </svg>
      );
  }
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
