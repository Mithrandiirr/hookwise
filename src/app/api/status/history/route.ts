import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerHealth } from "@/lib/db/schema";
import { gte, desc } from "drizzle-orm";

export async function GET() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const records = await db
    .select()
    .from(providerHealth)
    .where(gte(providerHealth.measuredAt, twentyFourHoursAgo))
    .orderBy(desc(providerHealth.measuredAt))
    .limit(500);

  // Group by provider
  const grouped: Record<
    string,
    Array<{ metricName: string; value: number; sampleSize: number; measuredAt: string }>
  > = {};

  for (const record of records) {
    if (!grouped[record.provider]) {
      grouped[record.provider] = [];
    }
    grouped[record.provider].push({
      metricName: record.metricName,
      value: record.value,
      sampleSize: record.sampleSize,
      measuredAt: record.measuredAt.toISOString(),
    });
  }

  const result = Object.entries(grouped).map(([provider, timeline]) => ({
    provider,
    timeline,
  }));

  return NextResponse.json(result);
}
