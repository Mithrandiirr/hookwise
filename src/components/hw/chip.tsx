import type { CSSProperties, ReactNode } from "react";

type ChipTone = "green" | "amber" | "red" | "indigo" | "blue" | "violet" | "warm";

const TONE_STYLES: Record<ChipTone, { color: string; bg: string; border: string }> = {
  green: { color: "#16a34a", bg: "#e8f7ee", border: "#c4ebd2" },
  amber: { color: "#b35418", bg: "#fdeada", border: "#f4c9ad" },
  red: { color: "#dc2626", bg: "#fdeaea", border: "#f4c4c4" },
  indigo: { color: "#0369a1", bg: "#e8f4fb", border: "#c8e4f6" },
  blue: { color: "#0369a1", bg: "#e8f4fb", border: "#c8e4f6" },
  violet: { color: "#7c5cd6", bg: "#efeafb", border: "#ddd0f5" },
  warm: { color: "#b35418", bg: "#fff8f3", border: "#f4c9ad" },
};

export function Chip({
  tone,
  children,
  style,
  className,
}: {
  tone?: ChipTone;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const t = tone ? TONE_STYLES[tone] : null;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "var(--font-jetbrains-mono), monospace",
        letterSpacing: "0.02em",
        border: `1px solid ${t ? t.border : "var(--hf-line)"}`,
        background: t ? t.bg : "#fbfbfc",
        color: t ? t.color : "var(--hf-ink-2)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
