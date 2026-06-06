export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, reconciliationRuns, events } from "@/lib/db";
import { eq, desc, inArray, and, gte, sql } from "drizzle-orm";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Panel,
  Pill,
  ProviderTag,
  fmtAgo,
} from "@/components/hw";

export default async function ReconciliationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [recentRuns, recoveredRevenueRow] = await Promise.all([
    integrationIds.length > 0
      ? db
          .select()
          .from(reconciliationRuns)
          .where(
            and(
              inArray(reconciliationRuns.integrationId, integrationIds),
              gte(reconciliationRuns.ranAt, thirtyDaysAgo),
            ),
          )
          .orderBy(desc(reconciliationRuns.ranAt))
          .limit(20)
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({
            revenue: sql<number>`COALESCE(SUM(${events.amountCents}), 0)::bigint`,
          })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              eq(events.source, "reconciliation"),
              gte(events.receivedAt, thirtyDaysAgo),
            ),
          )
      : Promise.resolve([{ revenue: 0 }]),
  ]);

  const totRecov = recentRuns.reduce((s, r) => s + r.gapsResolved, 0);
  const totScanned = recentRuns.reduce((s, r) => s + r.providerEventsFound, 0);
  const totRevenueCents = Number(recoveredRevenueRow[0]?.revenue ?? 0);
  const parityPct =
    totScanned > 0
      ? ((totScanned - recentRuns.reduce((s, r) => s + r.gapsDetected, 0)) /
          totScanned) *
        100
      : 100;

  const perProvider = new Map<
    string,
    { latestRun?: Date; parity?: number; gaps: number }
  >();
  for (const r of recentRuns) {
    const integ = integrationMap.get(r.integrationId);
    if (!integ) continue;
    const cur = perProvider.get(integ.provider) ?? { gaps: 0 };
    cur.gaps += r.gapsDetected;
    if (!cur.latestRun || r.ranAt > cur.latestRun) {
      cur.latestRun = r.ranAt;
      cur.parity =
        r.providerEventsFound > 0
          ? ((r.providerEventsFound - r.gapsDetected) / r.providerEventsFound) * 100
          : 100;
    }
    perProvider.set(integ.provider, cur);
  }

  return (
    <>
      <DashTopbar
        title="Reconciler"
        subtitle="Provider parity polling · auto-recovers missed events"
        right={
          <Pill tone={totRecov > 0 ? "green" : "ink"}>
            +{totRecov.toLocaleString()} recovered · 30d
          </Pill>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Reconciler"
          title={
            <>
              HookWise found{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                {totRecov.toLocaleString()} event{totRecov === 1 ? "" : "s"}
              </span>{" "}
              the provider missed.
            </>
          }
          sub="Every five minutes we poll each provider's API, diff against our ingest log, and quietly recover anything that fell through the cracks."
          actions={
            <>
              <button type="button" className="hf-btn outline small">Schedule</button>
              <button type="button" className="hf-btn pill small">Run now ↻</button>
            </>
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile
            label="EVENTS RECOVERED"
            value={totRecov.toLocaleString()}
            sub="last 30 days"
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
          <StatTile
            label="REVENUE PROTECTED"
            value={totRevenueCents > 0 ? fmtMoney(totRevenueCents) : "$0"}
            sub="quantified per recovery"
            color="#7ed98a"
            accent="#7ed98a"
          />
          <StatTile
            label="PROVIDER EVENTS SCANNED"
            value={fmtCount(totScanned)}
            sub={`across ${perProvider.size || 0} integration${perProvider.size === 1 ? "" : "s"}`}
          />
          <StatTile
            label="PARITY · 30D"
            value={`${parityPct.toFixed(2)}%`}
            sub="ingest log vs provider truth"
          />
        </div>

        {perProvider.size > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(perProvider.size, 5)}, 1fr)`,
              gap: 12,
              marginBottom: 22,
            }}
          >
            {Array.from(perProvider.entries()).map(([p, s]) => (
              <div
                key={p}
                style={{
                  background: "var(--hf-bg-3)",
                  border: "1px solid var(--hf-line)",
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <ProviderTag name={p} />
                  <span
                    className="hf-mono"
                    style={{ fontSize: 10.5, color: "var(--hf-ink-4)" }}
                  >
                    {s.latestRun ? `last ${fmtAgo(s.latestRun)} ago` : "—"}
                  </span>
                </div>
                <div
                  className="hf-num hf-mono"
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--hf-ink)",
                    letterSpacing: "-0.025em",
                  }}
                >
                  {s.parity != null ? `${s.parity.toFixed(2)}%` : "—"}
                </div>
                <div
                  style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 4 }}
                >
                  parity · last run
                </div>
              </div>
            ))}
          </div>
        )}

        <Panel
          title="Reconciliation runs"
          right={
            <span style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}>
              {recentRuns.length} most recent
            </span>
          }
          padded={false}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 120px 1fr 90px 90px 100px",
              gap: 14,
              padding: "12px 24px",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10.5,
              color: "var(--hf-ink-4)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--hf-line)",
            }}
          >
            <span>Time</span>
            <span>Provider</span>
            <span>Coverage</span>
            <span style={{ textAlign: "right" }}>Scanned</span>
            <span style={{ textAlign: "right" }}>Recovered</span>
            <span style={{ textAlign: "right" }}>Status</span>
          </div>
          {recentRuns.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--hf-ink-4)",
              }}
            >
              No reconciliation runs in the last 30 days.
            </div>
          ) : (
            recentRuns.map((r, i) => {
              const integ = integrationMap.get(r.integrationId);
              const coveragePct =
                r.providerEventsFound > 0
                  ? ((r.providerEventsFound - r.gapsDetected) /
                      r.providerEventsFound) *
                    100
                  : 100;
              const status =
                r.gapsDetected === r.gapsResolved ? "ok" : "partial";
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 120px 1fr 90px 90px 100px",
                    gap: 14,
                    padding: "14px 24px",
                    borderBottom:
                      i < recentRuns.length - 1
                        ? "1px solid rgba(255,255,255,0.03)"
                        : "none",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="hf-mono"
                    style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}
                  >
                    {fmtAgo(r.ranAt)} ago
                  </span>
                  <ProviderTag name={integ?.provider ?? "unknown"} />
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.05)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${coveragePct}%`,
                        height: "100%",
                        background:
                          r.gapsDetected === r.gapsResolved
                            ? "#7ed98a"
                            : "var(--hf-accent)",
                      }}
                    />
                  </div>
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 12,
                      color: "var(--hf-ink-2)",
                      textAlign: "right",
                    }}
                  >
                    {r.providerEventsFound.toLocaleString()}
                  </span>
                  <span
                    className="hf-num hf-mono"
                    style={{
                      fontSize: 12.5,
                      color:
                        r.gapsResolved > 0
                          ? "var(--hf-accent)"
                          : "var(--hf-ink-4)",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    {r.gapsResolved > 0 ? `+${r.gapsResolved}` : "—"}
                  </span>
                  <span style={{ justifySelf: "end" }}>
                    <Pill tone={status === "ok" ? "green" : "amber"}>{status}</Pill>
                  </span>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </>
  );
}

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
