import { db } from "@/lib/db";
import {
  events,
  deliveries,
  anomalies,
  replayQueue,
  reconciliationRuns,
  integrations,
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, sql, count } from "drizzle-orm";

export interface WeeklyReportData {
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  deliveredEvents: number;
  failedEvents: number;
  successRate: number;
  revenueProtectedCents: number;
  anomalies: {
    total: number;
    bySeverity: Record<string, number>;
  };
  replay: {
    delivered: number;
    skipped: number;
  };
  reconciliation: {
    runs: number;
    gapsDetected: number;
    gapsResolved: number;
  };
  perIntegration: Array<{
    integrationId: string;
    integrationName: string;
    provider: string;
    events: number;
    successRate: number;
    revenueCents: number;
  }>;
}

export async function generateWeeklyReport(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WeeklyReportData> {
  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId));

  const integrationIds = userIntegrations.map((i) => i.id);

  if (integrationIds.length === 0) {
    return {
      periodStart,
      periodEnd,
      totalEvents: 0,
      deliveredEvents: 0,
      failedEvents: 0,
      successRate: 100,
      revenueProtectedCents: 0,
      anomalies: { total: 0, bySeverity: {} },
      replay: { delivered: 0, skipped: 0 },
      reconciliation: { runs: 0, gapsDetected: 0, gapsResolved: 0 },
      perIntegration: [],
    };
  }

  const [
    totalEventsResult,
    deliveredResult,
    failedResult,
    revenueResult,
    anomalyResults,
    replayDelivered,
    replaySkipped,
    reconResults,
    perIntegrationEvents,
    perIntegrationDelivered,
    perIntegrationRevenue,
  ] = await Promise.all([
    // Total events
    db
      .select({ count: count() })
      .from(events)
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          gte(events.receivedAt, periodStart),
          lte(events.receivedAt, periodEnd)
        )
      ),
    // Delivered
    db
      .select({ count: count() })
      .from(deliveries)
      .innerJoin(events, eq(deliveries.eventId, events.id))
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          eq(deliveries.status, "delivered"),
          gte(deliveries.attemptedAt, periodStart),
          lte(deliveries.attemptedAt, periodEnd)
        )
      ),
    // Failed
    db
      .select({ count: count() })
      .from(deliveries)
      .innerJoin(events, eq(deliveries.eventId, events.id))
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          eq(deliveries.status, "failed"),
          gte(deliveries.attemptedAt, periodStart),
          lte(deliveries.attemptedAt, periodEnd)
        )
      ),
    // Revenue
    db
      .select({ total: sql<number>`COALESCE(SUM(${events.amountCents}), 0)` })
      .from(events)
      .innerJoin(deliveries, eq(deliveries.eventId, events.id))
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          eq(deliveries.status, "delivered"),
          gte(events.receivedAt, periodStart),
          lte(events.receivedAt, periodEnd)
        )
      ),
    // Anomalies by severity
    db
      .select({
        severity: anomalies.severity,
        count: count(),
      })
      .from(anomalies)
      .where(
        and(
          inArray(anomalies.integrationId, integrationIds),
          gte(anomalies.detectedAt, periodStart),
          lte(anomalies.detectedAt, periodEnd)
        )
      )
      .groupBy(anomalies.severity),
    // Replay delivered
    db
      .select({ count: count() })
      .from(replayQueue)
      .where(
        and(
          eq(replayQueue.status, "delivered"),
          gte(replayQueue.createdAt, periodStart),
          lte(replayQueue.createdAt, periodEnd)
        )
      ),
    // Replay skipped
    db
      .select({ count: count() })
      .from(replayQueue)
      .where(
        and(
          eq(replayQueue.status, "skipped"),
          gte(replayQueue.createdAt, periodStart),
          lte(replayQueue.createdAt, periodEnd)
        )
      ),
    // Reconciliation
    db
      .select({
        runs: count(),
        gapsDetected: sql<number>`COALESCE(SUM(${reconciliationRuns.gapsDetected}), 0)`,
        gapsResolved: sql<number>`COALESCE(SUM(${reconciliationRuns.gapsResolved}), 0)`,
      })
      .from(reconciliationRuns)
      .where(
        and(
          inArray(reconciliationRuns.integrationId, integrationIds),
          gte(reconciliationRuns.ranAt, periodStart),
          lte(reconciliationRuns.ranAt, periodEnd)
        )
      ),
    // Per-integration events
    db
      .select({
        integrationId: events.integrationId,
        count: count(),
      })
      .from(events)
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          gte(events.receivedAt, periodStart),
          lte(events.receivedAt, periodEnd)
        )
      )
      .groupBy(events.integrationId),
    // Per-integration delivered
    db
      .select({
        integrationId: events.integrationId,
        count: count(),
      })
      .from(deliveries)
      .innerJoin(events, eq(deliveries.eventId, events.id))
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          eq(deliveries.status, "delivered"),
          gte(deliveries.attemptedAt, periodStart),
          lte(deliveries.attemptedAt, periodEnd)
        )
      )
      .groupBy(events.integrationId),
    // Per-integration revenue
    db
      .select({
        integrationId: events.integrationId,
        total: sql<number>`COALESCE(SUM(${events.amountCents}), 0)`,
      })
      .from(events)
      .innerJoin(deliveries, eq(deliveries.eventId, events.id))
      .where(
        and(
          inArray(events.integrationId, integrationIds),
          eq(deliveries.status, "delivered"),
          gte(events.receivedAt, periodStart),
          lte(events.receivedAt, periodEnd)
        )
      )
      .groupBy(events.integrationId),
  ]);

  const totalEvents = totalEventsResult[0].count;
  const deliveredEvents = deliveredResult[0].count;
  const failedEvents = failedResult[0].count;
  const successRate = totalEvents > 0 ? (deliveredEvents / totalEvents) * 100 : 100;

  const bySeverity: Record<string, number> = {};
  let totalAnomalies = 0;
  for (const row of anomalyResults) {
    bySeverity[row.severity] = row.count;
    totalAnomalies += row.count;
  }

  const eventsMap = Object.fromEntries(perIntegrationEvents.map((r) => [r.integrationId, r.count]));
  const deliveredMap = Object.fromEntries(perIntegrationDelivered.map((r) => [r.integrationId, r.count]));
  const revenueMap = Object.fromEntries(perIntegrationRevenue.map((r) => [r.integrationId, Number(r.total) || 0]));

  const perIntegration = userIntegrations.map((i) => {
    const evCount = eventsMap[i.id] ?? 0;
    const delCount = deliveredMap[i.id] ?? 0;
    return {
      integrationId: i.id,
      integrationName: i.name,
      provider: i.provider,
      events: evCount,
      successRate: evCount > 0 ? (delCount / evCount) * 100 : 100,
      revenueCents: revenueMap[i.id] ?? 0,
    };
  });

  return {
    periodStart,
    periodEnd,
    totalEvents,
    deliveredEvents,
    failedEvents,
    successRate,
    revenueProtectedCents: Number(revenueResult[0].total) || 0,
    anomalies: { total: totalAnomalies, bySeverity },
    replay: {
      delivered: replayDelivered[0].count,
      skipped: replaySkipped[0].count,
    },
    reconciliation: {
      runs: reconResults[0].runs,
      gapsDetected: Number(reconResults[0].gapsDetected) || 0,
      gapsResolved: Number(reconResults[0].gapsResolved) || 0,
    },
    perIntegration,
  };
}
