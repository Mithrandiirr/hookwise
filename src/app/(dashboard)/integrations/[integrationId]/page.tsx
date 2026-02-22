export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  endpoints,
  events,
  replayQueue,
  anomalies,
  reconciliationRuns,
} from "@/lib/db";
import { eq, and, desc, count, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ArrowUpRight,
  Gauge,
  Timer,
  RotateCcw,
  Radio,
} from "lucide-react";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ integrationId: string }>;
}) {
  const { integrationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, user.id)
      )
    )
    .limit(1);

  if (!integration) notFound();

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integrationId))
    .limit(1);

  const recentEvents = await db
    .select()
    .from(events)
    .where(eq(events.integrationId, integrationId))
    .orderBy(desc(events.receivedAt))
    .limit(20);

  const pendingReplayCount = endpoint
    ? await db
        .select({ count: count() })
        .from(replayQueue)
        .where(
          and(
            eq(replayQueue.endpointId, endpoint.id),
            eq(replayQueue.status, "pending")
          )
        )
    : [{ count: 0 }];

  // Fetch recent anomalies for this integration
  const recentAnomalies = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.integrationId, integrationId))
    .orderBy(desc(anomalies.detectedAt))
    .limit(5);

  // Fetch last reconciliation run
  const [lastReconRun] = await db
    .select()
    .from(reconciliationRuns)
    .where(eq(reconciliationRuns.integrationId, integrationId))
    .orderBy(desc(reconciliationRuns.ranAt))
    .limit(1);

  const providerColors: Record<string, string> = {
    stripe: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    shopify: "text-green-400 bg-green-500/10 border-green-500/20",
    github: "text-white/60 bg-white/5 border-white/10",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 fade-up">
        <Link
          href="/integrations"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/[0.1] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-white">
              {integration.name}
            </h1>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${
                providerColors[integration.provider] ?? providerColors.github
              }`}
            >
              {integration.provider}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                integration.status === "active"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  integration.status === "active"
                    ? "bg-emerald-400 glow-green"
                    : "bg-red-400 glow-red"
                }`}
              />
              {integration.status}
            </span>
          </div>
        </div>
      </div>

      {/* Config Panel */}
      <div className="glass rounded-xl p-6 fade-up fade-up-1">
        <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-[0.08em] mb-4">
          Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ConfigItem
            label="Ingest URL"
            value={`/api/ingest/${integration.id}`}
            mono
          />
          <ConfigItem
            label="Destination"
            value={integration.destinationUrl}
            mono
          />
          <ConfigItem
            label="Created"
            value={new Date(integration.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <ConfigItem
            label="Signing Secret"
            value={"*".repeat(24)}
            mono
            masked
          />
        </div>
      </div>

      {/* Endpoint Health */}
      {endpoint && (
        <div className="fade-up fade-up-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 rounded-full bg-indigo-500" />
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              Endpoint Health
            </h2>
          </div>

          {/* Health Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <HealthMetric
              label="Circuit State"
              icon={<Radio className="h-3.5 w-3.5" />}
            >
              <CircuitBadgeLarge state={endpoint.circuitState} />
            </HealthMetric>
            <HealthMetric
              label="Success Rate"
              icon={<Gauge className="h-3.5 w-3.5" />}
            >
              <span className="text-2xl font-bold text-white tabular-nums">
                {endpoint.successRate.toFixed(1)}
                <span className="text-white/20 text-sm ml-0.5">%</span>
              </span>
            </HealthMetric>
            <HealthMetric
              label="Avg Response"
              icon={<Timer className="h-3.5 w-3.5" />}
            >
              <span className="text-2xl font-bold text-white tabular-nums">
                {endpoint.avgResponseMs.toFixed(0)}
                <span className="text-white/20 text-sm ml-0.5">ms</span>
              </span>
            </HealthMetric>
            <HealthMetric
              label="Replay Queue"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              <span className="text-2xl font-bold text-white tabular-nums">
                {pendingReplayCount[0].count}
              </span>
            </HealthMetric>
          </div>

          {/* Open circuit warning */}
          {endpoint.circuitState === "open" && (
            <div className="glass rounded-xl p-4 flex items-start gap-3 border-red-500/10 bg-red-500/[0.03]">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0 animate-pulse-glow" />
              <div>
                <p className="text-[13px] text-red-400 font-medium">
                  Circuit is open — deliveries are queued
                </p>
                <p className="text-[12px] text-white/25 mt-1">
                  Health checks run every minute. After 3 consecutive successes
                  the circuit transitions to half-open and queued events replay
                  automatically.
                  {endpoint.lastHealthCheck && (
                    <span className="ml-2 text-white/15">
                      Last check:{" "}
                      {new Date(endpoint.lastHealthCheck).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Anomalies */}
      {recentAnomalies.length > 0 && (
        <div className="fade-up fade-up-3">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              Recent Anomalies
            </h2>
            <Link
              href="/anomalies"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 ml-auto transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentAnomalies.map((anomaly) => {
              let diagnosis: { what?: string } = {};
              try { diagnosis = JSON.parse(anomaly.diagnosis ?? "{}"); } catch { /* noop */ }
              return (
                <Link
                  key={anomaly.id}
                  href={`/anomalies/${anomaly.id}`}
                  className="glass rounded-xl p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all block"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      anomaly.resolvedAt
                        ? "bg-white/10"
                        : anomaly.severity === "critical"
                          ? "bg-red-400 glow-red"
                          : anomaly.severity === "high"
                            ? "bg-red-400"
                            : "bg-amber-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-white/50 line-clamp-1">
                      {diagnosis.what ?? anomaly.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/15 shrink-0 tabular-nums">
                    {new Date(anomaly.detectedAt).toLocaleDateString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Reconciliation Config */}
      <div className="fade-up fade-up-4">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-emerald-500" />
          <h2 className="text-[15px] font-semibold text-white tracking-tight">
            Reconciliation
          </h2>
        </div>
        {integration.provider === "github" ? (
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-white/30 text-[13px]">
              GitHub does not provide a reconciliation API.
            </p>
          </div>
        ) : integration.apiKeyEncrypted ? (
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Enabled
              </span>
              <span className="text-[11px] text-white/20">
                Runs every 5 minutes
              </span>
            </div>
            {lastReconRun ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">Last Run</p>
                  <p className="text-[13px] text-white/50 tabular-nums">
                    {new Date(lastReconRun.ranAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">Provider Events</p>
                  <p className="text-[13px] text-white font-medium tabular-nums">{lastReconRun.providerEventsFound}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">Gaps Found</p>
                  <p className="text-[13px] text-amber-400 font-medium tabular-nums">{lastReconRun.gapsDetected}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">Gaps Resolved</p>
                  <p className="text-[13px] text-emerald-400 font-medium tabular-nums">{lastReconRun.gapsResolved}</p>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-white/20">
                No reconciliation runs yet. The first run will happen within 5 minutes.
              </p>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl p-5">
            <p className="text-[13px] text-white/40 mb-2">
              Provide your {integration.provider === "stripe" ? "Stripe secret key" : "Shopify API key"} to
              enable automatic event reconciliation. HookWise will detect webhook gaps and
              recover missing events via the provider API.
            </p>
            <p className="text-[11px] text-white/15">
              Configure via the Settings page or API. Keys are encrypted at rest.
            </p>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="fade-up fade-up-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-white tracking-tight">
            Recent Events
          </h2>
          <span className="text-[11px] text-white/20 ml-auto">
            {recentEvents.length} events
          </span>
        </div>
        <div className="glass rounded-xl overflow-hidden">
          {recentEvents.length === 0 ? (
            <div className="p-16 text-center">
              <Activity className="mx-auto h-8 w-8 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">No events yet</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Event Type
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Signature
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Source
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
                    Received
                  </th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-white/[0.04] last:border-0 table-row-hover group"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/events/${event.id}`}
                        className="font-mono text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {event.eventType}
                      </Link>
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
                      <span className="text-[11px] text-white/25 bg-white/[0.03] px-2 py-0.5 rounded">
                        {event.source}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-white/25 text-[12px] tabular-nums">
                      {new Date(event.receivedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/events/${event.id}`}>
                        <ArrowUpRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigItem({
  label,
  value,
  mono,
  masked,
}: {
  label: string;
  value: string;
  mono?: boolean;
  masked?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/25 mb-1.5">
        {label}
      </p>
      <p
        className={`text-[13px] break-all ${mono ? "font-mono text-[12px]" : ""} ${
          masked ? "text-white/15" : "text-white/60"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function HealthMetric({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-white/20">{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

function CircuitBadgeLarge({ state }: { state: string }) {
  const config: Record<
    string,
    { label: string; color: string; dot: string; glow: string }
  > = {
    closed: {
      label: "Healthy",
      color: "text-emerald-400",
      dot: "bg-emerald-400",
      glow: "glow-green",
    },
    half_open: {
      label: "Degraded",
      color: "text-amber-400",
      dot: "bg-amber-400",
      glow: "glow-amber",
    },
    open: {
      label: "Down",
      color: "text-red-400",
      dot: "bg-red-400",
      glow: "glow-red animate-pulse-glow",
    },
  };
  const { label, color, dot, glow } = config[state] ?? config.closed;
  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dot} ${glow}`} />
      <span className="text-lg font-bold">{label}</span>
    </div>
  );
}
