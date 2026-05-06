import { db } from "@/lib/db";
import {
  events,
  deliveries,
  endpoints,
  replayQueue,
  anomalies,
  providerHealth,
  patterns,
  payloadSchemas,
  integrations,
} from "@/lib/db/schema";
import { eq, and, gte, lte, desc, count, sql, ne } from "drizzle-orm";
import type {
  DeliveryHistoryResult,
  EndpointHealthResult,
  SimilarAnomalyResult,
  ProviderHealthResult,
  EventPatternResult,
  PayloadChangeResult,
} from "./types";
import type Anthropic from "@anthropic-ai/sdk";

// --- Tool definitions for Claude API ---

export const INVESTIGATION_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "query_delivery_history",
    description:
      "Query delivery history for an integration over a time range. Returns error breakdown, response time percentiles, status codes. Use this to understand WHAT is failing and HOW.",
    input_schema: {
      type: "object" as const,
      properties: {
        integration_id: { type: "string", description: "The integration ID to query" },
        minutes_back: {
          type: "number",
          description: "How many minutes of history to query (5, 30, 60, 360, 1440)",
          default: 30,
        },
      },
      required: ["integration_id"],
    },
  },
  {
    name: "query_endpoint_health",
    description:
      "Check current endpoint health: circuit breaker state, success rate, response time, replay queue size. Use this to understand the CURRENT state of the destination.",
    input_schema: {
      type: "object" as const,
      properties: {
        integration_id: { type: "string", description: "The integration ID" },
      },
      required: ["integration_id"],
    },
  },
  {
    name: "query_similar_anomalies",
    description:
      "Find past anomalies of the same type for this integration. Returns previous diagnoses and resolutions. Use this to check if this has HAPPENED BEFORE and what fixed it.",
    input_schema: {
      type: "object" as const,
      properties: {
        integration_id: { type: "string", description: "The integration ID" },
        anomaly_type: {
          type: "string",
          description: "Type: response_time_spike, failure_surge, source_silence, volume_spike, volume_drop, new_event_type, payload_anomaly",
        },
        limit: { type: "number", description: "Max results (default 5)", default: 5 },
      },
      required: ["integration_id", "anomaly_type"],
    },
  },
  {
    name: "query_provider_health",
    description:
      "Check provider-wide health across ALL customers. Determines if Stripe/Shopify/GitHub is having a global issue vs. a customer-specific problem. Use this to determine if the root cause is the PROVIDER.",
    input_schema: {
      type: "object" as const,
      properties: {
        provider: {
          type: "string",
          description: "Provider name: stripe, shopify, or github",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "query_event_patterns",
    description:
      "Analyze event volume patterns, type distribution, source breakdown, and signature validity over a time range. Use this to understand traffic PATTERNS and detect unusual shifts.",
    input_schema: {
      type: "object" as const,
      properties: {
        integration_id: { type: "string", description: "The integration ID" },
        hours_back: {
          type: "number",
          description: "How many hours of history (1, 6, 24, 72)",
          default: 24,
        },
      },
      required: ["integration_id"],
    },
  },
  {
    name: "query_payload_changes",
    description:
      "Check if webhook payload schemas have changed recently (new fields, removed fields, type changes). Use this to determine if a SCHEMA CHANGE is causing issues.",
    input_schema: {
      type: "object" as const,
      properties: {
        integration_id: { type: "string", description: "The integration ID" },
        event_type: {
          type: "string",
          description: "Specific event type to check, or 'all' for all types",
          default: "all",
        },
      },
      required: ["integration_id"],
    },
  },
  {
    name: "query_cross_integration_status",
    description:
      "Check failure rates across ALL integrations for this user. Use this to determine if the issue is ISOLATED to one integration or affecting multiple.",
    input_schema: {
      type: "object" as const,
      properties: {
        integration_id: {
          type: "string",
          description: "The current integration ID (used to find the user's other integrations)",
        },
      },
      required: ["integration_id"],
    },
  },
];

// --- Tool execution functions ---

export async function executeInvestigationTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "query_delivery_history":
      return queryDeliveryHistory(
        input.integration_id as string,
        (input.minutes_back as number) ?? 30
      );
    case "query_endpoint_health":
      return queryEndpointHealth(input.integration_id as string);
    case "query_similar_anomalies":
      return querySimilarAnomalies(
        input.integration_id as string,
        input.anomaly_type as string,
        (input.limit as number) ?? 5
      );
    case "query_provider_health":
      return queryProviderHealth(input.provider as string);
    case "query_event_patterns":
      return queryEventPatterns(
        input.integration_id as string,
        (input.hours_back as number) ?? 24
      );
    case "query_payload_changes":
      return queryPayloadChanges(
        input.integration_id as string,
        (input.event_type as string) ?? "all"
      );
    case "query_cross_integration_status":
      return queryCrossIntegrationStatus(input.integration_id as string);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function queryDeliveryHistory(
  integrationId: string,
  minutesBack: number
): Promise<DeliveryHistoryResult> {
  const since = new Date(Date.now() - minutesBack * 60 * 1000);

  const recentDeliveries = await db
    .select({
      statusCode: deliveries.statusCode,
      responseTimeMs: deliveries.responseTimeMs,
      status: deliveries.status,
      errorType: deliveries.errorType,
    })
    .from(deliveries)
    .innerJoin(events, eq(deliveries.eventId, events.id))
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(deliveries.attemptedAt, since)
      )
    )
    .orderBy(desc(deliveries.attemptedAt))
    .limit(500);

  const total = recentDeliveries.length;
  const failed = recentDeliveries.filter((d) => d.status === "failed").length;

  const errorBreakdown: Record<string, number> = {};
  const statusCodeBreakdown: Record<string, number> = {};
  const responseTimes: number[] = [];

  for (const d of recentDeliveries) {
    if (d.errorType) {
      errorBreakdown[d.errorType] = (errorBreakdown[d.errorType] ?? 0) + 1;
    }
    const codeKey = d.statusCode ? String(d.statusCode) : "no_response";
    statusCodeBreakdown[codeKey] = (statusCodeBreakdown[codeKey] ?? 0) + 1;
    if (d.responseTimeMs !== null) {
      responseTimes.push(d.responseTimeMs);
    }
  }

  responseTimes.sort((a, b) => a - b);
  const avgResponseMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p95ResponseMs = responseTimes[p95Index] ?? 0;

  return {
    total,
    failed,
    failureRate: total > 0 ? failed / total : 0,
    errorBreakdown,
    avgResponseMs: Math.round(avgResponseMs),
    p95ResponseMs,
    statusCodeBreakdown,
    timeRange: {
      from: since.toISOString(),
      to: new Date().toISOString(),
    },
  };
}

async function queryEndpointHealth(
  integrationId: string
): Promise<EndpointHealthResult> {
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integrationId))
    .limit(1);

  if (!endpoint) {
    return {
      circuitState: "unknown",
      successRate: 0,
      avgResponseMs: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastHealthCheck: null,
      stateChangedAt: new Date().toISOString(),
      healthScore: 0,
      replayQueueSize: 0,
    };
  }

  const [queueSize] = await db
    .select({ count: count() })
    .from(replayQueue)
    .where(
      and(
        eq(replayQueue.endpointId, endpoint.id),
        eq(replayQueue.status, "pending")
      )
    );

  return {
    circuitState: endpoint.circuitState,
    successRate: endpoint.successRate,
    avgResponseMs: endpoint.avgResponseMs,
    consecutiveFailures: endpoint.consecutiveFailures,
    consecutiveSuccesses: endpoint.consecutiveSuccesses,
    lastHealthCheck: endpoint.lastHealthCheck?.toISOString() ?? null,
    stateChangedAt: endpoint.stateChangedAt.toISOString(),
    healthScore: endpoint.healthScore,
    replayQueueSize: queueSize?.count ?? 0,
  };
}

async function querySimilarAnomalies(
  integrationId: string,
  anomalyType: string,
  limit: number
): Promise<SimilarAnomalyResult[]> {
  const pastAnomalies = await db
    .select()
    .from(anomalies)
    .where(
      and(
        eq(anomalies.integrationId, integrationId),
        eq(anomalies.type, anomalyType as typeof anomalies.type.enumValues[number])
      )
    )
    .orderBy(desc(anomalies.detectedAt))
    .limit(limit);

  return pastAnomalies.map((a) => {
    const diag = a.diagnosis as Record<string, unknown> | null;
    return {
      anomalyId: a.id,
      type: a.type,
      severity: a.severity,
      detectedAt: a.detectedAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      diagnosisWhat: diag?.what ? String(diag.what) : null,
      diagnosisWhy: diag?.why ? String(diag.why) : null,
      resolution: diag?.resolution ? String(diag.resolution) : null,
    };
  });
}

async function queryProviderHealth(
  provider: string
): Promise<ProviderHealthResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const healthMetrics = await db
    .select()
    .from(providerHealth)
    .where(
      and(
        eq(providerHealth.provider, provider as typeof providerHealth.provider.enumValues[number]),
        gte(providerHealth.measuredAt, oneHourAgo)
      )
    )
    .orderBy(desc(providerHealth.measuredAt))
    .limit(20);

  const failureMetrics = healthMetrics.filter((m) =>
    m.metricName.includes("failure_rate")
  );
  const latencyMetrics = healthMetrics.filter((m) =>
    m.metricName.includes("latency") || m.metricName.includes("response")
  );

  const avgFailureRate =
    failureMetrics.length > 0
      ? failureMetrics.reduce((sum, m) => sum + m.value, 0) / failureMetrics.length
      : 0;
  const avgLatencyMs =
    latencyMetrics.length > 0
      ? latencyMetrics.reduce((sum, m) => sum + m.value, 0) / latencyMetrics.length
      : 0;
  const totalSampleSize = healthMetrics.reduce(
    (sum, m) => sum + m.sampleSize,
    0
  );

  // Count affected integrations
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const affectedIntegrations = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${events.integrationId})` })
    .from(events)
    .innerJoin(
      integrations,
      eq(events.integrationId, integrations.id)
    )
    .innerJoin(deliveries, eq(deliveries.eventId, events.id))
    .where(
      and(
        eq(integrations.provider, provider as typeof integrations.provider.enumValues[number]),
        eq(deliveries.status, "failed"),
        gte(deliveries.attemptedAt, thirtyMinAgo)
      )
    );

  const status: ProviderHealthResult["status"] =
    avgFailureRate >= 0.5 ? "outage" : avgFailureRate >= 0.1 ? "degraded" : "operational";

  return {
    provider,
    avgFailureRate,
    avgLatencyMs: Math.round(avgLatencyMs),
    sampleSize: totalSampleSize,
    affectedIntegrationCount: Number(affectedIntegrations[0]?.count) || 0,
    status,
  };
}

async function queryEventPatterns(
  integrationId: string,
  hoursBack: number
): Promise<EventPatternResult> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  // Hourly volumes
  const hourlyData = await db
    .select({
      hour: sql<string>`date_trunc('hour', ${events.receivedAt})::text`,
      count: count(),
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, since)
      )
    )
    .groupBy(sql`date_trunc('hour', ${events.receivedAt})`)
    .orderBy(sql`date_trunc('hour', ${events.receivedAt})`);

  // Event type breakdown
  const typeData = await db
    .select({
      eventType: events.eventType,
      count: count(),
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, since)
      )
    )
    .groupBy(events.eventType);

  // Source breakdown
  const sourceData = await db
    .select({
      source: events.source,
      count: count(),
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, since)
      )
    )
    .groupBy(events.source);

  // Signature validity
  const [sigData] = await db
    .select({
      total: count(),
      valid: sql<number>`SUM(CASE WHEN ${events.signatureValid} THEN 1 ELSE 0 END)`,
    })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, since)
      )
    );

  // Average payload size (approximate via recent events)
  const recentPayloads = await db
    .select({ payload: events.payload })
    .from(events)
    .where(
      and(
        eq(events.integrationId, integrationId),
        gte(events.receivedAt, since)
      )
    )
    .limit(100);

  const avgPayloadSize =
    recentPayloads.length > 0
      ? recentPayloads.reduce(
          (sum, e) => sum + JSON.stringify(e.payload).length,
          0
        ) / recentPayloads.length
      : 0;

  const totalEvents = sigData?.total ?? 0;
  const validSigs = Number(sigData?.valid) || 0;

  return {
    hourlyVolumes: hourlyData.map((h) => ({
      hour: h.hour,
      count: h.count,
    })),
    eventTypeBreakdown: Object.fromEntries(
      typeData.map((t) => [t.eventType, t.count])
    ),
    sourceBreakdown: Object.fromEntries(
      sourceData.map((s) => [s.source, s.count])
    ),
    avgPayloadSizeBytes: Math.round(avgPayloadSize),
    signatureValidRate: totalEvents > 0 ? validSigs / totalEvents : 1,
  };
}

async function queryPayloadChanges(
  integrationId: string,
  eventType: string
): Promise<PayloadChangeResult[]> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const schemaQuery = eventType === "all"
    ? eq(payloadSchemas.integrationId, integrationId)
    : and(
        eq(payloadSchemas.integrationId, integrationId),
        eq(payloadSchemas.eventType, eventType)
      );

  const schemas = await db
    .select()
    .from(payloadSchemas)
    .where(schemaQuery);

  // Get baseline pattern for payload size
  const sizePattern = await db
    .select()
    .from(patterns)
    .where(
      and(
        eq(patterns.integrationId, integrationId),
        eq(patterns.metricName, "avg_payload_size")
      )
    )
    .limit(1);

  const baselineSize = sizePattern[0]?.rollingAvg ?? 0;

  return schemas.map((schema) => {
    const schemaData = schema.jsonSchema as Record<string, unknown> | null;
    const fields = (schemaData?.fields ?? {}) as Record<string, { type: string; seen: number }>;
    const sampleCount = (schemaData?.sampleCount as number) ?? 0;
    const avgSize = (schemaData?.avgSize as number) ?? 0;

    // Detect recently added fields (seen count << sample count = new field)
    const newFields: string[] = [];
    const typeChanges: Array<{ field: string; was: string; now: string }> = [];

    for (const [fieldName, info] of Object.entries(fields)) {
      if (sampleCount > 10 && info.seen < sampleCount * 0.1) {
        newFields.push(fieldName);
      }
    }

    const sizeChangePercent =
      baselineSize > 0 ? ((avgSize - baselineSize) / baselineSize) * 100 : 0;

    return {
      eventType: schema.eventType,
      newFields,
      removedFields: [], // Can't detect removed fields from current schema alone
      typeChanges,
      sizeChangePercent: Math.round(sizeChangePercent * 10) / 10,
      lastSchemaUpdate: schema.lastUpdated.toISOString(),
    };
  });
}

async function queryCrossIntegrationStatus(
  integrationId: string
): Promise<Array<{ integrationId: string; name: string; provider: string; failureRate: number; eventCount: number }>> {
  // Find the user who owns this integration
  const [integration] = await db
    .select({ userId: integrations.userId })
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration) return [];

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const userIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, integration.userId));

  const results = await Promise.all(
    userIntegrations.map(async (i) => {
      const [totalResult] = await db
        .select({ count: count() })
        .from(deliveries)
        .innerJoin(events, eq(deliveries.eventId, events.id))
        .where(
          and(
            eq(events.integrationId, i.id),
            gte(deliveries.attemptedAt, thirtyMinAgo)
          )
        );

      const [failResult] = await db
        .select({ count: count() })
        .from(deliveries)
        .innerJoin(events, eq(deliveries.eventId, events.id))
        .where(
          and(
            eq(events.integrationId, i.id),
            eq(deliveries.status, "failed"),
            gte(deliveries.attemptedAt, thirtyMinAgo)
          )
        );

      const total = totalResult?.count ?? 0;
      const failed = failResult?.count ?? 0;

      return {
        integrationId: i.id,
        name: i.name,
        provider: i.provider,
        failureRate: total > 0 ? failed / total : 0,
        eventCount: total,
      };
    })
  );

  return results;
}
