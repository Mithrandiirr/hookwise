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
    <aside className="flex flex-col w-60 min-h-screen bg-gray-900 border-r border-gray-800">
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <span className="text-lg font-bold text-white">HookWise</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
