# HookWise — Product Specification

## Vision
AI-powered webhook intelligence platform. Not just delivery infrastructure — an AI operations teammate for every API integration.

## Problem
Every developer integrating with Stripe, Shopify, or any webhook provider builds the same thing: retry logic, monitoring, dead letter queues, and manual debugging. When webhooks fail, developers spend hours correlating logs across services to figure out what went wrong. Existing tools (Hookdeck, Svix, Convoy) solve delivery reliability but offer zero intelligence — they're dumb pipes.

## Solution
A middleware that receives webhooks reliably AND understands them. It learns patterns, detects anomalies, correlates failures across integrations, calculates revenue impact, catches schema changes, and tells you what broke, why, and how to fix it — before your customers notice.

## Target Users
- Developers and engineering teams at SaaS companies with 3+ webhook integrations
- E-commerce businesses using Stripe + Shopify + email/shipping providers
- Startups that can't afford dedicated infrastructure engineers for webhook reliability

## Competitive Landscape
| Tool | What they do | What they DON'T do |
|------|-------------|-------------------|
| Hookdeck | Inbound webhook gateway, queue, route, transform, retry | No AI, no anomaly detection, no cross-integration correlation, no insights |
| Svix | Outbound webhook sending for platforms | Sending only, no inbound, no AI |
| Convoy | Open-source webhooks gateway (in+out) | No AI, no intelligence layer |

## Our Differentiators (things NO competitor has)
1. AI anomaly detection with root cause diagnosis
2. Cross-integration correlation (Shopify order → Stripe payment → SendGrid email)
3. Event flow tracking with broken chain detection
4. Revenue impact calculator (dollar amounts on failures)
5. Predictive alerts (warn before failure, not after)
6. Webhook contract testing (schema change detection)
7. Public integration status pages
8. Cross-customer anonymized benchmarks
9. AI incident commander (auto-pause, auto-replay, auto-resolve)
10. Handler code generation

---

## Phase 1: MVP (Weeks 1-4)

### 1.1 Webhook Ingestion Engine
- Unique endpoint per integration: `/ingest/{integration_id}`
- Signature verification per provider (Stripe HMAC, Shopify HMAC, GitHub HMAC)
- Store every event: id, integration_id, event_type, payload (JSONB), headers, received_at, signature_valid
- Return 200 OK in <50ms — all processing async via Inngest
- Idempotency via provider event IDs (Stripe: evt_xxx, Shopify: X-Shopify-Webhook-Id)

### 1.2 Delivery Worker
- POST event payload to customer's destination URL
- Custom headers: X-HookWise-Event-ID, X-HookWise-Timestamp
- Exponential backoff retry: 5s, 30s, 2min, 10min, 1hr, 6hr (max 6 attempts, configurable)
- Record every attempt: status_code, response_time_ms, response_body (first 1KB), attempted_at
- 5-second delivery timeout
- Dead letter queue after max retries exhausted

### 1.3 Dashboard v1
- Auth: Supabase Auth (email/password + GitHub OAuth)
- Integration setup: pick provider, paste signing secret, set destination URL, get ingest URL
- Event stream: chronological list with event type, status (delivered/failed/pending), timestamp, response time
- Event detail: full payload (JSON viewer), delivery attempts with status codes and timing
- Manual replay: one-click re-queue any event, bulk replay filtered set
- Integration health: green/yellow/red per integration based on last-hour failure rate

### 1.4 Initial Integrations
- Stripe: verify via `stripe-signature` header, parse event types
- Shopify: verify via `X-Shopify-Hmac-Sha256`, parse `X-Shopify-Topic`
- GitHub: verify via `X-Hub-Signature-256`, parse `X-GitHub-Event`

---

## Phase 2: AI Intelligence Layer (Weeks 5-8)

### 2.1 Pattern Learning
- Cron every 5 min per integration
- Compute rolling averages: events/hour, avg response time, failure rate, event type distribution
- Exponential moving average: new_avg = (old_avg * 0.9) + (current * 0.1)
- Track rolling stddev per metric
- Time-of-day baselines (business hours vs off-hours)
- Minimum 200 events before activating anomaly detection

### 2.2 Anomaly Detection
- Response time spike: >2x rolling avg for 5+ consecutive events
- Failure surge: >10% failure rate in 30-min window
- Source silence: zero events during normally active period
- Volume spike/drop: >3x or <0.3x normal volume
- New event type: previously unseen event type appears
- Payload anomaly: significant size deviation from baseline

### 2.3 AI Root Cause Analysis
- On anomaly: gather baseline + current metrics + last 20 events + other integrations' status
- Cross-integration correlation: check if anomalies correlate across providers
- Call Claude API with structured context → plain-language diagnosis
- Cache similar diagnoses for 1 hour
- Confidence scoring (high/medium/low)

### 2.4 Event Flow Tracking
- User defines expected chains: Shopify order → Stripe payment → SendGrid email
- Track each flow instance by correlation key (order ID, customer email)
- Flag broken chains: "Order #4521 received 12 min ago, no Stripe payment event yet"
- Visual flow diagram: green (completed) / yellow (waiting) / red (failed)
- Auto-discovered flows from event timing patterns

### 2.5 Smart Payload Insights
- Build schema model per event type (fields, types, ranges, distributions)
- Business pattern detection from payloads (avg order value, peak times)
- Unusual value alerts: "3 payments over $500, unusual for this hour"
- Schema change detection: "Shopify sending new field shipping_method_v2"

### 2.6 Predictive Alerts
- Response time trending: "180ms → 320ms → 480ms over 4 hours, timeouts within 2 hours"
- Failure rate trajectory: detect gradual increases before critical
- Volume prediction from daily/weekly patterns
- Capacity planning: "Volume growing 15%/month, exceed plan limit in 18 days"

### 2.7 Alerting
- Email alerts with AI diagnosis + affected events + dashboard link
- Slack integration (webhook to customer's channel)
- Per-integration thresholds, snooze, channel selection per severity
- Digest mode (hourly/daily instead of real-time)

---

## Phase 3: Growth + Advanced AI (Weeks 9-12)

### 3.1 Advanced Dashboard
- Realtime event stream via Supabase Realtime
- Anomaly timeline with severity, AI diagnosis, resolution status
- Integration health score (0-100)
- Search/filter: type, status, date range, integration, full-text payload search
- Metrics charts: volume over time, response time trends, failure rate graphs

### 3.2 AI-Powered Features
- Natural language queries: "Show me failed Stripe payments over $100 from last week"
- Automated remediation suggestions from cross-customer patterns
- Weekly intelligence report every Monday
- Semantic payload search
- Deploy impact detection

### 3.3 Developer Experience
- CLI tool: `hookwise listen --port 3000` (route live webhooks to localhost)
- REST API for programmatic access
- Webhook forwarding to multiple destinations
- Transformation rules (modify payloads before delivery)
- Event filtering (deliver only matching events)

### 3.4 More Integrations
- SendGrid, Twilio, Generic webhook, PayPal, HubSpot

---

## Phase 4: Monetization (Weeks 10-16)

### Pricing
- **Free**: 10K events/month, 3 integrations, 7-day retention, basic dashboard
- **Pro ($49/mo)**: 200K events, unlimited integrations, 30-day retention, AI diagnostics, anomaly alerts, payload insights, revenue tracking, replay sandbox
- **Team ($149/mo)**: 1M events, team seats, 90-day retention, full AI suite, incident commander, public status page, benchmarks, Slack/PagerDuty, API
- **Business ($399/mo)**: 5M events, dedicated support, 1-year retention, contract testing, code gen, templates, cost analytics, multi-env, white-label, SLA

---

## Phase 5: Competitive Moat (Month 4-8)

### 5.1 AI Incident Commander
- Auto-pause delivery on failure threshold, queue events, auto-replay on recovery
- Incident threads with team annotation, assignment, resolution tracking
- AI-drafted Slack messages with impact + recommended fix
- MTTR tracking, learns from past incidents
- Runbook attachment per anomaly type

### 5.2 Revenue Impact Calculator
- Extract transaction amounts from Stripe/PayPal payloads
- Extract order totals from Shopify payloads
- Revenue protection dashboard: total protected, at risk, ROI calculation
- Include in weekly reports

### 5.3 Public Status Page
- Hosted URL per customer showing integration health
- 90-day uptime history, embeddable widget
- Subscriber notifications on issues/recovery

### 5.4 Cross-Customer Benchmarks
- Response time percentile ranking
- Failure rate comparison vs similar-sized companies
- Provider reliability scores from aggregated data

### 5.5 Webhook Contract Testing
- Auto-learn JSON schema per event type
- Breaking change detection with affected event count
- Handler impact analysis for code-gen users

### 5.6 Replay Sandbox
- Replay to staging URL before production
- Bulk sandbox testing before bulk replay
- Simulated event generation for testing

---

## Phase 6: Platform (Month 8-14)

### 6.1 AI Code Generation
- Detect framework, generate complete handler code
- Signature verification + event routing + idempotency + TypeScript types
- Auto-update code when schema changes detected

### 6.2 Integration Templates
- Pre-built stacks: e-commerce (Shopify+Stripe+SendGrid), SaaS billing, developer workflow
- Community template marketplace with upvotes

### 6.3 Cost Analytics
- Per-integration compute cost tracking
- AI optimization suggestions

### 6.4 Multi-Environment
- Production/staging/dev with separate configs
- Promote configuration between environments
