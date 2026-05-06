/**
 * Seeds multiple realistic anomaly scenarios that represent real-world
 * webhook failure cases companies actually face.
 *
 * Usage: npx tsx scripts/seed-real-scenarios.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { integrations, anomalies } from "../src/lib/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const allIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.status, "active"));

  if (allIntegrations.length === 0) {
    console.error("No active integrations found. Create one first.");
    await client.end();
    return;
  }

  const stripe = allIntegrations.find((i) => i.provider === "stripe") ?? allIntegrations[0];
  const shopify = allIntegrations.find((i) => i.provider === "shopify");

  console.log("Seeding real-world anomaly scenarios...\n");

  // ─────────────────────────────────────────────────────────
  // SCENARIO 1: Stripe API version rollout breaks payload parsing
  // Real case: Stripe updates their API version, payload schema changes,
  // customer's endpoint starts returning 422 because it can't parse the new format
  // ─────────────────────────────────────────────────────────
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [scenario1] = await db.insert(anomalies).values({
    integrationId: stripe.id,
    type: "failure_surge",
    severity: "high",
    diagnosis: {
      what: "62% of deliveries failed in the last 2 hours with HTTP 422 Unprocessable Entity. Failures started abruptly at 15:42 UTC and affect only charge.succeeded and payment_intent.succeeded event types. Other event types (customer.created, invoice.paid) are delivering normally.",
      why: "Payload schema analysis detected 3 new fields in charge.succeeded events starting 2 hours ago: `payment_method_details.card.regulated_status`, `latest_charge.payment_method_options`, and `balance_transaction.reporting_category`. This coincides with Stripe's 2026-03-01 API version auto-upgrade that rolled out today. The customer's endpoint is returning 422, which indicates their webhook handler is using strict schema validation that rejects unknown fields. Cross-integration check shows 2 other Stripe integrations on HookWise also experiencing elevated error rates (18% and 23%), confirming this is a Stripe-side change affecting multiple customers.",
      impact: "247 charge.succeeded events failed delivery. Based on payload amounts, $18,432.67 in payment notifications were not delivered to the customer's system. This could cause: (1) delayed order fulfillment, (2) incorrect subscription status in the customer's app, (3) revenue reconciliation gaps in their accounting system.",
      recommendation: "1) URGENT: Update your webhook handler to use permissive JSON parsing — reject unknown fields is causing the 422s. Add `additionalProperties: true` to your schema validator or switch to a lenient parser. 2) Pin your Stripe API version in the Dashboard to avoid surprise breaking changes. 3) After fixing parsing, HookWise will automatically replay all 247 queued events in order. 4) Long-term: implement payload schema versioning in your handler to gracefully handle new fields.",
      confidence: 0.94,
      crossCorrelation: "2 other Stripe integrations on HookWise are experiencing similar elevated error rates (18% and 23% failure rates). All failures are HTTP 422 on charge-related events. This confirms a Stripe API version change is the root cause, not an endpoint-specific issue.",
      predictedResolution: "Requires customer code change. Similar schema-related incidents typically resolve within 2-4 hours once the team is alerted. Auto-replay will recover all events after the fix is deployed.",
      evidence: [
        {
          tool: "query_delivery_history",
          query: { integration_id: stripe.id, minutes_back: 120 },
          finding: "153/247 deliveries failed (62.0%). Top errors: {\"server_error\": 153}. Status codes: {\"422\": 153, \"200\": 94}",
        },
        {
          tool: "query_endpoint_health",
          query: { integration_id: stripe.id },
          finding: "Circuit: half_open, health score: 38, replay queue: 153 events",
        },
        {
          tool: "query_payload_changes",
          query: { integration_id: stripe.id, event_type: "charge.succeeded" },
          finding: "3 event types have new payload fields: payment_method_details.card.regulated_status, latest_charge.payment_method_options, balance_transaction.reporting_category",
        },
        {
          tool: "query_event_patterns",
          query: { integration_id: stripe.id, hours_back: 6 },
          finding: "5 event types observed. charge.succeeded and payment_intent.succeeded have 62% failure rate. customer.created, invoice.paid, invoice.finalized at 0% failure rate. Signature valid rate: 100.0%",
        },
        {
          tool: "query_provider_health",
          query: { provider: "stripe" },
          finding: "Provider status: degraded, 3 integrations affected across HookWise",
        },
        {
          tool: "query_cross_integration_status",
          query: { integration_id: stripe.id },
          finding: "2/4 integrations have >10% failure rate. Both are Stripe integrations with charge-related event failures.",
        },
        {
          tool: "query_similar_anomalies",
          query: { integration_id: stripe.id, anomaly_type: "failure_surge", limit: 5 },
          finding: "Found 1 similar past incident from 3 months ago: Stripe API version upgrade caused 422s on invoice events. Resolved by updating schema validation.",
        },
      ],
      remediationActions: [
        {
          type: "adjust_retry_strategy",
          integrationId: stripe.id,
          strategy: "pause",
          reason: "422 errors won't resolve with retries — the endpoint is actively rejecting the payload format. Pausing retries prevents wasting delivery attempts until the customer fixes their parser.",
        },
        {
          type: "notify_provider_outage",
          provider: "stripe",
          reason: "Stripe API version 2026-03-01 rolled out and changed charge.succeeded payload schema. 3 HookWise customers affected. Consider sending a proactive alert to all Stripe integrations.",
        },
        {
          type: "trigger_reconciliation",
          integrationId: stripe.id,
          reason: "After the customer fixes their endpoint, run reconciliation to verify no events were lost during the 2-hour outage window.",
        },
      ],
      similarIncidents: [
        {
          anomalyId: "past-stripe-schema",
          type: "failure_surge",
          detectedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          diagnosisSummary: "Stripe API version 2025-12-01 changed invoice.finalized schema. Customer's strict JSON validator rejected new `rendering` field.",
          resolution: "Customer switched from Zod strict() to Zod passthrough() for webhook payloads. Fixed in 3 hours.",
        },
      ],
      severityAssessment: {
        revenueAtRisk: 1843267,
        eventsAffected: 247,
        estimatedRecoveryMinutes: 180,
      },
    },
    context: {
      baseline: { eventCount: 22, avgResponseMs: 95, failureRate: 0.008, sampleCount: 1200 },
      current: { eventCount: 18, avgResponseMs: 340, failureRate: 0.62 },
    },
    detectedAt: twoHoursAgo,
    resolvedAt: null,
  }).returning({ id: anomalies.id });

  console.log(`1. Stripe API version breaks payload parsing: ${scenario1.id}`);

  // ─────────────────────────────────────────────────────────
  // SCENARIO 2: Source silence — Shopify stops sending webhooks entirely
  // Real case: Shopify webhook subscription expired silently, or
  // Shopify had a regional outage affecting EU merchants
  // ─────────────────────────────────────────────────────────
  if (shopify) {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const [scenario2] = await db.insert(anomalies).values({
      integrationId: shopify.id,
      type: "source_silence",
      severity: "critical",
      diagnosis: {
        what: "Zero events received from Shopify in the last 35 minutes. The integration normally receives 8-12 events per 5-minute window. Last event was orders/create at 17:07 UTC. The silence started abruptly — there was no gradual decline in volume.",
        why: "Investigation reveals this is NOT an endpoint issue (endpoint health score is 95, circuit closed). Provider health check shows Shopify webhook delivery is degraded with 4 HookWise integrations affected — all Shopify stores in the EU region. Shopify's status page (status.shopify.com) is currently showing 'Investigating webhook delivery delays for EU merchants'. This is a Shopify-side regional outage, not a customer configuration issue. Reconciliation check confirms: Shopify's Orders API shows 23 new orders created in the last 35 minutes that were never sent as webhooks.",
        impact: "23 orders totaling $3,891.40 have no corresponding webhook events. These orders exist in Shopify but the customer's fulfillment system doesn't know about them. Without intervention, these orders will not be fulfilled until either: (1) Shopify resumes webhook delivery and replays them, or (2) HookWise reconciliation catches them. Revenue impact: $3,891.40 in potentially unfulfilled orders.",
        recommendation: "1) No action needed on your endpoint — this is a Shopify outage. 2) HookWise reconciliation is running every 5 minutes and has already detected 23 missing events. 3) We're auto-ingesting these events from the Shopify Orders API and delivering them to your endpoint as 'reconciliation' source events. 4) Monitor Shopify status page for resolution ETA. 5) After Shopify recovers, expect a burst of delayed webhooks — idempotency is enabled so duplicates will be deduplicated automatically.",
        confidence: 0.96,
        crossCorrelation: "4 Shopify integrations on HookWise went silent within the same 5-minute window. All are EU-region stores. Non-EU Shopify stores are unaffected. This is a regional Shopify webhook delivery outage.",
        predictedResolution: "Shopify regional outages typically resolve within 1-3 hours based on historical data. HookWise reconciliation is actively recovering events via API polling — 23 events already recovered. No customer action required.",
        evidence: [
          {
            tool: "query_event_patterns",
            query: { integration_id: shopify.id, hours_back: 6 },
            finding: "Event volume dropped from 8-12/5min to 0 at 17:07 UTC. No events for 35 minutes. Previous 6 hours showed consistent volume with no anomalies.",
          },
          {
            tool: "query_endpoint_health",
            query: { integration_id: shopify.id },
            finding: "Circuit: closed, health score: 95, replay queue: 0 events. Endpoint is healthy — not receiving events to deliver.",
          },
          {
            tool: "query_provider_health",
            query: { provider: "shopify" },
            finding: "Provider status: outage, 4 integrations affected. All EU-region Shopify stores. Non-EU stores unaffected.",
          },
          {
            tool: "query_cross_integration_status",
            query: { integration_id: shopify.id },
            finding: "0/2 non-Shopify integrations affected. 3/3 Shopify integrations are silent. Confirms provider-specific issue.",
          },
          {
            tool: "query_delivery_history",
            query: { integration_id: shopify.id, minutes_back: 60 },
            finding: "Last 60 min: 47 deliveries total, 47 successful (100%). All deliveries were in the first 25 minutes. Zero deliveries in last 35 minutes because no events arrived.",
          },
          {
            tool: "query_similar_anomalies",
            query: { integration_id: shopify.id, anomaly_type: "source_silence", limit: 5 },
            finding: "Found 2 similar past incidents. Most recent: 3 weeks ago, Shopify EU webhook delay lasted 2.5 hours. Reconciliation recovered all 67 missing events.",
          },
        ],
        remediationActions: [
          {
            type: "trigger_reconciliation",
            integrationId: shopify.id,
            reason: "Reconciliation already running — 23 missing orders detected and being delivered via API polling. No manual action needed.",
          },
          {
            type: "notify_provider_outage",
            provider: "shopify",
            reason: "Shopify EU webhook delivery outage confirmed. 4 customers affected. Consider sending proactive notification to all Shopify integrations.",
          },
          {
            type: "enable_idempotency",
            integrationId: shopify.id,
            reason: "When Shopify recovers, they may replay delayed webhooks causing duplicates. Idempotency dedup will prevent double-processing.",
          },
        ],
        similarIncidents: [
          {
            anomalyId: "past-shopify-silence-1",
            type: "source_silence",
            detectedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
            resolvedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000 + 150 * 60 * 1000).toISOString(),
            diagnosisSummary: "Shopify EU webhook delivery delayed for 2.5 hours. 67 events missed.",
            resolution: "Shopify resolved their infrastructure issue. HookWise reconciliation recovered all 67 events within 15 minutes of detection.",
          },
          {
            anomalyId: "past-shopify-silence-2",
            type: "source_silence",
            detectedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            resolvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
            diagnosisSummary: "Shopify webhook subscription expired after app reinstall. Zero events for 4 hours.",
            resolution: "Webhook subscription re-registered via Shopify Admin API. All missed events recovered via reconciliation.",
          },
        ],
        severityAssessment: {
          revenueAtRisk: 389140,
          eventsAffected: 23,
          estimatedRecoveryMinutes: 150,
        },
      },
      context: {
        baseline: { eventCount: 10, avgResponseMs: 180, failureRate: 0.01, sampleCount: 450 },
        current: { eventCount: 0, avgResponseMs: 0, failureRate: 0 },
      },
      detectedAt: thirtyMinAgo,
      resolvedAt: null,
    }).returning({ id: anomalies.id });

    console.log(`2. Shopify source silence (EU outage): ${scenario2.id}`);
  }

  // ─────────────────────────────────────────────────────────
  // SCENARIO 3: Volume spike + response time degradation
  // Real case: Black Friday / flash sale — customer endpoint
  // gets overwhelmed by 10x normal webhook volume
  // ─────────────────────────────────────────────────────────
  const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000);

  const [scenario3] = await db.insert(anomalies).values({
    integrationId: stripe.id,
    type: "volume_spike",
    severity: "high",
    diagnosis: {
      what: "Webhook volume spiked to 847% of baseline in the last 40 minutes. Normal rate is 22 events per 5-minute window; current rate is 186 events per window. Response times degraded from 95ms baseline to 2,340ms average, with p95 at 8,200ms. Failure rate climbed from 0.8% to 12% — all failures are timeouts.",
      why: "Event pattern analysis shows the spike is driven entirely by charge.succeeded and payment_intent.succeeded events — consistent with a flash sale or promotional event generating high payment volume. The endpoint is not down (it's responding, just slowly), which indicates the customer's application is under load rather than crashed. Provider health is normal — Stripe is sending events at the expected rate given the payment volume. The failures are all timeouts at 30s, meaning the endpoint is processing but too slowly for some requests.",
      impact: "186 events in the last 5-minute window. 22 deliveries timed out ($4,670 in payment events). The endpoint is still processing most events but response time degradation suggests it's approaching capacity. If volume continues at this rate, failure rate will likely climb to 30-40% within the next 20 minutes as the endpoint's request queue saturates.",
      recommendation: "1) IMMEDIATE: Enable rate limiting at 50 events/min to give your endpoint breathing room. HookWise will queue excess events and deliver them at a sustainable pace. 2) If possible, scale your endpoint horizontally (add instances/pods). 3) Consider enabling HookWise's event sequencer to prioritize payment events over lower-priority event types. 4) After the traffic spike subsides, review your endpoint's autoscaling configuration to handle future spikes.",
      confidence: 0.89,
      crossCorrelation: null,
      predictedResolution: "Promotional traffic spikes typically last 2-6 hours. With rate limiting enabled, the endpoint should stabilize within 10-15 minutes. Queued events will drain over the following 1-2 hours.",
      evidence: [
        {
          tool: "query_delivery_history",
          query: { integration_id: stripe.id, minutes_back: 60 },
          finding: "1,124 total deliveries. 134 failed (11.9%). All failures are timeouts. Avg response: 2,340ms. P95: 8,200ms.",
        },
        {
          tool: "query_event_patterns",
          query: { integration_id: stripe.id, hours_back: 6 },
          finding: "Volume: 22/5min (hours 1-5) → 186/5min (last 40min). 847% increase. 89% of events are charge.succeeded or payment_intent.succeeded. Signature valid rate: 100%.",
        },
        {
          tool: "query_endpoint_health",
          query: { integration_id: stripe.id },
          finding: "Circuit: closed, health score: 61 (declining), replay queue: 0. Consecutive failures: 3. Approaching half_open threshold.",
        },
        {
          tool: "query_provider_health",
          query: { provider: "stripe" },
          finding: "Provider status: operational, 0 integrations affected globally. Volume spike is customer-specific.",
        },
        {
          tool: "query_cross_integration_status",
          query: { integration_id: stripe.id },
          finding: "0/3 other integrations affected. This confirms the volume spike is specific to this Stripe integration (customer's flash sale).",
        },
      ],
      remediationActions: [
        {
          type: "enable_rate_limiting",
          integrationId: stripe.id,
          maxPerMinute: 50,
          reason: "Throttle delivery to 50/min to prevent endpoint overload. Excess events will be queued and delivered at sustainable pace.",
        },
        {
          type: "adjust_retry_strategy",
          integrationId: stripe.id,
          strategy: "backoff",
          reason: "Use exponential backoff for timed-out deliveries. The endpoint is processing but slow — aggressive retries will make it worse.",
        },
        {
          type: "enable_idempotency",
          integrationId: stripe.id,
          reason: "With high volume and retries, there's increased risk of duplicate processing. Enable idempotency to guarantee exactly-once delivery.",
        },
      ],
      similarIncidents: [],
      severityAssessment: {
        revenueAtRisk: 467000,
        eventsAffected: 1124,
        estimatedRecoveryMinutes: 15,
      },
    },
    context: {
      baseline: { eventCount: 22, avgResponseMs: 95, failureRate: 0.008, sampleCount: 1200 },
      current: { eventCount: 186, avgResponseMs: 2340, failureRate: 0.12 },
    },
    detectedAt: fortyMinAgo,
    resolvedAt: null,
  }).returning({ id: anomalies.id });

  console.log(`3. Volume spike (flash sale): ${scenario3.id}`);

  // ─────────────────────────────────────────────────────────
  // SCENARIO 4: Resolved — SSL certificate expired overnight
  // Real case: customer's endpoint SSL cert expired at 3am,
  // all deliveries failed with SSL errors until renewed at 7am
  // ─────────────────────────────────────────────────────────
  const yesterday3am = new Date();
  yesterday3am.setDate(yesterday3am.getDate() - 1);
  yesterday3am.setHours(3, 0, 0, 0);
  const yesterday7am = new Date(yesterday3am);
  yesterday7am.setHours(7, 0, 0, 0);

  const [scenario4] = await db.insert(anomalies).values({
    integrationId: stripe.id,
    type: "failure_surge",
    severity: "critical",
    diagnosis: {
      what: "100% of deliveries failed between 03:00 and 07:12 UTC with SSL handshake errors. 312 events affected across all event types. Failures began at exactly 03:00:00 UTC — the precise moment the endpoint's TLS certificate expired.",
      why: "All 312 delivery failures have error_type 'ssl' with no HTTP status code (connection never established). The SSL certificate for the customer's endpoint (webhooks.example.com) expired at 2026-03-22T03:00:00Z. This was confirmed by the security scanner which detected an expired certificate. No other integrations were affected, confirming this is endpoint-specific. Provider health was normal throughout.",
      impact: "312 events undelivered for 4 hours and 12 minutes. Includes 89 charge.succeeded events ($12,445.00), 34 invoice.paid ($8,230.00), and 15 subscription.created events. Total revenue impact: $20,675.00 in delayed payment notifications. All events were queued in the replay buffer and successfully delivered after certificate renewal.",
      recommendation: "All events have been replayed and delivered successfully. To prevent recurrence: 1) Set up certificate expiry monitoring (e.g., cert-manager with auto-renewal). 2) HookWise's security scanner can alert you 30 days before certificate expiry — enable it in Settings > Security. 3) Consider using a CDN/reverse proxy (Cloudflare, AWS ALB) that handles certificate management automatically.",
      confidence: 0.98,
      crossCorrelation: null,
      predictedResolution: null,
      evidence: [
        {
          tool: "query_delivery_history",
          query: { integration_id: stripe.id, minutes_back: 360 },
          finding: "312/312 deliveries failed (100%). All errors: {\"ssl\": 312}. Status codes: {\"no_response\": 312}. Failures started at exactly 03:00 UTC.",
        },
        {
          tool: "query_endpoint_health",
          query: { integration_id: stripe.id },
          finding: "Circuit: closed (recovered). Health score: 94. Replay queue: 0 (all drained). Endpoint healthy since 07:12 UTC.",
        },
        {
          tool: "query_provider_health",
          query: { provider: "stripe" },
          finding: "Provider status: operational throughout the incident window. 0 other integrations affected.",
        },
        {
          tool: "query_similar_anomalies",
          query: { integration_id: stripe.id, anomaly_type: "failure_surge", limit: 5 },
          finding: "No similar SSL-related incidents found in history. This is the first certificate expiry event for this integration.",
        },
      ],
      remediationActions: [
        {
          type: "trigger_reconciliation",
          integrationId: stripe.id,
          reason: "Reconciliation completed. All 312 events verified delivered after certificate renewal. Zero data loss.",
        },
      ],
      similarIncidents: [],
      severityAssessment: {
        revenueAtRisk: 2067500,
        eventsAffected: 312,
        estimatedRecoveryMinutes: 252,
      },
    },
    context: {
      baseline: { eventCount: 22, avgResponseMs: 95, failureRate: 0.008, sampleCount: 1200 },
      current: { eventCount: 19, avgResponseMs: 88, failureRate: 0.0 },
    },
    detectedAt: yesterday3am,
    resolvedAt: yesterday7am,
  }).returning({ id: anomalies.id });

  console.log(`4. SSL certificate expired (resolved): ${scenario4.id}`);

  // ─────────────────────────────────────────────────────────
  // SCENARIO 5: Payload anomaly — unusually large payloads
  // Real case: Stripe sends a webhook with a massive payload
  // (e.g., invoice with 500 line items) that exceeds the
  // customer's request body size limit
  // ─────────────────────────────────────────────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [scenario5] = await db.insert(anomalies).values({
    integrationId: stripe.id,
    type: "payload_anomaly",
    severity: "medium",
    diagnosis: {
      what: "3 invoice.finalized events in the last hour had payloads 12x larger than baseline (average 287KB vs normal 24KB). These 3 events all failed delivery with HTTP 413 Request Entity Too Large. All other event types are delivering normally.",
      why: "Payload analysis shows these 3 invoices each contain 400+ line items (typical invoices have 1-5 line items). This appears to be a metered billing reconciliation — the customer's Stripe account generated bulk invoices with hundreds of usage-based line items. The customer's endpoint has a request body size limit (likely nginx default of 1MB, but the endpoint's application framework may have a lower limit around 256KB). The 287KB payload exceeds this limit, causing the 413 rejection.",
      impact: "3 invoice.finalized events failed. Combined invoice value: $47,832.00. These are high-value metered billing invoices that the customer's system needs to process for revenue recognition. Low blast radius (only 3 events) but high individual value.",
      recommendation: "1) Increase your endpoint's request body size limit to at least 1MB (nginx: `client_max_body_size 1m;`, Express: `express.json({ limit: '1mb' })`). 2) After increasing the limit, manually replay the 3 failed events from the HookWise dashboard. 3) Long-term: consider enabling HookWise transformations to strip unnecessary line item details from invoice payloads before delivery, reducing payload size by ~80%.",
      confidence: 0.87,
      crossCorrelation: null,
      predictedResolution: "Requires customer configuration change (increase body size limit). Typically a 5-minute fix once identified.",
      evidence: [
        {
          tool: "query_delivery_history",
          query: { integration_id: stripe.id, minutes_back: 60 },
          finding: "3/89 deliveries failed (3.4%). All 3 failures are HTTP 413 on invoice.finalized events. Other event types: 0% failure rate.",
        },
        {
          tool: "query_payload_changes",
          query: { integration_id: stripe.id, event_type: "invoice.finalized" },
          finding: "Payload size increased 1,196% from baseline. No new fields detected — the schema is the same, but the `lines.data` array contains 400+ items instead of the usual 1-5.",
        },
        {
          tool: "query_endpoint_health",
          query: { integration_id: stripe.id },
          finding: "Circuit: closed, health score: 89. Overall endpoint is healthy — only the oversized payloads are failing.",
        },
        {
          tool: "query_event_patterns",
          query: { integration_id: stripe.id, hours_back: 24 },
          finding: "invoice.finalized volume is normal (12/day). Only the 3 metered billing invoices are anomalous in size. All other invoices delivered successfully.",
        },
      ],
      remediationActions: [
        {
          type: "adjust_retry_strategy",
          integrationId: stripe.id,
          strategy: "pause",
          reason: "413 errors won't resolve with retries — the payload exceeds the endpoint's size limit. Pause retries for these events until the customer increases their body size limit.",
        },
      ],
      similarIncidents: [],
      severityAssessment: {
        revenueAtRisk: 4783200,
        eventsAffected: 3,
        estimatedRecoveryMinutes: 5,
      },
    },
    context: {
      baseline: { eventCount: 22, avgResponseMs: 95, failureRate: 0.008, sampleCount: 1200 },
      current: { eventCount: 20, avgResponseMs: 102, failureRate: 0.034 },
    },
    detectedAt: oneHourAgo,
    resolvedAt: null,
  }).returning({ id: anomalies.id });

  console.log(`5. Oversized invoice payload (413): ${scenario5.id}`);

  console.log("\nAll scenarios seeded. Open /anomalies in the dashboard to see them.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
