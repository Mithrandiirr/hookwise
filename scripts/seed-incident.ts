/**
 * Seeds a realistic incident scenario into your REAL integration
 * so you can see anomalies in the dashboard UI.
 *
 * 1. Builds a healthy baseline (300 events + patterns)
 * 2. Simulates endpoint degradation (503s, timeouts)
 * 3. Runs anomaly detection → Claude AI diagnosis
 * 4. Stores anomalies in DB → visible at /anomalies
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });
const db = drizzle(client, { schema });

// ──── Your real IDs ─────────────────────────────────────
const INTEGRATION_ID = "ef2d457f-34a2-4337-a97e-e6359065ee4b";
const ENDPOINT_ID = "6bf23abe-68aa-443f-9410-7493926eb42a";
const USER_ID = "70382443-36d9-47b0-8f0b-8e327ccf11cf";

function log(msg: string) { console.log(`\x1b[36m  →\x1b[0m ${msg}`); }
function ok(msg: string) { console.log(`\x1b[32m  ✓\x1b[0m ${msg}`); }

async function main() {
  console.log("\n\x1b[1m\x1b[36m╔═══════════════════════════════════════════════╗");
  console.log("║  Seeding real incident for dashboard testing  ║");
  console.log("╚═══════════════════════════════════════════════╝\x1b[0m\n");

  // ─── Step 1: Build healthy baseline events ────────────
  console.log("\x1b[1m\x1b[33m[1/5] Building healthy baseline (300 events)...\x1b[0m");

  const eventTypes = [
    "charge.succeeded", "charge.succeeded", "charge.succeeded",
    "payment_intent.succeeded", "payment_intent.succeeded",
    "invoice.paid", "invoice.paid",
    "customer.created",
    "charge.refunded",
    "checkout.session.completed",
  ];

  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (let i = 0; i < 300; i++) {
    const eventType = eventTypes[i % eventTypes.length];
    const receivedAt = new Date(now - twoWeeksMs + (i * (twoWeeksMs / 300)));
    const responseTime = 100 + Math.floor(Math.random() * 120);
    const succeeded = Math.random() > 0.02;

    const [evt] = await db.insert(schema.events).values({
      integrationId: INTEGRATION_ID,
      eventType,
      payload: {
        id: `evt_baseline_${i}`,
        type: eventType,
        created: Math.floor(receivedAt.getTime() / 1000),
        data: { object: { id: `pi_${i}`, customer: `cus_${i % 25}`, amount: 1000 + Math.floor(Math.random() * 50000), currency: "usd" } },
      },
      headers: { "stripe-signature": "t=...,v1=..." },
      receivedAt,
      signatureValid: true,
      providerEventId: `evt_baseline_${i}`,
      source: "webhook",
    }).returning();

    await db.insert(schema.deliveries).values({
      eventId: evt.id,
      endpointId: ENDPOINT_ID,
      status: succeeded ? "delivered" : "failed",
      statusCode: succeeded ? 200 : 500,
      responseTimeMs: responseTime,
      responseBody: succeeded ? '{"ok":true}' : '{"error":"internal"}',
      errorType: succeeded ? null : "server_error",
      attemptNumber: 1,
      attemptedAt: new Date(receivedAt.getTime() + responseTime),
    });

    if ((i + 1) % 100 === 0) log(`${i + 1}/300 baseline events`);
  }
  ok("300 healthy events inserted (98% success, ~150ms)");

  // ─── Step 2: Build patterns ───────────────────────────
  console.log("\n\x1b[1m\x1b[33m[2/5] Running pattern learning (building baseline)...\x1b[0m");

  const { computePatterns } = await import("../src/lib/ai/patterns");
  for (let i = 0; i < 40; i++) {
    await computePatterns(INTEGRATION_ID);
  }

  // Set sample count high enough for detection gate
  await db.update(schema.patterns)
    .set({ sampleCount: 300 })
    .where(eq(schema.patterns.integrationId, INTEGRATION_ID));

  // Learn payload schemas too
  const { updatePayloadSchema } = await import("../src/lib/ai/payload-schema");
  const sample = await db.select().from(schema.events)
    .where(eq(schema.events.integrationId, INTEGRATION_ID)).limit(15);
  for (const e of sample) {
    await updatePayloadSchema(INTEGRATION_ID, e.eventType, e.payload as Record<string, unknown>);
  }

  const patterns = await db.select().from(schema.patterns)
    .where(eq(schema.patterns.integrationId, INTEGRATION_ID));
  ok(`${patterns.length} pattern metrics established`);
  for (const p of patterns.filter(p => !p.metricName.includes(":") && !p.metricName.startsWith("event_type"))) {
    log(`${p.metricName}: avg=${p.rollingAvg.toFixed(2)}, stddev=${p.rollingStddev.toFixed(2)}`);
  }

  // ─── Step 3: Simulate incident ────────────────────────
  console.log("\n\x1b[1m\x1b[33m[3/5] Simulating endpoint degradation (last 5 minutes)...\x1b[0m");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  for (let i = 0; i < 35; i++) {
    const eventType = eventTypes[i % 5]; // mostly charges & payments
    const receivedAt = new Date(fiveMinAgo.getTime() + i * 8500);
    const isFail = Math.random() > 0.3;   // ~70% failing
    const isTimeout = !isFail && Math.random() > 0.6;
    const rt = isFail
      ? 3000 + Math.floor(Math.random() * 8000)
      : isTimeout
        ? 11000 + Math.floor(Math.random() * 4000)
        : 1800 + Math.floor(Math.random() * 2000);

    const [evt] = await db.insert(schema.events).values({
      integrationId: INTEGRATION_ID,
      eventType,
      payload: {
        id: `evt_incident_${i}`,
        type: eventType,
        created: Math.floor(receivedAt.getTime() / 1000),
        data: { object: { id: `pi_inc_${i}`, customer: `cus_${i % 8}`, amount: 2500 + Math.floor(Math.random() * 40000), currency: "usd" } },
      },
      headers: { "stripe-signature": "t=...,v1=..." },
      receivedAt,
      signatureValid: true,
      providerEventId: `evt_incident_${i}`,
      source: "webhook",
    }).returning();

    await db.insert(schema.deliveries).values({
      eventId: evt.id,
      endpointId: ENDPOINT_ID,
      status: (isFail || isTimeout) ? "failed" : "delivered",
      statusCode: isFail ? 503 : isTimeout ? null : 200,
      responseTimeMs: rt,
      responseBody: isFail ? "503 Service Unavailable" : isTimeout ? null : '{"ok":true}',
      errorType: isFail ? "server_error" : isTimeout ? "timeout" : null,
      attemptNumber: 1,
      attemptedAt: new Date(receivedAt.getTime() + rt),
    });
  }

  ok("35 degraded events injected (503s + timeouts, 3-15s response times)");

  // ─── Step 4: Detect anomalies + Claude diagnosis ──────
  console.log("\n\x1b[1m\x1b[33m[4/5] Running anomaly detection + AI diagnosis...\x1b[0m");

  const { detectAnomalies } = await import("../src/lib/ai/anomaly-detection");
  const detected = await detectAnomalies(INTEGRATION_ID);

  console.log(`\n  Detected \x1b[1m${detected.length}\x1b[0m anomaly(ies):\n`);

  if (detected.length === 0) {
    log("No anomalies detected from detection engine.");
    log("This can happen if the 5-minute window doesn't show enough deviation.");
    log("Inserting manually-crafted anomalies with AI diagnosis...\n");

    // Still call Claude for realistic diagnoses
    const { diagnoseAnomaly } = await import("../src/lib/ai/diagnose");
    const { AnomalyContext } = await import("../src/lib/ai/types") as any;

    // Build context manually from what we know
    const baseCtx = {
      integrationId: INTEGRATION_ID,
      integrationName: "Test stripe",
      provider: "stripe",
      baseline: {
        eventCount: 22, avgResponseMs: 150, failureRate: 0.02,
        stddevEventCount: 3, stddevResponseMs: 30, stddevFailureRate: 0.01, sampleCount: 300,
      },
      current: {
        eventCount: 35, avgResponseMs: 5400, failureRate: 0.7,
        eventTypeDistribution: { "charge.succeeded": 15, "payment_intent.succeeded": 10, "invoice.paid": 10 },
        timestamp: new Date().toISOString(),
      },
      recentEvents: [],
      recentDeliveries: [
        { statusCode: 503, responseTimeMs: 5200, errorType: "server_error", attemptedAt: new Date() },
        { statusCode: 503, responseTimeMs: 4800, errorType: "server_error", attemptedAt: new Date() },
        { statusCode: 503, responseTimeMs: 7100, errorType: "server_error", attemptedAt: new Date() },
        { statusCode: null, responseTimeMs: 11000, errorType: "timeout", attemptedAt: new Date() },
        { statusCode: 200, responseTimeMs: 2100, errorType: null, attemptedAt: new Date() },
      ],
      otherIntegrations: [],
    };

    // Failure surge
    const failCtx = { ...baseCtx, anomalyType: "failure_surge" as const, severity: "critical" as const };
    log("Calling Claude for failure_surge diagnosis...");
    const failDiag = await diagnoseAnomaly(failCtx);
    console.log(`\x1b[31m  ● FAILURE SURGE [critical]\x1b[0m`);
    console.log(`    What:   ${failDiag.what}`);
    console.log(`    Why:    ${failDiag.why}`);
    console.log(`    Impact: ${failDiag.impact}`);
    console.log(`    Action: ${failDiag.recommendation}`);
    console.log(`    Conf:   ${(failDiag.confidence * 100).toFixed(0)}%\n`);

    await db.insert(schema.anomalies).values({
      integrationId: INTEGRATION_ID,
      type: "failure_surge",
      severity: "critical",
      diagnosis: JSON.stringify(failDiag),
      context: failCtx,
      detectedAt: new Date(),
    });
    ok("Stored: failure_surge (critical)");

    // Response time spike
    const rtCtx = { ...baseCtx, anomalyType: "response_time_spike" as const, severity: "high" as const };
    log("Calling Claude for response_time_spike diagnosis...");
    const rtDiag = await diagnoseAnomaly(rtCtx);
    console.log(`\x1b[31m  ● RESPONSE TIME SPIKE [high]\x1b[0m`);
    console.log(`    What:   ${rtDiag.what}`);
    console.log(`    Why:    ${rtDiag.why}`);
    console.log(`    Impact: ${rtDiag.impact}`);
    console.log(`    Action: ${rtDiag.recommendation}`);
    console.log(`    Conf:   ${(rtDiag.confidence * 100).toFixed(0)}%\n`);

    await db.insert(schema.anomalies).values({
      integrationId: INTEGRATION_ID,
      type: "response_time_spike",
      severity: "high",
      diagnosis: JSON.stringify(rtDiag),
      context: rtCtx,
      detectedAt: new Date(Date.now() - 60000), // 1 min ago
    });
    ok("Stored: response_time_spike (high)");

    // Volume spike
    const volCtx = { ...baseCtx, anomalyType: "volume_spike" as const, severity: "medium" as const,
      current: { ...baseCtx.current, eventCount: 85 } };
    log("Calling Claude for volume_spike diagnosis...");
    const volDiag = await diagnoseAnomaly(volCtx);
    console.log(`\x1b[33m  ● VOLUME SPIKE [medium]\x1b[0m`);
    console.log(`    What:   ${volDiag.what}`);
    console.log(`    Why:    ${volDiag.why}`);
    console.log(`    Impact: ${volDiag.impact}`);
    console.log(`    Action: ${volDiag.recommendation}`);
    console.log(`    Conf:   ${(volDiag.confidence * 100).toFixed(0)}%\n`);

    await db.insert(schema.anomalies).values({
      integrationId: INTEGRATION_ID,
      type: "volume_spike",
      severity: "medium",
      diagnosis: JSON.stringify(volDiag),
      context: volCtx,
      detectedAt: new Date(Date.now() - 120000), // 2 min ago
    });
    ok("Stored: volume_spike (medium)");

  } else {
    // Real detection worked — diagnose each one
    const { diagnoseAnomaly } = await import("../src/lib/ai/diagnose");

    for (const anomaly of detected) {
      const sevColor = anomaly.severity === "critical" ? "\x1b[31m" : anomaly.severity === "high" ? "\x1b[31m" : "\x1b[33m";
      console.log(`${sevColor}  ● ${anomaly.type.toUpperCase()} [${anomaly.severity}]\x1b[0m`);

      log("Calling Claude API...");
      const diagnosis = await diagnoseAnomaly(anomaly.context);

      console.log(`    What:   ${diagnosis.what}`);
      console.log(`    Why:    ${diagnosis.why}`);
      console.log(`    Impact: ${diagnosis.impact}`);
      console.log(`    Action: ${diagnosis.recommendation}`);
      console.log(`    Conf:   ${(diagnosis.confidence * 100).toFixed(0)}%\n`);

      await db.insert(schema.anomalies).values({
        integrationId: INTEGRATION_ID,
        type: anomaly.type,
        severity: anomaly.severity,
        diagnosis: JSON.stringify(diagnosis),
        context: anomaly.context,
        detectedAt: new Date(),
      });
      ok(`Stored: ${anomaly.type} (${anomaly.severity})`);
    }
  }

  // ─── Step 5: Set up alert config ──────────────────────
  console.log("\n\x1b[1m\x1b[33m[5/5] Setting up alert configs...\x1b[0m");

  // Check if configs already exist
  const existingConfigs = await db.select().from(schema.alertConfigs)
    .where(eq(schema.alertConfigs.integrationId, INTEGRATION_ID));
  if (existingConfigs.length === 0) {
    await db.insert(schema.alertConfigs).values({
      integrationId: INTEGRATION_ID,
      channel: "email",
      destination: "dev@acme.com",
      threshold: 2,
      enabled: true,
    });
    await db.insert(schema.alertConfigs).values({
      integrationId: INTEGRATION_ID,
      channel: "slack",
      destination: "https://hooks.slack.com/services/...",
      threshold: 3,
      enabled: true,
    });
    ok("Alert configs created: email (medium+), slack (high+)");
  } else {
    ok(`${existingConfigs.length} alert config(s) already exist`);
  }

  // ─── Done ─────────────────────────────────────────────
  const [anomalyCount] = await db.select({ c: count() }).from(schema.anomalies)
    .where(eq(schema.anomalies.integrationId, INTEGRATION_ID));

  console.log("\n\x1b[1m\x1b[32m╔═══════════════════════════════════════════════╗");
  console.log(`║  Done! ${anomalyCount.c} anomalies ready in the dashboard      ║`);
  console.log("║                                               ║");
  console.log("║  Open your browser:                           ║");
  console.log("║    → /anomalies          (anomaly timeline)   ║");
  console.log("║    → /anomalies/:id      (full AI diagnosis)  ║");
  console.log("║    → /dashboard          (anomaly stat card)  ║");
  console.log("║    → /integrations/:id   (anomalies section)  ║");
  console.log("╚═══════════════════════════════════════════════╝\x1b[0m\n");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n\x1b[31mFATAL:\x1b[0m", err);
  process.exit(1);
});
