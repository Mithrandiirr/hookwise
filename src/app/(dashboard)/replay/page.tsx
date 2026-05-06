export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  endpoints,
  replayQueue,
  events,
} from "@/lib/db";
import { eq, desc, inArray, count } from "drizzle-orm";
import { Chip, Icon, DashTopbar, SectionHeader } from "@/components/hw";

const PAGE_SIZE = 50;

function EmptyPanel({ message }: { message: string }) {
  return (
    <div
      className="hw-panel"
      style={{
        padding: "56px 24px",
        background: "var(--hw-bg-2)",
        textAlign: "center",
        color: "var(--hw-ink-4)",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function ReplayStatus({ status }: { status: string }) {
  const map: Record<
    string,
    { tone: "amber" | "green" | "red" | "indigo" | undefined; label: string }
  > = {
    pending: { tone: "amber", label: "pending" },
    delivering: { tone: "indigo", label: "delivering" },
    delivered: { tone: "green", label: "delivered" },
    failed: { tone: "red", label: "failed" },
    skipped: { tone: undefined, label: "skipped" },
  };
  const c = map[status] ?? map.pending;
  return <Chip tone={c.tone}>{c.label}</Chip>;
}

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
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));

  const topbar = (
    <DashTopbar
      title="Replay queue"
      subtitle="events queued during circuit breaker openings, replayed on recovery"
    />
  );

  if (integrationIds.length === 0) {
    return (
      <>
        {topbar}
        <div style={{ padding: "24px 28px", flex: 1 }}>
          <EmptyPanel message="No integrations yet. Create one to start using the replay engine." />
        </div>
      </>
    );
  }

  const userEndpoints = await db
    .select()
    .from(endpoints)
    .where(inArray(endpoints.integrationId, integrationIds));

  const endpointIds = userEndpoints.map((e) => e.id);

  if (endpointIds.length === 0) {
    return (
      <>
        {topbar}
        <div style={{ padding: "24px 28px", flex: 1 }}>
          <EmptyPanel message="No endpoints configured yet." />
        </div>
      </>
    );
  }

  const replayStats = await db
    .select({
      endpointId: replayQueue.endpointId,
      status: replayQueue.status,
      count: count(),
    })
    .from(replayQueue)
    .where(inArray(replayQueue.endpointId, endpointIds))
    .groupBy(replayQueue.endpointId, replayQueue.status);

  const endpointStats: Record<
    string,
    { pending: number; delivered: number; failed: number; skipped: number }
  > = {};
  let totalPending = 0;
  let totalDelivered = 0;
  let totalFailed = 0;
  for (const row of replayStats) {
    if (!endpointStats[row.endpointId]) {
      endpointStats[row.endpointId] = {
        pending: 0,
        delivered: 0,
        failed: 0,
        skipped: 0,
      };
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
  const totalPages = Math.max(1, Math.ceil(totalReplayItems / PAGE_SIZE));

  return (
    <>
      <DashTopbar
        title="Replay queue"
        subtitle="events queued during circuit breaker openings, replayed on recovery"
        right={
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: "6px 10px",
              border: "1px solid var(--hw-line-2)",
              borderRadius: 7,
            }}
          >
            <span
              className="hw-mono"
              style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
            >
              {totalPending} pending · {totalDelivered} delivered · {totalFailed} failed
            </span>
          </div>
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
        <section
          className="hw-fade-up grid"
          style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
        >
          <Stat label="Pending" value={totalPending} tone="amber" />
          <Stat label="Delivered" value={totalDelivered} tone="green" />
          <Stat label="Failed" value={totalFailed} tone="red" />
        </section>

        {/* Per-endpoint */}
        <section className="hw-fade-up hw-fade-up-1 flex flex-col" style={{ gap: 12 }}>
          {userEndpoints.map((ep) => {
            const s = endpointStats[ep.id];
            const integ = integrationMap.get(ep.integrationId);
            if (!s) return null;
            const total = s.pending + s.delivered + s.failed + s.skipped;
            if (total === 0) return null;
            return (
              <div
                key={ep.id}
                className="hw-panel"
                style={{ padding: "16px 20px", background: "var(--hw-bg-2)" }}
              >
                <div className="flex items-center" style={{ gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--hw-ink)" }}>
                    {integ?.name ?? "—"}
                  </div>
                  <div
                    className="hw-mono"
                    style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                  >
                    {ep.url}
                  </div>
                </div>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 14,
                    marginTop: 14,
                  }}
                >
                  <MiniStat label="Pending" value={s.pending} tone="amber" />
                  <MiniStat label="Delivered" value={s.delivered} tone="green" />
                  <MiniStat label="Failed" value={s.failed} tone="red" />
                  <MiniStat label="Skipped" value={s.skipped} />
                </div>
              </div>
            );
          })}
        </section>

        {/* Recent activity */}
        <section className="hw-fade-up hw-fade-up-2">
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
              <SectionHeader title="Recent replay activity" />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
              >
                page {currentPage} / {totalPages}
              </span>
            </div>
            {recentItems.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                }}
              >
                No replay activity yet. Events are queued when a circuit breaker opens.
              </div>
            ) : (
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Event type</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Attempts</th>
                    <th>Queued</th>
                    <th>Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span
                          className="hw-mono"
                          style={{ fontSize: 12, color: "var(--hw-indigo-ink)" }}
                        >
                          {item.eventType}
                        </span>
                      </td>
                      <td>
                        <ReplayStatus status={item.status} />
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{ textAlign: "right", color: "var(--hw-ink-3)" }}
                      >
                        {item.attempts}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{ fontSize: 11.5, color: "var(--hw-ink-4)" }}
                      >
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{ fontSize: 11.5, color: "var(--hw-ink-4)" }}
                      >
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
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "red" | "indigo";
}) {
  const color =
    tone === "amber"
      ? "var(--hw-amber)"
      : tone === "green"
        ? "var(--hw-green)"
        : tone === "red"
          ? "var(--hw-red)"
          : "var(--hw-indigo-ink)";
  const iconMap: Record<typeof tone, "clock" | "check" | "x" | "activity"> = {
    amber: "clock",
    green: "check",
    red: "x",
    indigo: "activity",
  };
  return (
    <div
      className="hw-panel"
      style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="hw-label">{label}</div>
          <div
            className="hw-mono hw-num"
            style={{ fontSize: 26, fontWeight: 500, marginTop: 6, color }}
          >
            {value.toLocaleString()}
          </div>
        </div>
        <Icon name={iconMap[tone]} size={16} color={color} />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "green" | "red";
}) {
  const color =
    tone === "amber"
      ? "var(--hw-amber)"
      : tone === "green"
        ? "var(--hw-green)"
        : tone === "red"
          ? "var(--hw-red)"
          : "var(--hw-ink-3)";
  return (
    <div>
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono hw-num"
        style={{ marginTop: 4, fontSize: 15, color }}
      >
        {value}
      </div>
    </div>
  );
}
