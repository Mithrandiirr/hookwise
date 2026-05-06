import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  events,
  deliveries,
  integrations,
  anomalies,
  reconciliationRuns,
} from "@/lib/db/schema";
import { eq, and, gte, inArray, count, desc, avg, sql } from "drizzle-orm";

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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "24h";
  const since = getPeriodStart(period);

  const userIntegrations = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.userId, user.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  if (integrationIds.length === 0) {
    return NextResponse.json({
      eventVolume: 0,
      deliverySuccessRate: 100,
      avgResponseMs: 0,
      failedDeliveries: 0,
      anomaliesDetected: 0,
      eventsReconciled: 0,
      topEventTypes: [],
      hourlyVolume: [],
    });
  }

  const [eventVolume] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    );

  const [delivered] = await db
    .select({ count: count() })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since),
        eq(deliveries.status, "delivered")
      )
    );

  const [failed] = await db
    .select({ count: count() })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since),
        eq(deliveries.status, "failed")
      )
    );

  const [totalDel] = await db
    .select({ count: count() })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    );

  const [avgResp] = await db
    .select({ avg: avg(deliveries.responseTimeMs) })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        inArray(events.integrationId, integrationIds),
        gte(events.receivedAt, since)
      )
    );

  const [anomalyCount] = await db
    .select({ count: count() })
    .from(anomalies)
    .where(
      and(
        inArray(anomalies.integrationId, integrationIds),
        gte(anomalies.detectedAt, since)
      )
    );

  const reconRuns = await db
    .select({ gapsResolved: reconciliationRuns.gapsResolved })
    .from(reconciliationRuns)
    .where(
      and(
        inArray(reconciliationRuns.integrationId, integrationIds),
        gte(reconciliationRuns.ranAt, since)
      )
    );

  const eventsReconciled = reconRuns.reduce((s, r) => s + r.gapsResolved, 0);

  const topEventTypes = await db
    .select({ eventType: events.eventType, count: count() })
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

  const successRate =
    totalDel.count > 0
      ? Math.round((delivered.count / totalDel.count) * 1000) / 10
      : 100;

  return NextResponse.json({
    eventVolume: eventVolume.count,
    deliverySuccessRate: successRate,
    avgResponseMs: Math.round(Number(avgResp.avg) || 0),
    failedDeliveries: failed.count,
    anomaliesDetected: anomalyCount.count,
    eventsReconciled,
    topEventTypes: topEventTypes.map((t) => ({
      eventType: t.eventType,
      count: t.count,
    })),
    hourlyVolume: hourlyVolume.map((h) => ({
      hour: h.hour,
      count: h.count,
    })),
  });
}
