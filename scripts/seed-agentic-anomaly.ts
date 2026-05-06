/**
 * Seeds a realistic anomaly with full agentic diagnosis data
 * so the UI can display the investigation trail, remediation actions,
 * incident memory, and severity assessment.
 *
 * Usage: npx tsx scripts/seed-agentic-anomaly.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { integrations, anomalies } from "../src/lib/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.status, "active"))
    .limit(1);

  if (!integration) {
    console.error("No active integration found.");
    await client.end();
    return;
  }

  console.log(`Using integration: ${integration.name} (${integration.id})`);

  // 1. Seed a past resolved incident (for incident memory display)
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  await db.insert(anomalies).values({
    integrationId: integration.id,
    type: "failure_surge",
    severity: "high",
    diagnosis: {
      what: "Endpoint returned 503 for 78% of deliveries over 40 minutes.",
      why: "Database connection pool exhaustion during peak traffic. Customer's Postgres had max_connections=20 which saturated under 50+ req/s load.",
      impact: "134 events delayed, including 23 charge.succeeded events totaling $1,847.50 in payment notifications.",
      recommendation: "Customer increased max_connections to 100 and added PgBouncer. Recovery completed in 38 minutes.",
      confidence: 0.88,
      crossCorrelation: null,
      resolution: "Database connection pool scaled from 20 to 100. PgBouncer added as connection pooler.",
    },
    context: {
      baseline: { eventCount: 14, avgResponseMs: 125, failureRate: 0.02, sampleCount: 580 },
      current: { eventCount: 11, avgResponseMs: 4800, failureRate: 0.78 },
    },
    detectedAt: fiveDaysAgo,
    resolvedAt: fourDaysAgo,
  });

  // 2. Seed the main anomaly with full agentic diagnosis
  const [inserted] = await db.insert(anomalies).values({
    integrationId: integration.id,
    type: "failure_surge",
    severity: "critical",
    diagnosis: {
      what: "83% of deliveries failed in the last 30 minutes. 10 out of 12 events returned errors — 7 with HTTP 503, 2 timeouts at 30s, and 1 connection refused. Response times spiked from 120ms baseline to 5,200ms average.",
      why: "Based on delivery history showing uniform 503 errors and the endpoint health check confirming circuit breaker is now OPEN, this is an endpoint-side outage. The error pattern (503 + timeouts + connection refused) indicates the customer's application server is either overloaded or restarting. Provider health check confirms Stripe is operational (2% failure rate across all customers), ruling out a provider issue. This is the 2nd occurrence of this pattern — the previous incident 5 days ago was caused by database connection pool exhaustion.",
      impact: "12 events affected including 4 charge.succeeded ($199.96) and 4 invoice.paid ($203.92) events. Total revenue at risk: $403.88. Replay queue has 8 events pending. If not resolved within 2 hours, events may age out of retry window.",
      recommendation: "1) Check your application server logs for OOM or connection pool errors. 2) The previous incident was resolved by scaling database connections — verify PgBouncer is still active. 3) Once endpoint recovers, HookWise will automatically replay 8 queued events in order. 4) Consider enabling rate limiting to prevent overwhelming the endpoint during recovery.",
      confidence: 0.91,
      crossCorrelation: "Only this integration is affected (0/2 other integrations showing failures). This confirms an endpoint-specific issue, not a shared infrastructure problem.",
      predictedResolution: "Based on the previous similar incident (resolved in 38 minutes after DB pool scaling), estimated recovery: 30-45 minutes if the same root cause.",
      evidence: [
        {
          tool: "query_delivery_history",
          query: { integration_id: integration.id, minutes_back: 30 },
          finding: "10/12 deliveries failed (83.3%). Top errors: {\"server_error\": 7, \"timeout\": 2, \"connection_refused\": 1}",
        },
        {
          tool: "query_endpoint_health",
          query: { integration_id: integration.id },
          finding: "Circuit: open, health score: 12, replay queue: 8 events",
        },
        {
          tool: "query_similar_anomalies",
          query: { integration_id: integration.id, anomaly_type: "failure_surge", limit: 5 },
          finding: "Found 1 similar past incidents. Last: Endpoint returned 503 for 78% of deliveries over 40 minutes.",
        },
        {
          tool: "query_provider_health",
          query: { provider: "stripe" },
          finding: "Provider status: operational, 0 integrations affected",
        },
        {
          tool: "query_cross_integration_status",
          query: { integration_id: integration.id },
          finding: "0/3 integrations have >10% failure rate",
        },
        {
          tool: "query_event_patterns",
          query: { integration_id: integration.id, hours_back: 6 },
          finding: "3 event types observed. Signature valid rate: 100.0%",
        },
      ],
      remediationActions: [
        {
          type: "open_circuit_breaker",
          reason: "Circuit breaker already open. 8 events queued for replay once endpoint recovers.",
        },
        {
          type: "adjust_retry_strategy",
          integrationId: integration.id,
          strategy: "backoff",
          reason: "Switch to exponential backoff to avoid overwhelming the endpoint during recovery. Current 503s suggest server overload.",
        },
        {
          type: "enable_rate_limiting",
          integrationId: integration.id,
          maxPerMinute: 10,
          reason: "Limit delivery rate to 10/min during recovery to prevent re-triggering the overload condition.",
        },
        {
          type: "trigger_reconciliation",
          integrationId: integration.id,
          reason: "After recovery, run reconciliation to catch any events that may have been lost during the outage window.",
        },
      ],
      similarIncidents: [
        {
          anomalyId: "past-incident-1",
          type: "failure_surge",
          detectedAt: fiveDaysAgo.toISOString(),
          resolvedAt: fourDaysAgo.toISOString(),
          diagnosisSummary: "Endpoint returned 503 for 78% of deliveries over 40 minutes due to database connection pool exhaustion.",
          resolution: "Database connection pool scaled from 20 to 100. PgBouncer added as connection pooler.",
        },
      ],
      severityAssessment: {
        revenueAtRisk: 40388,
        eventsAffected: 12,
        estimatedRecoveryMinutes: 38,
      },
    },
    context: {
      baseline: { eventCount: 15, avgResponseMs: 120, failureRate: 0.015, sampleCount: 600 },
      current: { eventCount: 12, avgResponseMs: 5200, failureRate: 0.83 },
    },
    detectedAt: new Date(),
    resolvedAt: null,
  }).returning({ id: anomalies.id });

  console.log(`\nSeeded agentic anomaly: ${inserted.id}`);
  console.log("\nOpen the dashboard and navigate to /anomalies to see it.");
  console.log(`Direct link: /anomalies/${inserted.id}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
