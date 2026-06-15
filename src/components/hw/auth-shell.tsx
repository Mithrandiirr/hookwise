import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./logo";

export function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  footer,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="hw-root relative overflow-hidden flex flex-col"
      style={{ minHeight: "100vh", background: "var(--hw-bg)" }}
    >
      <div
        className="hw-grid-bg absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.5,
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, #000 35%, transparent 80%)",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, #000 35%, transparent 80%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: -160,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 500,
          background:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.14) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)",
        }}
      />

      <header
        className="relative mx-auto flex items-center justify-between"
        style={{ zIndex: 2, width: "100%", maxWidth: 1100, padding: "24px 28px" }}
      >
        <Logo />
        <Link
          href="/"
          className="text-[12px] hw-mono"
          style={{ color: "var(--hw-ink-4)" }}
        >
          ← Home
        </Link>
      </header>

      <main
        className="relative flex-1 flex items-center justify-center"
        style={{ zIndex: 2, padding: "32px 24px 72px" }}
      >
        <div
          className="hw-fade-up"
          style={{ width: "100%", maxWidth: 420 }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            {kicker && <div className="hw-kicker">{kicker}</div>}
            <h1
              className="hw-display"
              style={{
                marginTop: kicker ? 12 : 0,
                fontSize: 28,
                color: "var(--hw-ink)",
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--hw-ink-3)",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div
            className="hw-panel"
            style={{
              padding: 28,
              background: "#ffffff",
              boxShadow:
                "0 1px 2px rgba(14,17,22,0.05), 0 24px 64px -32px rgba(14,17,22,0.18)",
            }}
          >
            {children}
          </div>

          {footer && (
            <div
              style={{
                marginTop: 22,
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--hw-ink-3)",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function AuthField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={htmlFor}
        className="hw-label"
        style={{ display: "block", marginBottom: 8 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      className="hw-mono"
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: "#fdeaea",
        border: "1px solid #f4c4c4",
        color: "var(--hw-red)",
        fontSize: 12,
        marginBottom: 14,
      }}
    >
      {message}
    </div>
  );
}
