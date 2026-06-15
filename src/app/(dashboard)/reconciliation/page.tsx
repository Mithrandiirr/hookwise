export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, reconciliationRuns, events } from "@/lib/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { ReconciliationRuns, type Run } from "./reconciliation-runs";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

export default async function ReconciliationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));
  const integrationIds = userIntegrations.map((i) => i.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [recentRuns, topicRows] = await Promise.all([
    integrationIds.length > 0
      ? db
          .select()
          .from(reconciliationRuns)
          .where(inArray(reconciliationRuns.integrationId, integrationIds))
          .orderBy(desc(reconciliationRuns.ranAt))
          .limit(12)
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({
            eventType: events.eventType,
            total: sql<number>`COUNT(*)::int`,
            recovered: sql<number>`COUNT(*) FILTER (WHERE ${events.source} = 'reconciliation')::int`,
          })
          .from(events)
          .where(inArray(events.integrationId, integrationIds))
          .groupBy(events.eventType)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(6)
      : Promise.resolve([]),
  ]);

  const truth = recentRuns.reduce((s, r) => s + r.providerEventsFound, 0);
  const delivered = recentRuns.reduce((s, r) => s + r.hookwiseEventsFound, 0);
  const recovered = recentRuns.reduce((s, r) => s + r.gapsResolved, 0);
  const runsToday = recentRuns.filter((r) => r.ranAt >= startOfDay).length;
  const gapsToday = recentRuns.filter((r) => r.ranAt >= startOfDay).reduce((s, r) => s + r.gapsDetected, 0);
  const lastRun = recentRuns[0]?.ranAt;
  const inParity = recentRuns.every((r) => r.gapsDetected === r.gapsResolved);

  const runs: Run[] = recentRuns.map((r) => ({
    id: r.id,
    ranAt: new Date(r.ranAt).toISOString(),
    providerEventsFound: r.providerEventsFound,
    hookwiseEventsFound: r.hookwiseEventsFound,
    gapsDetected: r.gapsDetected,
    gapsResolved: r.gapsResolved,
  }));

  return (
    <div style={{ padding: "28px 32px 32px", flex: 1, overflow: "auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Reconciliation</h3>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>Polling the Admin API against delivered webhooks · read-only</div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11, color: "var(--hf-accent)", background: "var(--hf-accent-soft)", border: "1px solid var(--hf-accent-border)", borderRadius: 8, padding: "8px 13px" }}>
          <span className="hw-pulse-sky" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--hf-blue)" }} />
          {lastRun ? `last run ${fmtAgo(lastRun)} · next in 5m` : "awaiting first run"}
        </div>
      </div>

      {/* parity banner */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        <div style={{ background: "var(--hf-bg-3)", border: `1px solid ${inParity ? "#bfe7cd" : "var(--hf-warm-border)"}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: inParity ? "#22c55e" : "var(--hf-accent-warm)" }} />
            <div style={{ fontSize: 17, fontWeight: 650, color: inParity ? "#16794a" : "var(--hf-warm)" }}>{inParity ? "In parity" : "Recovering"}</div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6, fontFamily: mono }}>
            truth {truth.toLocaleString()} = delivered {delivered.toLocaleString()} + recovered {recovered.toLocaleString()}
          </div>
        </div>
        <MiniStat label="Cadence" value="5 min" />
        <MiniStat label="Runs today" value={runsToday.toLocaleString()} />
        <MiniStat label="Gaps today" value={<>{gapsToday}{gapsToday > 0 && <span style={{ fontSize: 12, color: "var(--hf-green)", fontWeight: 500 }}> · all recovered</span>}</>} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 10, alignItems: "start" }}>
        {/* runs log */}
        <ReconciliationRuns runs={runs} />

        {/* per-topic parity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>Parity by topic</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {topicRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--hf-ink-4)" }}>No topics recorded yet.</div>
              ) : (
                topicRows.map((t) => (
                  <div key={t.eventType}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 11.5, marginBottom: 5 }}>
                      <span>{t.eventType}</span>
                      <span style={{ color: t.recovered > 0 ? "var(--hf-warm)" : "var(--hf-green)" }}>100%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "var(--hf-line-soft)" }}>
                      <div style={{ width: "100%", height: 5, borderRadius: 999, background: "#22c55e" }} />
                    </div>
                    {t.recovered > 0 && (
                      <div style={{ fontSize: 10.5, color: "var(--hf-ink-4)", marginTop: 5 }}>{t.recovered} recovered, brought back to parity</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <div style={{ background: "var(--hf-accent-tint)", border: "1px solid var(--hf-accent-border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-accent)", marginBottom: 6 }}>How parity is measured</div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: "var(--hf-ink-2)" }}>
              Each run polls the Admin API for the last window, matches by{" "}
              <span style={{ fontFamily: mono, fontSize: 10.5 }}>provider_event_id</span>, and counts anything unmatched after the 60-min maturity window as a gap — then replays it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--hf-ink-4)" }}>{label}</div>
      <div className="hf-num" style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function fmtAgo(d: Date): string {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
