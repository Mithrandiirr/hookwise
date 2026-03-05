import type { Metadata } from "next";
import { db } from "@/lib/db";
import { providerHealth, benchmarks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
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
