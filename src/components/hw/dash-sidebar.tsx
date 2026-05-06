"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Logo } from "./logo";
import { Icon, type IconName } from "./icon";

type NavItem = {
  href: string;
  name: string;
  icon: IconName;
  count?: number;
  external?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { href: "/dashboard", name: "Overview", icon: "dashboard" },
      { href: "/events", name: "Events", icon: "activity" },
      { href: "/anomalies", name: "Anomalies", icon: "alert" },
      { href: "/alerts", name: "Alerts", icon: "bell" },
    ],
  },
  {
    label: "Deliver",
    items: [
      { href: "/integrations", name: "Integrations", icon: "plug" },
      { href: "/replay", name: "Replay", icon: "replay" },
      { href: "/reconciliation", name: "Reconciliation", icon: "refresh" },
    ],
  },
  {
    label: "Insight",
    items: [
      { href: "/analytics", name: "Analytics", icon: "chart" },
      { href: "/flows", name: "Flows", icon: "zap" },
      { href: "/scan", name: "Scanner", icon: "search" },
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

  const orgName = org?.name ?? "Acme Commerce";
  const orgPlan = org?.plan ?? "team · pro";
  const orgInit = org?.initials ?? orgName.slice(0, 2).toUpperCase();
  const userName = user?.name ?? "Operator";
  const userRole = user?.role ?? "on-call";
  const userInit = user?.initials ?? userName.slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col flex-shrink-0 hw-mono-tabular"
      style={{
        width: 232,
        background: "var(--hw-bg)",
        borderRight: "1px solid var(--hw-line)",
      }}
    >
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--hw-line)" }}>
        <Logo />
      </div>

      <div
        className="flex-1 overflow-hidden"
        style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}
      >
        <div
          className="flex items-center gap-[10px]"
          style={{
            padding: "10px 12px",
            border: "1px solid var(--hw-line)",
            borderRadius: 8,
            margin: "4px 4px 10px",
            background: "var(--hw-panel)",
          }}
        >
          <div
            className="grid place-items-center"
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              background: "linear-gradient(135deg,#fbbf24,#f87171)",
              fontSize: 10,
              fontWeight: 700,
              color: "#0a0d14",
            }}
          >
            {orgInit}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--hw-ink)" }}>{orgName}</div>
            <div
              className="hw-mono"
              style={{ fontSize: 10, color: "var(--hw-ink-4)" }}
            >
              {orgPlan}
            </div>
          </div>
          <Icon name="chevron-down" size={14} color="var(--hw-ink-4)" />
        </div>

        {GROUPS.map((g) => (
          <div key={g.label} style={{ padding: "6px 4px" }}>
            <div
              className="hw-mono"
              style={{
                padding: "6px 12px",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--hw-ink-4)",
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
                  className={clsx(
                    "flex items-center gap-[10px] transition-all",
                    "cursor-pointer"
                  )}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 500,
                    color: isActive ? "var(--hw-ink)" : "var(--hw-ink-3)",
                    background: isActive ? "var(--hw-panel-raised)" : "transparent",
                    boxShadow: isActive ? "inset 0 0 0 1px var(--hw-line-2)" : "none",
                  }}
                >
                  <Icon
                    name={item.icon}
                    size={15}
                    color={isActive ? "var(--hw-indigo-ink)" : "var(--hw-ink-4)"}
                  />
                  <span>{item.name}</span>
                  {count ? (
                    <span
                      className="hw-mono ml-auto"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "rgba(251,191,36,0.10)",
                        color: "var(--hw-amber)",
                        border: "1px solid rgba(251,191,36,0.25)",
                      }}
                    >
                      {count}
                    </span>
                  ) : isActive ? (
                    <span
                      className="ml-auto"
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--hw-indigo)",
                      }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-[10px]"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--hw-line)",
        }}
      >
        <div
          className="grid place-items-center"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "linear-gradient(135deg,#60a5fa,#818cf8)",
            fontSize: 11,
            fontWeight: 700,
            color: "#0a0d14",
          }}
        >
          {userInit}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{userName}</div>
          <div className="hw-mono" style={{ fontSize: 10, color: "var(--hw-ink-4)" }}>
            {userRole}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="grid place-items-center hover:text-[var(--hw-ink)]"
          style={{ color: "var(--hw-ink-4)", padding: 4 }}
        >
          <Icon name="settings" size={14} color="currentColor" />
        </button>
      </div>
    </aside>
  );
}
