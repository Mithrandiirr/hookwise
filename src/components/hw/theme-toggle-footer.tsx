"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggleFooter() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: 2,
        border: "1px solid var(--hf-line)",
        borderRadius: 999,
        background: "var(--hf-bg-3)",
        gap: 0,
      }}
    >
      {(["light", "dark"] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t)}
            className="hf-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              letterSpacing: "0.02em",
              cursor: "pointer",
              border: "none",
              background: active ? "var(--hf-bg)" : "transparent",
              color: active ? "var(--hf-ink)" : "var(--hf-ink-3)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.18)" : "none",
              transition: "all 120ms ease",
            }}
          >
            <span aria-hidden style={{ fontSize: 11 }}>
              {t === "light" ? "☀" : "☾"}
            </span>
            {t}
          </button>
        );
      })}
    </div>
  );
}
