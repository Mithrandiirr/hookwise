/**
 * HookWise — Setup Real Webhook Testing
 *
 * Creates/updates Stripe and Shopify integrations that point to the local
 * dev receiver endpoint, so the full delivery pipeline works end-to-end.
 *
 * Prerequisites:
 *   1. Dev server running: pnpm dev
 *   2. Inngest dev server running: pnpm dev:inngest
 *   3. STRIPE_WEBHOOK_SECRET in .env.local (from `stripe listen` output)
 *
 * Usage: npx tsx scripts/setup-real-webhooks.ts
 */

// Load env BEFORE any other imports so DATABASE_URL is available
import { config } from "dotenv";
config({ path: ".env.local" });

const USER_ID = "70382443-36d9-47b0-8f0b-8e327ccf11cf";
const RECEIVER_URL = "http://localhost:3000/api/dev/receiver";
const BASE_URL = "http://localhost:3000";

function log(section: string, msg: string) {
  console.log(`\x1b[36m[${section}]\x1b[0m ${msg}`);
}
function ok(msg: string) {
  console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
}
function warn(msg: string) {
  console.log(`\x1b[33m  ⚠\x1b[0m ${msg}`);
}

interface IntegrationConfig {
  name: string;
  provider: "stripe" | "shopify";
  secretEnvVar: string;
  fallbackSecret: string;
}

const CONFIGS: IntegrationConfig[] = [
  {
    name: "Stripe (Real Webhooks)",
    provider: "stripe",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET",
    fallbackSecret: " whsec_a97c8400ca4ef16c826a8bb4c62eb4b4163c5537bd971727209fbeb58387ad40",
  },
  {
    name: "Shopify (Real Webhooks)",
    provider: "shopify",
    secretEnvVar: "SHOPIFY_WEBHOOK_SECRET",
    fallbackSecret: "shpss_test_fallback_secret",
  },
];

async function main() {
  // Dynamic imports so dotenv has already loaded DATABASE_URL
  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");

  async function upsertIntegration(cfg: IntegrationConfig): Promise<string> {
    const secret = process.env[cfg.secretEnvVar] ?? cfg.fallbackSecret;

    if (!process.env[cfg.secretEnvVar]) {
      warn(`${cfg.secretEnvVar} not set — using fallback secret. Real provider webhooks won't verify.`);
    }

    // Check for existing integration
    const [existing] = await db
      .select()
      .from(schema.integrations)
      .where(
        and(
          eq(schema.integrations.userId, USER_ID),
          eq(schema.integrations.provider, cfg.provider),
          eq(schema.integrations.status, "active")
        )
      )
      .limit(1);

    if (existing) {
      // Update destination URL and signing secret
      await db
        .update(schema.integrations)
        .set({
          destinationUrl: RECEIVER_URL,
          signingSecret: secret,
          name: cfg.name,
          updatedAt: new Date(),
        })
        .where(eq(schema.integrations.id, existing.id));

      // Update endpoint URL too
      await db
        .update(schema.endpoints)
        .set({ url: RECEIVER_URL })
        .where(eq(schema.endpoints.integrationId, existing.id));

      ok(`Updated existing: ${cfg.name} (${existing.id})`);
      return existing.id;
    }

    // Create new integration
    const [created] = await db
      .insert(schema.integrations)
      .values({
        userId: USER_ID,
        name: cfg.name,
        provider: cfg.provider,
        signingSecret: secret,
        destinationUrl: RECEIVER_URL,
        status: "active",
        idempotencyEnabled: true,
      })
      .returning();

    // Create endpoint
    await db.insert(schema.endpoints).values({
      integrationId: created.id,
      url: RECEIVER_URL,
      circuitState: "closed",
      successRate: 100,
      avgResponseMs: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      consecutiveHealthChecks: 0,
      healthScore: 100,
    });

    ok(`Created: ${cfg.name} (${created.id})`);
    return created.id;
  }

  console.log(
    "\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   HookWise — Setup Real Webhook Testing                      ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\x1b[0m\n"
  );

  const ids: Record<string, string> = {};

  for (const cfg of CONFIGS) {
    log(cfg.provider, `Setting up ${cfg.name}...`);
    ids[cfg.provider] = await upsertIntegration(cfg);
  }

  // Print summary
  console.log("\n\x1b[1m── Ingest URLs ──────────────────────────────────────────\x1b[0m\n");
  for (const cfg of CONFIGS) {
    console.log(`  ${cfg.provider.toUpperCase()}: ${BASE_URL}/api/ingest/${ids[cfg.provider]}`);
  }

  console.log("\n\x1b[1m── CLI Commands ─────────────────────────────────────────\x1b[0m\n");

  if (ids["stripe"]) {
    console.log("  \x1b[33mStripe CLI:\x1b[0m");
    console.log(`  stripe listen --forward-to ${BASE_URL}/api/ingest/${ids["stripe"]}`);
    console.log("");
    console.log("  \x1b[33mTrigger test events:\x1b[0m");
    console.log("  stripe trigger payment_intent.succeeded");
    console.log("  stripe trigger charge.succeeded");
    console.log("  stripe trigger invoice.paid");
    console.log("");
  }

  if (ids["shopify"]) {
    console.log("  \x1b[33mShopify CLI:\x1b[0m");
    console.log(`  shopify webhook trigger --topic orders/create --address ${BASE_URL}/api/ingest/${ids["shopify"]}`);
    console.log("");
  }

  console.log("\x1b[1m── Full Test Flow ───────────────────────────────────────\x1b[0m\n");
  console.log("  Terminal 1: pnpm dev                          # Next.js");
  console.log("  Terminal 2: pnpm dev:inngest                  # Inngest dev server");
  console.log("  Terminal 3: pnpm test:setup-webhooks           # This script");
  console.log(`  Terminal 4: stripe listen --forward-to ${BASE_URL}/api/ingest/${ids["stripe"] ?? "<ID>"}`);
  console.log("  Terminal 5: stripe trigger payment_intent.succeeded");
  console.log("");
  console.log("  Events flow: Stripe CLI → ingest → DB → Inngest → deliver → dev receiver");
  console.log("  Check dashboard at http://localhost:3000/events\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n\x1b[31mFATAL:\x1b[0m", err);
  process.exit(1);
});
