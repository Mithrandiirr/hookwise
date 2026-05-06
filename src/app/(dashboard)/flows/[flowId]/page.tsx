export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db, flows, flowInstances, integrations } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import type { FlowInstanceStatus } from "@/types";
import { Chip, Icon, DashTopbar, SectionHeader } from "@/components/hw";

interface FlowStep {
  integrationId: string;
  eventType: string;
  correlationField: string;
}

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [flow] = await db
    .select()
    .from(flows)
    .where(and(eq(flows.id, flowId), eq(flows.userId, user.id)))
    .limit(1);
  if (!flow) notFound();

  const steps = flow.steps as FlowStep[];
  const integrationIds = [...new Set(steps.map((s) => s.integrationId))];
  const integrationRows = await Promise.all(
    integrationIds.map(async (id) => {
      const [row] = await db
        .select({
          id: integrations.id,
          name: integrations.name,
          provider: integrations.provider,
        })
        .from(integrations)
        .where(eq(integrations.id, id))
        .limit(1);
      return row;
    }),
  );
  const integrationMap = new Map(
    integrationRows.filter(Boolean).map((r) => [r!.id, r!] as const),
  );

  const instances = await db
    .select()
    .from(flowInstances)
    .where(eq(flowInstances.flowId, flowId))
    .orderBy(desc(flowInstances.startedAt))
    .limit(50);

  return (
    <>
      <DashTopbar
        title={
          <span className="flex items-center" style={{ gap: 10 }}>
            <Link
              href="/flows"
              style={{
                color: "var(--hw-ink-4)",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Flows /
            </Link>
            <span>{flow.name}</span>
          </span>
        }
        subtitle={
          <span className="hw-mono" style={{ fontSize: 12, color: "var(--hw-ink-3)" }}>
            {steps.length} steps · timeout {flow.timeoutMinutes} min
          </span>
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
        {/* Flow definition */}
        <section className="hw-fade-up">
          <div
            className="hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <SectionHeader title="Flow definition" />
            <div
              className="flex items-center flex-wrap"
              style={{ gap: 8, marginTop: 14 }}
            >
              {steps.map((s, i) => {
                const integ = integrationMap.get(s.integrationId);
                return (
                  <div
                    key={i}
                    className="flex items-center"
                    style={{ gap: 8 }}
                  >
                    <div
                      className="hw-panel flex items-center"
                      style={{
                        padding: "8px 12px",
                        background: "var(--hw-bg-3)",
                        gap: 8,
                      }}
                    >
                      <span
                        className="hw-mono"
                        style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="hw-mono"
                        style={{ fontSize: 12, color: "var(--hw-indigo-ink)" }}
                      >
                        {s.eventType}
                      </span>
                      {integ && (
                        <span
                          className="hw-mono"
                          style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                        >
                          · {integ.name}
                        </span>
                      )}
                      <span
                        className="hw-mono"
                        style={{ fontSize: 11, color: "var(--hw-ink-5)" }}
                      >
                        ({s.correlationField})
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <Icon
                        name="chevron-right"
                        size={13}
                        color="var(--hw-ink-5)"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Instances */}
        <section className="hw-fade-up hw-fade-up-1">
          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hw-line)",
              }}
            >
              <SectionHeader title="Instances" />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
              >
                {instances.length} instances
              </span>
            </div>

            {instances.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                }}
              >
                No instances yet. They appear once matching events are received.
              </div>
            ) : (
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Correlation key</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th style={{ textAlign: "right" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr key={instance.id}>
                      <td>
                        <InstanceStatus
                          status={instance.status as FlowInstanceStatus}
                        />
                      </td>
                      <td
                        className="hw-mono"
                        style={{ fontSize: 12, color: "var(--hw-ink-3)" }}
                      >
                        {instance.correlationKey}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{ fontSize: 11.5, color: "var(--hw-ink-4)" }}
                      >
                        {formatTime(instance.startedAt)}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{ fontSize: 11.5, color: "var(--hw-ink-4)" }}
                      >
                        {instance.completedAt
                          ? formatTime(instance.completedAt)
                          : "—"}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{
                          textAlign: "right",
                          fontSize: 12,
                          color: "var(--hw-ink-2)",
                        }}
                      >
                        {instance.completedAt
                          ? formatDuration(instance.startedAt, instance.completedAt)
                          : instance.status === "running"
                            ? formatDuration(instance.startedAt, new Date())
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function InstanceStatus({ status }: { status: FlowInstanceStatus }) {
  const map: Record<
    FlowInstanceStatus,
    { tone: "green" | "amber" | "red" | "indigo"; label: string }
  > = {
    running: { tone: "indigo", label: "running" },
    completed: { tone: "green", label: "completed" },
    failed: { tone: "red", label: "failed" },
    timed_out: { tone: "amber", label: "timed out" },
  };
  const c = map[status] ?? map.running;
  return <Chip tone={c.tone}>{c.label}</Chip>;
}

function formatTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(start: Date, end: Date) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
