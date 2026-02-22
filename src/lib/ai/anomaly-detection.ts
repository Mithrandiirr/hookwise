import { db } from "@/lib/db";
import {
  events,
  deliveries,
  patterns,
  integrations,
  payloadSchemas,
} from "@/lib/db/schema";
import { eq, and, gte, desc, ne, count } from "drizzle-orm";
import type { AnomalyType, AnomalySeverity } from "@/types";
import type { DetectedAnomaly, AnomalyContext, MetricSnapshot } from "./types";

const MIN_SAMPLE_COUNT = 200;

interface PatternMap {
  [metricName: string]: {
    rollingAvg: number;
    rollingStddev: number;
    sampleCount: number;
  };
}

export async function detectAnomalies(
  integrationId: string
): Promise<DetectedAnomaly[]> {
  // Fetch patterns for this integration
  const integrationPatterns = await db
    .select()
    .from(patterns)
    .where(eq(patterns.integrationId, integrationId));

  const patternMap: PatternMap = {};
  for (const p of integrationPatterns) {
    patternMap[p.metricName] = {
      rollingAvg: p.rollingAvg,
      rollingStddev: p.rollingStddev,
      sampleCount: p.sampleCount,
    };
  }

  // Gate: skip if not enough data
  const generalPattern = patternMap["event_count"];
  if (!generalPattern || generalPattern.sampleCount < MIN_SAMPLE_COUNT) {
    return [];
  }

  // Fetch current metrics
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

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
      statusCode: deliveries.statusCode,
      responseTimeMs: deliveries.responseTimeMs,
      status: deliveries.status,
      errorType: deliveries.errorType,
      attemptedAt: deliveries.attemptedAt,
    })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(deliveries.attemptedAt, fiveMinAgo)
      )
    )
    .orderBy(desc(deliveries.attemptedAt))
    .limit(20);

  // 30-min window for failure surge detection
  const [failureCountResult] = await db
    .select({ count: count() })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        eq(events.integrationId, integrationId),
        eq(deliveries.status, "failed"),
        gte(deliveries.attemptedAt, thirtyMinAgo)
      )
    );

  const [totalDeliveryCount] = await db
    .select({ count: count() })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(deliveries.attemptedAt, thirtyMinAgo)
      )
    );

  const eventCount = eventCountResult?.count ?? 0;
  const totalInWindow = totalDeliveryCount?.count ?? 0;
  const failedInWindow = failureCountResult?.count ?? 0;
  const failureRate30m =
    totalInWindow > 0 ? failedInWindow / totalInWindow : 0;

  const responseTimes = recentDeliveries
    .map((d) => d.responseTimeMs)
    .filter((t): t is number => t !== null);
  const avgResponseMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  const failedRecent = recentDeliveries.filter(
    (d) => d.status === "failed"
  ).length;
  const failureRate5m =
    recentDeliveries.length > 0 ? failedRecent / recentDeliveries.length : 0;

  // Event type distribution
  const recentEvents = await db
    .select({
      id: events.id,
      eventType: events.eventType,
      receivedAt: events.receivedAt,
      signatureValid: events.signatureValid,
      source: events.source,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, fiveMinAgo)
      )
    )
    .orderBy(desc(events.receivedAt))
    .limit(20);

  const eventTypeDist: Record<string, number> = {};
  for (const e of recentEvents) {
    eventTypeDist[e.eventType] = (eventTypeDist[e.eventType] ?? 0) + 1;
  }

  const currentSnapshot: MetricSnapshot = {
    eventCount,
    avgResponseMs,
    failureRate: failureRate5m,
    eventTypeDistribution: eventTypeDist,
    timestamp: new Date().toISOString(),
  };

  // Fetch integration info for context building
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration) return [];

  // Fetch other integrations for cross-correlation
  const otherIntegrationsList = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, integration.userId),
        ne(integrations.id, integrationId)
      )
    );

  const otherIntegrationStatus = await Promise.all(
    otherIntegrationsList.map(async (oi) => {
      const [failCount] = await db
        .select({ count: count() })
        .from(deliveries)
        .innerJoin(events, eq(deliveries.eventId, events.id))
        .where(
          and(
            eq(events.integrationId, oi.id),
            eq(deliveries.status, "failed"),
            gte(deliveries.attemptedAt, thirtyMinAgo)
          )
        );
      const [totalCount] = await db
        .select({ count: count() })
        .from(deliveries)
        .innerJoin(events, eq(deliveries.eventId, events.id))
        .where(
          and(
            eq(events.integrationId, oi.id),
            gte(deliveries.attemptedAt, thirtyMinAgo)
          )
        );
      return {
        id: oi.id,
        name: oi.name,
        provider: oi.provider,
        currentFailureRate:
          (totalCount?.count ?? 0) > 0
            ? (failCount?.count ?? 0) / (totalCount?.count ?? 1)
            : 0,
      };
    })
  );

  // Build base context
  const baselineData = {
    eventCount: patternMap["event_count"]?.rollingAvg ?? 0,
    avgResponseMs: patternMap["avg_response_ms"]?.rollingAvg ?? 0,
    failureRate: patternMap["failure_rate"]?.rollingAvg ?? 0,
    stddevEventCount: patternMap["event_count"]?.rollingStddev ?? 0,
    stddevResponseMs: patternMap["avg_response_ms"]?.rollingStddev ?? 0,
    stddevFailureRate: patternMap["failure_rate"]?.rollingStddev ?? 0,
    sampleCount: generalPattern.sampleCount,
  };

  function buildContext(
    type: AnomalyType,
    severity: AnomalySeverity
  ): AnomalyContext {
    return {
      integrationId,
      integrationName: integration.name,
      provider: integration.provider,
      anomalyType: type,
      severity,
      baseline: baselineData,
      current: currentSnapshot,
      recentEvents: recentEvents.map((e) => ({
        ...e,
        source: e.source ?? "webhook",
      })),
      recentDeliveries: recentDeliveries.map((d) => ({
        statusCode: d.statusCode,
        responseTimeMs: d.responseTimeMs,
        errorType: d.errorType,
        attemptedAt: d.attemptedAt,
      })),
      otherIntegrations: otherIntegrationStatus,
    };
  }

  const detected: DetectedAnomaly[] = [];

  // 1. Response time spike: last 5 deliveries all >2x rolling avg
  const rtBaseline = patternMap["avg_response_ms"];
  if (rtBaseline && responseTimes.length >= 5) {
    const last5 = responseTimes.slice(0, 5);
    const allAboveThreshold = last5.every(
      (rt) => rt > rtBaseline.rollingAvg * 2
    );
    if (allAboveThreshold) {
      const maxRt = Math.max(...last5);
      const multiplier = maxRt / rtBaseline.rollingAvg;
      const severity: AnomalySeverity =
        multiplier > 10 ? "critical" : multiplier > 5 ? "high" : "medium";
      detected.push({
        type: "response_time_spike",
        severity,
        context: buildContext("response_time_spike", severity),
      });
    }
  }

  // 2. Failure surge: >10% failure rate in 30-min window
  if (totalInWindow >= 5 && failureRate30m > 0.1) {
    const severity: AnomalySeverity =
      failureRate30m > 0.8
        ? "critical"
        : failureRate30m > 0.5
          ? "high"
          : "medium";
    detected.push({
      type: "failure_surge",
      severity,
      context: buildContext("failure_surge", severity),
    });
  }

  // 3. Source silence: zero events during normally active period
  const eventsPerHourBaseline = patternMap["event_count"];
  if (
    eventsPerHourBaseline &&
    eventsPerHourBaseline.rollingAvg > 2 &&
    eventCount === 0
  ) {
    const severity: AnomalySeverity =
      eventsPerHourBaseline.rollingAvg > 20 ? "high" : "medium";
    detected.push({
      type: "source_silence",
      severity,
      context: buildContext("source_silence", severity),
    });
  }

  // 4. Volume spike/drop
  if (eventsPerHourBaseline && eventsPerHourBaseline.rollingAvg > 0) {
    const ratio = eventCount / eventsPerHourBaseline.rollingAvg;
    if (ratio > 3) {
      const severity: AnomalySeverity = ratio > 10 ? "critical" : "high";
      detected.push({
        type: "volume_spike",
        severity,
        context: buildContext("volume_spike", severity),
      });
    } else if (ratio < 0.3 && eventCount > 0) {
      const severity: AnomalySeverity = ratio < 0.1 ? "critical" : "high";
      detected.push({
        type: "volume_drop",
        severity,
        context: buildContext("volume_drop", severity),
      });
    }
  }

  // 5. New event type: event type not seen in payloadSchemas
  const knownSchemas = await db
    .select({ eventType: payloadSchemas.eventType })
    .from(payloadSchemas)
    .where(eq(payloadSchemas.integrationId, integrationId));

  const knownTypes = new Set(knownSchemas.map((s) => s.eventType));
  for (const eventType of Object.keys(eventTypeDist)) {
    if (!knownTypes.has(eventType)) {
      detected.push({
        type: "new_event_type",
        severity: "low",
        context: buildContext("new_event_type", "low"),
      });
      break; // One anomaly for all new types
    }
  }

  // 6. Payload anomaly: check if any event payload size deviates significantly
  // We check the average payload size against baseline
  if (recentEvents.length > 0) {
    const payloadSizes = recentEvents.map(
      (e) => JSON.stringify(e).length
    );
    const avgPayloadSize =
      payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length;
    const payloadBaseline = patternMap["avg_payload_size"];
    if (
      payloadBaseline &&
      payloadBaseline.rollingAvg > 0 &&
      avgPayloadSize > payloadBaseline.rollingAvg * 3
    ) {
      detected.push({
        type: "payload_anomaly",
        severity: "medium",
        context: buildContext("payload_anomaly", "medium"),
      });
    }
  }

  return detected;
}
