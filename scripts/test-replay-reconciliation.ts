/**
 * HookWise — Replay & Reconciliation Real-Case Scenario Test
 *
 * Simulates a full incident lifecycle through the real HTTP pipeline:
 *
 * Phase 1: Setup — Create test integration + endpoint pointing to dev receiver
 * Phase 2: Normal Traffic — Send 10 signed Stripe webhooks through ingest pipeline
 * Phase 3: Endpoint Failure — Swap URL to dead port, send 10 more → circuit opens → replay queue fills
 * Phase 4: Recovery — Restore URL, emit replay-started → replay engine drains queue
 * Phase 5: Reconciliation — Poll Stripe API for events not in HookWise, fill gaps
 *
 * Prerequisites:
 *   1. `pnpm dev` running (Next.js + Inngest dev server)
 *   2. `STRIPE_SECRET_KEY=sk_test_...` in `.env.local` (Phase 5 only)
 *   3. Stripe CLI installed for `stripe trigger` (Phase 5 only)
 *
 * Usage: npx tsx scripts/test-replay-reconciliation.ts
 *
 * Options:
 *   --skip-reconciliation   Skip Phase 5 (no Stripe key needed)
 *   --base-url=URL          Dev server URL (default: http://localhost:3000)
 */

// ─── Environment Setup (MUST run before any app imports) ─
import { config } from "dotenv";
config({ path: ".env.local" });

import crypto from "crypto";
import { execSync } from "child_process";

// App modules are loaded dynamically in main() to avoid ESM
// import hoisting reading DATABASE_URL before dotenv sets it.
type AppModules = Awaited<ReturnType<typeof loadAppModules>>;
let app: AppModules;

async function loadAppModules() {
  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { eq, and, count, desc } = await import("drizzle-orm");
  const { inngest } = await import("../src/lib/inngest/client");
  return { db, schema, eq, and, count, desc, inngest };
}

// ─── CLI Args ────────────────────────────────────────────

function getArg(name: string, fallback: string): string {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const BASE_URL = getArg("base-url", "http://localhost:3000");
const SKIP_RECONCILIATION = hasFlag("skip-reconciliation");
const USER_ID = "70382443-36d9-47b0-8f0b-8e327ccf11cf";
const SIGNING_SECRET = "whsec_replay_test_secret_key_2024";
const DEAD_URL = "http://localhost:19999/dead";
const DEV_RECEIVER_URL = `${BASE_URL}/api/dev/receiver`;

// ─── Logging ────────────────────────────────────────────

function log(section: string, msg: string) {
  console.log(`\x1b[36m[${section}]\x1b[0m ${msg}`);
}
function ok(msg: string) {
  console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
}
function fail(msg: string) {
  console.log(`\x1b[31m  ✗\x1b[0m ${msg}`);
}
function warn(msg: string) {
  console.log(`\x1b[33m  ⚠\x1b[0m ${msg}`);
}
function header(title: string) {
  console.log(
    `\n\x1b[1m\x1b[33m┌─── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}┐\x1b[0m`
  );
}
function divider() {
  console.log(`\x1b[33m└${"─".repeat(60)}┘\x1b[0m`);
}

// ─── Stripe Signature ────────────────────────────────────

function signStripe(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function stripePayload(i: number): { body: string; eventId: string } {
  const eventTypes = [
    "charge.succeeded",
    "charge.failed",
    "payment_intent.succeeded",
    "invoice.paid",
    "customer.created",
  ];
  const eventType = eventTypes[i % eventTypes.length];
  const amount = 500 + Math.floor(Math.random() * 250000);
  const id = `evt_${crypto.randomBytes(12).toString("hex")}`;
  const body = JSON.stringify({
    id,
    object: "event",
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    api_version: "2024-12-18",
    data: {
      object: {
        id: `pi_${crypto.randomBytes(12).toString("hex")}`,
        object: "payment_intent",
        amount,
        currency: "usd",
        customer: `cus_${(i % 20).toString().padStart(5, "0")}`,
        status: eventType.includes("failed") ? "failed" : "succeeded",
        description: `Order #${10000 + i}`,
        metadata: { hookwise_test: "replay_reconciliation" },
        created: Math.floor(Date.now() / 1000),
      },
    },
    request: { id: `req_${crypto.randomBytes(8).toString("hex")}` },
  });
  return { body, eventId: id };
}

// ─── HTTP Helpers ────────────────────────────────────────

async function sendWebhook(
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<{ status: number; body: string; latency: number }> {
  const start = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
  const latency = Math.round(performance.now() - start);
  const resBody = await res.text();
  return { status: res.status, body: resBody, latency };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(
  label: string,
  fn: () => Promise<T>,
  check: (result: T) => boolean,
  maxAttempts: number = 30,
  intervalMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fn();
    if (check(result)) return result;
    if (i < maxAttempts - 1) {
      process.stdout.write(`\x1b[90m  ... polling ${label} (${i + 1}/${maxAttempts})\x1b[0m\r`);
      await sleep(intervalMs);
    }
  }
  process.stdout.write("                                                    \r");
  throw new Error(`Polling timed out: ${label}`);
}

// ─── State Tracking ──────────────────────────────────────

interface TestState {
  integrationId: string;
  endpointId: string;
  phase2EventIds: string[];
  phase3EventIds: string[];
}

const metrics = {
  phase2: { sent: 0, ingested: 0, delivered: 0 },
  phase3: { sent: 0, ingested: 0, circuitOpened: false, replayQueued: 0 },
  phase4: { replayDelivered: 0, replaySkipped: 0, circuitClosed: false },
  phase5: { providerEvents: 0, gapsDetected: 0, gapsResolved: 0 },
};

// ─────────────────────────────────────────────────────────
// PHASE 1: Setup
// ─────────────────────────────────────────────────────────

async function phase1Setup(): Promise<TestState> {
  const { db, schema, eq, and } = app;
  header("PHASE 1: Setup");

  // Clean up any existing test integration
  const existing = await db
    .select()
    .from(schema.integrations)
    .where(
      and(
        eq(schema.integrations.userId, USER_ID),
        eq(schema.integrations.name, "Replay Test (Stripe)")
      )
    );

  for (const int of existing) {
    const endpoints = await db
      .select()
      .from(schema.endpoints)
      .where(eq(schema.endpoints.integrationId, int.id));

    for (const ep of endpoints) {
      await db.delete(schema.replayQueue).where(eq(schema.replayQueue.endpointId, ep.id));
      await db.delete(schema.deliveries).where(eq(schema.deliveries.endpointId, ep.id));
    }

    await db.delete(schema.events).where(eq(schema.events.integrationId, int.id));
    await db.delete(schema.reconciliationRuns).where(eq(schema.reconciliationRuns.integrationId, int.id));
    await db.delete(schema.endpoints).where(eq(schema.endpoints.integrationId, int.id));
    await db.delete(schema.integrations).where(eq(schema.integrations.id, int.id));
    warn(`Cleaned up previous test integration (${int.id.slice(0, 8)}...)`);
  }

  // Create integration
  const [integration] = await db
    .insert(schema.integrations)
    .values({
      userId: USER_ID,
      name: "Replay Test (Stripe)",
      provider: "stripe",
      signingSecret: SIGNING_SECRET,
      destinationUrl: DEV_RECEIVER_URL,
      status: "active",
      idempotencyEnabled: false,
      enrichmentEnabled: false,
      sequencerEnabled: false,
    })
    .returning();

  ok(`Created integration: ${integration.id.slice(0, 8)}...`);

  // Create endpoint
  const [endpoint] = await db
    .insert(schema.endpoints)
    .values({
      integrationId: integration.id,
      url: DEV_RECEIVER_URL,
      circuitState: "closed",
      successRate: 100,
      avgResponseMs: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      consecutiveHealthChecks: 0,
      healthScore: 100,
    })
    .returning();

  ok(`Created endpoint: ${endpoint.id.slice(0, 8)}... → ${DEV_RECEIVER_URL}`);
  ok(`Circuit state: closed`);

  divider();
  return {
    integrationId: integration.id,
    endpointId: endpoint.id,
    phase2EventIds: [],
    phase3EventIds: [],
  };
}

// ─────────────────────────────────────────────────────────
// PHASE 2: Normal Traffic
// ─────────────────────────────────────────────────────────

async function phase2NormalTraffic(state: TestState): Promise<void> {
  const { db, schema, eq, and, count } = app;
  header("PHASE 2: Normal Traffic (10 webhooks)");
  log("traffic", "Sending 10 signed Stripe webhooks via HTTP...");

  const ingestUrl = `${BASE_URL}/api/ingest/${state.integrationId}`;

  for (let i = 0; i < 10; i++) {
    const { body, eventId } = stripePayload(i);
    const signature = signStripe(body, SIGNING_SECRET);
    const res = await sendWebhook(ingestUrl, body, {
      "stripe-signature": signature,
    });

    if (res.status === 200) {
      metrics.phase2.sent++;
      state.phase2EventIds.push(eventId);
      ok(`${JSON.parse(body).type} → ${res.status} (${res.latency}ms)`);
    } else {
      fail(`webhook ${i} → ${res.status}: ${res.body}`);
    }

    await sleep(200);
  }

  log("traffic", `Sent ${metrics.phase2.sent}/10 webhooks. Waiting for Inngest to process...`);

  // Poll DB for events + deliveries
  const result = await poll(
    "deliveries",
    async () => {
      const eventRows = await db
        .select({ cnt: count() })
        .from(schema.events)
        .where(eq(schema.events.integrationId, state.integrationId));

      const deliveryRows = await db
        .select({ cnt: count() })
        .from(schema.deliveries)
        .where(
          and(
            eq(schema.deliveries.endpointId, state.endpointId),
            eq(schema.deliveries.status, "delivered")
          )
        );

      return {
        events: eventRows[0]?.cnt ?? 0,
        delivered: deliveryRows[0]?.cnt ?? 0,
      };
    },
    (r) => r.delivered >= metrics.phase2.sent,
    45,
    2000
  );

  metrics.phase2.ingested = result.events;
  metrics.phase2.delivered = result.delivered;

  ok(`Events in DB: ${result.events}`);
  ok(`Deliveries successful: ${result.delivered}`);

  // Verify circuit still closed
  const [endpoint] = await db
    .select()
    .from(schema.endpoints)
    .where(eq(schema.endpoints.id, state.endpointId))
    .limit(1);

  ok(`Circuit state: ${endpoint?.circuitState ?? "unknown"}`);

  if (endpoint?.circuitState !== "closed") {
    fail("Expected circuit to remain CLOSED after successful deliveries");
  }

  divider();
}

// ─────────────────────────────────────────────────────────
// PHASE 3: Endpoint Failure → Circuit Opens
// ─────────────────────────────────────────────────────────

async function phase3EndpointFailure(state: TestState): Promise<void> {
  const { db, schema, eq, and, count } = app;
  header("PHASE 3: Endpoint Failure → Circuit Opens");

  // Swap endpoint URL to dead port
  log("failure", `Swapping endpoint URL to ${DEAD_URL} (nothing listening)`);
  await db
    .update(schema.endpoints)
    .set({ url: DEAD_URL })
    .where(eq(schema.endpoints.id, state.endpointId));

  // Also update integration destination so Inngest uses it
  await db
    .update(schema.integrations)
    .set({ destinationUrl: DEAD_URL })
    .where(eq(schema.integrations.id, state.integrationId));

  ok(`Endpoint URL updated to dead port`);

  log("failure", "Sending 10 more webhooks (will fail to deliver)...");

  const ingestUrl = `${BASE_URL}/api/ingest/${state.integrationId}`;

  for (let i = 10; i < 20; i++) {
    const { body, eventId } = stripePayload(i);
    const signature = signStripe(body, SIGNING_SECRET);
    const res = await sendWebhook(ingestUrl, body, {
      "stripe-signature": signature,
    });

    if (res.status === 200) {
      metrics.phase3.sent++;
      state.phase3EventIds.push(eventId);
      ok(`Ingested webhook ${i - 10 + 1}/10 (${res.latency}ms) — delivery will fail`);
    } else {
      fail(`webhook ${i} ingest failed → ${res.status}: ${res.body}`);
    }

    await sleep(300);
  }

  log("failure", `Ingested ${metrics.phase3.sent}/10. Waiting for circuit to open...`);

  // Poll for circuit to open — this happens after 5 consecutive failures
  const circuitResult = await poll(
    "circuit open",
    async () => {
      const [ep] = await db
        .select()
        .from(schema.endpoints)
        .where(eq(schema.endpoints.id, state.endpointId))
        .limit(1);
      return ep;
    },
    (ep) => ep?.circuitState === "open",
    60,
    2000
  );

  if (circuitResult?.circuitState === "open") {
    metrics.phase3.circuitOpened = true;
    ok(`Circuit OPENED (consecutive failures: ${circuitResult.consecutiveFailures})`);
  } else {
    fail(`Circuit did not open — state: ${circuitResult?.circuitState}`);
  }

  // Wait a bit more for remaining events to be queued
  await sleep(5000);

  // Check replay queue
  const replayItems = await db
    .select({ cnt: count() })
    .from(schema.replayQueue)
    .where(
      and(
        eq(schema.replayQueue.endpointId, state.endpointId),
        eq(schema.replayQueue.status, "pending")
      )
    );

  metrics.phase3.replayQueued = replayItems[0]?.cnt ?? 0;
  ok(`Replay queue depth: ${metrics.phase3.replayQueued} pending items`);

  // Count failed deliveries
  const failedDeliveries = await db
    .select({ cnt: count() })
    .from(schema.deliveries)
    .where(
      and(
        eq(schema.deliveries.endpointId, state.endpointId),
        eq(schema.deliveries.status, "failed")
      )
    );

  ok(`Failed deliveries recorded: ${failedDeliveries[0]?.cnt ?? 0}`);

  // Count total events now
  const totalEvents = await db
    .select({ cnt: count() })
    .from(schema.events)
    .where(eq(schema.events.integrationId, state.integrationId));

  metrics.phase3.ingested = (totalEvents[0]?.cnt ?? 0) - metrics.phase2.ingested;
  ok(`New events ingested during failure: ${metrics.phase3.ingested}`);

  divider();
}

// ─────────────────────────────────────────────────────────
// PHASE 4: Recovery → Replay Drains
// ─────────────────────────────────────────────────────────

async function phase4Recovery(state: TestState): Promise<void> {
  const { db, schema, eq, and, count, inngest } = app;
  header("PHASE 4: Recovery → Replay Engine");

  // First, transition circuit from open → half_open (simulating health checks)
  log("recovery", "Simulating 3 successful health checks to move to HALF_OPEN...");

  const { recordHealthCheckResult } = await import(
    "../src/lib/mitigation/circuit-breaker"
  );

  for (let i = 0; i < 3; i++) {
    const result = await recordHealthCheckResult(state.endpointId, true);
    ok(`Health check ${i + 1}/3: ${result.previousState} → ${result.newState}`);
  }

  // Verify half_open
  const [halfOpenEndpoint] = await db
    .select()
    .from(schema.endpoints)
    .where(eq(schema.endpoints.id, state.endpointId))
    .limit(1);

  if (halfOpenEndpoint?.circuitState !== "half_open") {
    fail(`Expected HALF_OPEN but got: ${halfOpenEndpoint?.circuitState}`);
    return;
  }

  ok(`Circuit transitioned to HALF_OPEN`);

  // Restore endpoint URL to dev receiver
  log("recovery", `Restoring endpoint URL to ${DEV_RECEIVER_URL}`);
  await db
    .update(schema.endpoints)
    .set({ url: DEV_RECEIVER_URL })
    .where(eq(schema.endpoints.id, state.endpointId));

  await db
    .update(schema.integrations)
    .set({ destinationUrl: DEV_RECEIVER_URL })
    .where(eq(schema.integrations.id, state.integrationId));

  ok(`Endpoint URL restored`);

  // Emit replay-started event to trigger the replay engine
  log("recovery", "Emitting endpoint/replay-started event...");
  await inngest.send({
    name: "endpoint/replay-started",
    data: {
      endpointId: state.endpointId,
      integrationId: state.integrationId,
    },
  });
  ok(`Replay started event emitted`);

  // Poll for replay queue to drain
  log("recovery", "Waiting for replay engine to drain the queue...");

  const replayResult = await poll(
    "replay drain",
    async () => {
      const pending = await db
        .select({ cnt: count() })
        .from(schema.replayQueue)
        .where(
          and(
            eq(schema.replayQueue.endpointId, state.endpointId),
            eq(schema.replayQueue.status, "pending")
          )
        );

      const delivered = await db
        .select({ cnt: count() })
        .from(schema.replayQueue)
        .where(
          and(
            eq(schema.replayQueue.endpointId, state.endpointId),
            eq(schema.replayQueue.status, "delivered")
          )
        );

      const skipped = await db
        .select({ cnt: count() })
        .from(schema.replayQueue)
        .where(
          and(
            eq(schema.replayQueue.endpointId, state.endpointId),
            eq(schema.replayQueue.status, "skipped")
          )
        );

      return {
        pending: pending[0]?.cnt ?? 0,
        delivered: delivered[0]?.cnt ?? 0,
        skipped: skipped[0]?.cnt ?? 0,
      };
    },
    (r) => r.pending === 0,
    60,
    2000
  );

  metrics.phase4.replayDelivered = replayResult.delivered;
  metrics.phase4.replaySkipped = replayResult.skipped;

  ok(`Replay delivered: ${replayResult.delivered}`);
  if (replayResult.skipped > 0) {
    warn(`Replay skipped: ${replayResult.skipped}`);
  }
  ok(`Replay pending: ${replayResult.pending}`);

  // Check final circuit state
  const [finalEndpoint] = await db
    .select()
    .from(schema.endpoints)
    .where(eq(schema.endpoints.id, state.endpointId))
    .limit(1);

  metrics.phase4.circuitClosed = finalEndpoint?.circuitState === "closed";
  ok(`Final circuit state: ${finalEndpoint?.circuitState}`);

  if (finalEndpoint?.circuitState === "closed") {
    ok(`Circuit fully recovered to CLOSED`);
  } else if (finalEndpoint?.circuitState === "half_open") {
    warn(`Circuit still HALF_OPEN (needs ${10 - (finalEndpoint?.consecutiveSuccesses ?? 0)} more successes for CLOSED)`);
  }

  divider();
}

// ─────────────────────────────────────────────────────────
// PHASE 5: Reconciliation
// ─────────────────────────────────────────────────────────

async function phase5Reconciliation(state: TestState): Promise<void> {
  const { db, schema, eq, and, count, desc } = app;
  header("PHASE 5: Reconciliation (Stripe API)");

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    warn("STRIPE_SECRET_KEY not set in .env.local — skipping Phase 5");
    warn("Set STRIPE_SECRET_KEY=sk_test_... to enable reconciliation testing");
    divider();
    return;
  }

  // Create a real Stripe event via the CLI
  log("reconciliation", "Creating a real Stripe event via `stripe trigger`...");

  try {
    const triggerOutput = execSync("stripe trigger charge.succeeded 2>&1", {
      timeout: 30000,
      encoding: "utf-8",
    });
    ok(`Stripe trigger output: ${triggerOutput.trim().split("\n").pop()}`);
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    warn(`stripe trigger failed: ${err.stderr ?? err.message}`);
    warn("Make sure the Stripe CLI is installed and authenticated");
    warn("Install: brew install stripe/stripe-cli/stripe");
    warn("Auth: stripe login");
    divider();
    return;
  }

  // Wait briefly for Stripe's API to reflect the event
  await sleep(2000);

  // Set the API key on the integration so reconciliation can poll Stripe
  log("reconciliation", "Setting Stripe API key on integration for reconciliation...");
  await db
    .update(schema.integrations)
    .set({ apiKeyEncrypted: stripeKey })
    .where(eq(schema.integrations.id, state.integrationId));
  ok("API key set");

  // Run reconciliation
  log("reconciliation", "Running reconciliation engine...");

  const { reconcileIntegration } = await import("../src/lib/ai/reconciliation");
  const result = await reconcileIntegration(state.integrationId);

  metrics.phase5.providerEvents = result.providerEventsFound;
  metrics.phase5.gapsDetected = result.gapsDetected;
  metrics.phase5.gapsResolved = result.gapsResolved;

  ok(`Provider events found: ${result.providerEventsFound}`);
  ok(`HookWise events found: ${result.hookwiseEventsFound}`);
  ok(`Gaps detected: ${result.gapsDetected}`);
  ok(`Gaps resolved: ${result.gapsResolved}`);

  // Verify reconciliation run was logged
  const [reconRun] = await db
    .select()
    .from(schema.reconciliationRuns)
    .where(eq(schema.reconciliationRuns.integrationId, state.integrationId))
    .orderBy(desc(schema.reconciliationRuns.ranAt))
    .limit(1);

  if (reconRun) {
    ok(`Reconciliation run logged at ${reconRun.ranAt?.toISOString()}`);
  }

  // Check for reconciliation-sourced events
  const reconEvents = await db
    .select({ cnt: count() })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.integrationId, state.integrationId),
        eq(schema.events.source, "reconciliation")
      )
    );

  ok(`Events with source=reconciliation: ${reconEvents[0]?.cnt ?? 0}`);

  // Clean up the API key
  await db
    .update(schema.integrations)
    .set({ apiKeyEncrypted: null })
    .where(eq(schema.integrations.id, state.integrationId));

  divider();
}

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────

function printSummary(): void {
  header("SUMMARY");

  console.log("\x1b[1m");
  console.log("  Phase │ Metric                    │ Value");
  console.log("  ──────┼───────────────────────────┼──────────");
  console.log(`    2   │ Webhooks sent              │ ${metrics.phase2.sent}`);
  console.log(`    2   │ Events ingested            │ ${metrics.phase2.ingested}`);
  console.log(`    2   │ Deliveries successful      │ ${metrics.phase2.delivered}`);
  console.log("  ──────┼───────────────────────────┼──────────");
  console.log(`    3   │ Webhooks sent (failure)    │ ${metrics.phase3.sent}`);
  console.log(`    3   │ Events ingested            │ ${metrics.phase3.ingested}`);
  console.log(`    3   │ Circuit opened             │ ${metrics.phase3.circuitOpened ? "YES" : "NO"}`);
  console.log(`    3   │ Replay queue depth         │ ${metrics.phase3.replayQueued}`);
  console.log("  ──────┼───────────────────────────┼──────────");
  console.log(`    4   │ Replay delivered           │ ${metrics.phase4.replayDelivered}`);
  console.log(`    4   │ Replay skipped             │ ${metrics.phase4.replaySkipped}`);
  console.log(`    4   │ Circuit recovered           │ ${metrics.phase4.circuitClosed ? "CLOSED" : "HALF_OPEN"}`);
  console.log("  ──────┼───────────────────────────┼──────────");
  console.log(`    5   │ Provider events found      │ ${metrics.phase5.providerEvents}`);
  console.log(`    5   │ Gaps detected              │ ${metrics.phase5.gapsDetected}`);
  console.log(`    5   │ Gaps resolved              │ ${metrics.phase5.gapsResolved}`);
  console.log("\x1b[0m");

  // Overall verdict
  const allGood =
    metrics.phase2.delivered >= 10 &&
    metrics.phase3.circuitOpened &&
    metrics.phase3.replayQueued > 0 &&
    metrics.phase4.replayDelivered > 0;

  if (allGood) {
    console.log(
      "\x1b[32m\x1b[1m  Result: ALL PHASES PASSED — replay & circuit breaker working end-to-end\x1b[0m\n"
    );
  } else {
    console.log(
      "\x1b[33m\x1b[1m  Result: SOME PHASES INCOMPLETE — check details above\x1b[0m\n"
    );
  }

  divider();
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(
    "\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   HookWise — Replay & Reconciliation Test                    ║"
  );
  console.log(
    "║                                                              ║"
  );
  console.log(
    `║   Target: ${BASE_URL.padEnd(47)}  ║`
  );
  console.log(
    `║   Phases: 1-Setup  2-Traffic  3-Failure  4-Replay  5-Recon   ║`
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\x1b[0m"
  );

  // Load app modules (dynamic import to ensure DATABASE_URL is set)
  log("preflight", "Loading app modules...");
  app = await loadAppModules();
  ok("App modules loaded");

  // Preflight: database connectivity
  log("preflight", "Checking database connection...");
  try {
    const testResult = await app.db.select({ cnt: app.count() }).from(app.schema.integrations);
    ok(`Database connected (${testResult[0]?.cnt ?? 0} integrations)`);
  } catch (dbErr) {
    fail(`Cannot connect to database — check DATABASE_URL in .env.local`);
    fail(`Error: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
    process.exit(1);
  }

  // Preflight: dev server
  log("preflight", `Checking dev server at ${BASE_URL}...`);
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    ok(`Dev server responded with ${res.status}`);
  } catch {
    fail(`Cannot reach ${BASE_URL} — is the dev server running? (pnpm dev)`);
    process.exit(1);
  }

  // Check dev receiver
  log("preflight", "Checking dev receiver endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/dev/receiver`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ test: "preflight" }),
    });
    if (res.status === 200) {
      ok("Dev receiver is responding");
    } else {
      warn(`Dev receiver returned ${res.status} — deliveries may fail`);
    }
  } catch {
    fail("Dev receiver not reachable — deliveries will fail");
    process.exit(1);
  }

  try {
    // Phase 1: Setup
    const state = await phase1Setup();

    // Phase 2: Normal Traffic
    await phase2NormalTraffic(state);

    // Phase 3: Endpoint Failure
    await phase3EndpointFailure(state);

    // Phase 4: Recovery + Replay
    await phase4Recovery(state);

    // Phase 5: Reconciliation
    if (!SKIP_RECONCILIATION) {
      await phase5Reconciliation(state);
    } else {
      header("PHASE 5: Reconciliation (SKIPPED)");
      warn("Skipped via --skip-reconciliation flag");
      divider();
    }

    // Print summary
    printSummary();
  } catch (err) {
    console.error("\n\x1b[31mFATAL:\x1b[0m", err);
    process.exit(1);
  }

  process.exit(0);
}

main();
