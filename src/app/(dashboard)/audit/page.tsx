export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, events } from "@/lib/db";
import { audits } from "@/lib/db/schema";
import { and, between, desc, eq, inArray, sql } from "drizzle-orm";
import { auditProgress } from "@/lib/audit";
import { DashTopbar, PageHead, StatTile, Panel, Pill } from "@/components/hw";
import { AuditClient } from "./audit-client";

// Orange is reserved for dollar amounts inside Gap Reports and gap tiles.
const GAP_DOLLAR_ORANGE = "#f97316";

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
        <div style={{ padding: "24px 32px 40px", flex: 1 }}>
          <PageHead
            crumb="Audit"
            title={<>Run a free 7-day gap audit on your store.</>}
            sub="Connect a read-only API key and an additional webhook subscription — zero risk, zero infra change. For 7 days we record what the provider fires and poll the API for what actually happened."
            actions={
              <Link href="/onboarding/connect" className="hf-btn pill small">
                Connect your store →
              </Link>
            }
          />
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
        <div style={{ padding: "24px 32px 40px", flex: 1 }}>
          <PageHead
            crumb="Audit"
            title={<>Your store is connected. Start the audit.</>}
            sub="For 7 days we record every webhook the provider fires and poll its API for ground truth. The Gap Report shows exactly what was never delivered — with dollar values."
          />
          <AuditClient mode="start" />
        </div>
      </>
    );
  }

  const integration = owned.find((i) => i.id === audit.integrationId) ?? owned[0];
  const progress = auditProgress(audit);
  const windowEnd = progress.expired ? audit.endsAt : new Date();

  const [webhookRow, gapRow] = await Promise.all([
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
  ]);

  const webhooksRecorded = webhookRow[0]?.count ?? 0;
  const gapsFound = gapRow[0]?.count ?? 0;
  const gapAmountCents = Number(gapRow[0]?.amount ?? 0);

  return (
    <>
      <DashTopbar
        title="7-Day Gap Audit"
        subtitle={`${integration.providerDomain ?? integration.name} · ${integration.provider}`}
        right={
          <Pill tone={progress.expired ? "green" : "ink"}>
            {progress.expired ? "complete" : `day ${progress.day} of ${progress.totalDays}`}
          </Pill>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Audit"
          title={
            gapsFound > 0 ? (
              <>
                {gapsFound.toLocaleString()} event{gapsFound === 1 ? "" : "s"} your provider{" "}
                <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                  never delivered
                </span>
                .
              </>
            ) : (
              <>
                Recording. No gaps{" "}
                <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                  so far
                </span>
                .
              </>
            )
          }
          sub="We record what the provider fires, poll its API every 5 minutes for ground truth, and diff the two. Gaps younger than the provider's latency window are never flagged."
        />

        {/* Progress bar */}
        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: 11.5,
            }}
          >
            <span className="hf-mono" style={{ color: "var(--hf-ink-3)" }}>
              {progress.expired
                ? "AUDIT WINDOW COMPLETE"
                : `DAY ${progress.day} OF ${progress.totalDays}`}
            </span>
            <span className="hf-mono" style={{ color: "var(--hf-ink-4)" }}>
              {audit.startedAt.toLocaleDateString()} → {audit.endsAt.toLocaleDateString()}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(progress.fraction * 100)}%`,
                height: "100%",
                background: "var(--hf-accent)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile
            label="WEBHOOKS RECORDED"
            value={webhooksRecorded.toLocaleString()}
            sub="what the provider fired"
          />
          <StatTile
            label="GAPS FOUND"
            value={gapsFound.toLocaleString()}
            sub="provider truth vs delivered"
            color={gapsFound > 0 ? "var(--hf-accent)" : undefined}
            accent={gapsFound > 0 ? "var(--hf-accent)" : undefined}
          />
          <StatTile
            label="GAP VALUE"
            value={fmtMoney(gapAmountCents)}
            sub="orders never delivered"
            color={gapAmountCents > 0 ? GAP_DOLLAR_ORANGE : undefined}
            accent={gapAmountCents > 0 ? GAP_DOLLAR_ORANGE : undefined}
          />
          <StatTile
            label="AUDIT STATUS"
            value={progress.expired ? "Complete" : "Recording"}
            sub={progress.expired ? "report frozen" : "polling every 5 min"}
          />
        </div>

        <Panel title="Gap Report">
          <AuditClient
            mode="report"
            auditId={audit.id}
            shareToken={audit.shareToken}
            brandName={audit.brandName}
            complete={progress.expired}
          />
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
