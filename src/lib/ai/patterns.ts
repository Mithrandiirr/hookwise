import { db } from "@/lib/db";
import { events, deliveries, patterns } from "@/lib/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

const EMA_ALPHA = 0.1;

interface MetricData {
  metricName: string;
  value: number;
}

function getTimeSuffix(): string {
  const hour = new Date().getUTCHours();
  return hour >= 9 && hour < 17 ? ":bh" : ":oh";
}

export async function computePatterns(integrationId: string): Promise<void> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const suffix = getTimeSuffix();

  // Aggregate metrics for the last 5-minute window
  const [eventCountResult] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, fiveMinAgo)
      )
    );

  const recentDeliveries = await db
    .select({
      responseTimeMs: deliveries.responseTimeMs,
      status: deliveries.status,
    })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(deliveries.attemptedAt, fiveMinAgo)
      )
    );

  const eventCount = eventCountResult?.count ?? 0;
  const totalDeliveries = recentDeliveries.length;
  const failedDeliveries = recentDeliveries.filter(
    (d) => d.status === "failed"
  ).length;
  const failureRate =
    totalDeliveries > 0 ? failedDeliveries / totalDeliveries : 0;

  const responseTimes = recentDeliveries
    .map((d) => d.responseTimeMs)
    .filter((t): t is number => t !== null);
  const avgResponseMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  // Event type distribution
  const eventTypes = await db
    .select({
      eventType: events.eventType,
      count: count(),
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, fiveMinAgo)
      )
    )
    .groupBy(events.eventType);

  const metrics: MetricData[] = [
    { metricName: `event_count${suffix}`, value: eventCount },
    { metricName: `avg_response_ms${suffix}`, value: avgResponseMs },
    { metricName: `failure_rate${suffix}`, value: failureRate },
    // Also store without time suffix for general baselines
    { metricName: "event_count", value: eventCount },
    { metricName: "avg_response_ms", value: avgResponseMs },
    { metricName: "failure_rate", value: failureRate },
  ];

  // Add per-event-type counts
  for (const et of eventTypes) {
    metrics.push({
      metricName: `event_type:${et.eventType}`,
      value: et.count,
    });
  }

  for (const metric of metrics) {
    await upsertPattern(integrationId, metric.metricName, metric.value);
  }
}

async function upsertPattern(
  integrationId: string,
  metricName: string,
  currentValue: number
): Promise<void> {
  const [existing] = await db
    .select()
    .from(patterns)
    .where(
      and(
        eq(patterns.integrationId, integrationId),
        eq(patterns.metricName, metricName)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(patterns).values({
      integrationId,
      metricName,
      rollingAvg: currentValue,
      rollingStddev: 0,
      sampleCount: 1,
      lastUpdated: new Date(),
    });
    return;
  }

  const newAvg =
    existing.rollingAvg * (1 - EMA_ALPHA) + currentValue * EMA_ALPHA;
  const newStddev = Math.sqrt(
    existing.rollingStddev ** 2 * (1 - EMA_ALPHA) +
      (currentValue - newAvg) ** 2 * EMA_ALPHA
  );

  await db
    .update(patterns)
    .set({
      rollingAvg: newAvg,
      rollingStddev: newStddev,
      sampleCount: existing.sampleCount + 1,
      lastUpdated: new Date(),
    })
    .where(eq(patterns.id, existing.id));
}
