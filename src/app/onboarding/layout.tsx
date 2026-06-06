import Link from "next/link";
import "@/app/globals.css";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hf-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "18px 28px",
          borderBottom: "1px solid var(--hf-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" className="hf-logo" style={{ textDecoration: "none" }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M12 2 L22 7.5 V16.5 L12 22 L2 16.5 V7.5 Z" fill="#f4f2ee" />
            <path
              d="M12 2 L12 22 M2 7.5 L22 16.5 M22 7.5 L2 16.5"
              stroke="#0a0a0a"
              strokeWidth="0.8"
              opacity="0.5"
            />
          </svg>
          <span>HOOKWISE</span>
        </Link>
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
