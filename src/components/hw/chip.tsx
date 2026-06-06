import type { CSSProperties, ReactNode } from "react";

type ChipTone = "green" | "amber" | "red" | "indigo" | "blue" | "violet" | "warm";

const TONE_STYLES: Record<ChipTone, { color: string; bg: string; border: string }> = {
  green: { color: "#7ed98a", bg: "rgba(126,217,138,0.08)", border: "rgba(126,217,138,0.22)" },
  amber: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.22)" },
  red: { color: "#f29a9a", bg: "rgba(242,154,154,0.08)", border: "rgba(242,154,154,0.22)" },
  indigo: { color: "#c4a5ff", bg: "rgba(196,165,255,0.08)", border: "rgba(196,165,255,0.22)" },
  blue: { color: "#9ac7ff", bg: "rgba(154,199,255,0.08)", border: "rgba(154,199,255,0.22)" },
  violet: { color: "#c4a5ff", bg: "rgba(196,165,255,0.08)", border: "rgba(196,165,255,0.22)" },
  warm: { color: "#f2b37a", bg: "rgba(242,179,122,0.08)", border: "rgba(242,179,122,0.22)" },
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
        background: t ? t.bg : "rgba(255,255,255,0.025)",
        color: t ? t.color : "var(--hf-ink-2)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
