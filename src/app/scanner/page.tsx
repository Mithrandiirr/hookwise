import Link from "next/link";
import { Logo, Icon } from "@/components/hw";
import { ScannerFlow } from "./scanner-flow";

export default function ScanPage() {
  return (
    <div
      className="hw-root relative overflow-hidden"
      style={{ minHeight: "100vh", background: "var(--hw-bg)" }}
    >
      <div
        className="hw-grid-bg absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.55,
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, #000 40%, transparent 85%)",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, #000 40%, transparent 85%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1000,
          height: 600,
          background:
            "radial-gradient(ellipse at center, rgba(129,140,248,0.14) 0%, rgba(129,140,248,0.04) 40%, transparent 70%)",
        }}
      />

      <nav
        className="relative mx-auto flex items-center justify-between"
        style={{ zIndex: 2, maxWidth: 1100, padding: "24px 40px" }}
      >
        <Logo />
        <div className="flex items-center" style={{ gap: 24 }}>
          <Link
            href="/login"
            className="text-[13px]"
            style={{ color: "var(--hw-ink-3)" }}
          >
            Sign in
          </Link>
          <Link href="/signup" className="hw-btn hw-btn-primary">
            <span>Get started</span>
            <Icon name="arrow-up-right" size={14} />
          </Link>
        </div>
      </nav>

      <div
        className="relative mx-auto"
        style={{ zIndex: 2, maxWidth: 1100, padding: "60px 40px 100px" }}
      >
        <div
          className="hw-fade-up"
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <div className="hw-kicker">FREE WEBHOOK SCANNER</div>
          <h1
            className="hw-display"
            style={{
              marginTop: 14,
              fontSize: 44,
              color: "var(--hw-ink)",
              maxWidth: 680,
              marginInline: "auto",
            }}
          >
            See what your webhooks are missing.
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: 15,
              color: "var(--hw-ink-3)",
              maxWidth: 580,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            Drop in a read-only API key. We pull recent events and surface
            volume, types, and dollars flowing through your webhooks. No signup.
          </p>
        </div>

        <ScannerFlow />
      </div>
    </div>
  );
}
