import Link from "next/link";

export function Logo({ size = 24, href = "/" }: { size?: number; href?: string | null }) {
  const inner = (
    <div className="flex items-center gap-[9px]">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="block">
        <defs>
          <linearGradient id="hw-logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#a5b4fc" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#hw-logo-grad)" />
        <path d="M7.5 8.5v7M16.5 8.5v7M7.5 12h9" stroke="#0a0d14" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.6" fill="#0a0d14" />
      </svg>
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--hw-ink)]">HookWise</span>
    </div>
  );
  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}
