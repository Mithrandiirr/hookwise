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
        title="Flows"
        subtitle="multi-step event chains across providers, tracked by correlation key"
        right={
          <Link href="/flows/new" className="hw-btn hw-btn-indigo">
            <Icon name="zap" size={13} /> Create flow
          </Link>
        }
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        {userFlows.length === 0 ? (
          <section className="hw-fade-up">
            <div
              className="hw-panel flex flex-col items-center justify-center"
              style={{
                padding: "72px 24px",
                background: "var(--hw-bg-2)",
                textAlign: "center",
                gap: 14,
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "var(--hw-panel)",
                  border: "1px solid var(--hw-line)",
                }}
              >
                <Icon name="zap" size={22} color="var(--hw-ink-4)" />
              </div>
              <div style={{ fontSize: 15, color: "var(--hw-ink)" }}>
                No flows defined
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                  maxWidth: 380,
                }}
              >
                Model multi-step chains like Shopify order → Stripe payment → SendGrid email. HookWise tracks the instance until every step fires.
              </div>
              <Link href="/flows/new" className="hw-btn hw-btn-primary">
                <Icon name="zap" size={13} /> Create flow
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="hw-fade-up flex flex-col"
            style={{ gap: 12 }}
          >
            {userFlows.map((flow) => {
              const steps = flow.steps as Array<{ eventType: string }>;
              const stats = statsMap.get(flow.id);
              return (
                <Link
                  key={flow.id}
                  href={`/flows/${flow.id}`}
                  className="hw-panel flex items-center"
                  style={{
                    padding: "18px 22px",
                    background: "var(--hw-bg-2)",
                    gap: 20,
                  }}
                >
                  <div
                    className="grid place-items-center"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: "rgba(129,140,248,0.1)",
                      border: "1px solid rgba(129,140,248,0.2)",
                    }}
                  >
                    <Icon name="zap" size={18} color="var(--hw-indigo-ink)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="flex items-center flex-wrap"
                      style={{ gap: 10, marginBottom: 4 }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--hw-ink)",
                        }}
                      >
                        {flow.name}
                      </span>
                      <span
                        className="hw-mono"
                        style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                      >
                        {steps.length} steps · timeout {flow.timeoutMinutes}m
                      </span>
                    </div>
                    <div
                      className="flex items-center flex-wrap"
                      style={{ gap: 6 }}
                    >
                      {steps.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center"
                          style={{ gap: 6 }}
                        >
                          <Chip>{s.eventType}</Chip>
                          {i < steps.length - 1 && (
                            <Icon
                              name="chevron-right"
                              size={11}
                              color="var(--hw-ink-5)"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {stats && (
                    <div
                      className="flex items-center"
                      style={{ gap: 14, color: "var(--hw-ink-3)" }}
                    >
                      <MiniStat
                        label="running"
                        value={stats.running}
                        tone="indigo"
                      />
                      <MiniStat
                        label="done"
                        value={stats.completed}
                        tone="green"
                      />
                      <MiniStat
                        label="failed"
                        value={stats.failed}
                        tone="red"
                      />
                    </div>
                  )}
                  <Icon
                    name="chevron-right"
                    size={14}
                    color="var(--hw-ink-5)"
                  />
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "indigo" | "green" | "red";
}) {
  const color =
    tone === "indigo"
      ? "var(--hw-indigo-ink)"
      : tone === "green"
        ? "var(--hw-green)"
        : "var(--hw-red)";
  return (
    <div style={{ textAlign: "right" }}>
      <div
        className="hw-mono hw-num"
        style={{ fontSize: 15, fontWeight: 500, color }}
      >
        {value}
      </div>
      <div
        className="hw-mono"
        style={{ fontSize: 10, color: "var(--hw-ink-4)", marginTop: 2 }}
      >
        {label}
      </div>
    </div>
  );
}
