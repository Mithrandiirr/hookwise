import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  anomalies,
  patterns,
  events,
  deliveries,
  endpoints,
  integrations,
} from "../src/lib/db/schema.ts";
import { eq, and, isNull } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // 1. Resolve all unresolved anomalies so dedup doesn't block
  const resolved = await db
    .update(anomalies)
    .set({ resolvedAt: new Date() })
    .where(isNull(anomalies.resolvedAt))
    .returning({ id: anomalies.id });

  console.log(`Resolved ${resolved.length} old anomalies`);

  // 2. Find integration + endpoint
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.provider, "shopify"),
        eq(integrations.name, "Shopify (Real Webhooks)")
      )
    )
    .limit(1);

  if (!integration) {
    console.error("No Shopify integration found");
    await client.end();
    return;
  }

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integration.id))
    .limit(1);

  if (!endpoint) {
    console.error("No endpoint found");
    await client.end();
    return;
  }

  // 3. Re-seed patterns
  await db.delete(patterns).where(eq(patterns.integrationId, integration.id));

  const patternData = [
    { metricName: "event_count", rollingAvg: 12.5, rollingStddev: 2.3, sampleCount: 500 },
    { metricName: "avg_response_ms", rollingAvg: 145, rollingStddev: 35, sampleCount: 500 },
    { metricName: "failure_rate", rollingAvg: 0.02, rollingStddev: 0.01, sampleCount: 500 },
    { metricName: "avg_payload_size", rollingAvg: 2400, rollingStddev: 400, sampleCount: 500 },
  ];

  for (const p of patternData) {
    await db.insert(patterns).values({
      integrationId: integration.id,
      ...p,
      lastUpdated: new Date(),
    });
  }

  // 4. Insert fresh events + failing deliveries
  const now = new Date();
  const eventIds: string[] = [];

  for (let i = 0; i < 8; i++) {
    const receivedAt = new Date(now.getTime() - (i * 30_000));
    const [evt] = await db
      .insert(events)
      .values({
        integrationId: integration.id,
        eventType: "orders/create",
        payload: {
          id: 2000 + i,
          order_number: `#200${i}`,
          total_price: "16.80",
          currency: "MAD",
          _test: true,
        },
        headers: { "x-shopify-topic": "orders/create" },
        receivedAt,
        signatureValid: true,
        providerEventId: `shopify:reset:${Date.now()}-${i}`,
        source: "webhook",
      })
      .returning({ id: events.id });

    eventIds.push(evt.id);
  }

  for (let i = 0; i < eventIds.length; i++) {
    const isFailed = i < 6;
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

  console.log("Fresh events + deliveries seeded");
  console.log("");
  console.log("Now trigger 'Anomaly Detection Engine' from Inngest dashboard (localhost:8288)");

  await client.end();
}

main();
