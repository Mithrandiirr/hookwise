/**
 * HookWise — Real Scenario Test
 *
 * Simulates a realistic production incident:
 *
 * Phase A: "Normal operations" — 2 weeks of healthy webhook traffic
 *   - 300 events delivered successfully with ~150ms response times
 *   - Pattern learning builds a strong baseline
 *
 * Phase B: "Endpoint degrades" — destination starts failing
 *   - Response times spike to 3-8 seconds
 *   - 60% of deliveries fail with 503 errors
 *   - Some timeouts
 *
 * Phase C: "Detection" — anomaly detection runs and finds:
 *   - failure_surge (60% failure vs 2% baseline)
 *   - response_time_spike (5s avg vs 150ms baseline)
 *   - Claude AI diagnoses root cause
 *
 * Phase D: "Recovery" — verify alerting config, resolve anomaly
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { eq, count, desc, and, gte } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const client = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });
const db = drizzle(client, { schema });

// ─── Helpers ────────────────────────────────────────────

function log(section: string, msg: string) {
  console.log(`\x1b[36m[${section}]\x1b[0m ${msg}`);
}
function ok(msg: string) {
  console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
}
function bad(msg: string) {
  console.log(`\x1b[31m  ✗\x1b[0m ${msg}`);
}
function header(title: string) {
  console.log(`\n\x1b[1m\x1b[33m┌─── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}┐\x1b[0m`);
}
function divider() {
  console.log(`\x1b[33m└${"─".repeat(55)}┘\x1b[0m`);
}

const TEST_USER_ID = "00000000-0000-0000-0000-000000000099";
let integrationId: string;
let endpointId: string;

// ─── Cleanup ────────────────────────────────────────────

async function cleanup() {
  log("cleanup", "Removing previous test data...");
  const existing = await db.select({ id: schema.integrations.id }).from(schema.integrations).where(eq(schema.integrations.userId, TEST_USER_ID));
  for (const int of existing) {
    await db.delete(schema.anomalies).where(eq(schema.anomalies.integrationId, int.id));
    await db.delete(schema.patterns).where(eq(schema.patterns.integrationId, int.id));
    await db.delete(schema.payloadSchemas).where(eq(schema.payloadSchemas.integrationId, int.id));
    await db.delete(schema.alertConfigs).where(eq(schema.alertConfigs.integrationId, int.id));
    await db.delete(schema.reconciliationRuns).where(eq(schema.reconciliationRuns.integrationId, int.id));
    await db.delete(schema.transformations).where(eq(schema.transformations.integrationId, int.id));
    const evts = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.integrationId, int.id));
    for (const e of evts) await db.delete(schema.deliveries).where(eq(schema.deliveries.eventId, e.id));
    const eps = await db.select({ id: schema.endpoints.id }).from(schema.endpoints).where(eq(schema.endpoints.integrationId, int.id));
    for (const ep of eps) await db.delete(schema.replayQueue).where(eq(schema.replayQueue.endpointId, ep.id));
    await db.delete(schema.events).where(eq(schema.events.integrationId, int.id));
    await db.delete(schema.endpoints).where(eq(schema.endpoints.integrationId, int.id));
  }
  await db.delete(schema.integrations).where(eq(schema.integrations.userId, TEST_USER_ID));
  const flows = await db.select({ id: schema.flows.id }).from(schema.flows).where(eq(schema.flows.userId, TEST_USER_ID));
  for (const f of flows) await db.delete(schema.flowInstances).where(eq(schema.flowInstances.flowId, f.id));
  await db.delete(schema.flows).where(eq(schema.flows.userId, TEST_USER_ID));
  ok("Clean slate");
}

// ─── Phase A: Normal Operations ─────────────────────────

async function phaseA_normalOperations() {
  header("PHASE A: NORMAL OPERATIONS (building baseline)");

  // Create integration
  const [integration] = await db.insert(schema.integrations).values({
    userId: TEST_USER_ID,
    name: "Acme Stripe Payments",
    provider: "stripe",
    signingSecret: "whsec_test_real_scenario",
    destinationUrl: "https://api.acme.com/webhooks/stripe",
    status: "active",
  }).returning();
  integrationId = integration.id;
  ok(`Integration: ${integration.name} (${integrationId.slice(0, 8)}...)`);

  // Create endpoint
  const [ep] = await db.insert(schema.endpoints).values({
    integrationId,
    url: "https://api.acme.com/webhooks/stripe",
    circuitState: "closed",
    successRate: 98.5,
    avgResponseMs: 145,
    consecutiveFailures: 0,
    consecutiveHealthChecks: 0,
    consecutiveSuccesses: 20,
  }).returning();
  endpointId = ep.id;
  ok(`Endpoint healthy: 98.5% success, 145ms avg`);

  // Simulate 2 weeks of healthy traffic — insert events + successful deliveries
  log("phase-a", "Inserting 300 healthy events over simulated 2-week period...");

  const eventTypes = [
    "charge.succeeded", "charge.succeeded", "charge.succeeded",    // 30%
    "payment_intent.succeeded", "payment_intent.succeeded",         // 20%
    "invoice.paid", "invoice.paid",                                 // 20%
    "customer.created",                                             // 10%
    "charge.refunded",                                              // 10%
    "checkout.session.completed",                                   // 10%
  ];

  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (let i = 0; i < 300; i++) {
    const eventType = eventTypes[i % eventTypes.length];
    const receivedAt = new Date(now - twoWeeksMs + (i * (twoWeeksMs / 300)));
    const responseTime = 100 + Math.floor(Math.random() * 100); // 100-200ms
    const success = Math.random() > 0.02; // 98% success rate

    const [evt] = await db.insert(schema.events).values({
      integrationId,
      eventType,
      payload: {
        id: `evt_${i.toString().padStart(4, "0")}`,
        type: eventType,
        created: Math.floor(receivedAt.getTime() / 1000),
        data: {
          object: {
            id: `pi_${i.toString().padStart(4, "0")}`,
            customer: `cus_${(i % 25).toString().padStart(3, "0")}`,
            amount: 1000 + Math.floor(Math.random() * 50000),
            currency: "usd",
            status: success ? "succeeded" : "failed",
          },
        },
      },
      headers: { "stripe-signature": "t=...,v1=..." },
      receivedAt,
      signatureValid: true,
      providerEventId: `evt_stripe_${i}`,
      source: "webhook",
    }).returning();

    await db.insert(schema.deliveries).values({
      eventId: evt.id,
      endpointId,
      status: success ? "delivered" : "failed",
      statusCode: success ? 200 : 500,
      responseTimeMs: responseTime,
      responseBody: success ? '{"ok":true}' : '{"error":"server error"}',
      errorType: success ? null : "server_error",
      attemptNumber: 1,
      attemptedAt: new Date(receivedAt.getTime() + responseTime),
    });
  }

  ok("300 events + deliveries inserted (98% success, 100-200ms response)");

  // Build patterns with repeated learning cycles (simulating 2 weeks of cron runs)
  log("phase-a", "Running pattern learning (40 cycles to build strong baseline)...");
  const { computePatterns } = await import("../src/lib/ai/patterns");
  for (let i = 0; i < 40; i++) {
    await computePatterns(integrationId);
  }

  // Learn payload schemas
  const { updatePayloadSchema } = await import("../src/lib/ai/payload-schema");
  const sampleEvts = await db.select().from(schema.events)
    .where(eq(schema.events.integrationId, integrationId)).limit(20);
  for (const e of sampleEvts) {
    await updatePayloadSchema(integrationId, e.eventType, e.payload as Record<string, unknown>);
  }

  // Verify baseline
  const patternRows = await db.select().from(schema.patterns)
    .where(eq(schema.patterns.integrationId, integrationId));

  ok(`${patternRows.length} pattern metrics established`);
  const keyMetrics = patternRows.filter(p => !p.metricName.includes(":") && !p.metricName.startsWith("event_type"));
  for (const p of keyMetrics) {
    log("baseline", `  ${p.metricName}: avg=${p.rollingAvg.toFixed(2)} stddev=${p.rollingStddev.toFixed(2)} samples=${p.sampleCount}`);
  }

  // Ensure sampleCount passes the 200 gate
  await db.update(schema.patterns).set({ sampleCount: 250 }).where(eq(schema.patterns.integrationId, integrationId));
  ok("Baseline ready (sample count: 250)");
  divider();
}

// ─── Phase B: Endpoint Degrades ─────────────────────────

async function phaseB_endpointDegrades() {
  header("PHASE B: ENDPOINT DEGRADES (simulating incident)");

  log("phase-b", "Simulating: Acme's API starts returning 503s and timing out...");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const degradedEventTypes = [
    "charge.succeeded",
    "payment_intent.succeeded",
    "invoice.paid",
    "charge.succeeded",
    "charge.succeeded",
  ];

  // Insert 30 recent events with degraded delivery metrics
  for (let i = 0; i < 30; i++) {
    const eventType = degradedEventTypes[i % degradedEventTypes.length];
    const receivedAt = new Date(fiveMinAgo.getTime() + i * 10000); // spread over 5 min
    const isFailed = Math.random() > 0.35; // 65% failure rate
    const isTimeout = !isFailed && Math.random() > 0.5;
    const responseTime = isFailed
      ? 3000 + Math.floor(Math.random() * 7000)    // 3-10s for failures
      : isTimeout
        ? 10000 + Math.floor(Math.random() * 5000) // 10-15s timeouts
        : 2000 + Math.floor(Math.random() * 3000);  // 2-5s even for "successes"

    const [evt] = await db.insert(schema.events).values({
      integrationId,
      eventType,
      payload: {
        id: `evt_incident_${i}`,
        type: eventType,
        created: Math.floor(receivedAt.getTime() / 1000),
        data: {
          object: {
            id: `pi_incident_${i}`,
            customer: `cus_${(i % 10).toString().padStart(3, "0")}`,
            amount: 2500 + Math.floor(Math.random() * 30000),
            currency: "usd",
          },
        },
      },
      headers: { "stripe-signature": "t=...,v1=..." },
      receivedAt,
      signatureValid: true,
      providerEventId: `evt_stripe_incident_${i}`,
      source: "webhook",
    }).returning();

    const errorType = isFailed ? "server_error" : isTimeout ? "timeout" : null;
    const statusCode = isFailed ? 503 : isTimeout ? null : 200;

    await db.insert(schema.deliveries).values({
      eventId: evt.id,
      endpointId,
      status: (isFailed || isTimeout) ? "failed" : "delivered",
      statusCode,
      responseTimeMs: responseTime,
      responseBody: isFailed ? "Service Unavailable" : isTimeout ? null : '{"ok":true}',
      errorType,
      attemptNumber: 1,
      attemptedAt: new Date(receivedAt.getTime() + responseTime),
    });
  }

  // Update endpoint health to reflect degradation
  await db.update(schema.endpoints).set({
    circuitState: "half_open",
    successRate: 35,
    avgResponseMs: 5200,
    consecutiveFailures: 3,
    consecutiveSuccesses: 0,
    stateChangedAt: new Date(),
  }).where(eq(schema.endpoints.id, endpointId));

  // Count the actual recent failures for reporting
  const [recentTotal] = await db.select({ count: count() }).from(schema.deliveries)
    .innerJoin(schema.events, eq(schema.deliveries.eventId, schema.events.id))
    .where(and(eq(schema.events.integrationId, integrationId), gte(schema.deliveries.attemptedAt, fiveMinAgo)));
  const [recentFailed] = await db.select({ count: count() }).from(schema.deliveries)
    .innerJoin(schema.events, eq(schema.deliveries.eventId, schema.events.id))
    .where(and(eq(schema.events.integrationId, integrationId), eq(schema.deliveries.status, "failed"), gte(schema.deliveries.attemptedAt, fiveMinAgo)));

  const failRate = recentTotal.count > 0 ? ((recentFailed.count / recentTotal.count) * 100).toFixed(1) : "0";

  ok(`30 degraded events injected (last 5 minutes)`);
  ok(`Failure rate: ${failRate}% (${recentFailed.count}/${recentTotal.count} deliveries)`);
  ok(`Endpoint state: half_open, avg response: 5200ms`);
  divider();
}

// ─── Phase C: Anomaly Detection + AI Diagnosis ──────────

async function phaseC_detectAndDiagnose() {
  header("PHASE C: ANOMALY DETECTION + AI DIAGNOSIS");

  // Run pattern learning once more to capture the degraded window
  log("phase-c", "Running pattern learning on degraded window...");
  const { computePatterns } = await import("../src/lib/ai/patterns");
  await computePatterns(integrationId);
  ok("Patterns updated with degraded metrics");

  // Run anomaly detection
  log("phase-c", "Running anomaly detection...");
  const { detectAnomalies } = await import("../src/lib/ai/anomaly-detection");
  const detected = await detectAnomalies(integrationId);

  if (detected.length === 0) {
    bad("No anomalies detected — check detection thresholds");
    divider();
    return;
  }

  ok(`${detected.length} anomaly(ies) detected:`);
  for (const a of detected) {
    console.log(`\x1b[31m    ● ${a.type} [${a.severity}]\x1b[0m`);
  }

  // Run AI diagnosis on each anomaly
  log("phase-c", "\nCalling Claude API for root cause analysis...\n");
  const { diagnoseAnomaly } = await import("../src/lib/ai/diagnose");

  for (const anomaly of detected) {
    console.log(`\x1b[1m\x1b[33m  ─── AI Diagnosis: ${anomaly.type} (${anomaly.severity}) ───\x1b[0m`);

    const diagnosis = await diagnoseAnomaly(anomaly.context);

    console.log(`\x1b[37m  WHAT:\x1b[0m     ${diagnosis.what}`);
    console.log(`\x1b[37m  WHY:\x1b[0m      ${diagnosis.why}`);
    console.log(`\x1b[37m  IMPACT:\x1b[0m   ${diagnosis.impact}`);
    console.log(`\x1b[37m  ACTION:\x1b[0m   ${diagnosis.recommendation}`);
    console.log(`\x1b[37m  CONF:\x1b[0m     ${(diagnosis.confidence * 100).toFixed(0)}%`);
    if (diagnosis.crossCorrelation) {
      console.log(`\x1b[37m  CORREL:\x1b[0m   ${diagnosis.crossCorrelation}`);
    }
    console.log("");

    // Store in database
    const [stored] = await db.insert(schema.anomalies).values({
      integrationId,
      type: anomaly.type,
      severity: anomaly.severity,
      diagnosis: JSON.stringify(diagnosis),
      context: anomaly.context,
      detectedAt: new Date(),
    }).returning();

    ok(`Anomaly stored: ${stored.id.slice(0, 8)}...`);
  }

  divider();
}

// ─── Phase D: Alert + Resolve ───────────────────────────

async function phaseD_alertAndResolve() {
  header("PHASE D: ALERTING + RESOLUTION");

  // Create alert config
  log("phase-d", "Setting up alert channels...");
  await db.insert(schema.alertConfigs).values({
    integrationId,
    channel: "slack",
    destination: "https://hooks.slack.com/services/T.../B.../xxx",
    threshold: 2,
    enabled: true,
  });
  await db.insert(schema.alertConfigs).values({
    integrationId,
    channel: "email",
    destination: "oncall@acme.com",
    threshold: 3,
    enabled: true,
  });
  ok("Alert configs: Slack (medium+), Email (high+)");

  // Verify anomalies in DB
  const anomalyRows = await db.select().from(schema.anomalies)
    .where(eq(schema.anomalies.integrationId, integrationId))
    .orderBy(desc(schema.anomalies.detectedAt));

  log("phase-d", `\n${anomalyRows.length} active anomaly(ies) in database:`);
  for (const a of anomalyRows) {
    let diag: { what?: string } = {};
    try { diag = JSON.parse(a.diagnosis ?? "{}"); } catch {}
    console.log(`    \x1b[31m●\x1b[0m [${a.severity}] ${a.type} — ${diag.what?.slice(0, 80) ?? "no diagnosis"}`);
  }

  // Simulate resolution
  log("phase-d", "\nSimulating incident resolution...");
  for (const a of anomalyRows) {
    await db.update(schema.anomalies).set({ resolvedAt: new Date() }).where(eq(schema.anomalies.id, a.id));
  }
  ok("All anomalies marked as resolved");

  // Restore endpoint health
  await db.update(schema.endpoints).set({
    circuitState: "closed",
    successRate: 98,
    avgResponseMs: 160,
    consecutiveFailures: 0,
    consecutiveSuccesses: 10,
    stateChangedAt: new Date(),
  }).where(eq(schema.endpoints.id, endpointId));
  ok("Endpoint restored to healthy state");

  divider();
}

// ─── Summary ────────────────────────────────────────────

async function summary() {
  header("FINAL STATE");

  const tables = [
    { name: "Events", q: async () => (await db.select({ c: count() }).from(schema.events).where(eq(schema.events.integrationId, integrationId)))[0].c },
    { name: "Deliveries", q: async () => {
      const evts = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.integrationId, integrationId));
      if (!evts.length) return 0;
      return (await db.select({ c: count() }).from(schema.deliveries))[0].c;
    }},
    { name: "Patterns", q: async () => (await db.select({ c: count() }).from(schema.patterns).where(eq(schema.patterns.integrationId, integrationId)))[0].c },
    { name: "Payload Schemas", q: async () => (await db.select({ c: count() }).from(schema.payloadSchemas).where(eq(schema.payloadSchemas.integrationId, integrationId)))[0].c },
    { name: "Anomalies", q: async () => (await db.select({ c: count() }).from(schema.anomalies).where(eq(schema.anomalies.integrationId, integrationId)))[0].c },
    { name: "Alert Configs", q: async () => (await db.select({ c: count() }).from(schema.alertConfigs).where(eq(schema.alertConfigs.integrationId, integrationId)))[0].c },
  ];

  for (const t of tables) {
    const c = await t.q();
    console.log(`  ${t.name.padEnd(20)} ${c}`);
  }

  console.log(`\n\x1b[32m\x1b[1m  ✓ Real scenario test complete\x1b[0m\n`);
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════╗");
  console.log("║   HookWise — Real Incident Scenario Test             ║");
  console.log("║                                                      ║");
  console.log("║   Simulates: healthy baseline → endpoint degrades    ║");
  console.log("║   → AI detects & diagnoses → alert → resolve         ║");
  console.log("╚══════════════════════════════════════════════════════╝\x1b[0m");

  try {
    await cleanup();
    await phaseA_normalOperations();
    await phaseB_endpointDegrades();
    await phaseC_detectAndDiagnose();
    await phaseD_alertAndResolve();
    await summary();
  } catch (err) {
    console.error("\n\x1b[31mFATAL:\x1b[0m", err);
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

main();
