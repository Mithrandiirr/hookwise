export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, events, integrations } from "@/lib/db";
import { eq, desc, inArray, count } from "drizzle-orm";
import {
  Activity,
  CheckCircle,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/dashboard/pagination";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";

const PAGE_SIZE = 50;

export default async function EventsPage({
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

  const [recentEvents, totalCount] =
    integrationIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(events)
            .where(inArray(events.integrationId, integrationIds))
            .orderBy(desc(events.receivedAt))
            .limit(PAGE_SIZE)
            .offset(offset),
          db
            .select({ count: count() })
            .from(events)
            .where(inArray(events.integrationId, integrationIds)),
        ])
      : [[], [{ count: 0 }]];

  const integrationMap = Object.fromEntries(
    userIntegrations.map((i) => [i.id, i])
  );

  const total = totalCount[0].count;

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={["events"]} />
      <div className="fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">
          Events
        </h1>
        <p className="text-[var(--text-tertiary)] mt-1 text-[15px]">
          All received webhook events across your integrations
        </p>
      </div>

      <div className="glass rounded-xl overflow-hidden fade-up fade-up-1">
        {recentEvents.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-surface)] mb-4">
              <Activity className="h-6 w-6 text-[var(--text-faint)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium">No events yet</p>
            <p className="text-[var(--text-faint)] text-sm mt-1">
              Events will appear here once webhooks start arriving.
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Event Type
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Integration
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Signature
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Source
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Received
                </th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => {
                const integration = integrationMap[event.integrationId];
                return (
                  <tr
                    key={event.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 table-row-hover group"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/events/${event.id}`}
                        className="font-mono text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {event.eventType}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {integration ? (
                        <Link
                          href={`/integrations/${integration.id}`}
                          className="hover:text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                        >
                          <ProviderDot provider={integration.provider} />
                          {integration.name}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-faint)] font-mono text-[11px]">
                          {event.integrationId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {event.signatureValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <CheckCircle className="h-3 w-3" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400/70 text-[11px]">
                          <XCircle className="h-3 w-3" />
                          Invalid
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded">
                        {event.source}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-[12px] tabular-nums">
                      {formatTime(event.receivedAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/events/${event.id}`}>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-ghost)] group-hover:text-[var(--text-tertiary)] transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination currentPage={currentPage} totalItems={total} basePath="/events" pageSize={PAGE_SIZE} />
    </div>
  );
}

function ProviderDot({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    stripe: "bg-violet-400",
    shopify: "bg-green-400",
    github: "bg-[var(--text-tertiary)]",
  };
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full ${colors[provider] ?? "bg-[var(--text-faint)]"}`}
    />
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
