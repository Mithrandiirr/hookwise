export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  endpoints,
  replayQueue,
  events,
} from "@/lib/db";
import { eq, and, desc, inArray, count, sql } from "drizzle-orm";
import { RotateCcw, Inbox, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/dashboard/pagination";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";

const PAGE_SIZE = 50;

export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, name: integrations.name, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const integrationMap = Object.fromEntries(
    userIntegrations.map((i) => [i.id, i])
  );

  if (integrationIds.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState message="No integrations found. Create an integration to start using the replay engine." />
      </div>
    );
  }

  // Fetch all endpoints for user's integrations
  const userEndpoints = await db
    .select()
    .from(endpoints)
    .where(inArray(endpoints.integrationId, integrationIds));

  const endpointIds = userEndpoints.map((e) => e.id);
  const endpointMap = Object.fromEntries(
    userEndpoints.map((e) => [e.id, e])
  );

  if (endpointIds.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState message="No endpoints configured yet." />
      </div>
    );
  }

  // Aggregate replay stats per endpoint
  const replayStats = await db
    .select({
      endpointId: replayQueue.endpointId,
      status: replayQueue.status,
      count: count(),
    })
    .from(replayQueue)
    .where(inArray(replayQueue.endpointId, endpointIds))
    .groupBy(replayQueue.endpointId, replayQueue.status);

  // Build per-endpoint stats
  const endpointStats: Record<string, { pending: number; delivered: number; failed: number; skipped: number }> = {};
  let totalPending = 0;
  let totalDelivered = 0;
  let totalFailed = 0;

  for (const row of replayStats) {
    if (!endpointStats[row.endpointId]) {
      endpointStats[row.endpointId] = { pending: 0, delivered: 0, failed: 0, skipped: 0 };
    }
    const stats = endpointStats[row.endpointId];
    if (row.status === "pending" || row.status === "delivering") {
      stats.pending += row.count;
      totalPending += row.count;
    } else if (row.status === "delivered") {
      stats.delivered += row.count;
      totalDelivered += row.count;
    } else if (row.status === "failed") {
      stats.failed += row.count;
      totalFailed += row.count;
    } else if (row.status === "skipped") {
      stats.skipped += row.count;
    }
  }

  // Recent replay items (paginated) joined with events
  const [recentItems, replayTotal] = await Promise.all([
    db
      .select({
        id: replayQueue.id,
        endpointId: replayQueue.endpointId,
        eventId: replayQueue.eventId,
        status: replayQueue.status,
        attempts: replayQueue.attempts,
        createdAt: replayQueue.createdAt,
        deliveredAt: replayQueue.deliveredAt,
        eventType: events.eventType,
      })
      .from(replayQueue)
      .innerJoin(events, eq(replayQueue.eventId, events.id))
      .where(inArray(replayQueue.endpointId, endpointIds))
      .orderBy(desc(replayQueue.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: count() })
      .from(replayQueue)
      .where(inArray(replayQueue.endpointId, endpointIds)),
  ]);
  const totalReplayItems = replayTotal[0].count;

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={["replay_queue"]} />
      <Header />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up">
        <StatCard
          label="Pending"
          value={totalPending}
          icon={<Clock className="h-4 w-4" />}
          color="text-amber-400"
        />
        <StatCard
          label="Delivered"
          value={totalDelivered}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-emerald-400"
        />
        <StatCard
          label="Failed"
          value={totalFailed}
          icon={<XCircle className="h-4 w-4" />}
          color="text-red-400"
        />
      </div>

      {/* Per-endpoint sections */}
      {userEndpoints.map((ep) => {
        const stats = endpointStats[ep.id];
        const integration = integrationMap[ep.integrationId];
        if (!stats) return null;
        const total = stats.pending + stats.delivered + stats.failed + stats.skipped;
        if (total === 0) return null;
        return (
          <div key={ep.id} className="fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-indigo-500" />
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                {integration?.name ?? "Unknown"}{" "}
                <span className="text-[var(--text-faint)] font-normal">— {ep.url}</span>
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <MiniStat label="Pending" value={stats.pending} color="text-amber-400" />
              <MiniStat label="Delivered" value={stats.delivered} color="text-emerald-400" />
              <MiniStat label="Failed" value={stats.failed} color="text-red-400" />
              <MiniStat label="Skipped" value={stats.skipped} color="text-[var(--text-tertiary)]" />
            </div>
          </div>
        );
      })}

      {/* Recent activity table */}
      <div className="fade-up">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
            Recent Replay Activity
          </h2>
          <span className="text-[11px] text-[var(--text-faint)] ml-auto">
            {recentItems.length} items
          </span>
        </div>
        <div className="glass rounded-xl overflow-hidden">
          {recentItems.length === 0 ? (
            <EmptyState message="No replay activity yet. Events are queued when a circuit breaker opens." />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Event Type
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Attempts
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Queued
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Delivered
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 table-row-hover"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[12px] text-indigo-400">
                        {item.eventType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ReplayStatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-tertiary)] tabular-nums">
                      {item.attempts}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-[12px] tabular-nums">
                      {new Date(item.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-[12px] tabular-nums">
                      {item.deliveredAt
                        ? new Date(item.deliveredAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalItems={totalReplayItems} basePath="/replay" pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 fade-up">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <RotateCcw className="h-4.5 w-4.5 text-indigo-400" />
      </div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
          Replay Queue
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          Events queued during circuit breaker openings, replayed automatically on recovery.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-1.5 mb-3">
        <span className={color}>{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass rounded-lg p-3">
      <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[15px] font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass rounded-xl p-16 text-center">
      <Inbox className="mx-auto h-8 w-8 text-[var(--text-ghost)] mb-3" />
      <p className="text-[var(--text-tertiary)] text-sm">{message}</p>
    </div>
  );
}

function ReplayStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "text-amber-400 bg-amber-500/10" },
    delivering: { label: "Delivering", className: "text-blue-400 bg-blue-500/10" },
    delivered: { label: "Delivered", className: "text-emerald-400 bg-emerald-500/10" },
    failed: { label: "Failed", className: "text-red-400 bg-red-500/10" },
    skipped: { label: "Skipped", className: "text-[var(--text-tertiary)] bg-[var(--bg-surface)]" },
  };
  const { label, className } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}
