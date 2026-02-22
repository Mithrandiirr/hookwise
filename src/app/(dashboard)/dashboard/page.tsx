export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, events, deliveries, endpoints, anomalies } from "@/lib/db";
import { eq, desc, count, and, gte, inArray, isNull } from "drizzle-orm";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Plug,
  Zap,
  ArrowUpRight,
  Clock,
  XOctagon,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));

  const integrationIds = userIntegrations.map((i) => i.id);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [eventsCount, failedCount, userEndpoints, anomalyCount] = await Promise.all([
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, oneHourAgo)
            )
          )
      : Promise.resolve([{ count: 0 }]),
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(deliveries)
          .innerJoin(events, eq(deliveries.eventId, events.id))
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              eq(deliveries.status, "failed"),
              gte(deliveries.attemptedAt, oneHourAgo)
            )
          )
      : Promise.resolve([{ count: 0 }]),
    integrationIds.length > 0
      ? db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({ count: count() })
          .from(anomalies)
          .where(
            and(
              inArray(anomalies.integrationId, integrationIds),
              isNull(anomalies.resolvedAt)
            )
          )
      : Promise.resolve([{ count: 0 }]),
  ]);

  const stats = {
    integrations: userIntegrations.length,
    activeIntegrations: userIntegrations.filter((i) => i.status === "active")
      .length,
    eventsLastHour: eventsCount[0].count,
    failedLastHour: failedCount[0].count,
    activeAnomalies: anomalyCount[0].count,
  };

  const endpointMap = Object.fromEntries(
    userEndpoints.map((e) => [e.integrationId, e])
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-white">
          Overview
        </h1>
        <p className="text-white/40 mt-1 text-[15px]">
          Webhook intelligence command center
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Integrations"
          value={stats.integrations}
          icon={<Plug className="h-4 w-4" />}
          glowClass="glow-blue"
          iconBg="bg-blue-500/10 text-blue-400"
          delay="fade-up fade-up-1"
        />
        <StatCard
          label="Active"
          value={stats.activeIntegrations}
          icon={<Zap className="h-4 w-4" />}
          glowClass="glow-green"
          iconBg="bg-emerald-500/10 text-emerald-400"
          delay="fade-up fade-up-2"
        />
        <StatCard
          label="Events (1h)"
          value={stats.eventsLastHour}
          icon={<Activity className="h-4 w-4" />}
          glowClass=""
          iconBg="bg-indigo-500/10 text-indigo-400"
          delay="fade-up fade-up-3"
        />
        <StatCard
          label="Failed (1h)"
          value={stats.failedLastHour}
          icon={<XOctagon className="h-4 w-4" />}
          glowClass={stats.failedLastHour > 0 ? "glow-red" : ""}
          iconBg={
            stats.failedLastHour > 0
              ? "bg-red-500/10 text-red-400"
              : "bg-white/5 text-white/30"
          }
          alert={stats.failedLastHour > 0}
          delay="fade-up fade-up-4"
        />
        <StatCard
          label="Anomalies"
          value={stats.activeAnomalies}
          icon={<AlertTriangle className="h-4 w-4" />}
          glowClass={stats.activeAnomalies > 0 ? "glow-amber" : ""}
          iconBg={
            stats.activeAnomalies > 0
              ? "bg-amber-500/10 text-amber-400"
              : "bg-white/5 text-white/30"
          }
          alert={stats.activeAnomalies > 0}
          delay="fade-up fade-up-5"
        />
      </div>

      {/* Endpoint Health */}
      {userEndpoints.length > 0 && (
        <div className="fade-up fade-up-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 rounded-full bg-indigo-500" />
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              Endpoint Health
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userIntegrations.map((integration) => {
              const endpoint = endpointMap[integration.id];
              if (!endpoint) return null;
              return (
                <Link
                  key={integration.id}
                  href={`/integrations/${integration.id}`}
                  className="group glass rounded-xl p-5 transition-all duration-200 hover:border-white/[0.12]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <ProviderIcon provider={integration.provider} />
                      <span className="text-white font-medium text-[13px]">
                        {integration.name}
                      </span>
                    </div>
                    <CircuitBadge state={endpoint.circuitState} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/25 mb-1">
                        Success Rate
                      </p>
                      <p className="text-lg font-semibold text-white tabular-nums">
                        {endpoint.successRate.toFixed(1)}
                        <span className="text-white/30 text-sm">%</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/25 mb-1">
                        Avg Response
                      </p>
                      <p className="text-lg font-semibold text-white tabular-nums">
                        {endpoint.avgResponseMs.toFixed(0)}
                        <span className="text-white/30 text-sm">ms</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                    <span className="text-[11px] text-white/20">
                      View details
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Integrations Table */}
      <div className="fade-up fade-up-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-white tracking-tight">
            Integrations
          </h2>
        </div>
        {userIntegrations.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] mb-4">
              <Plug className="h-6 w-6 text-white/20" />
            </div>
            <p className="text-white/50 font-medium text-[15px]">
              No integrations yet
            </p>
            <p className="text-white/20 text-sm mt-1 max-w-sm mx-auto">
              Add your first integration to start receiving and monitoring
              webhooks.
            </p>
            <Link
              href="/integrations"
              className="mt-5 inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
            >
              Add integration
            </Link>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Provider
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Health
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Ingest URL
                  </th>
                </tr>
              </thead>
              <tbody>
                {userIntegrations.map((integration) => {
                  const endpoint = endpointMap[integration.id];
                  return (
                    <tr
                      key={integration.id}
                      className="border-b border-white/[0.04] last:border-0 table-row-hover"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/integrations/${integration.id}`}
                          className="font-medium text-white hover:text-indigo-400 transition-colors"
                        >
                          {integration.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <ProviderIcon provider={integration.provider} />
                          <span className="text-white/50 capitalize">
                            {integration.provider}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={integration.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {endpoint ? (
                          <CircuitBadge state={endpoint.circuitState} />
                        ) : (
                          <span className="text-white/15 text-xs">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-white/25">
                        /api/ingest/{integration.id}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  glowClass,
  iconBg,
  alert,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  glowClass: string;
  iconBg: string;
  alert?: boolean;
  delay: string;
}) {
  return (
    <div className={`glass rounded-xl p-5 ${delay}`}>
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBg} ${glowClass}`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
          {label}
        </span>
      </div>
      <p
        className={`text-3xl font-bold tabular-nums stat-value ${
          alert ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CircuitBadge({ state }: { state: string }) {
  const config: Record<
    string,
    { label: string; dot: string; text: string; glow: string }
  > = {
    closed: {
      label: "Healthy",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      glow: "glow-green",
    },
    half_open: {
      label: "Degraded",
      dot: "bg-amber-400",
      text: "text-amber-400",
      glow: "glow-amber",
    },
    open: {
      label: "Down",
      dot: "bg-red-400",
      text: "text-red-400",
      glow: "glow-red animate-pulse-glow",
    },
  };
  const { label, dot, text, glow } = config[state] ?? config.closed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${glow}`} />
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "text-emerald-400 bg-emerald-500/10",
    paused: "text-amber-400 bg-amber-500/10",
    error: "text-red-400 bg-red-500/10",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
        styles[status] ?? styles.error
      }`}
    >
      {status}
    </span>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    stripe: "text-violet-400 bg-violet-500/10",
    shopify: "text-green-400 bg-green-500/10",
    github: "text-white/60 bg-white/5",
  };
  const labels: Record<string, string> = {
    stripe: "S",
    shopify: "Sh",
    github: "GH",
  };
  return (
    <div
      className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${
        colors[provider] ?? colors.github
      }`}
    >
      {labels[provider] ?? "?"}
    </div>
  );
}
