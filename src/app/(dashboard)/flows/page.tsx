export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, flows, flowInstances } from "@/lib/db";
import { eq, desc, count, and } from "drizzle-orm";
import { Chip, Icon, DashTopbar } from "@/components/hw";

export default async function FlowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userFlows = await db
    .select()
    .from(flows)
    .where(eq(flows.userId, user!.id))
    .orderBy(desc(flows.createdAt));

  const flowStats = await Promise.all(
    userFlows.map(async (flow) => {
      const [running] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(eq(flowInstances.flowId, flow.id), eq(flowInstances.status, "running")),
        );
      const [completed] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(eq(flowInstances.flowId, flow.id), eq(flowInstances.status, "completed")),
        );
      const [failed] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(eq(flowInstances.flowId, flow.id), eq(flowInstances.status, "failed")),
        );
      const [timedOut] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(eq(flowInstances.flowId, flow.id), eq(flowInstances.status, "timed_out")),
        );
      return {
        flowId: flow.id,
        running: running?.count ?? 0,
        completed: completed?.count ?? 0,
        failed: (failed?.count ?? 0) + (timedOut?.count ?? 0),
      };
    }),
  );
  const statsMap = new Map(flowStats.map((s) => [s.flowId, s] as const));

  return (
    <>
      <DashTopbar
        title="Sequencer"
        subtitle="multi-step event chains across providers · tracked by correlation key"
        right={
          <Link href="/flows/new" className="hf-btn pill small">
            <Icon name="zap" size={13} /> Create flow
          </Link>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {userFlows.length === 0 ? (
          <div
            style={{
              padding: "72px 24px",
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: "var(--hf-bg)",
                border: "1px solid var(--hf-line)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="zap" size={22} color="var(--hf-ink-4)" />
            </div>
            <div style={{ fontSize: 15, color: "var(--hf-ink)" }}>No flows defined</div>
            <div style={{ fontSize: 12.5, color: "var(--hf-ink-4)", maxWidth: 380 }}>
              Model multi-step chains like Shopify order → Stripe payment → SendGrid email. HookWise tracks the instance until every step fires.
            </div>
            <Link href="/flows/new" className="hf-btn pill">
              <Icon name="zap" size={13} /> Create flow
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {userFlows.map((flow) => {
              const steps = flow.steps as Array<{ eventType: string }>;
              const stats = statsMap.get(flow.id);
              return (
                <Link
                  key={flow.id}
                  href={`/flows/${flow.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "18px 22px",
                    background: "var(--hf-bg-3)",
                    border: "1px solid var(--hf-line)",
                    borderRadius: 14,
                    gap: 20,
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: "rgba(255,107,44,0.08)",
                      border: "1px solid rgba(255,107,44,0.22)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name="zap" size={18} color="var(--hf-accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--hf-ink)" }}>
                        {flow.name}
                      </span>
                      <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
                        {steps.length} steps · timeout {flow.timeoutMinutes}m
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      {steps.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Chip>{s.eventType}</Chip>
                          {i < steps.length - 1 && (
                            <Icon name="chevron-right" size={11} color="var(--hf-ink-4)" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {stats && (
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <MiniStat label="running" value={stats.running} color="var(--hf-accent)" />
                      <MiniStat label="done" value={stats.completed} color="#7ed98a" />
                      <MiniStat label="failed" value={stats.failed} color="#f29a9a" />
                    </div>
                  )}
                  <Icon name="chevron-right" size={14} color="var(--hf-ink-4)" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div className="hf-num" style={{ fontSize: 15, fontWeight: 500, color }}>
        {value}
      </div>
      <div className="hf-mono" style={{ fontSize: 10, color: "var(--hf-ink-4)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
