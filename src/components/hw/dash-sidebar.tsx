"use client";

// Sidebar — matches .design/HookWise Phase 0 (Section 4 · Dashboard):
//   white surface, mono uppercase group labels (Store / Account), plain-text
//   items, active state = sky-tint background + 2px sky left border.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "./logo";
import { ThemeToggleFooter } from "./theme-toggle-footer";

type NavItem = {
  href: string;
  name: string;
  count?: number; // badge — rendered in a sky pill when > 0
};

type NavGroup = { label: string; items: NavItem[] };

// v8: reconciliation IS the product. Audit + Reconciliation lead; dormant
// surfaces stay routable but leave the nav until a paying customer pulls
// them back in.
const GROUPS: NavGroup[] = [
  {
    label: "Monitor",
    items: [
      { href: "/dashboard", name: "Overview" },
      { href: "/reconciliation", name: "Reconciliation" },
      { href: "/events", name: "Events" },
      { href: "/replay", name: "Replay" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/account", name: "Account" },
      { href: "/integrations", name: "Integrations" },
      { href: "/alerts", name: "Alerts" },
      { href: "/settings", name: "Settings" },
    ],
  },
];

export function DashSidebar({
  user,
  org,
  counts,
}: {
  user?: { name: string; role: string; initials?: string };
  org?: { name: string; plan: string; initials?: string };
  counts?: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const orgName = org?.name ?? "your store";
  const userName = user?.name ?? "Operator";
  const userInit = user?.initials ?? userName.slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 220,
        background: "var(--hf-sidebar-bg)",
        borderRight: "1px solid var(--hf-line-soft)",
        height: "100vh",
        position: "sticky",
        top: 0,
        padding: "20px 12px 0",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 18px" }}>
        <LogoMark size={19} />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--hf-ink)" }}>trueline</span>
      </div>

      {/* Nav groups */}
      <div className="flex-1" style={{ overflow: "auto" }}>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div
              className="hf-mono"
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--hf-ink-4)",
                padding: "10px 10px 6px",
              }}
            >
              {g.label}
            </div>
            {g.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const count = counts?.[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: isActive ? 550 : 400,
                    color: isActive ? "var(--hf-ink)" : "var(--hf-ink-2)",
                    background: isActive ? "var(--hf-accent-tint)" : "transparent",
                    borderLeft: isActive
                      ? "2px solid var(--hf-accent)"
                      : "2px solid transparent",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ flex: 1 }}>{item.name}</span>
                  {count ? (
                    <span
                      className="hf-mono"
                      style={{
                        fontSize: 10,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: "var(--hf-accent-soft)",
                        border: "1px solid var(--hf-accent-border)",
                        color: "var(--hf-accent)",
                        fontWeight: 600,
                      }}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Theme toggle */}
      <div style={{ padding: "0 10px 10px", display: "flex", justifyContent: "center" }}>
        <ThemeToggleFooter />
      </div>

      {/* User footer */}
      <div
        style={{
          margin: "0 -12px",
          padding: "12px 22px",
          borderTop: "1px solid var(--hf-line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--hf-accent-soft)",
            color: "var(--hf-accent)",
            display: "grid",
            placeItems: "center",
            fontSize: 10,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {userInit}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "var(--hf-ink-2)",
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {orgName !== "your store" ? orgName : userName}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--hf-ink-4)",
            cursor: "pointer",
            padding: 4,
            fontSize: 14,
          }}
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
