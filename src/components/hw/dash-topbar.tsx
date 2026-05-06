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
      className="flex items-center justify-between"
      style={{
        padding: "18px 28px",
        borderBottom: "1px solid var(--hw-line)",
        gap: 20,
        background: "var(--hw-bg)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--hw-ink)",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--hw-ink-3)", marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {right && <div className="flex items-center gap-[10px]">{right}</div>}
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
    <div className="flex items-center justify-between" style={{ gap: 16 }}>
      <div>
        {kicker && <div className="hw-label" style={{ marginBottom: 6 }}>{kicker}</div>}
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--hw-ink)",
          }}
        >
          {title}
        </div>
      </div>
      {right}
    </div>
  );
}
