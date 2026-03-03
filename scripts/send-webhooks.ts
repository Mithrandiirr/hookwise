/**
 * HookWise — Send Real Webhooks
 *
 * Sends properly-signed webhook HTTP requests to the /api/ingest endpoint,
 * testing the full pipeline: HTTP → signature verify → DB insert → Inngest.
 *
 * Prerequisites:
 *   1. Dev server running: pnpm dev
 *   2. At least one active integration in the DB (the script creates them if needed)
 *
 * Usage: npx tsx scripts/send-webhooks.ts
 *
 * Options:
 *   --count=N       Number of webhooks per provider (default: 20)
 *   --delay=N       Delay in ms between requests (default: 200)
 *   --base-url=URL  Base URL of the dev server (default: http://localhost:3000)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import crypto from "crypto";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── CLI Args ────────────────────────────────────────────

function getArg(name: string, fallback: string): string {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : fallback;
}

const WEBHOOK_COUNT = parseInt(getArg("count", "20"), 10);
const DELAY_MS = parseInt(getArg("delay", "200"), 10);
const BASE_URL = getArg("base-url", "http://localhost:3000");
const USER_ID = "70382443-36d9-47b0-8f0b-8e327ccf11cf";

// ─── Logging ─────────────────────────────────────────────

function log(section: string, msg: string) {
  console.log(`\x1b[36m[${section}]\x1b[0m ${msg}`);
}
function ok(msg: string) {
  console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
}
function fail(msg: string) {
  console.log(`\x1b[31m  ✗\x1b[0m ${msg}`);
}
function header(title: string) {
  console.log(
    `\n\x1b[1m\x1b[33m┌─── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}┐\x1b[0m`
  );
}
function divider() {
  console.log(`\x1b[33m└${"─".repeat(60)}┘\x1b[0m`);
}

// ─── Signature Generators ────────────────────────────────

function signStripe(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function signShopify(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64");
}

function signGitHub(payload: string, secret: string): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `sha256=${sig}`;
}

// ─── Payload Generators ─────────────────────────────────

function randomAmount(): number {
  return 500 + Math.floor(Math.random() * 250000);
}

function randomCustomerId(i: number): string {
  return `cus_${(i % 50).toString().padStart(5, "0")}`;
}

const STRIPE_EVENT_TYPES = [
  "charge.succeeded",
  "charge.failed",
  "charge.refunded",
  "payment_intent.succeeded",
  "payment_intent.created",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.created",
  "customer.updated",
  "checkout.session.completed",
] as const;

const SHOPIFY_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/paid",
  "products/update",
  "customers/create",
  "checkouts/create",
  "refunds/create",
] as const;

const GITHUB_EVENTS = [
  "push",
  "pull_request",
  "workflow_run",
  "issues",
  "release",
  "deployment_status",
] as const;

function stripePayload(i: number): { body: string; eventType: string } {
  const eventType = STRIPE_EVENT_TYPES[i % STRIPE_EVENT_TYPES.length];
  const amount = randomAmount();
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
        customer: randomCustomerId(i),
        status: eventType.includes("failed") ? "failed" : "succeeded",
        description: `Order #${10000 + i}`,
        metadata: { hookwise_test: "true" },
        created: Math.floor(Date.now() / 1000),
      },
    },
    request: { id: `req_${crypto.randomBytes(8).toString("hex")}` },
  });
  return { body, eventType };
}

function shopifyPayload(i: number): {
  body: string;
  topic: string;
  webhookId: string;
} {
  const topic = SHOPIFY_TOPICS[i % SHOPIFY_TOPICS.length];
  const orderId = 100000 + i;
  const amount = randomAmount();
  const webhookId = crypto.randomUUID();
  const body = JSON.stringify({
    id: orderId,
    admin_graphql_api_id: `gid://shopify/Order/${orderId}`,
    name: `#${orderId}`,
    email: `customer${i % 30}@example.com`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_price: (amount / 100).toFixed(2),
    subtotal_price: ((amount * 0.9) / 100).toFixed(2),
    total_tax: ((amount * 0.1) / 100).toFixed(2),
    currency: "USD",
    financial_status: "paid",
    fulfillment_status: null,
    order_number: orderId,
    line_items: [
      {
        id: orderId * 10 + 1,
        title: "HookWise Pro Plan",
        quantity: 1,
        price: (amount / 100).toFixed(2),
        sku: `SKU-${i % 20}`,
        variant_title: "Monthly",
      },
    ],
    shipping_address:
      i % 8 !== 0
        ? {
            first_name: "Test",
            last_name: `User ${i}`,
            address1: "123 Main St",
            city: "San Francisco",
            province: "California",
            country: "US",
            zip: "94105",
          }
        : undefined,
    billing_address: {
      first_name: "Test",
      last_name: `User ${i}`,
      address1: "123 Main St",
      city: "San Francisco",
      province: "California",
      country: "US",
      zip: "94105",
    },
  });
  return { body, topic, webhookId };
}

function githubPayload(i: number): {
  body: string;
  event: string;
  deliveryId: string;
} {
  const event = GITHUB_EVENTS[i % GITHUB_EVENTS.length];
  const deliveryId = crypto.randomUUID();
  const repo = i % 2 === 0 ? "myapp/backend" : "myapp/frontend";

  let body: string;
  switch (event) {
    case "push":
      body = JSON.stringify({
        ref: "refs/heads/main",
        before: crypto.randomBytes(20).toString("hex"),
        after: crypto.randomBytes(20).toString("hex"),
        repository: {
          id: 123456,
          full_name: repo,
          html_url: `https://github.com/${repo}`,
        },
        pusher: { name: `dev${i % 5}`, email: `dev${i % 5}@example.com` },
        sender: { login: `dev${i % 5}`, id: 1000 + (i % 5) },
        head_commit: {
          id: crypto.randomBytes(20).toString("hex"),
          message: `fix: resolve issue #${200 + i}`,
          timestamp: new Date().toISOString(),
          author: { name: `dev${i % 5}` },
        },
        commits: [
          {
            id: crypto.randomBytes(20).toString("hex"),
            message: `fix: resolve issue #${200 + i}`,
          },
        ],
      });
      break;
    case "pull_request":
      body = JSON.stringify({
        action: ["opened", "closed", "synchronize", "reopened"][i % 4],
        number: 100 + i,
        pull_request: {
          id: 5000 + i,
          number: 100 + i,
          title: `Feature: implement webhook ${i}`,
          state: "open",
          html_url: `https://github.com/${repo}/pull/${100 + i}`,
          head: { ref: `feature/webhook-${i}` },
          base: { ref: "main" },
        },
        repository: { id: 123456, full_name: repo },
        sender: { login: `dev${i % 5}`, id: 1000 + (i % 5) },
      });
      break;
    case "workflow_run":
      body = JSON.stringify({
        action: "completed",
        workflow_run: {
          id: 9000 + i,
          name: "CI",
          status: "completed",
          conclusion: i % 5 === 0 ? "failure" : "success",
          head_branch: "main",
          html_url: `https://github.com/${repo}/actions/runs/${9000 + i}`,
        },
        repository: { id: 123456, full_name: repo },
        sender: { login: `dev${i % 5}` },
      });
      break;
    default:
      body = JSON.stringify({
        action: "created",
        repository: { id: 123456, full_name: repo },
        sender: { login: `dev${i % 5}` },
      });
  }

  return { body, event, deliveryId };
}

// ─── Ensure Integrations Exist ───────────────────────────

interface LiveIntegration {
  id: string;
  provider: "stripe" | "shopify" | "github";
  signingSecret: string;
  name: string;
}

async function ensureIntegrations(): Promise<LiveIntegration[]> {
  header("INTEGRATIONS");
  log("setup", "Checking for active integrations...");

  const configs = [
    {
      name: "Stripe Webhooks (Live Test)",
      provider: "stripe" as const,
      destination: "https://api.myapp.com/webhooks/stripe",
      secret: "whsec_live_test_stripe_secret_key_123",
    },
    {
      name: "Shopify Orders (Live Test)",
      provider: "shopify" as const,
      destination: "https://api.myapp.com/webhooks/shopify",
      secret: "shpss_live_test_shopify_secret_key_456",
    },
    {
      name: "GitHub CI/CD (Live Test)",
      provider: "github" as const,
      destination: "https://api.myapp.com/webhooks/github",
      secret: "ghwh_live_test_github_secret_key_789",
    },
  ];

  const integrations: LiveIntegration[] = [];

  for (const c of configs) {
    // Check if an integration already exists for this provider
    const [existing] = await db
      .select()
      .from(schema.integrations)
      .where(
        and(
          eq(schema.integrations.userId, USER_ID),
          eq(schema.integrations.provider, c.provider),
          eq(schema.integrations.status, "active")
        )
      )
      .limit(1);

    if (existing) {
      integrations.push({
        id: existing.id,
        provider: c.provider,
        signingSecret: existing.signingSecret,
        name: existing.name ?? c.name,
      });
      ok(`Found existing: ${existing.name ?? c.name} (${existing.id.slice(0, 8)}...)`);
    } else {
      const [created] = await db
        .insert(schema.integrations)
        .values({
          userId: USER_ID,
          name: c.name,
          provider: c.provider,
          signingSecret: c.secret,
          destinationUrl: c.destination,
          status: "active",
          idempotencyEnabled: true,
          enrichmentEnabled: c.provider === "stripe",
          sequencerEnabled: c.provider === "shopify",
        })
        .returning();

      // Create an endpoint too
      await db.insert(schema.endpoints).values({
        integrationId: created.id,
        url: c.destination,
        circuitState: "closed",
        successRate: 100,
        avgResponseMs: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        consecutiveHealthChecks: 0,
        healthScore: 100,
      });

      integrations.push({
        id: created.id,
        provider: c.provider,
        signingSecret: c.secret,
        name: c.name,
      });
      ok(`Created: ${c.name} (${created.id.slice(0, 8)}...)`);
    }
  }

  divider();
  return integrations;
}

// ─── Send Webhooks ───────────────────────────────────────

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

async function sendStripeWebhooks(integration: LiveIntegration) {
  header(`STRIPE WEBHOOKS → ${integration.id.slice(0, 8)}...`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < WEBHOOK_COUNT; i++) {
    const { body, eventType } = stripePayload(i);
    const signature = signStripe(body, integration.signingSecret);
    const url = `${BASE_URL}/api/ingest/${integration.id}`;

    const res = await sendWebhook(url, body, {
      "stripe-signature": signature,
    });

    if (res.status === 200) {
      success++;
      ok(`${eventType} → ${res.status} (${res.latency}ms)`);
    } else {
      failed++;
      fail(`${eventType} → ${res.status} (${res.latency}ms) ${res.body}`);
    }

    if (DELAY_MS > 0 && i < WEBHOOK_COUNT - 1) await sleep(DELAY_MS);
  }

  log("stripe", `Done: ${success} ok, ${failed} failed`);
  divider();
}

async function sendShopifyWebhooks(integration: LiveIntegration) {
  header(`SHOPIFY WEBHOOKS → ${integration.id.slice(0, 8)}...`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < WEBHOOK_COUNT; i++) {
    const { body, topic, webhookId } = shopifyPayload(i);
    const signature = signShopify(body, integration.signingSecret);
    const url = `${BASE_URL}/api/ingest/${integration.id}`;

    const res = await sendWebhook(url, body, {
      "x-shopify-hmac-sha256": signature,
      "x-shopify-topic": topic,
      "x-shopify-webhook-id": webhookId,
      "x-shopify-shop-domain": "test-store.myshopify.com",
      "x-shopify-api-version": "2024-10",
    });

    if (res.status === 200) {
      success++;
      ok(`${topic} → ${res.status} (${res.latency}ms)`);
    } else {
      failed++;
      fail(`${topic} → ${res.status} (${res.latency}ms) ${res.body}`);
    }

    if (DELAY_MS > 0 && i < WEBHOOK_COUNT - 1) await sleep(DELAY_MS);
  }

  log("shopify", `Done: ${success} ok, ${failed} failed`);
  divider();
}

async function sendGitHubWebhooks(integration: LiveIntegration) {
  header(`GITHUB WEBHOOKS → ${integration.id.slice(0, 8)}...`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < WEBHOOK_COUNT; i++) {
    const { body, event, deliveryId } = githubPayload(i);
    const signature = signGitHub(body, integration.signingSecret);
    const url = `${BASE_URL}/api/ingest/${integration.id}`;

    const res = await sendWebhook(url, body, {
      "x-hub-signature-256": signature,
      "x-github-event": event,
      "x-github-delivery": deliveryId,
      "x-github-hook-id": "123456789",
    });

    if (res.status === 200) {
      success++;
      ok(`${event} → ${res.status} (${res.latency}ms)`);
    } else {
      failed++;
      fail(`${event} → ${res.status} (${res.latency}ms) ${res.body}`);
    }

    if (DELAY_MS > 0 && i < WEBHOOK_COUNT - 1) await sleep(DELAY_MS);
  }

  log("github", `Done: ${success} ok, ${failed} failed`);
  divider();
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log(
    "\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   HookWise — Send Real Webhooks                              ║"
  );
  console.log(
    "║                                                              ║"
  );
  console.log(
    `║   Sending ${WEBHOOK_COUNT} webhooks per provider (Stripe, Shopify, GitHub)  ║`
  );
  console.log(
    `║   Target: ${BASE_URL.padEnd(47)}  ║`
  );
  console.log(
    `║   Delay: ${DELAY_MS}ms between requests${" ".repeat(Math.max(0, 34 - DELAY_MS.toString().length))}║`
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\x1b[0m"
  );

  // Verify dev server is running
  log("preflight", `Checking dev server at ${BASE_URL}...`);
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    ok(`Dev server responded with ${res.status}`);
  } catch {
    fail(`Cannot reach ${BASE_URL} — is the dev server running? (pnpm dev)`);
    process.exit(1);
  }

  try {
    const integrations = await ensureIntegrations();

    const stripe = integrations.find((i) => i.provider === "stripe");
    const shopify = integrations.find((i) => i.provider === "shopify");
    const github = integrations.find((i) => i.provider === "github");

    if (stripe) await sendStripeWebhooks(stripe);
    if (shopify) await sendShopifyWebhooks(shopify);
    if (github) await sendGitHubWebhooks(github);

    const total = WEBHOOK_COUNT * integrations.length;
    header("COMPLETE");
    console.log(`\x1b[32m\x1b[1m  ✓ ${total} webhooks sent through the ingest pipeline\x1b[0m`);
    console.log(`\n  What happened for each webhook:`);
    console.log(`    1. HTTP POST → /api/ingest/[integrationId]`);
    console.log(`    2. Signature verified (HMAC-SHA256)`);
    console.log(`    3. Event stored in Postgres`);
    console.log(`    4. Inngest event emitted (webhook/received)`);
    console.log(`\n  Check your dashboard at ${BASE_URL}/dashboard`);
    console.log(`  Check Inngest dev server for queued jobs\n`);
    divider();
  } catch (err) {
    console.error("\n\x1b[31mFATAL:\x1b[0m", err);
    process.exit(1);
  }

  process.exit(0);
}

main();
