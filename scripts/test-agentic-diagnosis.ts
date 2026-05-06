/**
 * Tests the new agentic AI diagnosis engine end-to-end.
 *
 * 1. Seeds baseline patterns + failure scenario into the DB
 * 2. Runs anomaly detection
 * 3. Runs agentic diagnosis (Claude investigates with tools)
 * 4. Prints the full diagnosis with evidence trail
 *
 * Usage: npx tsx scripts/test-agentic-diagnosis.ts
 *
 * Requires: ANTHROPIC_API_KEY in .env.local + DATABASE_URL
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  integrations,
  patterns,
  events,
  deliveries,
  endpoints,
  anomalies,
  providerHealth,
} from "../src/lib/db/schema.ts";
import { eq, and } from "drizzle-orm";

// We can't use the @/ alias in scripts, so we import the AI modules directly
// But since they use @/ internally, we need tsx with tsconfig paths
// Instead, we'll test via a direct HTTP call to an API route

async function main() {
  console.log("========================================");
  console.log("  HookWise Agentic Diagnosis Test");
  console.log("========================================\n");

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set in .env.local");
    console.error("Set it and try again.");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // 1. Find an active integration
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.status, "active"))
    .limit(1);

  if (!integration) {
    console.error("No active integration found. Create one first via the dashboard.");
    await client.end();
    return;
  }

  console.log(`Using integration: ${integration.name} (${integration.provider})`);
  console.log(`Integration ID: ${integration.id}\n`);

  // 2. Find or verify endpoint
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integration.id))
    .limit(1);

  if (!endpoint) {
    console.error("No endpoint found for this integration.");
    await client.end();
    return;
  }

  // 3. Seed baseline patterns (healthy integration)
  console.log("Step 1: Seeding baseline patterns (healthy state)...");
  await db.delete(patterns).where(eq(patterns.integrationId, integration.id));

  const patternData = [
    { metricName: "event_count", rollingAvg: 15.0, rollingStddev: 3.0, sampleCount: 600 },
    { metricName: "avg_response_ms", rollingAvg: 120, rollingStddev: 25, sampleCount: 600 },
    { metricName: "failure_rate", rollingAvg: 0.015, rollingStddev: 0.008, sampleCount: 600 },
    { metricName: "avg_payload_size", rollingAvg: 2200, rollingStddev: 350, sampleCount: 600 },
  ];

  for (const p of patternData) {
    await db.insert(patterns).values({
      integrationId: integration.id,
      metricName: p.metricName,
      rollingAvg: p.rollingAvg,
      rollingStddev: p.rollingStddev,
      sampleCount: p.sampleCount,
      lastUpdated: new Date(),
    });
  }
  console.log("  Baseline: 15 events/5min, 120ms response, 1.5% failure rate\n");

  // 4. Seed a past anomaly with diagnosis (for incident memory)
  console.log("Step 2: Seeding past incident (for incident memory)...");
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  await db.insert(anomalies).values({
    integrationId: integration.id,
    type: "failure_surge",
    severity: "high",
    diagnosis: {
      what: "Endpoint returned 503 for 82% of deliveries over 45 minutes due to database connection pool exhaustion.",
      why: "Customer endpoint's database connection pool was saturated during a traffic spike, causing the app server to return 503.",
      impact: "127 webhook events were delayed. $2,340 in payment events affected.",
      recommendation: "Customer increased their connection pool from 10 to 50 connections. Recovery took 45 minutes after the fix was deployed.",
      confidence: 0.85,
      crossCorrelation: null,
      resolution: "Customer scaled their database connection pool. Full recovery within 45 minutes.",
    },
    context: {},
    detectedAt: threeDaysAgo,
    resolvedAt: twoDaysAgo,
  });
  console.log("  Past incident: failure_surge 3 days ago (resolved)\n");

  // 5. Seed provider health data (to test cross-correlation)
  console.log("Step 3: Seeding provider health data...");
  await db.insert(providerHealth).values([
    {
      provider: integration.provider,
      metricName: "failure_rate",
      value: 0.02,
      sampleSize: 5000,
      measuredAt: new Date(),
    },
    {
      provider: integration.provider,
      metricName: "avg_response_ms",
      value: 95,
      sampleSize: 5000,
      measuredAt: new Date(),
    },
  ]);
  console.log(`  ${integration.provider} health: 2% failure rate, 95ms avg\n`);

  // 6. Inject failure scenario — endpoint going down
  console.log("Step 4: Injecting failure scenario (endpoint outage)...");
  const now = new Date();
  const eventIds: string[] = [];

  // Create 12 events in last 5 minutes
  for (let i = 0; i < 12; i++) {
    const receivedAt = new Date(now.getTime() - i * 25_000);
    const eventType =
      i < 4 ? "charge.succeeded" :
      i < 8 ? "invoice.paid" :
      "customer.subscription.created";

    const [evt] = await db
      .insert(events)
      .values({
        integrationId: integration.id,
        eventType,
        payload: {
          id: `evt_test_${Date.now()}_${i}`,
          type: eventType,
          data: {
            object: {
              id: `ch_test_${i}`,
              amount: 4999 + i * 100,
              currency: "usd",
            },
          },
          _test: true,
        },
        headers: { "stripe-signature": "t=test,v1=test" },
        receivedAt,
        signatureValid: true,
        providerEventId: `evt_test_agentic_${Date.now()}_${i}`,
        source: "webhook",
        amountCents: 4999 + i * 100,
      })
      .returning({ id: events.id });

    eventIds.push(evt.id);
  }

  // Create deliveries — 10/12 failing with mixed errors
  for (let i = 0; i < eventIds.length; i++) {
    const isFailed = i < 10;
    let errorType: "timeout" | "server_error" | "connection_refused" | null = null;
    let statusCode = 200;
    let responseTimeMs = 110 + Math.floor(Math.random() * 40);

    if (isFailed) {
      if (i < 7) {
        errorType = "server_error";
        statusCode = 503;
        responseTimeMs = 4500 + Math.floor(Math.random() * 3000);
      } else if (i < 9) {
        errorType = "timeout";
        statusCode = 0;
        responseTimeMs = 30000;
      } else {
        errorType = "connection_refused";
        statusCode = 0;
        responseTimeMs = 0;
      }
    }

    await db.insert(deliveries).values({
      eventId: eventIds[i],
      endpointId: endpoint.id,
      status: isFailed ? "failed" : "delivered",
      statusCode: statusCode || null,
      responseTimeMs,
      responseBody: isFailed ? "Service Unavailable" : '{"ok":true}',
      errorType,
      attemptNumber: 1,
      attemptedAt: new Date(now.getTime() - i * 25_000),
      deliveryType: "initial",
    });
  }

  console.log("  12 events, 10 failed (83% failure rate)");
  console.log("  Error mix: 7x 503, 2x timeout, 1x connection_refused");
  console.log("  Revenue at risk: ~$61 in payment events\n");

  // 7. Now run the actual diagnosis
  console.log("Step 5: Running agentic diagnosis...");
  console.log("  (Claude will investigate using 7 tools before diagnosing)\n");
  console.log("─".repeat(60));

  // Dynamic import to resolve @/ aliases through tsx
  const { detectAnomalies } = await import("../src/lib/ai/anomaly-detection.ts");
  const { diagnoseAnomaly } = await import("../src/lib/ai/diagnose.ts");

  // Run anomaly detection
  const detected = await detectAnomalies(integration.id);
  console.log(`\nAnomalies detected: ${detected.length}`);
  for (const a of detected) {
    console.log(`  - ${a.type} (${a.severity})`);
  }

  if (detected.length === 0) {
    console.log("\nNo anomalies detected. Check baseline patterns.");
    await client.end();
    return;
  }

  // Run AI diagnosis on the first anomaly
  const anomaly = detected[0];
  console.log(`\nDiagnosing: ${anomaly.type}...`);
  console.log("(This may take 15-30 seconds as Claude investigates)\n");

  const startTime = Date.now();
  const diagnosis = await diagnoseAnomaly(anomaly.context);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 8. Print results
  console.log("─".repeat(60));
  console.log("  DIAGNOSIS RESULTS");
  console.log("─".repeat(60));
  console.log(`\nTime: ${elapsed}s`);
  console.log(`Confidence: ${(diagnosis.confidence * 100).toFixed(0)}%`);

  console.log(`\nWhat: ${diagnosis.what}`);
  console.log(`\nWhy: ${diagnosis.why}`);
  console.log(`\nImpact: ${diagnosis.impact}`);
  console.log(`\nRecommendation: ${diagnosis.recommendation}`);

  if (diagnosis.crossCorrelation) {
    console.log(`\nCross-correlation: ${diagnosis.crossCorrelation}`);
  }
  if (diagnosis.predictedResolution) {
    console.log(`\nPredicted resolution: ${diagnosis.predictedResolution}`);
  }

  // Evidence trail
  console.log(`\n${"─".repeat(60)}`);
  console.log("  INVESTIGATION EVIDENCE");
  console.log("─".repeat(60));
  if (diagnosis.evidence.length > 0) {
    for (const step of diagnosis.evidence) {
      console.log(`\n  Tool: ${step.tool}`);
      console.log(`  Query: ${JSON.stringify(step.query)}`);
      console.log(`  Finding: ${step.finding}`);
    }
  } else {
    console.log("  (No investigation steps — used fallback mode)");
  }

  // Severity assessment
  console.log(`\n${"─".repeat(60)}`);
  console.log("  SEVERITY ASSESSMENT");
  console.log("─".repeat(60));
  const sev = diagnosis.severityAssessment;
  console.log(`  Events affected: ${sev.eventsAffected}`);
  console.log(`  Revenue at risk: ${sev.revenueAtRisk !== null ? `$${(sev.revenueAtRisk / 100).toFixed(2)}` : "unknown"}`);
  console.log(`  Est. recovery: ${sev.estimatedRecoveryMinutes !== null ? `${sev.estimatedRecoveryMinutes} minutes` : "unknown"}`);

  // Remediation actions
  if (diagnosis.remediationActions.length > 0) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("  SUGGESTED ACTIONS");
    console.log("─".repeat(60));
    for (const action of diagnosis.remediationActions) {
      console.log(`  [${action.type}] ${action.reason}`);
    }
  }

  // Similar incidents
  if (diagnosis.similarIncidents.length > 0) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("  INCIDENT MEMORY");
    console.log("─".repeat(60));
    for (const inc of diagnosis.similarIncidents) {
      console.log(`  [${inc.detectedAt.toISOString?.() ?? inc.detectedAt}] ${inc.diagnosisSummary}`);
      if (inc.resolution) {
        console.log(`    Resolution: ${inc.resolution}`);
      }
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("  TEST COMPLETE");
  console.log("─".repeat(60));

  // Cleanup test data
  console.log("\nCleaning up test events...");
  for (const eventId of eventIds) {
    await db.delete(deliveries).where(eq(deliveries.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));
  }
  console.log("Done.");

  await client.end();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
