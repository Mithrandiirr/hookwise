import type { ReactNode } from "react";

export function DashTopbar({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        padding: "16px 32px",
        borderBottom: "1px solid var(--hf-line)",
        background: "var(--hf-overlay)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--hf-ink-3)" }}>
          <span>acme-production</span>
          <span>/</span>
          <span style={{ color: "var(--hf-ink)" }}>{title}</span>
        </div>
        {subtitle && (
          <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>}
    </header>
  );
}

export function SectionHeader({
  kicker,
  title,
  right,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="hf-section-intro" style={{ marginBottom: 0 }}>
      <div>
        {kicker && (
          <div
            className="hf-mono"
            style={{
              fontSize: 10.5,
              color: "var(--hf-ink-4)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 6,
            }}
          >
            {kicker}
          </div>
        )}
        <div
          style={{
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--hf-ink)",
          }}
        >
          {title}
        </div>
      </div>
      {right}
    </div>
  );
}
