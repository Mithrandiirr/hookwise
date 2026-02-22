import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });
const db = drizzle(client, { schema });

const INTEGRATION_ID = "ef2d457f-34a2-4337-a97e-e6359065ee4b";

const DIAGNOSES: Record<string, object> = {
  new_event_type: {
    what: "A previously unseen event type 'checkout.session.completed' appeared in your Stripe webhook stream. This event type has not been observed in the 300-event baseline history for this integration.",
    why: "This typically happens when a new Stripe product feature is enabled (Checkout Sessions, Payment Links), a new API version is adopted that emits additional event types, or someone manually added this event type to the webhook endpoint configuration in the Stripe dashboard.",
    impact: "Low immediate risk — the event was delivered successfully. However, if your handler doesn't have a case for this event type, it may be silently dropped or cause an unhandled error on the next occurrence. Payment flows relying on checkout session completion could be affected.",
    recommendation: "1. Verify your webhook handler has a case for 'checkout.session.completed'. 2. If intentional, no action needed — HookWise will incorporate it into baseline patterns within 2-3 learning cycles. 3. If unexpected, check your Stripe webhook endpoint settings at dashboard.stripe.com/webhooks.",
    confidence: 0.85,
    crossCorrelation: null,
  },
  failure_surge: {
    what: "70% of webhook deliveries to your endpoint have returned HTTP 503 over the last 5 minutes. 24 out of 35 delivery attempts failed with 'Service Unavailable', concentrated on charge.succeeded and payment_intent.succeeded events.",
    why: "Your destination endpoint at jsonplaceholder.typicode.com is returning 503 errors consistently, indicating the upstream server is either overloaded, undergoing maintenance, or has hit a resource ceiling (memory/CPU/connection pool exhaustion). The failure pattern is uniform across all event types, ruling out a payload-specific bug — this is infrastructure-level.",
    impact: "24 payment-related webhook events are undelivered. If these include charge confirmations or payment intent updates, downstream order fulfillment, receipt emails, and inventory updates may be stalled. Estimated affected transaction volume: ~$12,400 based on payload amounts in the failed events.",
    recommendation: "1. Check your server's health dashboard for CPU/memory spikes or deployment rollouts in the last 10 minutes. 2. If a deploy just went out, roll back immediately. 3. HookWise has queued all failed events in the replay buffer — once your endpoint recovers, they will be delivered in order automatically. No manual replay needed.",
    confidence: 0.92,
    crossCorrelation: "No other integrations are experiencing failures — this is isolated to your endpoint, not a provider-side outage.",
  },
  response_time_spike: {
    what: "Average response time spiked from 150ms baseline to 5,400ms over the last 5 minutes — a 36x increase. Several requests exceeded 11 seconds and timed out entirely. The slowdown affects all event types uniformly.",
    why: "The response time degradation pattern (gradual increase from 1.8s to 11s+ over 5 minutes) is consistent with resource exhaustion on your server — likely a connection pool running dry, a database query bottleneck, or a memory leak causing GC pauses. The timeouts started ~3 minutes after the initial slowdown, suggesting cascading failure as pending requests pile up.",
    impact: "Webhook processing latency has increased from sub-200ms to multi-second territory. Events that depend on timely delivery (payment confirmations, subscription state changes) are arriving 30-70x later than normal. 8 events timed out completely and will need retry.",
    recommendation: "1. Check your application's database connection pool — a common cause is connections not being released. 2. Look for recent code changes that added synchronous I/O in the webhook handler path. 3. Consider adding a /health endpoint that HookWise can monitor independently. 4. The circuit breaker will throttle delivery automatically while your endpoint recovers.",
    confidence: 0.88,
    crossCorrelation: null,
  },
  volume_spike: {
    what: "Event volume increased from a baseline of ~22 events per 5-minute window to 85 events — a 3.9x spike. The surge is concentrated in charge.succeeded and payment_intent.succeeded event types.",
    why: "This volume pattern is consistent with a batch processing event on the Stripe side — likely a bulk subscription renewal cycle, a promotional campaign triggering simultaneous purchases, or a retry storm from Stripe re-delivering events it believes were not acknowledged. The event type distribution (heavily weighted toward payment events) suggests legitimate transaction volume rather than duplicate delivery.",
    impact: "Your endpoint is receiving ~4x normal load. Combined with the elevated response times, this creates compounding pressure — more events arriving while each takes longer to process. If your server has fixed concurrency limits, the queue depth is growing rapidly.",
    recommendation: "1. If this volume is expected (e.g., a sale or billing cycle), no action needed — HookWise is buffering overflow automatically. 2. If unexpected, check your Stripe dashboard for unusual activity. 3. Consider implementing a webhook handler that responds 200 immediately and processes asynchronously to handle volume spikes gracefully.",
    confidence: 0.79,
    crossCorrelation: "Volume patterns on other integrations are normal — this spike is Stripe-specific, not a platform-wide event.",
  },
};

async function main() {
  const allAnomalies = await db
    .select()
    .from(schema.anomalies)
    .where(eq(schema.anomalies.integrationId, INTEGRATION_ID));

  console.log(`Found ${allAnomalies.length} anomalies to patch\n`);

  for (const anomaly of allAnomalies) {
    const diagnosis = DIAGNOSES[anomaly.type];
    if (!diagnosis) {
      console.log(`  skip: ${anomaly.type} (no diagnosis template)`);
      continue;
    }

    await db
      .update(schema.anomalies)
      .set({ diagnosis: JSON.stringify(diagnosis) })
      .where(eq(schema.anomalies.id, anomaly.id));

    const d = diagnosis as Record<string, unknown>;
    console.log(`  \x1b[32m✓\x1b[0m ${anomaly.type} [${anomaly.severity}] — confidence: ${(d.confidence as number * 100).toFixed(0)}%`);
  }

  console.log("\nDone — refresh /anomalies in your browser.");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
