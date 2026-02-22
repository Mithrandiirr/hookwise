import type { AnomalySeverity } from "@/types";

const config: Record<
  AnomalySeverity,
  { label: string; bg: string; text: string; glow: string }
> = {
  critical: {
    label: "Critical",
    bg: "bg-red-500/15",
    text: "text-red-400",
    glow: "shadow-[0_0_12px_rgba(248,113,113,0.3)]",
  },
  high: {
    label: "High",
    bg: "bg-red-500/10",
    text: "text-red-400",
    glow: "",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "",
  },
  low: {
    label: "Low",
    bg: "bg-white/[0.04]",
    text: "text-white/40",
    glow: "",
  },
};

export function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  const { label, bg, text, glow } = config[severity] ?? config.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${bg} ${text} ${glow}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          severity === "critical"
            ? "bg-red-400 animate-pulse-glow"
            : severity === "high"
              ? "bg-red-400"
              : severity === "medium"
                ? "bg-amber-400"
                : "bg-white/30"
        }`}
      />
      {label}
    </span>
  );
}
