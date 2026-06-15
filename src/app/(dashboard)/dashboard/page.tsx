export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, events, reconciliationRuns, backfillRuns } from "@/lib/db";
import { eq, desc, and, gte, inArray, sql } from "drizzle-orm";
import { resolveOrgTier } from "@/lib/tier";
import type { BackfillSummary } from "@/lib/inngest/functions/onboarding-backfill";
import { FirstLoadView } from "./first-load-view";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));
  const integrationIds = userIntegrations.map((i) => i.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const empty = integrationIds.length === 0;

  const [eventsLast24hRow, latestBackfillRow, reconMonthRow, perDayRows, recentRecoveries, lastRunRow, topicRows] =
    await Promise.all([
      empty
        ? Promise.resolve([{ c: 0 }])
        : db.select({ c: sql<number>`COUNT(*)::int` }).from(events).where(and(inArray(events.integrationId, integrationIds), gte(events.receivedAt, twentyFourHoursAgo))),
      empty
        ? Promise.resolve([])
        : db.select().from(backfillRuns).where(inArray(backfillRuns.integrationId, integrationIds)).orderBy(desc(backfillRuns.startedAt)).limit(1),
      empty
        ? Promise.resolve([{ c: 0, amount: 0 }])
        : db
            .select({ c: sql<number>`COUNT(*)::int`, amount: sql<number>`COALESCE(SUM(${events.amountCents}), 0)::bigint` })
            .from(events)
            .where(and(inArray(events.integrationId, integrationIds), eq(events.source, "reconciliation"), gte(events.receivedAt, monthStart))),
      empty
        ? Promise.resolve([])
        : db
            .select({ day: sql<string>`to_char(date_trunc('day', ${events.receivedAt}), 'YYYY-MM-DD')`, amount: sql<number>`COALESCE(SUM(${events.amountCents}), 0)::bigint` })
            .from(events)
            .where(and(inArray(events.integrationId, integrationIds), eq(events.source, "reconciliation"), gte(events.receivedAt, fourteenDaysAgo)))
            .groupBy(sql`date_trunc('day', ${events.receivedAt})`),
      empty
        ? Promise.resolve([])
        : db
            .select({ providerEventId: events.providerEventId, eventType: events.eventType, receivedAt: events.receivedAt, amountCents: events.amountCents })
            .from(events)
            .where(and(inArray(events.integrationId, integrationIds), eq(events.source, "reconciliation")))
            .orderBy(desc(events.receivedAt))
            .limit(4),
      empty
        ? Promise.resolve([])
        : db.select({ ranAt: reconciliationRuns.ranAt }).from(reconciliationRuns).where(inArray(reconciliationRuns.integrationId, integrationIds)).orderBy(desc(reconciliationRuns.ranAt)).limit(1),
      empty
        ? Promise.resolve([])
        : db
            .select({ eventType: events.eventType, count: sql<number>`COUNT(*)::int`, recovered: sql<number>`COUNT(*) FILTER (WHERE ${events.source} = 'reconciliation')::int` })
            .from(events)
            .where(inArray(events.integrationId, integrationIds))
            .groupBy(events.eventType)
            .orderBy(sql`COUNT(*) DESC`)
            .limit(5),
    ]);

  const tier = resolveOrgTier(userIntegrations);
  const latestBackfill = latestBackfillRow[0];
  const eventsLast24h = eventsLast24hRow[0]?.c ?? 0;

  // First-load: back-poll done, no live events yet — keep onboarding view.
  const isFirstLoad = eventsLast24h === 0 && latestBackfill?.summary != null;
  if (isFirstLoad && latestBackfill) {
    const integration = userIntegrations.find((i) => i.id === latestBackfill.integrationId);
    return (
      <FirstLoadView
        summary={latestBackfill.summary as BackfillSummary}
        integrationId={latestBackfill.integrationId}
        provider={integration?.provider ?? "unknown"}
        revenueTrackingEnabled={tier.revenueTrackingEnabled}
      />
    );
  }

  const integration = userIntegrations[0];
  const storeLabel = integration?.providerDomain ?? integration?.name ?? "your store";
  const assuredCents = Number(reconMonthRow[0]?.amount ?? 0);
  const gapsRecovered = reconMonthRow[0]?.c ?? 0;
  const lastRun = lastRunRow[0]?.ranAt;

  // 14-day bar series of $ recovered/day
  const byDay = new Map(perDayRows.map((r) => [r.day, Number(r.amount)]));
  const days: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(byDay.get(isoDay(d)) ?? 0);
  }
  const maxDay = Math.max(1, ...days);

  return (
    <div style={{ padding: "28px 32px 32px", flex: 1, overflow: "auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{storeLabel}</h3>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#16794a", background: "var(--hf-green-bg)", border: "1px solid #bfe7cd", borderRadius: 999, padding: "4px 11px" }}>
              <span className="hw-pulse-sky" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              assured
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>Revenue Assurance · reconciling every 5 minutes</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 12, color: "var(--hf-ink-2)", border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })} <span style={{ color: "var(--hf-ink-4)" }}>▾</span>
          </div>
          <div className="hf-btn pill" style={{ fontSize: 12.5 }}>Download statement</div>
        </div>
      </div>

      {/* stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        <Tile label="Revenue assured · MTD" value={fmtMoney(assuredCents)} sub="order value recovered this month" warm />
        <Tile label="Gaps recovered" value={gapsRecovered.toLocaleString()} sub="re-delivered automatically" />
        <Tile label="Last reconciliation" value={lastRun ? fmtAgo(lastRun) : "—"} sub={lastRun ? "in parity · next in 5m" : "awaiting first run"} subGreen={!!lastRun} />
        <Tile label="Cadence" value="5 min" sub="continuous polling" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 10, alignItems: "start" }}>
        {/* left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* assured over time */}
          <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Revenue assured</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-ink-4)" }}>last 14 days · $ recovered/day</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 8, alignItems: "end", height: 120 }}>
              {days.map((v, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ background: v > 0 ? "var(--hf-accent-warm)" : "var(--hf-warm-bg)", borderRadius: 3, height: `${Math.max(3, Math.round((v / maxDay) * 100))}%`, opacity: v > 0 ? 1 : 0.6 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: mono, fontSize: 10, color: "var(--hf-ink-4)" }}>
              <div>{new Date(fourteenDaysAgo).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              <div>today</div>
            </div>
          </div>

          {/* recent recoveries */}
          <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--hf-line-soft)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Recent recoveries</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-accent)", cursor: "pointer" }}>view all →</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 130px 110px 90px", gap: 12, padding: "8px 20px", borderBottom: "1px solid var(--hf-line-soft)", background: "var(--hf-bg-2)", fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-ink-4)" }}>
              <div>Order</div><div>Topic</div><div>Recovered</div><div style={{ textAlign: "right" }}>Endpoint</div><div style={{ textAlign: "right" }}>Value</div>
            </div>
            {recentRecoveries.length === 0 ? (
              <div style={{ padding: "20px", fontSize: 12.5, color: "var(--hf-ink-4)" }}>No recoveries yet — the reconciler re-delivers missed events as it finds them.</div>
            ) : (
              recentRecoveries.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr 130px 110px 90px", gap: 12, alignItems: "center", padding: "10px 20px", borderBottom: i < recentRecoveries.length - 1 ? "1px solid var(--hf-line-soft)" : "none", fontSize: 12.5 }}>
                  <div style={{ fontFamily: mono, fontSize: 11.5 }}>{(r.providerEventId ?? "—").slice(0, 10)}</div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)" }}>{r.eventType}</div>
                  <div style={{ color: "var(--hf-ink-3)" }}>{fmtAgo(r.receivedAt)}</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-green)", background: "var(--hf-green-bg)", borderRadius: 999, padding: "2px 8px" }}>200 OK</span>
                  </div>
                  <div className="hf-num" style={{ textAlign: "right", fontWeight: 600, color: "var(--hf-accent-warm)" }}>{r.amountCents ? fmtMoney(r.amountCents) : "—"}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* plan card (dark) */}
          <div style={{ background: "#0e1116", borderRadius: 12, padding: 20, color: "#f4f4f5" }}>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7dd3fc", marginBottom: 10 }}>Your plan</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Revenue Assurance</div>
            <div style={{ fontSize: 13, color: "#9aa3af", marginTop: 4 }}>$29 / store / month · {userIntegrations.length || 1} store{userIntegrations.length === 1 ? "" : "s"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 12, color: "#9aa3af" }}>Next statement</div>
              <div style={{ fontSize: 12.5, fontWeight: 550 }}>{new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#9aa3af" }}>Assured this month</div>
              <div className="hf-num" style={{ fontSize: 12.5, fontWeight: 600, color: "#f5874a" }}>{fmtMoney(assuredCents)}</div>
            </div>
          </div>

          {/* subscription health */}
          <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>Subscription health</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {topicRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--hf-ink-4)" }}>Waiting for the first webhooks…</div>
              ) : (
                topicRows.map((t) => (
                  <div key={t.eventType} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                    <div style={{ flex: 1, fontFamily: mono, fontSize: 11.5 }}>{t.eventType}</div>
                    <div style={{ fontFamily: mono, fontSize: 10.5, color: t.recovered > 0 ? "var(--hf-green)" : "var(--hf-ink-4)" }}>{t.recovered > 0 ? "recovered" : "healthy"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, warm, subGreen }: { label: string; value: string; sub: string; warm?: boolean; subGreen?: boolean }) {
  return (
    <div style={{ background: warm ? "var(--hf-warm-bg)" : "var(--hf-bg-3)", border: `1px solid ${warm ? "var(--hf-warm-border)" : "var(--hf-line)"}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: warm ? "var(--hf-warm)" : "var(--hf-ink-4)" }}>{label}</div>
      <div className="hf-num" style={{ fontSize: 30, fontWeight: warm ? 650 : 600, letterSpacing: "-0.02em", marginTop: 8, color: warm ? "var(--hf-accent-warm)" : "var(--hf-ink)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: subGreen ? "var(--hf-green)" : warm ? "var(--hf-warm)" : "var(--hf-ink-4)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtAgo(d: Date): string {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
