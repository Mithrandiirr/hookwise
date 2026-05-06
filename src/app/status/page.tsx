import type { Metadata } from "next";
import { db } from "@/lib/db";
import { providerHealth, benchmarks, anomalies, integrations } from "@/lib/db/schema";
import { desc, eq, gte, and, count, sql } from "drizzle-orm";
import { StatusClient } from "./status-client";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";

export const metadata: Metadata = {
  title: "HookWise Status — Provider Health Dashboard",
  description:
    "Real-time webhook provider health status for Stripe, Shopify, and GitHub. Monitor latency, failure rates, and event volumes across the HookWise network.",
  openGraph: {
    title: "HookWise Status — Provider Health Dashboard",
    description:
      "Real-time webhook provider health status across the HookWise network.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 60;

type ProviderStatus = "operational" | "degraded" | "outage";

function getStatus(failureRate: number): ProviderStatus {
  if (failureRate >= 50) return "outage";
  if (failureRate >= 10) return "degraded";
  return "operational";
}

export type StatusProviderData = {
  status: ProviderStatus;
  metrics: Record<string, { value: number; sampleSize: number }>;
  updatedAt: string | null;
};

export type IncidentEntry = {
  time: string;
  provider: string;
  status: ProviderStatus;
  failureRate: number;
};

export type StatusData = {
  overallStatus: ProviderStatus;
  providers: Record<string, StatusProviderData>;
  benchmarks: Array<{
    provider: string;
    eventType: string;
    p50Latency: number;
    p95Latency: number;
    failureRate: number;
    sampleSize: number;
  }>;
  incidents: IncidentEntry[];
  networkStats: {
    totalProviders: number;
    totalEventsProcessed: number;
    uptimePercent: number;
  };
  generatedAt: string;
};

async function getStatusData(): Promise<StatusData> {
  const providers = ["stripe", "shopify", "github"] as const;
  const result: Record<string, StatusProviderData> = {};

  for (const provider of providers) {
    const latestMetrics = await db
      .select()
      .from(providerHealth)
      .where(eq(providerHealth.provider, provider))
      .orderBy(desc(providerHealth.measuredAt))
      .limit(10);

    const metricMap: Record<string, { value: number; sampleSize: number }> = {};
    let latestTime: Date | null = null;
    const seen = new Set<string>();

    for (const m of latestMetrics) {
      if (!seen.has(m.metricName)) {
        seen.add(m.metricName);
        metricMap[m.metricName] = { value: m.value, sampleSize: m.sampleSize };
        if (!latestTime || m.measuredAt > latestTime) {
          latestTime = m.measuredAt;
        }
      }
    }

    const failureRate = metricMap["failure_rate"]?.value ?? 0;
    result[provider] = {
      status: getStatus(failureRate),
      metrics: metricMap,
      updatedAt: latestTime?.toISOString() ?? null,
    };
  }

  const recentBenchmarks = await db
    .select()
    .from(benchmarks)
    .orderBy(desc(benchmarks.measuredAt))
    .limit(50);

  const statuses = Object.values(result).map((p) => p.status);
  let overallStatus: ProviderStatus = "operational";
  if (statuses.includes("outage")) overallStatus = "outage";
  else if (statuses.includes("degraded")) overallStatus = "degraded";

  // Build incident timeline from health snapshots with elevated failure rates
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const healthHistory = await db
    .select()
    .from(providerHealth)
    .where(
      and(
        eq(providerHealth.metricName, "failure_rate"),
        gte(providerHealth.measuredAt, twentyFourHoursAgo)
      )
    )
    .orderBy(desc(providerHealth.measuredAt))
    .limit(200);

  const incidents: IncidentEntry[] = healthHistory
    .filter((h) => h.value >= 10)
    .map((h) => ({
      time: h.measuredAt.toISOString(),
      provider: h.provider,
      status: getStatus(h.value),
      failureRate: h.value,
    }));

  // Network stats
  const [totalEvents] = await db
    .select({ count: count() })
    .from(
      db.select({ id: sql`1` }).from(providerHealth).as("ph")
    );

  const allFailureRates = healthHistory.map((h) => h.value);
  const avgFailureRate =
    allFailureRates.length > 0
      ? allFailureRates.reduce((s, v) => s + v, 0) / allFailureRates.length
      : 0;

  return {
    overallStatus,
    providers: result,
    benchmarks: recentBenchmarks.map((b) => ({
      provider: b.provider,
      eventType: b.eventType,
      p50Latency: b.p50Latency,
      p95Latency: b.p95Latency,
      failureRate: b.failureRate,
      sampleSize: b.sampleSize,
    })),
    incidents,
    networkStats: {
      totalProviders: providers.length,
      totalEventsProcessed: totalEvents?.count ?? 0,
      uptimePercent: Math.round((100 - avgFailureRate) * 100) / 100,
    },
    generatedAt: new Date().toISOString(),
  };
}

export default async function StatusPage() {
  const data = await getStatusData();
  return (
    <>
      <RealtimeRefresh tables={["provider_health"]} />
      <StatusClient initialData={data} />
    </>
  );
}
