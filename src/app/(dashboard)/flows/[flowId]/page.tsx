export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, flows, flowInstances, integrations } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { FlowDiagram } from "@/components/dashboard/flow-diagram";
import type { FlowInstanceStatus } from "@/types";

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

  // Fetch integration names for the diagram
  const integrationIds = [...new Set(steps.map((s) => s.integrationId))];
  const integrationRows = await Promise.all(
    integrationIds.map(async (id) => {
      const [row] = await db
        .select({ id: integrations.id, name: integrations.name })
        .from(integrations)
        .where(eq(integrations.id, id))
        .limit(1);
      return row;
    })
  );
  const integrationNames = Object.fromEntries(
    integrationRows.filter(Boolean).map((r) => [r!.id, r!.name])
  );

  // Fetch flow instances
  const instances = await db
    .select()
    .from(flowInstances)
    .where(eq(flowInstances.flowId, flowId))
    .orderBy(desc(flowInstances.startedAt))
    .limit(50);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 fade-up">
        <Link
          href="/flows"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            {flow.name}
          </h1>
          <p className="text-[var(--text-tertiary)] text-[13px] mt-0.5">
            {steps.length} steps &middot; Timeout: {flow.timeoutMinutes} minutes
          </p>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="glass rounded-xl p-5 fade-up fade-up-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
          Flow Definition
        </h2>
        <FlowDiagram
          steps={steps}
          integrationNames={integrationNames}
          completedSteps={steps.length}
          status="completed"
        />
      </div>

      {/* Instances */}
      <div className="fade-up fade-up-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
            Instances
          </h2>
          <span className="text-[11px] text-[var(--text-faint)] ml-auto">
            {instances.length} instances
          </span>
        </div>

        {instances.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <Clock className="mx-auto h-8 w-8 text-[var(--text-ghost)] mb-3" />
            <p className="text-[var(--text-tertiary)] text-sm">No instances yet</p>
            <p className="text-[var(--text-ghost)] text-[12px] mt-1">
              Instances will appear once matching events are received.
            </p>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Correlation Key
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Started
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Completed
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {instances.map((instance) => (
                  <tr
                    key={instance.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 table-row-hover"
                  >
                    <td className="px-5 py-3.5">
                      <InstanceStatusBadge
                        status={instance.status as FlowInstanceStatus}
                      />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--text-tertiary)]">
                      {instance.correlationKey}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-[12px] tabular-nums">
                      {formatTime(instance.startedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-[12px] tabular-nums">
                      {instance.completedAt
                        ? formatTime(instance.completedAt)
                        : "--"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-[12px] tabular-nums">
                      {instance.completedAt
                        ? formatDuration(instance.startedAt, instance.completedAt)
                        : instance.status === "running"
                          ? formatDuration(instance.startedAt, new Date())
                          : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InstanceStatusBadge({ status }: { status: FlowInstanceStatus }) {
  const config: Record<
    FlowInstanceStatus,
    { icon: React.ReactNode; label: string; classes: string }
  > = {
    running: {
      icon: <Clock className="h-3 w-3" />,
      label: "Running",
      classes: "text-indigo-400 bg-indigo-500/10",
    },
    completed: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Completed",
      classes: "text-emerald-400 bg-emerald-500/10",
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Failed",
      classes: "text-red-400 bg-red-500/10",
    },
    timed_out: {
      icon: <AlertTriangle className="h-3 w-3" />,
      label: "Timed out",
      classes: "text-amber-400 bg-amber-500/10",
    },
  };

  const { icon, label, classes } = config[status] ?? config.running;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {icon}
      {label}
    </span>
  );
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
