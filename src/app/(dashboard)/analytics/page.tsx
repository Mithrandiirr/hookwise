export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  events,
  deliveries,
  integrations,
  anomalies,
  reconciliationRuns,
  idempotencyLog,
} from "@/lib/db/schema";
import {
  eq,
  desc,
  and,
  gte,
  inArray,
  count,
  sql,
  avg,
} from "drizzle-orm";
import { AnalyticsClient } from "./analytics-client";

function getPeriodStart(period: string): Date {
  const now = Date.now();
  switch (period) {
    case "1h":
      return new Date(now - 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now - 24 * 60 * 60 * 1000);
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = periodParam ?? "24h";
  const since = getPeriodStart(period);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, name: integrations.name, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  if (integrationIds.length === 0) {
    return (
      <AnalyticsClient
        period={period}
        stats={{
          eventVolume: 0,
          deliverySuccessRate: 0,
          avgResponseMs: 0,
          failedDeliveries: 0,
          anomaliesDetected: 0,
          eventsReconciled: 0,
          deduplicated: 0,
        }}
        topEventTypes={[]}
        hourlyVolume={[]}
      />
    );
  }

  // Event volume
  const [eventVolume] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    );

  // Delivery stats
  const eventIds = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    );

  const eventIdList = eventIds.map((e) => e.id);

  let deliveredCount = 0;
  let failedCount = 0;
  let totalDeliveries = 0;
  let avgMs = 0;

  if (eventIdList.length > 0) {
    const [delivered] = await db
      .select({ count: count() })
      .from(deliveries)
      .where(
        and(
          inArray(deliveries.eventId, eventIdList),
          eq(deliveries.status, "delivered")
        )
      );

    const [failed] = await db
      .select({ count: count() })
      .from(deliveries)
      .where(
        and(
          inArray(deliveries.eventId, eventIdList),
          eq(deliveries.status, "failed")
        )
      );

    const [total] = await db
      .select({ count: count() })
      .from(deliveries)
      .where(inArray(deliveries.eventId, eventIdList));

    const [avgResp] = await db
      .select({ avg: avg(deliveries.responseTimeMs) })
      .from(deliveries)
      .where(inArray(deliveries.eventId, eventIdList));

    deliveredCount = delivered.count;
    failedCount = failed.count;
    totalDeliveries = total.count;
    avgMs = Number(avgResp.avg) || 0;
  }

  const deliverySuccessRate =
    totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 100;

  // Anomalies
  const [anomalyCount] = await db
    .select({ count: count() })
    .from(anomalies)
    .where(
      and(
        inArray(anomalies.integrationId, integrationIds),
        gte(anomalies.detectedAt, since)
      )
    );

  // Reconciled events
  const reconRuns = await db
    .select({ gapsResolved: reconciliationRuns.gapsResolved })
    .from(reconciliationRuns)
    .where(
      and(
        inArray(reconciliationRuns.integrationId, integrationIds),
        gte(reconciliationRuns.ranAt, since)
      )
    );

  const eventsReconciled = reconRuns.reduce((sum, r) => sum + r.gapsResolved, 0);

  // Deduplicated events
  const [dedupCount] = await db
    .select({ count: count() })
    .from(idempotencyLog)
    .where(
      and(
        inArray(idempotencyLog.integrationId, integrationIds),
        gte(idempotencyLog.firstSeenAt, since)
      )
    );

  // Top event types
  const topEventTypes = await db
    .select({
      eventType: events.eventType,
      count: count(),
    })
    .from(events)
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    )
    .groupBy(events.eventType)
    .orderBy(desc(count()))
    .limit(10);

  // Hourly volume
  const hourlyVolume = await db
    .select({
      hour: sql<string>`date_trunc('hour', ${events.receivedAt})::text`,
      count: count(),
    })
    .from(events)
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    )
    .groupBy(sql`date_trunc('hour', ${events.receivedAt})`)
    .orderBy(sql`date_trunc('hour', ${events.receivedAt})`);

  return (
    <AnalyticsClient
      period={period}
      stats={{
        eventVolume: eventVolume.count,
        deliverySuccessRate: Math.round(deliverySuccessRate * 10) / 10,
        avgResponseMs: Math.round(avgMs),
        failedDeliveries: failedCount,
        anomaliesDetected: anomalyCount.count,
        eventsReconciled,
        deduplicated: dedupCount.count,
      }}
      topEventTypes={topEventTypes.map((t) => ({
        eventType: t.eventType,
        count: t.count,
      }))}
      hourlyVolume={hourlyVolume.map((h) => ({
        hour: h.hour,
        count: h.count,
      }))}
    />
  );
}
