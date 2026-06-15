import Link from "next/link";
import { Logo } from "@/components/hw/logo";
import "@/app/globals.css";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hf-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "18px 28px",
          borderBottom: "1px solid var(--hf-line-soft)",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo />
        <Link
          href="/dashboard"
          style={{ color: "var(--hf-ink-3)", fontSize: 12.5, textDecoration: "none" }}
        >
          Skip for now →
        </Link>
      </header>
      <div style={{ flex: 1, display: "flex" }}>{children}</div>
    </div>
  );
}
