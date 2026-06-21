/**
 * One-shot setup for live Shopify testing against hookwise.myshopify.com.
 *  - Points the "Shopify Test" integration at the working admin token
 *  - Sets it active + audit mode
 *  - Registers an orders/create webhook to the ngrok ingest URL (idempotent)
 *  - Fires the onboarding/backfill job for the 7 existing orders
 *
 * Usage: NGROK_URL=https://xxxx.ngrok-free.dev npx tsx scripts/setup-live-shopify.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const INTEGRATION_ID = "7f0a840e-59de-4c03-93b6-f1f5edfcc53a";
const SHOP_DOMAIN = "hookwise.myshopify.com";
const API_VERSION = "2024-01";
const TOKEN = process.env.shopify_api_key!;
const NGROK_URL = process.env.NGROK_URL!;
const WEBHOOK_TOPICS = ["orders/create", "orders/paid", "orders/updated"];

async function main() {
  if (!TOKEN) throw new Error("shopify_api_key missing from .env.local");
  if (!NGROK_URL) throw new Error("NGROK_URL env var required");

  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const ingestUrl = `${NGROK_URL.replace(/\/$/, "")}/api/ingest/${INTEGRATION_ID}`;

  // 1) Point the integration at the working token, active + audit mode.
  const [updated] = await db
    .update(schema.integrations)
    .set({
      apiKeyEncrypted: TOKEN,
      providerDomain: SHOP_DOMAIN,
      status: "active",
      mode: "audit",
      updatedAt: new Date(),
    })
    .where(eq(schema.integrations.id, INTEGRATION_ID))
    .returning({ id: schema.integrations.id, name: schema.integrations.name });
  console.log("✓ integration ready:", updated);
  console.log("  ingest URL:", ingestUrl);

  // 2) Register webhooks (idempotent — skip topics already pointing at this URL).
  const headers = {
    "X-Shopify-Access-Token": TOKEN,
    "Content-Type": "application/json",
  };
  const existingRes = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/webhooks.json`,
    { headers }
  );
  const existing = (await existingRes.json()) as {
    webhooks?: Array<{ id: number; topic: string; address: string }>;
  };
  const have = new Set(
    (existing.webhooks ?? [])
      .filter((w) => w.address === ingestUrl)
      .map((w) => w.topic)
  );

  for (const topic of WEBHOOK_TOPICS) {
    if (have.has(topic)) {
      console.log(`  webhook ${topic} already registered`);
      continue;
    }
    const res = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/webhooks.json`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          webhook: { topic, address: ingestUrl, format: "json" },
        }),
      }
    );
    const body = await res.json();
    if (!res.ok) {
      console.log(`  ✗ webhook ${topic} failed ${res.status}:`, JSON.stringify(body));
    } else {
      console.log(`  ✓ webhook ${topic} registered`);
    }
  }

  // 3) Fire the backfill for the existing orders.
  const { inngest } = await import("../src/lib/inngest/client");
  await inngest.send({
    name: "onboarding/backfill",
    data: { integrationId: INTEGRATION_ID, windowDays: 120, maxEvents: 5000 },
  });
  console.log("✓ backfill fired (window 120d)");

  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
