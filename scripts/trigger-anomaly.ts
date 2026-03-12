/**
 * Seeds realistic pattern data for a Shopify integration, then
 * injects fake events + a sudden failure surge so the anomaly
 * detector fires and Claude diagnoses it.
 *
 * Usage: npx tsx scripts/trigger-anomaly.ts
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
} from "../src/lib/db/schema.ts";
import { eq, and } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // 1. Find the Shopify Test integration
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.provider, "shopify"),
        eq(integrations.status, "active")
      )
    )
    .limit(1);

  if (!integration) {
    console.error("No active Shopify integration found.");
    await client.end();
    return;
  }

  console.log(`Using integration: ${integration.name} (${integration.id})`);

  // 2. Find or get endpoint
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

  // 3. Seed baseline patterns (simulating a healthy integration with 500+ samples)
  console.log("Seeding baseline patterns...");

  const patternData = [
    { metricName: "event_count", rollingAvg: 12.5, rollingStddev: 2.3, sampleCount: 500 },
    { metricName: "avg_response_ms", rollingAvg: 145, rollingStddev: 35, sampleCount: 500 },
    { metricName: "failure_rate", rollingAvg: 0.02, rollingStddev: 0.01, sampleCount: 500 },
    { metricName: "avg_payload_size", rollingAvg: 2400, rollingStddev: 400, sampleCount: 500 },
  ];

  // Delete existing patterns for this integration
  await db.delete(patterns).where(eq(patterns.integrationId, integration.id));

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
  console.log("  Patterns seeded (500 sample baseline)");

  // 4. Inject recent events (last 5 min) to simulate real traffic
  console.log("Injecting recent events with failures...");

  const now = new Date();
  const eventIds: string[] = [];

  for (let i = 0; i < 8; i++) {
    const receivedAt = new Date(now.getTime() - (i * 30_000)); // every 30s
    const [evt] = await db
      .insert(events)
      .values({
        integrationId: integration.id,
        eventType: i < 6 ? "orders/create" : "orders/paid",
        payload: {
          id: 1000 + i,
          order_number: `#100${i}`,
          total_price: "16.80",
          currency: "MAD",
          financial_status: "paid",
          _test: true,
        },
        headers: { "x-shopify-topic": "orders/create" },
        receivedAt,
        signatureValid: true,
        providerEventId: `shopify:test:${Date.now()}-${i}`,
        source: "webhook",
      })
      .returning({ id: events.id });

    eventIds.push(evt.id);
  }
  console.log(`  Inserted ${eventIds.length} recent events`);

  // 5. Create deliveries — mostly failing (simulating endpoint down)
  console.log("Injecting delivery failures (simulating endpoint outage)...");

  for (let i = 0; i < eventIds.length; i++) {
    const isFailed = i < 6; // 6 out of 8 fail = 75% failure rate
    await db.insert(deliveries).values({
      eventId: eventIds[i],
      endpointId: endpoint.id,
      status: isFailed ? "failed" : "delivered",
      statusCode: isFailed ? 503 : 200,
      responseTimeMs: isFailed ? 5000 + Math.floor(Math.random() * 2000) : 150,
      responseBody: isFailed ? "Service Unavailable" : '{"ok":true}',
      errorType: isFailed ? "server_error" : null,
      attemptNumber: 1,
      attemptedAt: new Date(now.getTime() - (i * 30_000)),
      deliveryType: "initial",
    });
  }
  console.log("  Inserted deliveries (75% failure rate — all 503s)");

  // 6. Done — tell user what to expect
  console.log("\n=== ANOMALY SCENARIO READY ===");
  console.log("Baseline: 12.5 events/5min, 145ms avg response, 2% failure rate");
  console.log("Current:  8 events, ~5000ms response times, 75% failure rate");
  console.log("");
  console.log("Expected anomalies:");
  console.log("  1. failure_surge  — 75% failure rate vs 2% baseline");
  console.log("  2. response_time_spike — 5000ms+ vs 145ms baseline");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Make sure ANTHROPIC_API_KEY is set in .env.local");
  console.log("  2. Trigger anomaly detection via Inngest dashboard (localhost:8288)");
  console.log("     OR wait for the 5-min cron");
  console.log("  3. Check /anomalies in the dashboard for AI-powered diagnosis");

  await client.end();
}

main();
