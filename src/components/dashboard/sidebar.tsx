"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Activity,
  AlertTriangle,
  Bell,
  FileCheck,
  GitBranch,
  Globe,
  LayoutDashboard,
  Plug,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  LogOut,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const nav: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
}> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/scan", label: "Health Scanner", icon: Search },
  { href: "/events", label: "Events", icon: Activity },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/compliance", label: "Compliance", icon: FileCheck },
  { href: "/replay", label: "Replay", icon: RotateCcw },
  { href: "/reconciliation", label: "Reconciliation", icon: RefreshCw },
  { href: "/flows", label: "Flows", icon: GitBranch },
  { href: "/status", label: "Status Page", icon: Globe, external: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-[240px] min-h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-default)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 glow-blue">
          <Zap className="h-4 w-4 text-indigo-400" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
          HookWise
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Platform
        </p>
        {nav.map(({ href, label, icon: Icon, external }) => {
          const active =
            !external &&
            (pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href)));
          return (
            <Link
              key={href}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-default)]"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)]"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-indigo-400" : "text-[var(--text-muted)] group-hover:text-[var(--text-tertiary)]"
                )}
              />
              {label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 glow-blue" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle + Sign out */}
      <div className="px-3 py-4 border-t border-[var(--border-default)]">
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)] transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
