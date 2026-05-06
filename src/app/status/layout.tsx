import Link from "next/link";
import { Logo } from "@/components/hw";

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="hw-root relative overflow-hidden"
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
      <nav
        className="relative mx-auto flex items-center justify-between"
        style={{ zIndex: 2, maxWidth: 1100, padding: "24px 40px" }}
      >
        <Logo />
        <div className="flex items-center" style={{ gap: 24 }}>
          <Link
            href="/"
            className="text-[13px]"
            style={{ color: "var(--hw-ink-3)" }}
          >
            Home
          </Link>
          <Link
            href="/scanner"
            className="text-[13px]"
            style={{ color: "var(--hw-ink-3)" }}
          >
            Scanner
          </Link>
        </div>
      </nav>
      <div
        className="relative mx-auto"
        style={{ zIndex: 2, maxWidth: 1100, padding: "32px 40px 100px" }}
      >
        {children}
      </div>
    </div>
  );
}
