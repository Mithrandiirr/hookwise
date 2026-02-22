"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Activity,
  AlertTriangle,
  GitBranch,
  LayoutDashboard,
  Plug,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Activity },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/flows", label: "Flows", icon: GitBranch },
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
    <aside className="flex flex-col w-[240px] min-h-screen bg-[#080a10] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 glow-blue">
          <Zap className="h-4 w-4 text-indigo-400" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          HookWise
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">
          Platform
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-indigo-400" : "text-white/25 group-hover:text-white/50"
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

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/30 hover:bg-white/[0.04] hover:text-white/60 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
