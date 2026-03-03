import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerHealth, benchmarks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

type ProviderStatus = "operational" | "degraded" | "outage";

function getStatus(failureRate: number): ProviderStatus {
  if (failureRate >= 50) return "outage";
  if (failureRate >= 10) return "degraded";
  return "operational";
}

export async function GET() {
  const providers = ["stripe", "shopify", "github"] as const;

  const result: Record<string, {
    status: ProviderStatus;
    metrics: Record<string, { value: number; sampleSize: number }>;
    updatedAt: string | null;
  }> = {};

  for (const provider of providers) {
    // Get latest metrics for each metric name
    const latestMetrics = await db
      .select()
      .from(providerHealth)
      .where(eq(providerHealth.provider, provider))
      .orderBy(desc(providerHealth.measuredAt))
      .limit(10);

    // Deduplicate to latest per metric name
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

  // Get recent benchmarks
  const recentBenchmarks = await db
    .select()
    .from(benchmarks)
    .orderBy(desc(benchmarks.measuredAt))
    .limit(50);

  // Determine overall status
  const statuses = Object.values(result).map((p) => p.status);
  let overallStatus: ProviderStatus = "operational";
  if (statuses.includes("outage")) overallStatus = "outage";
  else if (statuses.includes("degraded")) overallStatus = "degraded";

  return NextResponse.json(
    {
      overallStatus,
      providers: result,
      benchmarks: recentBenchmarks,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
