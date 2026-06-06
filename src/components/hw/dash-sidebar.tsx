"use client";

// Sidebar — matches .design/hookwise-f.jsx (`DASH_NAV`) layout:
//   pitch-black bg (#0c0c0c, darker than canvas), unicode glyphs as icons,
//   left-border + accent-color active state, optional count badges.
// Production preserves all routable surfaces (Analytics, Scanner, Billing, etc.)
// even where the design dropped them.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  href: string;
  name: string;
  glyph: string;     // Unicode glyph (matches .design's minimal, Cursor-style markers)
  count?: number;    // badge — rendered in accent pill when > 0
};

type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard",        name: "Overview",       glyph: "▤" },
      { href: "/anomalies",        name: "Investigations", glyph: "✦" },
      { href: "/events",           name: "Live feed",      glyph: "⚡" },
      { href: "/reconciliation",   name: "Reconciler",     glyph: "⟲" },
      { href: "/health",           name: "Health",         glyph: "♥" },
      { href: "/activity",         name: "Activity",       glyph: "⚑" },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/integrations", name: "Endpoints", glyph: "⟿" },
      { href: "/analytics",    name: "Analytics", glyph: "☷" },
      { href: "/scan",         name: "Scanner",   glyph: "⌗" },
      { href: "/replay",       name: "Retries",   glyph: "⏱" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings",       name: "Project",  glyph: "⚙" },
      { href: "/settings/api",   name: "API keys", glyph: "⚿" },
      { href: "/alerts",         name: "Alerts",   glyph: "✉" },
      { href: "/billing",        name: "Billing",  glyph: "$" },
      { href: "/settings/team",  name: "Members",  glyph: "☰" },
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

  const orgName = org?.name ?? "acme-production";
  const userName = user?.name ?? "Operator";
  const userRole = user?.role ?? "Pro plan";
  const userInit = user?.initials ?? userName.slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 220,
        background: "#0c0c0c",
        borderRight: "1px solid var(--hf-line)",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px" }}>
        <div className="hf-logo">
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
        </div>
      </div>

      {/* Project switcher */}
      <div style={{ padding: "0 12px 14px" }}>
        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 8,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--hf-ink-2)",
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, var(--hf-accent), #4a7c1f)",
            }}
          />
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {orgName}
          </span>
          <span style={{ color: "var(--hf-ink-4)" }}>⌄</span>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1" style={{ overflow: "auto" }}>
        {GROUPS.map((g) => (
          <div key={g.label} style={{ padding: "8px 0" }}>
            <div className="hf-sb-head" style={{ padding: "6px 18px 4px" }}>
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
                    display: "grid",
                    gridTemplateColumns: "20px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "7px 18px",
                    fontSize: 13,
                    color: isActive ? "var(--hf-ink)" : "var(--hf-ink-2)",
                    background: isActive ? "var(--hf-bg-3)" : "transparent",
                    borderLeft: isActive
                      ? "2px solid var(--hf-accent)"
                      : "2px solid transparent",
                    paddingLeft: isActive ? 16 : 18,
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: isActive ? "var(--hf-accent)" : "var(--hf-ink-3)",
                      width: 18,
                      textAlign: "center",
                      lineHeight: 1,
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                    }}
                  >
                    {item.glyph}
                  </span>
                  <span>{item.name}</span>
                  {count ? (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: "var(--hf-accent)",
                        color: "#0a0a0a",
                        fontWeight: 600,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
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

      {/* User footer */}
      <div
        style={{
          padding: "14px 18px",
          borderTop: "1px solid var(--hf-line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "linear-gradient(135deg, #a3e635, #4a7c1f)",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 600,
            color: "#0a0a0a",
          }}
        >
          {userInit}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--hf-ink)", fontSize: 12, fontWeight: 500 }}>
            {userName}
          </div>
          <div style={{ color: "var(--hf-ink-3)", fontSize: 11 }}>{userRole}</div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--hf-ink-3)",
            cursor: "pointer",
            padding: 4,
            fontSize: 14,
          }}
        >
          ⋯
        </button>
      </div>
    </aside>
  );
}
