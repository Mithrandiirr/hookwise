/**
 * HookWise — Dashboard Seed Script
 *
 * Seeds the database with realistic data for a real user so every
 * dashboard page is populated with meaningful content.
 *
 * Usage: bun run scripts/seed-dashboard.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as schema from "../src/lib/db/schema";
import { db } from "../src/lib/db";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";

// ─── Config ──────────────────────────────────────────────
const USER_ID = "70382443-36d9-47b0-8f0b-8e327ccf11cf";

function log(section: string, msg: string) {
  console.log(`\x1b[36m[${section}]\x1b[0m ${msg}`);
}
function ok(msg: string) {
  console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
}
function header(title: string) {
  console.log(`\n\x1b[1m\x1b[33m┌─── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}┐\x1b[0m`);
}
function divider() {
  console.log(`\x1b[33m└${"─".repeat(60)}┘\x1b[0m`);
}

// ─── Helpers ─────────────────────────────────────────────

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function integrityHash(action: string, details: object, prev: string) {
  return crypto.createHash("sha256").update(prev + action + JSON.stringify(details)).digest("hex");
}

// ─── Cleanup ─────────────────────────────────────────────

async function cleanup() {
  header("CLEANUP");
  log("cleanup", "Removing existing data for your user...");

  const existing = await db.select({ id: schema.integrations.id })
    .from(schema.integrations)
    .where(eq(schema.integrations.userId, USER_ID));
  const existingIds = existing.map((e) => e.id);

  if (existingIds.length > 0) {
    // Get dependent IDs
    const evtRows = await db.select({ id: schema.events.id }).from(schema.events)
      .where(inArray(schema.events.integrationId, existingIds));
    const evtIds = evtRows.map((e) => e.id);

    const epRows = await db.select({ id: schema.endpoints.id }).from(schema.endpoints)
      .where(inArray(schema.endpoints.integrationId, existingIds));
    const epIds = epRows.map((e) => e.id);

    // Delete in dependency order
    if (epIds.length > 0) {
      const scanRows = await db.select({ id: schema.securityScans.id }).from(schema.securityScans)
        .where(inArray(schema.securityScans.endpointId, epIds));
      const scanIds = scanRows.map((s) => s.id);
      if (scanIds.length > 0) {
        await db.delete(schema.securityFindings).where(inArray(schema.securityFindings.scanId, scanIds));
      }
      await db.delete(schema.securityScans).where(inArray(schema.securityScans.endpointId, epIds));
      await db.delete(schema.replayQueue).where(inArray(schema.replayQueue.endpointId, epIds));
    }
    if (evtIds.length > 0) {
      await db.delete(schema.deliveries).where(inArray(schema.deliveries.eventId, evtIds));
    }

    await db.delete(schema.events).where(inArray(schema.events.integrationId, existingIds));
    await db.delete(schema.anomalies).where(inArray(schema.anomalies.integrationId, existingIds));
    await db.delete(schema.patterns).where(inArray(schema.patterns.integrationId, existingIds));
    await db.delete(schema.payloadSchemas).where(inArray(schema.payloadSchemas.integrationId, existingIds));
    await db.delete(schema.alertConfigs).where(inArray(schema.alertConfigs.integrationId, existingIds));
    await db.delete(schema.reconciliationRuns).where(inArray(schema.reconciliationRuns.integrationId, existingIds));
    await db.delete(schema.transformations).where(inArray(schema.transformations.integrationId, existingIds));
    await db.delete(schema.idempotencyLog).where(inArray(schema.idempotencyLog.integrationId, existingIds));
    await db.delete(schema.sequencerRules).where(inArray(schema.sequencerRules.integrationId, existingIds));
    await db.delete(schema.endpoints).where(inArray(schema.endpoints.integrationId, existingIds));
    await db.delete(schema.integrations).where(eq(schema.integrations.userId, USER_ID));
  }

  // User-scoped tables
  await db.delete(schema.auditLog).where(eq(schema.auditLog.userId, USER_ID));
  await db.delete(schema.complianceExports).where(eq(schema.complianceExports.userId, USER_ID));
  await db.delete(schema.intelligenceReports).where(eq(schema.intelligenceReports.userId, USER_ID));
  const flowRows = await db.select({ id: schema.flows.id }).from(schema.flows)
    .where(eq(schema.flows.userId, USER_ID));
  if (flowRows.length > 0) {
    await db.delete(schema.flowInstances).where(inArray(schema.flowInstances.flowId, flowRows.map((f) => f.id)));
  }
  await db.delete(schema.flows).where(eq(schema.flows.userId, USER_ID));

  ok("Clean slate");
  divider();
}

// ─── Seed Integrations + Endpoints ───────────────────────

interface SeedIntegration {
  id: string;
  endpointId: string;
  name: string;
  provider: "stripe" | "shopify" | "github";
  destinationUrl: string;
  circuitState: "closed" | "half_open" | "open";
  successRate: number;
  avgResponseMs: number;
}

const seedIntegrations: SeedIntegration[] = [];

async function createIntegrations() {
  header("INTEGRATIONS + ENDPOINTS");

  const configs = [
    {
      name: "Production Stripe Payments",
      provider: "stripe" as const,
      destination: "https://api.myapp.com/webhooks/stripe",
      circuit: "closed" as const,
      successRate: 99.2,
      avgMs: 142,
      consecutiveFailures: 0,
      consecutiveSuccesses: 85,
    },
    {
      name: "Shopify Orders (US Store)",
      provider: "shopify" as const,
      destination: "https://api.myapp.com/webhooks/shopify",
      circuit: "half_open" as const,
      successRate: 78.5,
      avgMs: 890,
      consecutiveFailures: 2,
      consecutiveSuccesses: 0,
    },
    {
      name: "Stripe Connect Payouts",
      provider: "stripe" as const,
      destination: "https://api.myapp.com/webhooks/stripe-connect",
      circuit: "closed" as const,
      successRate: 97.8,
      avgMs: 210,
      consecutiveFailures: 0,
      consecutiveSuccesses: 42,
    },
    {
      name: "GitHub CI/CD Webhooks",
      provider: "github" as const,
      destination: "https://api.myapp.com/webhooks/github",
      circuit: "open" as const,
      successRate: 12.0,
      avgMs: 8500,
      consecutiveFailures: 15,
      consecutiveSuccesses: 0,
    },
  ];

  for (const c of configs) {
    const [integration] = await db.insert(schema.integrations).values({
      userId: USER_ID,
      name: c.name,
      provider: c.provider,
      signingSecret: `whsec_seed_${c.provider}_${Date.now()}`,
      destinationUrl: c.destination,
      status: c.circuit === "open" ? "error" : "active",
      idempotencyEnabled: true,
      enrichmentEnabled: c.provider === "stripe",
      sequencerEnabled: c.provider === "shopify",
    }).returning();

    const [endpoint] = await db.insert(schema.endpoints).values({
      integrationId: integration.id,
      url: c.destination,
      circuitState: c.circuit,
      successRate: c.successRate,
      avgResponseMs: c.avgMs,
      consecutiveFailures: c.consecutiveFailures,
      consecutiveSuccesses: c.consecutiveSuccesses,
      consecutiveHealthChecks: c.circuit === "closed" ? 10 : 0,
      healthScore: c.successRate,
      stateChangedAt: c.circuit === "closed" ? daysAgo(3) : minutesAgo(25),
    }).returning();

    seedIntegrations.push({
      id: integration.id,
      endpointId: endpoint.id,
      name: c.name,
      provider: c.provider,
      destinationUrl: c.destination,
      circuitState: c.circuit,
      successRate: c.successRate,
      avgResponseMs: c.avgMs,
    });

    ok(`${c.name} [${c.provider}] — ${c.circuit} (${c.successRate}%)`);
  }

  divider();
}

// ─── Seed Events + Deliveries ────────────────────────────

const stripeEventTypes = [
  "charge.succeeded", "charge.failed", "charge.refunded",
  "payment_intent.succeeded", "payment_intent.created",
  "invoice.paid", "invoice.payment_failed",
  "customer.created", "customer.updated",
  "checkout.session.completed",
];

const shopifyEventTypes = [
  "orders/create", "orders/updated", "orders/paid",
  "products/update", "customers/create",
  "checkouts/create", "refunds/create",
];

const githubEventTypes = [
  "push", "pull_request", "workflow_run",
  "issues", "release", "deployment_status",
];

async function createEventsAndDeliveries() {
  header("EVENTS + DELIVERIES");

  for (const integ of seedIntegrations) {
    const eventTypes = integ.provider === "stripe"
      ? stripeEventTypes
      : integ.provider === "shopify"
        ? shopifyEventTypes
        : githubEventTypes;

    // Recent events (last 2 hours — shows up in dashboard "Events (1h)" counter)
    const recentCount = integ.circuitState === "open" ? 20 : randomBetween(40, 80);
    // Older events (spread over past 7 days)
    const olderCount = randomBetween(150, 300);

    log("events", `${integ.name}: ${recentCount} recent + ${olderCount} older events`);

    // Older events
    for (let i = 0; i < olderCount; i++) {
      const eventType = eventTypes[i % eventTypes.length];
      const receivedAt = new Date(
        Date.now() - randomBetween(2 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000)
      );
      const isSuccess = Math.random() > (integ.circuitState === "open" ? 0.8 : 0.03);
      const responseTime = isSuccess ? randomBetween(80, 300) : randomBetween(2000, 10000);
      const amount = randomBetween(500, 150000);

      const [evt] = await db.insert(schema.events).values({
        integrationId: integ.id,
        eventType,
        payload: buildPayload(integ.provider, eventType, i, amount),
        headers: buildHeaders(integ.provider),
        receivedAt,
        signatureValid: Math.random() > 0.005,
        providerEventId: `evt_${integ.provider}_${i}_${Date.now()}`,
        source: "webhook",
        amountCents: integ.provider !== "github" ? amount : null,
      }).returning();

      await db.insert(schema.deliveries).values({
        eventId: evt.id,
        endpointId: integ.endpointId,
        status: isSuccess ? "delivered" : "failed",
        statusCode: isSuccess ? 200 : (Math.random() > 0.5 ? 503 : 500),
        responseTimeMs: responseTime,
        responseBody: isSuccess ? '{"ok":true}' : "Service Unavailable",
        errorType: isSuccess ? null : (Math.random() > 0.5 ? "server_error" : "timeout"),
        attemptNumber: 1,
        attemptedAt: new Date(receivedAt.getTime() + responseTime),
      });
    }

    // Recent events (last 1–2 hours)
    for (let i = 0; i < recentCount; i++) {
      const eventType = eventTypes[i % eventTypes.length];
      const receivedAt = new Date(Date.now() - randomBetween(1000, 90 * 60 * 1000));
      const failChance = integ.circuitState === "open" ? 0.88
        : integ.circuitState === "half_open" ? 0.35
        : 0.02;
      const isSuccess = Math.random() > failChance;
      const responseTime = isSuccess
        ? randomBetween(80, 250)
        : randomBetween(3000, 15000);
      const amount = randomBetween(1000, 200000);

      const [evt] = await db.insert(schema.events).values({
        integrationId: integ.id,
        eventType,
        payload: buildPayload(integ.provider, eventType, olderCount + i, amount),
        headers: buildHeaders(integ.provider),
        receivedAt,
        signatureValid: true,
        providerEventId: `evt_${integ.provider}_recent_${i}_${Date.now()}`,
        source: "webhook",
        amountCents: integ.provider !== "github" ? amount : null,
      }).returning();

      await db.insert(schema.deliveries).values({
        eventId: evt.id,
        endpointId: integ.endpointId,
        status: isSuccess ? "delivered" : "failed",
        statusCode: isSuccess ? 200 : 503,
        responseTimeMs: responseTime,
        responseBody: isSuccess ? '{"ok":true}' : "Service Unavailable",
        errorType: isSuccess ? null : "server_error",
        attemptNumber: isSuccess ? 1 : randomBetween(1, 3),
        attemptedAt: new Date(receivedAt.getTime() + responseTime),
      });
    }

    ok(`${olderCount + recentCount} events + deliveries created`);
  }

  divider();
}

// ─── Seed Anomalies ──────────────────────────────────────

async function createAnomalies() {
  header("ANOMALIES");

  const anomalyData: Array<{
    integIdx: number;
    type: "response_time_spike" | "failure_surge" | "volume_spike" | "volume_drop" | "source_silence" | "new_event_type" | "payload_anomaly";
    severity: "low" | "medium" | "high" | "critical";
    ago: number;
    resolved: boolean;
    diagnosis: object;
  }> = [
    {
      integIdx: 3, // GitHub — open circuit
      type: "failure_surge",
      severity: "critical",
      ago: 25,
      resolved: false,
      diagnosis: {
        what: "88% of deliveries to GitHub CI/CD endpoint failing with 503 errors",
        why: "The destination endpoint at api.myapp.com/webhooks/github is returning 503 Service Unavailable, likely due to an overloaded backend service or infrastructure degradation on the receiving side.",
        impact: "15 webhook events undelivered in the last 30 minutes. CI/CD pipelines are not being triggered — deployments and PR checks are stalled.",
        recommendation: "Check the health of api.myapp.com/webhooks/github. Look for memory/CPU spikes, database connection exhaustion, or recent deployment failures on the receiving service.",
        confidence: 0.92,
        crossCorrelation: "No other integrations affected — isolated to the GitHub endpoint.",
      },
    },
    {
      integIdx: 3, // GitHub
      type: "response_time_spike",
      severity: "high",
      ago: 30,
      resolved: false,
      diagnosis: {
        what: "Average response time spiked from 180ms to 8,500ms — a 47x increase",
        why: "The GitHub webhook endpoint is experiencing severe latency, likely due to synchronous processing of webhook payloads or a downstream dependency (database, external API) being slow.",
        impact: "Even successful deliveries are taking 8+ seconds, causing timeout retries and consuming retry budget.",
        recommendation: "Implement async processing — acknowledge the webhook immediately (return 200) and process the payload in a background job.",
        confidence: 0.88,
      },
    },
    {
      integIdx: 1, // Shopify — half_open
      type: "failure_surge",
      severity: "high",
      ago: 40,
      resolved: false,
      diagnosis: {
        what: "Failure rate jumped from 2% baseline to 21.5% for Shopify Orders",
        why: "Intermittent 503 responses from the destination suggest the endpoint is under resource pressure. The pattern correlates with a spike in orders/create events — likely a flash sale or marketing campaign driving volume.",
        impact: "$4,230 in order webhooks pending. Inventory sync and fulfillment automation may be delayed.",
        recommendation: "Scale the receiving service horizontally. Consider enabling HookWise rate limiting to smooth the delivery curve during traffic spikes.",
        confidence: 0.85,
        crossCorrelation: "Stripe payments integration unaffected — confirms issue is endpoint-specific, not a shared infrastructure problem.",
      },
    },
    {
      integIdx: 0, // Stripe Production — resolved
      type: "volume_spike",
      severity: "medium",
      ago: 180,
      resolved: true,
      diagnosis: {
        what: "Event volume increased 340% compared to baseline (120 events/hour vs 35 baseline)",
        why: "A batch of subscription renewals triggered a large burst of invoice.paid and charge.succeeded events. This is expected behavior during billing cycles.",
        impact: "No delivery failures — endpoint handled the volume well. Informational only.",
        recommendation: "No action needed. Consider setting up calendar-based expected volume rules to suppress false alerts during known billing periods.",
        confidence: 0.95,
      },
    },
    {
      integIdx: 2, // Stripe Connect — resolved
      type: "new_event_type",
      severity: "low",
      ago: 360,
      resolved: true,
      diagnosis: {
        what: "New event type 'transfer.reversed' seen for the first time",
        why: "A payout reversal occurred on a connected account. This is a legitimate Stripe event that hasn't been observed before in this integration.",
        impact: "Low — the event was delivered successfully. However, the receiving application may not have a handler for this event type.",
        recommendation: "Verify that your application handles 'transfer.reversed' events. If not, add a handler to update transfer status and notify affected users.",
        confidence: 0.90,
      },
    },
    {
      integIdx: 1, // Shopify
      type: "payload_anomaly",
      severity: "medium",
      ago: 90,
      resolved: false,
      diagnosis: {
        what: "3 orders/create events missing the 'shipping_address' field that is normally present",
        why: "These appear to be digital product orders where no shipping address is collected. The payload schema deviation is expected for digital goods.",
        impact: "Downstream fulfillment logic that depends on shipping_address may throw errors for these events.",
        recommendation: "Update your webhook handler to gracefully handle missing shipping_address for digital product orders. Consider using HookWise payload transformation to add a default value.",
        confidence: 0.78,
      },
    },
  ];

  for (const a of anomalyData) {
    const integ = seedIntegrations[a.integIdx];
    const [anomaly] = await db.insert(schema.anomalies).values({
      integrationId: integ.id,
      type: a.type,
      severity: a.severity,
      diagnosis: JSON.stringify(a.diagnosis),
      context: {
        integrationName: integ.name,
        provider: integ.provider,
        endpointUrl: integ.destinationUrl,
        circuitState: integ.circuitState,
        currentSuccessRate: integ.successRate,
      },
      detectedAt: minutesAgo(a.ago),
      resolvedAt: a.resolved ? minutesAgo(a.ago - 60) : null,
    }).returning();

    const status = a.resolved ? "\x1b[32mresolved\x1b[0m" : "\x1b[31mactive\x1b[0m";
    ok(`[${a.severity}] ${a.type} on ${integ.name} — ${status}`);
  }

  divider();
}

// ─── Seed Replay Queue ───────────────────────────────────

async function createReplayQueue() {
  header("REPLAY QUEUE");

  // Queue replay items for the GitHub integration (circuit open)
  const githubInteg = seedIntegrations[3];
  const githubEvents = await db.select({ id: schema.events.id })
    .from(schema.events)
    .where(eq(schema.events.integrationId, githubInteg.id))
    .limit(30);

  let pos = 1;
  for (const evt of githubEvents.slice(0, 18)) {
    const status = pos <= 5 ? "delivered" : pos <= 8 ? "failed" : "pending";
    await db.insert(schema.replayQueue).values({
      endpointId: githubInteg.endpointId,
      eventId: evt.id,
      position: pos,
      correlationKey: `github-recovery-${Math.floor(pos / 5)}`,
      status,
      attempts: status === "delivered" ? 1 : status === "failed" ? 3 : 0,
      createdAt: minutesAgo(30 - pos),
      deliveredAt: status === "delivered" ? minutesAgo(25 - pos) : null,
    });
    pos++;
  }
  ok(`${pos - 1} replay items for GitHub (5 delivered, 3 failed, 10 pending)`);

  // Queue a few for Shopify too
  const shopifyInteg = seedIntegrations[1];
  const shopifyEvents = await db.select({ id: schema.events.id })
    .from(schema.events)
    .where(eq(schema.events.integrationId, shopifyInteg.id))
    .limit(10);

  let pos2 = 1;
  for (const evt of shopifyEvents.slice(0, 6)) {
    const status = pos2 <= 3 ? "delivered" : "pending";
    await db.insert(schema.replayQueue).values({
      endpointId: shopifyInteg.endpointId,
      eventId: evt.id,
      position: pos2,
      correlationKey: `shopify-recovery-1`,
      status,
      attempts: status === "delivered" ? 1 : 0,
      createdAt: minutesAgo(15 - pos2),
      deliveredAt: status === "delivered" ? minutesAgo(10 - pos2) : null,
    });
    pos2++;
  }
  ok(`${pos2 - 1} replay items for Shopify (3 delivered, 3 pending)`);

  divider();
}

// ─── Seed Reconciliation Runs ────────────────────────────

async function createReconciliationRuns() {
  header("RECONCILIATION RUNS");

  for (const integ of seedIntegrations.filter((i) => i.provider !== "github")) {
    const runCount = randomBetween(8, 15);
    for (let i = 0; i < runCount; i++) {
      const providerFound = randomBetween(20, 80);
      const hookwiseFound = providerFound - randomBetween(0, 5);
      const gaps = Math.max(0, providerFound - hookwiseFound);
      const resolved = gaps > 0 ? randomBetween(Math.max(0, gaps - 1), gaps) : 0;

      await db.insert(schema.reconciliationRuns).values({
        integrationId: integ.id,
        providerEventsFound: providerFound,
        hookwiseEventsFound: hookwiseFound,
        gapsDetected: gaps,
        gapsResolved: resolved,
        ranAt: new Date(Date.now() - i * 5 * 60 * 1000 - randomBetween(0, 120000)),
      });
    }
    ok(`${runCount} reconciliation runs for ${integ.name}`);
  }

  divider();
}

// ─── Seed Security Scans + Findings ─────────────────────

async function createSecurityScans() {
  header("SECURITY SCANS");

  for (const integ of seedIntegrations) {
    const score = integ.circuitState === "closed" ? randomBetween(85, 100) : randomBetween(40, 70);
    const [scan] = await db.insert(schema.securityScans).values({
      endpointId: integ.endpointId,
      scanType: "full",
      findings: [],
      score,
      scannedAt: hoursAgo(randomBetween(1, 24)),
    }).returning();

    // Add findings for lower-scoring endpoints
    if (score < 90) {
      const findings: Array<{
        vulnType: "invalid_signature_accepted" | "expired_timestamp_accepted" | "replay_accepted" | "injection_vulnerable" | "missing_signature_check" | "missing_timestamp_check";
        severity: "low" | "medium" | "high" | "critical";
        desc: string;
        fix: string;
      }> = [];

      if (score < 70) {
        findings.push({
          vulnType: "replay_accepted",
          severity: "high",
          desc: "Endpoint accepts replayed webhook payloads with old timestamps. An attacker could replay captured webhooks to trigger duplicate actions.",
          fix: "Implement timestamp validation — reject webhooks with timestamps older than 5 minutes. Compare against Stripe's 'stripe-signature' timestamp.",
        });
        findings.push({
          vulnType: "missing_timestamp_check",
          severity: "medium",
          desc: "No timestamp validation detected. The endpoint processes webhooks regardless of when they were originally sent.",
          fix: "Parse the 't=' value from the webhook signature header and reject events older than 300 seconds.",
        });
      }
      if (score < 85) {
        findings.push({
          vulnType: "expired_timestamp_accepted",
          severity: "medium",
          desc: "Webhooks with timestamps older than 10 minutes are still accepted. This window is too permissive.",
          fix: "Tighten the timestamp tolerance to 5 minutes (300 seconds) as recommended by Stripe's documentation.",
        });
      }

      for (const f of findings) {
        await db.insert(schema.securityFindings).values({
          scanId: scan.id,
          vulnerabilityType: f.vulnType,
          severity: f.severity,
          description: f.desc,
          remediation: f.fix,
        });
      }

      ok(`${integ.name}: score ${score}/100 — ${findings.length} finding(s)`);
    } else {
      ok(`${integ.name}: score ${score}/100 — clean`);
    }
  }

  divider();
}

// ─── Seed Audit Log ─────────────────────────────────────

async function createAuditLog() {
  header("AUDIT LOG");

  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  const actions: Array<{
    action: "event.received" | "event.delivered" | "event.failed" | "event.replayed" | "circuit.opened" | "circuit.closed" | "circuit.half_open" | "integration.created" | "scan.completed";
    integIdx: number;
    ago: number;
    details: object;
  }> = [
    { action: "integration.created", integIdx: 0, ago: 7 * 24 * 60, details: { name: "Production Stripe Payments", provider: "stripe" } },
    { action: "integration.created", integIdx: 1, ago: 7 * 24 * 60 - 30, details: { name: "Shopify Orders (US Store)", provider: "shopify" } },
    { action: "integration.created", integIdx: 2, ago: 5 * 24 * 60, details: { name: "Stripe Connect Payouts", provider: "stripe" } },
    { action: "integration.created", integIdx: 3, ago: 3 * 24 * 60, details: { name: "GitHub CI/CD Webhooks", provider: "github" } },
    { action: "event.received", integIdx: 0, ago: 120, details: { eventType: "charge.succeeded", amount: 15000 } },
    { action: "event.delivered", integIdx: 0, ago: 119, details: { statusCode: 200, responseTimeMs: 142 } },
    { action: "event.received", integIdx: 1, ago: 90, details: { eventType: "orders/create", orderId: "#1042" } },
    { action: "event.delivered", integIdx: 1, ago: 89, details: { statusCode: 200, responseTimeMs: 320 } },
    { action: "event.received", integIdx: 3, ago: 60, details: { eventType: "push", repo: "myapp/backend" } },
    { action: "event.failed", integIdx: 3, ago: 59, details: { statusCode: 503, errorType: "server_error" } },
    { action: "circuit.half_open", integIdx: 3, ago: 45, details: { previousState: "closed", consecutiveFailures: 5 } },
    { action: "circuit.opened", integIdx: 3, ago: 30, details: { previousState: "half_open", consecutiveFailures: 15 } },
    { action: "event.replayed", integIdx: 3, ago: 28, details: { replayBatchSize: 18, reason: "circuit_recovery_attempt" } },
    { action: "event.received", integIdx: 1, ago: 50, details: { eventType: "orders/paid", orderId: "#1043" } },
    { action: "event.failed", integIdx: 1, ago: 49, details: { statusCode: 503, errorType: "server_error" } },
    { action: "circuit.half_open", integIdx: 1, ago: 40, details: { previousState: "closed", consecutiveFailures: 2 } },
    { action: "scan.completed", integIdx: 0, ago: 180, details: { scanType: "full", score: 95 } },
    { action: "scan.completed", integIdx: 3, ago: 120, details: { scanType: "full", score: 52 } },
    { action: "event.received", integIdx: 2, ago: 15, details: { eventType: "transfer.reversed", amount: 8400 } },
    { action: "event.delivered", integIdx: 2, ago: 14, details: { statusCode: 200, responseTimeMs: 195 } },
  ];

  for (const entry of actions) {
    const integ = seedIntegrations[entry.integIdx];
    const hash = integrityHash(entry.action, entry.details, prevHash);
    await db.insert(schema.auditLog).values({
      userId: USER_ID,
      integrationId: integ.id,
      action: entry.action,
      details: entry.details,
      integrityHash: hash,
      createdAt: minutesAgo(entry.ago),
    });
    prevHash = hash;
  }

  ok(`${actions.length} audit log entries`);
  divider();
}

// ─── Seed Compliance Exports ─────────────────────────────

async function createComplianceExports() {
  header("COMPLIANCE EXPORTS");

  await db.insert(schema.complianceExports).values({
    userId: USER_ID,
    format: "json",
    periodStart: daysAgo(30),
    periodEnd: daysAgo(0),
    fileUrl: null,
    status: "completed",
    createdAt: daysAgo(1),
  });
  await db.insert(schema.complianceExports).values({
    userId: USER_ID,
    format: "csv",
    periodStart: daysAgo(7),
    periodEnd: daysAgo(0),
    fileUrl: null,
    status: "completed",
    createdAt: hoursAgo(6),
  });

  ok("2 compliance exports");
  divider();
}

// ─── Seed Patterns ───────────────────────────────────────

async function createPatterns() {
  header("PATTERNS");

  for (const integ of seedIntegrations) {
    const baseFailRate = integ.circuitState === "open" ? 88 : integ.circuitState === "half_open" ? 21 : 2;
    const baseResponseMs = integ.avgResponseMs;
    const baseVolume = randomBetween(25, 60);

    const metrics = [
      { name: "failure_rate", avg: baseFailRate, stddev: baseFailRate * 0.15 },
      { name: "avg_response_ms", avg: baseResponseMs, stddev: baseResponseMs * 0.2 },
      { name: "event_count", avg: baseVolume, stddev: baseVolume * 0.25 },
    ];

    // Per-event-type metrics
    const eventTypes = integ.provider === "stripe" ? stripeEventTypes.slice(0, 3)
      : integ.provider === "shopify" ? shopifyEventTypes.slice(0, 3)
      : githubEventTypes.slice(0, 3);

    for (const et of eventTypes) {
      metrics.push({
        name: `event_type:${et}:count`,
        avg: randomBetween(5, 20),
        stddev: randomBetween(2, 8),
      });
    }

    for (const m of metrics) {
      await db.insert(schema.patterns).values({
        integrationId: integ.id,
        metricName: m.name,
        rollingAvg: m.avg,
        rollingStddev: m.stddev,
        sampleCount: randomBetween(150, 300),
        lastUpdated: minutesAgo(5),
      });
    }

    ok(`${metrics.length} patterns for ${integ.name}`);
  }

  divider();
}

// ─── Seed Payload Schemas ────────────────────────────────

async function createPayloadSchemas() {
  header("PAYLOAD SCHEMAS");

  for (const integ of seedIntegrations) {
    const eventTypes = integ.provider === "stripe" ? stripeEventTypes.slice(0, 5)
      : integ.provider === "shopify" ? shopifyEventTypes.slice(0, 4)
      : githubEventTypes.slice(0, 3);

    for (const et of eventTypes) {
      await db.insert(schema.payloadSchemas).values({
        integrationId: integ.id,
        eventType: et,
        jsonSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            data: { type: "object" },
            created: { type: "number" },
          },
          required: ["id", "type"],
        },
        lastUpdated: hoursAgo(randomBetween(1, 48)),
      });
    }

    ok(`${eventTypes.length} schemas for ${integ.name}`);
  }

  divider();
}

// ─── Seed Alert Configs ──────────────────────────────────

async function createAlertConfigs() {
  header("ALERT CONFIGS");

  for (const integ of seedIntegrations) {
    await db.insert(schema.alertConfigs).values({
      integrationId: integ.id,
      channel: "slack",
      destination: "https://hooks.slack.com/services/T.../B.../xxx",
      threshold: 2, // medium+
      enabled: true,
    });
    await db.insert(schema.alertConfigs).values({
      integrationId: integ.id,
      channel: "email",
      destination: "oncall@myapp.com",
      threshold: 3, // high+
      enabled: true,
    });
  }

  ok(`${seedIntegrations.length * 2} alert configs (Slack + Email per integration)`);
  divider();
}

// ─── Seed Provider Health (Status Page) ──────────────────

async function createProviderHealth() {
  header("PROVIDER HEALTH");

  // Clear existing provider health data
  await db.delete(schema.providerHealth);
  await db.delete(schema.benchmarks);

  const providers = ["stripe", "shopify", "github"] as const;

  for (const provider of providers) {
    const isHealthy = provider !== "github";
    const failureRate = isHealthy ? randomBetween(1, 5) : randomBetween(15, 35);
    const avgLatency = isHealthy ? randomBetween(100, 300) : randomBetween(2000, 5000);

    // Insert health metrics (multiple time points)
    for (let i = 0; i < 12; i++) {
      const jitter = randomBetween(-2, 2);
      await db.insert(schema.providerHealth).values({
        provider,
        metricName: "failure_rate",
        value: Math.max(0, failureRate + jitter),
        sampleSize: randomBetween(500, 5000),
        measuredAt: minutesAgo(i * 5),
      });
      await db.insert(schema.providerHealth).values({
        provider,
        metricName: "avg_latency_ms",
        value: avgLatency + randomBetween(-50, 50),
        sampleSize: randomBetween(500, 5000),
        measuredAt: minutesAgo(i * 5),
      });
      await db.insert(schema.providerHealth).values({
        provider,
        metricName: "event_volume",
        value: randomBetween(1000, 10000),
        sampleSize: randomBetween(100, 500),
        measuredAt: minutesAgo(i * 5),
      });
    }

    // Benchmarks per event type
    const eventTypes = provider === "stripe" ? stripeEventTypes.slice(0, 5)
      : provider === "shopify" ? shopifyEventTypes.slice(0, 4)
      : githubEventTypes.slice(0, 3);

    for (const et of eventTypes) {
      await db.insert(schema.benchmarks).values({
        provider,
        eventType: et,
        p50Latency: avgLatency * 0.7,
        p95Latency: avgLatency * 2.5,
        failureRate: failureRate,
        sampleSize: randomBetween(200, 3000),
        period: "5m",
        measuredAt: minutesAgo(0),
      });
    }

    const status = failureRate >= 10 ? "degraded" : "operational";
    ok(`${provider}: ${status} (${failureRate}% failure, ${avgLatency}ms avg)`);
  }

  divider();
}

// ─── Payload Builders ────────────────────────────────────

function buildPayload(provider: string, eventType: string, idx: number, amount: number) {
  if (provider === "stripe") {
    return {
      id: `evt_${idx}_${Date.now()}`,
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      livemode: true,
      data: {
        object: {
          id: `pi_${idx}`,
          object: "payment_intent",
          amount,
          currency: "usd",
          customer: `cus_${(idx % 50).toString().padStart(4, "0")}`,
          status: eventType.includes("failed") ? "failed" : "succeeded",
          description: `Order #${1000 + idx}`,
        },
      },
    };
  }
  if (provider === "shopify") {
    return {
      id: 1000 + idx,
      name: `#${1000 + idx}`,
      email: `customer${idx % 30}@example.com`,
      total_price: (amount / 100).toFixed(2),
      currency: "USD",
      financial_status: "paid",
      fulfillment_status: null,
      line_items: [
        { title: "Widget Pro", quantity: randomBetween(1, 5), price: (amount / 100).toFixed(2) },
      ],
      shipping_address: idx % 10 !== 7 ? { city: "San Francisco", country: "US" } : undefined,
    };
  }
  // github
  return {
    ref: "refs/heads/main",
    repository: { full_name: `myapp/${idx % 2 === 0 ? "backend" : "frontend"}` },
    sender: { login: `dev${idx % 5}` },
    action: eventType === "pull_request" ? "opened" : eventType === "issues" ? "created" : undefined,
    head_commit: eventType === "push" ? { message: `fix: resolve issue #${100 + idx}` } : undefined,
  };
}

function buildHeaders(provider: string) {
  if (provider === "stripe") {
    return { "stripe-signature": `t=${Math.floor(Date.now() / 1000)},v1=abc123` };
  }
  if (provider === "shopify") {
    return { "x-shopify-hmac-sha256": "base64hash==", "x-shopify-topic": "orders/create" };
  }
  return { "x-github-event": "push", "x-github-delivery": crypto.randomUUID() };
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════╗");
  console.log("║   HookWise — Dashboard Seed                                  ║");
  console.log("║                                                              ║");
  console.log("║   Populates ALL dashboard pages with realistic production    ║");
  console.log("║   data: integrations, events, anomalies, replays, scans,    ║");
  console.log("║   audit logs, reconciliation, provider health, and more.    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\x1b[0m");

  try {
    await cleanup();
    await createIntegrations();
    await createEventsAndDeliveries();
    await createAnomalies();
    await createReplayQueue();
    await createReconciliationRuns();
    await createSecurityScans();
    await createAuditLog();
    await createComplianceExports();
    await createPatterns();
    await createPayloadSchemas();
    await createAlertConfigs();
    await createProviderHealth();

    header("DONE");
    console.log(`\x1b[32m\x1b[1m  ✓ Dashboard seeded. Open http://localhost:3000/dashboard\x1b[0m\n`);
    console.log(`  Pages populated:`);
    console.log(`    • /dashboard        — 4 integrations, events counter, anomaly alerts`);
    console.log(`    • /integrations     — Stripe, Shopify, GitHub with health states`);
    console.log(`    • /anomalies        — 6 anomalies (4 active, 2 resolved) with AI diagnosis`);
    console.log(`    • /replay           — 24 replay items across 2 endpoints`);
    console.log(`    • /reconciliation   — ~30 reconciliation runs with gap detection`);
    console.log(`    • /security         — Security scans with vulnerability findings`);
    console.log(`    • /compliance       — 20 audit log entries + 2 exports`);
    console.log(`    • /status           — Provider health for Stripe, Shopify, GitHub`);
    console.log("");
    divider();
  } catch (err) {
    console.error("\n\x1b[31mFATAL:\x1b[0m", err);
    process.exit(1);
  }

  process.exit(0);
}

main();
