// v7.1 — /billing dashboard surface.
// Usage meter + plan card + Stripe portal CTA. Revenue-protected pricing offer only renders on Tier A.

export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, events } from "@/lib/db";
import { eq, count, and, gte, inArray } from "drizzle-orm";
import { Chip, DashTopbar, Icon } from "@/components/hw";
import { resolveOrgTier } from "@/lib/tier";

type PlanKey = "free" | "pro" | "business";

type Plan = {
  key: PlanKey;
  name: string;
  price: string;
  cap: number;
  retention: string;
};

const PLANS: Record<PlanKey, Plan> = {
  free: { key: "free", name: "Free", price: "$0", cap: 10_000, retention: "7 days" },
  pro: { key: "pro", name: "Pro", price: "$79", cap: 500_000, retention: "30 days" },
  business: { key: "business", name: "Business", price: "$299", cap: 5_000_000, retention: "1 year" },
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, provider: integrations.provider, status: integrations.status })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const tier = resolveOrgTier(userIntegrations);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [usageRow] =
    integrationIds.length > 0
      ? await db
          .select({ count: count() })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, monthStart),
            ),
          )
      : ([{ count: 0 }] as const);

  // UI scaffold — wire to orgs.plan once multi-org migration ships.
  const currentPlanKey: PlanKey = "free";
  const plan = PLANS[currentPlanKey];

  const used = usageRow?.count ?? 0;
  const cap = plan.cap;
  const pct = Math.min(100, (used / cap) * 100);
  const overage = Math.max(0, used - cap);

  const billingDay = new Date();
  billingDay.setMonth(billingDay.getMonth() + 1);
  billingDay.setDate(1);

  return (
    <>
      <DashTopbar
        title="Billing"
        subtitle="Usage-metered · invoiced monthly via Stripe"
        right={
          <>
            <Chip tone={overage > 0 ? "amber" : "green"}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: overage > 0 ? "#d97706" : "#16a34a",
                }}
              />
              {plan.name} · {used.toLocaleString()} events
            </Chip>
            <button type="button" className="hf-btn outline small">
              <Icon name="settings" size={13} /> Stripe portal
            </button>
          </>
        }
      />

      <div
        style={{
          padding: "24px 32px 40px",
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Usage hero */}
        <div className="hf-landscape" style={{ padding: "26px 32px" }}>
          <div className="hf-eyebrow">Current period</div>
          <h1 className="hf-display" style={{ fontSize: 26, margin: "8px 0 0" }}>
            <span className="hf-num">{used.toLocaleString()}</span> events.{" "}
            <span style={{ color: "var(--hf-ink-3)" }}>
              {pct.toFixed(0)}% of {plan.name} cap.
            </span>
          </h1>

          <div
            style={{
              marginTop: 22,
              height: 10,
              borderRadius: 5,
              background: "#f1f2f5",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background:
                  pct >= 90 ? "var(--hf-accent-warm)" : pct >= 75 ? "#d97706" : "var(--hf-accent)",
                transition: "width 200ms ease",
              }}
            />
          </div>
          <div
            className="hf-mono"
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--hf-ink-4)",
            }}
          >
            <span>0</span>
            <span>{cap.toLocaleString()} cap</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 22 }}>
            <Stat label="Plan" value={plan.name} sub={`${plan.price}/mo`} />
            <Stat label="Retention" value={plan.retention} />
            <Stat label="Integrations" value={userIntegrations.length.toString()} sub={`tier ${tier.tier}`} />
            <Stat
              label="Next invoice"
              value={billingDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              sub={overage > 0 ? `${overage.toLocaleString()} over cap` : "auto-renews"}
            />
          </div>
        </div>

        {/* Plan cards */}
        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div className="hf-section-intro" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
              Plans
            </h2>
            <Link href="/#pricing" className="hf-link-accent">
              See full comparison →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {Object.values(PLANS).map((p) => {
              const isCurrent = p.key === currentPlanKey;
              return (
                <div
                  key={p.key}
                  style={{
                    background: isCurrent ? "#e8f4fb" : "var(--hf-bg)",
                    border: isCurrent ? "1px solid var(--hf-accent)" : "1px solid var(--hf-line)",
                    borderRadius: 12,
                    padding: "18px 20px",
                    position: "relative",
                  }}
                >
                  {isCurrent && (
                    <span
                      className="hf-mono"
                      style={{
                        position: "absolute",
                        top: -10,
                        left: 16,
                        fontSize: 9.5,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--hf-accent)",
                        color: "var(--hf-bg)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      current
                    </span>
                  )}
                  <div
                    className="hf-mono"
                    style={{
                      fontSize: 10.5,
                      color: "var(--hf-ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="hf-num"
                    style={{
                      fontSize: 28,
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      color: "var(--hf-ink)",
                      marginTop: 6,
                    }}
                  >
                    {p.price}
                    <span style={{ color: "var(--hf-ink-3)", fontSize: 13, marginLeft: 4 }}>/mo</span>
                  </div>
                  <div
                    className="hf-mono"
                    style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <span>{p.cap.toLocaleString()} events / mo</span>
                    <span>{p.retention} retention</span>
                  </div>
                  <button
                    className={isCurrent ? "hf-btn ghost small" : "hf-btn outline small"}
                    style={{ marginTop: 14, width: "100%", justifyContent: "center" }}
                    type="button"
                  >
                    {isCurrent ? "Manage" : `Switch to ${p.name} →`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier A revenue-protected pricing — only renders for Tier A orgs */}
        {tier.revenueTrackingEnabled && (
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(255,107,44,0.08), transparent 60%), var(--hf-bg-3)",
              border: "1px solid rgba(255,107,44,0.3)",
              borderRadius: 14,
              padding: "22px 24px",
            }}
          >
            <div className="hf-eyebrow" style={{ color: "var(--hf-accent-warm)" }}>
              Optional · Tier A
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                margin: "8px 0 6px",
              }}
            >
              Revenue-protected pricing
            </h2>
            <p style={{ fontSize: 13, color: "var(--hf-ink-2)", margin: 0, lineHeight: 1.55, maxWidth: 700 }}>
              You have at least one money provider connected. On the Business plan, you can opt into
              outcome-based pricing — 1% of reconciled revenue, capped at $999/mo — instead of the flat
              $299. Sales conversation, not the default. Worth it if your reconciler regularly recovers
              meaningful dollars.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="button" className="hf-btn outline small">
                Talk to sales →
              </button>
              <button type="button" className="hf-btn ghost small">
                Estimate my recovered revenue →
              </button>
            </div>
          </div>
        )}

        {/* Invoice history */}
        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div className="hf-section-intro" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
              Invoice history
            </h2>
            <button type="button" className="hf-btn ghost small">
              <Icon name="copy" size={13} /> Export CSV
            </button>
          </div>
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--hf-ink-4)",
            }}
          >
            No invoices yet. First invoice generates on{" "}
            {billingDay.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--hf-bg)",
        border: "1px solid var(--hf-line)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        className="hf-mono"
        style={{
          fontSize: 10.5,
          color: "var(--hf-ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: "var(--hf-ink)",
          marginTop: 6,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
