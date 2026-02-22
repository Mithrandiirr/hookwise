# HookWise — Product Specification

## Vision
AI-powered webhook intelligence platform. Not just delivery infrastructure — an AI operations teammate that protects, diagnoses, and recovers.

## Problem
Webhooks are unreliable by nature. Real issues documented in the last 6 months:
- Shopify silently drops ~10% of `orders/create` webhooks (Dec 2025, developer forum)
- Shopify removes webhook subscriptions entirely after 8 failed deliveries in 4 hours
- Shopify payload fields (shipping_address, note_attributes) intermittently missing from events
- Stripe sends events out of order, breaking subscription status tracking
- Stripe delays invoice finalization for up to 72 hours if webhook endpoint doesn't respond properly
- Shopify's own team recommends polling their API to catch missed webhooks

Existing tools (Hookdeck, Svix, Convoy) solve delivery but offer zero intelligence. They're dumb pipes.

## Solution
A middleware that receives webhooks reliably AND understands them. Four mitigation layers protect every event, AI diagnoses issues with surgical context, and developers fix problems in minutes instead of hours.

## What HookWise Can and Cannot Do
**CAN do:**
- Guarantee delivery via buffering + circuit breaker + reconciliation
- Alert with surgical context (which events, what pattern, what payload data, revenue impact)
- Transform payloads before delivery (field mapping for breaking changes) — originals stored intact
- Detect provider outages by observing patterns across all customers
- Fetch missed events via provider API reconciliation (bypass webhooks entirely)
- Skip failing events and continue (don't block queue on one bad event)
- Group failing events by pattern ("these 4 all fail because X")

**CANNOT do:**
- Modify original webhook events (signatures would break)
- Fix customer's handler code (diagnose + recommend only)
- Fix provider-side bugs (detect + work around via reconciliation)
- Guarantee zero added latency (buffering adds 100-500ms)

## Target Users
- Developers and engineering teams at SaaS companies with 3+ webhook integrations
- E-commerce businesses using Stripe + Shopify + email/shipping providers
- Startups that can't afford dedicated infrastructure engineers for webhook reliability

## Competitive Landscape
| Tool | What they do | What they DON'T do |
|------|-------------|-------------------|
| Hookdeck | Inbound webhook gateway, queue, route, transform, retry | No AI, no anomaly detection, no reconciliation, no circuit breaker |
| Svix | Outbound webhook sending for platforms | Sending only, no inbound, no AI |
| Convoy | Open-source webhooks gateway (in+out) | No AI, no intelligence layer, no reconciliation |

None of them: detect anomalies, diagnose root causes, reconcile missed events via API, calculate revenue impact, track event flows, predict failures, or generate intelligence reports.

---

## The 4 Mitigation Layers (Core Architecture)

### Layer 1: Smart Buffer (Week 1 — built into ingestion engine)
The ingestion endpoint is a BUFFER, not a proxy. This is the fundamental design choice.

1. Receive event from provider, verify signature, store in database
2. Return 200 OK to provider in <50ms — provider ALWAYS sees success
3. Emit async event to trigger delivery separately

Why this matters:
- Customer's server can be down for days — zero events lost
- Shopify never sees a failure, so it never removes the webhook subscription
- Stripe never retries against us, so no thundering herd
- Every event is safe in our database regardless of what happens downstream

### Layer 2: Circuit Breaker + Endpoint Health Monitor (Week 2-3)
Actively monitor endpoint health and make intelligent delivery decisions.

Three endpoint states:
- **CLOSED (healthy)**: success rate >90%, response time <5s → deliver normally
- **HALF-OPEN (degraded)**: success rate 50-90% OR response time 5-10s → rate-limit to 1/sec
- **OPEN (broken)**: success rate <50% OR response time >10s OR 5 consecutive failures → stop delivery, queue events, health check every 30s

State transitions:
- CLOSED → OPEN: 5 consecutive failures OR success rate drops below 50%
- OPEN → HALF-OPEN: 3 consecutive successful health checks
- HALF-OPEN → CLOSED: 10 consecutive successful deliveries
- HALF-OPEN → OPEN: 2 failures during half-open state

Smart retry by error type:
- 429 (rate limited): honor Retry-After header exactly
- 503 (server down): aggressive backoff, infrastructure issue
- 500 (code bug): retry once then hold — retrying bugs is noise
- Timeout: retry once with 2x timeout
- SSL error: don't retry, alert immediately
- Connection refused: transition to OPEN state

### Layer 3: Ordered Replay Engine (Week 3-4)
When endpoint recovers, replay queued events intelligently.

1. Sort by received_at timestamp (strict chronological)
2. Group by correlation key (order_id) — related events replay together
3. Adaptive rate limiting: start 1/sec → 2 → 5 → 10/sec as endpoint proves healthy
4. Checkpoint every delivery — resume from last checkpoint if interrupted
5. Deduplication via provider_event_id
6. Skip-and-continue: skip persistently failing events, deliver the rest, surface failures separately

### Layer 4: Reconciliation Engine (Month 2-3 — optional, requires API key)
Goes around webhooks entirely. Fetches events the provider generated but never sent.

- **Stripe**: `GET /v1/events?delivery_success=false` every 5 min. Compare against events table. Fetch and deliver gaps.
- **Shopify**: Admin API to list recent orders. Compare against received webhooks. Construct missing events.
- Logs every run: provider_events_found, hookwise_events_found, gaps_detected, gaps_resolved
- Customer enables per-integration by providing API key (encrypted at rest)
- This makes webhooks 100% reliable. Even if Shopify drops 10%, reconciliation catches it in 5 minutes.

---

## Phase 1: MVP (Weeks 1-4)

### 1.1 Webhook Ingestion Engine (Layer 1)
- Unique endpoint per integration: `/ingest/{integration_id}`
- Signature verification per provider (Stripe HMAC, Shopify HMAC, GitHub HMAC)
- Store every event: id, integration_id, event_type, payload (JSONB), headers, received_at, signature_valid, provider_event_id, source
- Return 200 OK in <50ms — all processing async via Inngest
- Idempotency via provider event IDs (Stripe: evt_xxx, Shopify: X-Shopify-Webhook-Id)

### 1.2 Circuit Breaker + Delivery Worker (Layer 2)
- Endpoint health tracking: circuit_state, success_rate, avg_response_ms, consecutive_failures
- Sliding window of last 20 deliveries per endpoint
- State machine: CLOSED → OPEN → HALF-OPEN → CLOSED
- Health checks every 30s during OPEN state (HEAD request)
- Smart retry per error type (429/500/503/timeout/SSL)
- Custom headers: X-HookWise-Event-ID, X-HookWise-Timestamp, X-HookWise-Retry-Count
- 5-second delivery timeout (configurable)

### 1.3 Ordered Replay Engine (Layer 3)
- Replay queue table with position, correlation_key, status, checkpoint
- Chronological ordering with correlation grouping
- Adaptive rate limiting (1/sec → 10/sec)
- Skip-and-continue for persistently failing events
- Dashboard shows: "47 events queued. Replay in progress. 12/47 delivered. ETA: 3 min."

### 1.4 Dashboard v1
- Auth: Supabase Auth (email/password + GitHub OAuth)
- Integration setup: pick provider, paste signing secret, set destination URL, get ingest URL
- Event stream: chronological list with event type, status (delivered/failed/queued/replaying), timestamp, response time
- Event detail: full payload (JSON viewer), delivery attempts with status codes, timing, error types
- Endpoint health: circuit state visualization (green/yellow/red), success rate, response time chart
- Replay controls: one-click replay single event, bulk replay filtered set, replay queue progress
- Manual replay: select events → test in sandbox URL → bulk replay to production

### 1.5 Initial Integrations
- Stripe: verify via `stripe-signature` header, parse event types, extract payment amounts for revenue tracking
- Shopify: verify via `X-Shopify-Hmac-Sha256`, parse `X-Shopify-Topic`, extract order totals
- GitHub: verify via `X-Hub-Signature-256`, parse `X-GitHub-Event`

---

## Phase 2: AI Intelligence Layer (Weeks 5-8)

### 2.1 Pattern Learning
- Cron every 5 min per integration
- Rolling averages: events/hour, avg response time, failure rate, event type distribution
- Exponential moving average: new_avg = (old_avg * 0.9) + (current * 0.1)
- Time-of-day baselines (business hours vs off-hours)
- Minimum 200 events before activating anomaly detection

### 2.2 Anomaly Detection
6 anomaly types:
- Response time spike: >2x rolling avg for 5+ consecutive events
- Failure surge: >10% failure rate in 30-min window
- Source silence: zero events during normally active period
- Volume spike/drop: >3x or <0.3x normal volume
- New event type: previously unseen event type appears
- Payload anomaly: significant size deviation from baseline

### 2.3 AI Diagnosis
- On anomaly: gather baseline + current metrics + last 20 events + other integrations' status
- Cross-integration correlation: check if anomalies correlate across providers
- Call Claude API with structured context → diagnosis includes:
  - WHAT: specific metrics that deviated
  - WHY: root cause (endpoint issue, provider issue, or payload pattern)
  - IMPACT: affected events count + revenue if payment/order events
  - RECOMMENDATION: specific actionable advice
- Cache similar diagnoses for 1 hour
- Confidence scoring (high/medium/low)

### 2.4 Reconciliation Engine (Layer 4)
- Stripe: `GET /v1/events` comparison every 5 min
- Shopify: Admin API order/resource comparison every 5 min
- Reconciliation run logging with gap detection and resolution metrics
- Customer-facing: "Reconciliation found 2 missed Stripe events. Both delivered successfully."

### 2.5 Event Flow Tracking
- User defines expected chains: Shopify order → Stripe payment → SendGrid email
- Track each flow instance by correlation key (order ID, customer email)
- Flag broken chains: "Order #4521 received 12 min ago, no Stripe payment event yet"
- Visual flow diagram: green (completed) / yellow (waiting) / red (failed/timeout)

### 2.6 Smart Payload Insights
- Build schema model per event type (fields, types, ranges, distributions)
- Unusual value alerts: "3 payments over $500, unusual for this hour"
- Schema change detection: "Shopify sending new field shipping_method_v2 not seen before"

### 2.7 Predictive Alerts
- Response time trending: "180ms → 320ms → 480ms over 4 hours, timeouts within 2 hours"
- Failure rate trajectory: detect gradual increases before critical
- Capacity planning: "Volume growing 15%/month, exceed plan limit in 18 days"

### 2.8 Alerting
- Email alerts with AI diagnosis + affected events + revenue impact + dashboard link
- Slack integration (webhook to customer's channel)
- Per-integration thresholds, snooze, channel selection per severity
- Digest mode (hourly/daily instead of real-time)

---

## Phase 3: Growth + Advanced AI (Weeks 9-12)

### 3.1 Advanced Dashboard
- Realtime event stream via Supabase Realtime
- Anomaly timeline with severity, AI diagnosis, resolution status
- Integration health score (0-100)
- Reconciliation history: gaps found, gaps resolved, data integrity percentage
- Search/filter: type, status, date range, integration, full-text payload search
- Metrics charts: volume over time, response time trends, failure rate graphs

### 3.2 Payload Transformations
- Configure field mapping rules per integration per event type
- "When Shopify sends orders/create, rename data.shipping.address to data.shipping_address"
- Original event always stored intact — transformation applied only to delivery
- AI-suggested transformations when schema changes detected: "Shopify changed X. Apply this mapping to keep your handler working."
- This is NOT modifying the webhook — it's adapting delivery while customer updates their code

### 3.3 AI-Powered Features
- Natural language queries: "Show me failed Stripe payments over $100 from last week"
- Weekly intelligence report every Monday (events, success rate, anomalies, response trends, one recommendation)
- Semantic payload search
- Deploy impact detection

### 3.4 Developer Experience
- CLI tool: `hookwise listen --port 3000` (route live webhooks to localhost)
- REST API for programmatic access
- Webhook forwarding to multiple destinations
- Event filtering (deliver only matching events)

### 3.5 More Integrations
- SendGrid, Twilio, Generic webhook, PayPal, HubSpot

---

## Phase 4: Monetization (Weeks 10-16)

### Pricing
- **Free**: 10K events/month, 3 integrations, 7-day retention, basic dashboard, smart buffer + circuit breaker + basic retries
- **Pro ($49/mo)**: 200K events, unlimited integrations, 30-day retention, ordered replay, AI diagnostics, anomaly alerts, payload insights, revenue tracking, email alerts, reconciliation for Stripe
- **Team ($149/mo)**: 1M events, team seats, 90-day retention, full AI suite (flows, predictive, NL queries, weekly reports), payload transformations, reconciliation for all providers, incident threads, Slack/PagerDuty, API
- **Business ($399/mo)**: 5M events, dedicated support, 1-year retention, contract testing, code gen, templates, cost analytics, multi-env, public status page, SLA

---

## Phase 5: Competitive Moat (Month 4-8)

### 5.1 Incident Threads
- Each anomaly creates a thread with full context
- Team members annotate, assign, resolve with audit trail
- AI-drafted Slack message with impact + recommendation
- MTTR tracking — AI learns from past incidents

### 5.2 Revenue Impact Calculator
- Extract transaction amounts from Stripe/PayPal payment payloads
- Extract order totals from Shopify order payloads
- Revenue protection dashboard: total protected, at risk, ROI calculation
- Include in weekly reports: "We protected $12,400 this week. You pay $49/month."

### 5.3 Public Status Page
- Hosted URL per customer showing integration health
- 90-day uptime history, embeddable widget
- Subscriber notifications on issues/recovery

### 5.4 Cross-Customer Benchmarks
- Response time percentile ranking vs similar-sized companies
- Failure rate comparison
- Provider reliability scores from aggregated data (network effect moat)

### 5.5 Webhook Contract Testing
- Auto-learn JSON schema per event type from observed payloads
- Breaking change detection: "Stripe invoice.paid no longer contains charges array"
- AI-suggested payload transformation to maintain compatibility

### 5.6 Replay Sandbox
- Replay to staging URL before production
- Bulk sandbox testing before bulk replay
- Simulated event generation for testing

---

## Phase 6: Platform (Month 8-14)

### 6.1 AI Code Generation
- Detect framework, generate complete handler code with signature verification, event routing, idempotency, TypeScript types
- Auto-update code suggestions when schema changes detected

### 6.2 Integration Templates
- Pre-built stacks: e-commerce (Shopify+Stripe+SendGrid), SaaS billing, developer workflow
- Community template marketplace with upvotes

### 6.3 Cost Analytics
- Per-integration compute cost tracking
- AI optimization suggestions: "Filter out events you never use"

### 6.4 Multi-Environment
- Production/staging/dev with separate configs and data isolation
- Promote configuration between environments
