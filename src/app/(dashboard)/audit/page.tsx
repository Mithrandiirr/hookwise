export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, events } from "@/lib/db";
import { audits } from "@/lib/db/schema";
import { and, between, desc, eq, inArray, sql } from "drizzle-orm";
import { auditProgress } from "@/lib/audit";
import { DashTopbar } from "@/components/hw";
import { AuditClient } from "./audit-client";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

function StatCard({
  label,
  value,
  sub,
  warm = false,
}: {
  label: string;
  value: string;
  sub: string;
  warm?: boolean;
}) {
  // Orange is reserved for dollar amounts inside Gap Reports and gap tiles.
  return (
    <div
      style={{
        background: warm ? "var(--hf-warm-bg)" : "var(--hf-bg-3)",
        border: `1px solid ${warm ? "var(--hf-warm-border)" : "var(--hf-line)"}`,
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: warm ? "var(--hf-warm)" : "var(--hf-ink-4)",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: 28,
          fontWeight: warm ? 650 : 600,
          letterSpacing: "-0.02em",
          marginTop: 8,
          color: warm ? "var(--hf-accent-warm)" : "var(--hf-ink)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: warm ? "var(--hf-warm)" : "var(--hf-ink-4)", marginTop: 3 }}>
        {sub}
      </div>
    </div>
  );
}

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const owned = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));

  if (owned.length === 0) {
    return (
      <>
        <DashTopbar title="7-Day Gap Audit" subtitle="Find what your provider never delivered" />
        <div style={{ padding: "28px 32px 40px", flex: 1 }}>
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              padding: "40px 44px",
              maxWidth: 760,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--hf-accent)",
                marginBottom: 16,
              }}
            >
              Free 7-day gap audit
            </div>
            <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em" }}>
              Run a free 7-day gap audit on your store.
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.55, color: "var(--hf-ink-2)", maxWidth: 560 }}>
              Connect a read-only API key and an additional webhook subscription — zero risk, zero
              infra change. For 7 days we record what the provider fires and poll the API for what
              actually happened.
            </p>
            <Link href="/onboarding/connect" className="hf-btn pill">
              Connect your store
            </Link>
          </div>
        </div>
      </>
    );
  }

  const ownedIds = owned.map((i) => i.id);
  const [audit] = await db
    .select()
    .from(audits)
    .where(inArray(audits.integrationId, ownedIds))
    .orderBy(desc(audits.startedAt))
    .limit(1);

  if (!audit) {
    return (
      <>
        <DashTopbar title="7-Day Gap Audit" subtitle="Find what your provider never delivered" />
        <div style={{ padding: "28px 32px 40px", flex: 1 }}>
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              padding: "40px 44px",
              maxWidth: 760,
            }}
          >
            <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em" }}>
              Your store is connected. Start the audit.
            </h1>
            <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.55, color: "var(--hf-ink-2)", maxWidth: 560 }}>
              For 7 days we record every webhook the provider fires and poll its API for ground
              truth. The Gap Report shows exactly what was never delivered — with dollar values.
            </p>
            <AuditClient mode="start" />
          </div>
        </div>
      </>
    );
  }

  const integration = owned.find((i) => i.id === audit.integrationId) ?? owned[0];
  const progress = auditProgress(audit);
  const windowEnd = progress.expired ? audit.endsAt : new Date();

  const [webhookRow, gapRow, perDayRows, gapRows, topicRows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integration.id),
          eq(events.source, "webhook"),
          between(events.receivedAt, audit.startedAt, windowEnd)
        )
      ),
    db
      .select({
        count: sql<number>`COUNT(*)::int`,
        amount: sql<number>`COALESCE(SUM(${events.amountCents}), 0)::bigint`,
      })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integration.id),
          eq(events.source, "reconciliation"),
          between(events.receivedAt, audit.startedAt, windowEnd)
        )
      ),
    // per-day event counts across the window (for the bar strip)
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${events.receivedAt}), 'YYYY-MM-DD')`,
        total: sql<number>`COUNT(*)::int`,
        gaps: sql<number>`COUNT(*) FILTER (WHERE ${events.source} = 'reconciliation')::int`,
      })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integration.id),
          between(events.receivedAt, audit.startedAt, windowEnd)
        )
      )
      .groupBy(sql`date_trunc('day', ${events.receivedAt})`),
    // top confirmed gaps (the reconciliation rows)
    db
      .select({
        providerEventId: events.providerEventId,
        eventType: events.eventType,
        receivedAt: events.receivedAt,
        amountCents: events.amountCents,
      })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integration.id),
          eq(events.source, "reconciliation"),
          between(events.receivedAt, audit.startedAt, windowEnd)
        )
      )
      .orderBy(sql`${events.amountCents} DESC NULLS LAST`, desc(events.receivedAt))
      .limit(5),
    // subscription topics seen, by activity (for the health panel)
    db
      .select({
        eventType: events.eventType,
        count: sql<number>`COUNT(*)::int`,
        last: sql<Date>`MAX(${events.receivedAt})`,
      })
      .from(events)
      .where(
        and(
          eq(events.integrationId, integration.id),
          eq(events.source, "webhook"),
          between(events.receivedAt, audit.startedAt, windowEnd)
        )
      )
      .groupBy(events.eventType)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5),
  ]);

  const webhooksRecorded = webhookRow[0]?.count ?? 0;
  const gapsFound = gapRow[0]?.count ?? 0;
  const gapAmountCents = Number(gapRow[0]?.amount ?? 0);
  const groundTruth = webhooksRecorded + gapsFound;
  const storeLabel = integration.providerDomain ?? integration.name;
  const topicCount = topicRows.length;

  // Build a fixed-length day strip from the audit window, filling real counts.
  const dayBuckets: Array<{ label: string; total: number; gaps: number; isFuture: boolean; isToday: boolean }> = [];
  const byDay = new Map(perDayRows.map((r) => [r.day, { total: r.total, gaps: r.gaps }]));
  const startDay = new Date(audit.startedAt);
  startDay.setHours(0, 0, 0, 0);
  const todayKey = isoDay(new Date());
  for (let i = 0; i < progress.totalDays; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = isoDay(d);
    const hit = byDay.get(key);
    dayBuckets.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      total: hit?.total ?? 0,
      gaps: hit?.gaps ?? 0,
      isFuture: key > todayKey,
      isToday: key === todayKey,
    });
  }
  const maxDay = Math.max(1, ...dayBuckets.map((b) => b.total));
  const MATURITY_MS = 60 * 60 * 1000;

  return (
    <>
      <div style={{ padding: "28px 32px 32px", overflow: "auto", flex: 1 }}>
        {/* header — store + recording badge | day-of progress */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
                {storeLabel}
              </h3>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: mono,
                  fontSize: 10.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: progress.expired ? "var(--hf-green)" : "var(--hf-accent)",
                  background: progress.expired ? "var(--hf-green-bg)" : "var(--hf-accent-soft)",
                  border: `1px solid ${progress.expired ? "#c4ebd2" : "var(--hf-accent-border)"}`,
                  borderRadius: 999,
                  padding: "4px 11px",
                }}
              >
                {!progress.expired && (
                  <span
                    className="hw-pulse-sky"
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--hf-accent)" }}
                  />
                )}
                {progress.expired ? "complete" : "recording"}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>
              7-Day Gap Audit · started {audit.startedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·
              report lands {audit.endsAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)", marginBottom: 8 }}>
              {progress.expired ? "AUDIT COMPLETE" : `DAY ${progress.day} OF ${progress.totalDays}`}
            </div>
            <div style={{ width: 220, height: 4, borderRadius: 999, background: "var(--hf-line-2)" }}>
              <div
                style={{
                  width: `${Math.round(progress.fraction * 100)}%`,
                  height: 4,
                  borderRadius: 999,
                  background: "var(--hf-accent)",
                }}
              />
            </div>
          </div>
        </div>

        {/* stat tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1.15fr",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatCard
            label="Webhooks recorded"
            value={webhooksRecorded.toLocaleString()}
            sub={`across ${topicCount || "—"} topic${topicCount === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Ground truth · Admin API"
            value={groundTruth.toLocaleString()}
            sub="polled every 5 min"
          />
          <StatCard
            label="Gaps found"
            value={gapsFound.toLocaleString()}
            sub="provider truth vs delivered"
          />
          <StatCard
            label="Revenue at risk"
            value={fmtMoney(gapAmountCents)}
            sub="order value in confirmed gaps"
            warm={gapAmountCents > 0}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 10, alignItems: "start" }}>
          {/* ── left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* events per day */}
            <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Events per day</div>
                {gapsFound > 0 && (
                  <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-warm)" }}>● gap burst detected</div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${dayBuckets.length}, 1fr)`, gap: 10, alignItems: "end", height: 110 }}>
                {dayBuckets.map((b, i) => {
                  const h = b.isFuture ? 30 : Math.max(8, Math.round((b.total / maxDay) * 100));
                  const barBg = b.isFuture ? "var(--hf-bg-2)" : b.gaps > 0 ? "#f5b07c" : b.isToday ? "#a5d8f3" : "#dbe0e8";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                      {b.gaps > 0 && !b.isFuture && (
                        <div style={{ display: "flex", justifyContent: "center", fontSize: 9, color: "var(--hf-accent-warm)" }}>●</div>
                      )}
                      <div
                        style={{
                          background: barBg,
                          border: b.isFuture ? "1px dashed #d8dbe2" : "none",
                          borderRadius: "4px 4px 2px 2px",
                          height: `${h}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${dayBuckets.length}, 1fr)`,
                  gap: 10,
                  marginTop: 8,
                  fontFamily: mono,
                  fontSize: 10,
                  color: "var(--hf-ink-4)",
                  textAlign: "center",
                }}
              >
                {dayBuckets.map((b, i) => (
                  <div key={i} style={{ color: b.isToday ? "var(--hf-accent)" : b.gaps > 0 ? "var(--hf-accent-warm)" : "var(--hf-ink-4)" }}>
                    {b.isToday ? "today" : b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* confirmed gaps */}
            <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--hf-line-soft)" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Confirmed gaps</div>
                <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-ink-4)" }}>audit mode · record-only</div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 130px 90px 120px",
                  gap: 12,
                  padding: "8px 20px",
                  borderBottom: "1px solid var(--hf-line-soft)",
                  background: "var(--hf-bg-2)",
                  fontFamily: mono,
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--hf-ink-4)",
                }}
              >
                <div>Order</div>
                <div>Topic</div>
                <div>Detected</div>
                <div style={{ textAlign: "right" }}>Value</div>
                <div style={{ textAlign: "right" }}>Status</div>
              </div>
              {gapRows.length === 0 ? (
                <div style={{ padding: "18px 20px", fontSize: 12.5, color: "var(--hf-ink-4)" }}>
                  No gaps detected yet — the diff runs every 5 minutes against the Admin API.
                </div>
              ) : (
                gapRows.map((g, i) => {
                  const mature = Date.now() - new Date(g.receivedAt).getTime() >= MATURITY_MS;
                  const cents = g.amountCents ?? 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "100px 1fr 130px 90px 120px",
                        gap: 12,
                        alignItems: "center",
                        padding: "10px 20px",
                        borderBottom: i < gapRows.length - 1 ? "1px solid var(--hf-line-soft)" : "none",
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ fontFamily: mono, fontSize: 11.5 }}>{g.providerEventId ?? "—"}</div>
                      <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)" }}>{g.eventType}</div>
                      <div style={{ color: "var(--hf-ink-3)" }}>{fmtDetected(g.receivedAt)}</div>
                      <div className="hf-num" style={{ textAlign: "right", fontWeight: 600, color: mature ? "var(--hf-accent-warm)" : "var(--hf-warm)" }}>
                        {cents > 0 ? fmtMoney(cents) : "—"}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {mature ? (
                          <span style={{ fontFamily: mono, fontSize: 10, border: "1px solid var(--hf-accent-border)", color: "var(--hf-accent)", background: "var(--hf-accent-tint)", borderRadius: 999, padding: "2px 8px" }}>
                            logged
                          </span>
                        ) : (
                          <span style={{ fontFamily: mono, fontSize: 10, border: "1px solid #d4d6dd", color: "var(--hf-ink-3)", borderRadius: 999, padding: "2px 8px" }}>
                            unconfirmed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── right column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* subscription health */}
            <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>Subscription health</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topicRows.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--hf-ink-4)" }}>Waiting for the first webhooks…</div>
                ) : (
                  topicRows.map((tpc) => (
                    <div key={tpc.eventType} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--hf-green)", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: mono, fontSize: 11.5 }}>{tpc.eventType}</div>
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-ink-4)" }}>
                        {tpc.count.toLocaleString()} rec
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--hf-warm-bg)", border: "1px solid var(--hf-warm-border)", borderRadius: 10 }}>
                <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-accent-warm)", marginBottom: 5 }}>
                  Heads up
                </div>
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "var(--hf-warm)" }}>
                  Shopify auto-removes failing subscriptions silently. We watch delivery health across
                  every topic and alert you before a subscription drops.
                </p>
              </div>
            </div>

            {/* audit mode / report */}
            <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--hf-ink-4)", marginBottom: 8 }}>
                {progress.expired ? "Gap Report" : "Audit mode"}
              </div>
              {progress.expired ? (
                <AuditClient
                  mode="report"
                  auditId={audit.id}
                  shareToken={audit.shareToken}
                  brandName={audit.brandName}
                  complete={progress.expired}
                />
              ) : (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--hf-ink-3)" }}>
                  Gaps are recorded, never delivered — we&#39;re not touching your systems during the
                  audit. Recovery turns on with{" "}
                  <span style={{ color: "var(--hf-accent)", fontWeight: 550 }}>Revenue Assurance</span>{" "}
                  after your report.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDetected(d: Date): string {
  const today = isoDay(new Date());
  const isToday = isoDay(new Date(d)) === today;
  const time = new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  if (isToday) return `today, ${time}`;
  return `${new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 10_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
