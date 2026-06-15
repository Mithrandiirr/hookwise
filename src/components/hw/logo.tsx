import Link from "next/link";

// trueline mark — two record lines; the lower one has a gap a sky node fills (the diff,
// as a monogram). Ink lines flip with the theme; the node is the only brand-blue. Per .design/Brand.
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="5" y="11" width="22" height="4" rx="2" fill="var(--hf-ink)" />
      <rect x="5" y="18" width="9" height="4" rx="2" fill="var(--hf-ink)" />
      <rect x="20" y="18" width="7" height="4" rx="2" fill="var(--hf-ink)" />
      <rect x="15" y="17.5" width="4" height="5" rx="1.5" fill="var(--hf-blue)" />
    </svg>
  );
}

export function Logo({ size = 22, href = "/" }: { size?: number; href?: string | null }) {
  const inner = (
    <div className="flex items-center gap-[9px]">
      <LogoMark size={size} />
      <span
        style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--hf-ink)" }}
      >
        trueline
      </span>
    </div>
  );
  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}
