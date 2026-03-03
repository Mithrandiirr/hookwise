# HookWise — Product Specification v5.0

## Vision
The Datadog of webhooks. A webhook operations platform that guarantees every business event reaches your application, tells you exactly what's happening across all integrations, and makes your system better every week.

## One-Line Pitch
Never miss a webhook. Know why when things break. Get smarter every week.

## Core Identity
- **Category**: Webhook Operations Platform (new category)
- **Hookdeck**: Vercel of webhooks (infrastructure plumbing)
- **HookWise**: Datadog of webhooks (operations intelligence + delivery guarantee)
- **Positioning**: Customers can use both or HookWise standalone

## Core Value Loop
**INGEST → PROTECT → DELIVER → UNDERSTAND → IMPROVE**

## The 10 Pillars
| # | Pillar | What It Does | Sprint |
|---|--------|-------------|--------|
| 1 | Smart Buffer | Ingest + store + return 200 in <50ms. Redis fallback. | 1 |
| 2 | Circuit Breaker + Replay | 3-state health, smart retry, ordered replay | 2–3 |
| 3 | Reconciliation Engine | Poll provider APIs for events never sent | 3 |
| 4 | AI Intelligence | Pattern learning, anomaly detection, diagnosis | 4 |
| 5 | Idempotency-as-a-Service | Exactly-once delivery via provider_event_id dedup | 2 |
| 6 | Event Sequencer | Reorder events by business logic before delivery | 4 |
| 7 | Enriched Delivery | Fetch latest resource state before delivering | 3 |
| 8 | Security Scanner | Audit endpoints for vulnerabilities | 5 |
| 9 | Compliance Audit Trail | Immutable logs, PCI DSS ready, exportable reports | 5 |
| 10 | Provider Status Page | Real-time cross-customer provider health (public) | 6 |

## 3 Impossible-to-Copy Advantages
1. **Reconciliation Engine** — Requires API keys. Different trust model. Competitors are proxy-only.
2. **Cross-Provider Intelligence** — Correlates across Stripe+Shopify. Parses payloads. Competitors treat events as opaque blobs.
3. **Network Effect Moat** — Benchmarks + provider reliability scores compound with customer base.

---

## The Problem — Documented Pain

Real incidents from the last 6 months:
- Shopify silently drops ~10% of orders/create webhooks (Dec 2025)
- Shopify removes webhook subscriptions after 8 failed deliveries in 4 hours
- Shopify payload fields intermittently missing (shipping_address, note_attributes)
- Stripe sends events out of order, breaking subscription status tracking
- Stripe delays invoice finalization 72 hours if endpoint doesn't respond
- Shopify staff officially recommend polling API for 100% reliability
- Only 30% of organizations implement replay attack protection on webhook endpoints
- Webhook vulnerabilities account for 12% of API-related security incidents

---

## Go-to-Market Strategy

### The Revenue Story
- **Onboarding**: "We scanned your last 30 days. You lost $940 in webhook failures."
- **Dashboard header**: "Revenue protected this month: $47,320"
- **Weekly email**: "HookWise saved you $12,400 last week"
- **Upgrade prompt**: "You hit your 10K limit. Events 10,001–43,000 contained $31K in orders."

### Target Segments
1. **Shopify Plus Agencies** — 1 agency = 10–50 stores. Outreach via personalized health scans.
2. **Indie SaaS Founders on Stripe** — Content marketing + community presence.
3. **Mid-Market DevOps/SRE Teams** — $199–$499/mo via content and word of mouth.

### Content Engine
One data-driven post per month:
- "We analyzed 10M Shopify webhooks. Here's the real failure rate."
- "Why Shopify tells you to poll their API (and what to do instead)"
- "Only 30% of webhook endpoints have replay protection. Is yours one?"
- Monthly provider reliability reports

---

## Architecture — The 4 Mitigation Layers

### Layer 1: Smart Buffer
Hono on Vercel Edge. Verify signature → store in Postgres → return 200 in <50ms. Redis fallback if DB unreachable. Provider ALWAYS sees success.

### Layer 2: Circuit Breaker
3-state: CLOSED → HALF-OPEN → OPEN. Sliding window of 20 deliveries. Smart retry per error type. Health checks every 30s during OPEN.

### Layer 3: Ordered Replay
Chronological replay grouped by correlation key. Adaptive rate (1→10/sec). Checkpoint/resume. Dedup.

### Layer 4: Reconciliation Engine (The Moat)
Poll Stripe Events API and Shopify Admin API every 5 min. Diff against events table. Auto-ingest missing events.

---

## Enhanced Delivery Pipeline

1. Event received → **idempotency check** (skip if already delivered)
2. Check circuit state → OPEN: queue for replay
3. If enrichment enabled → **fetch latest resource from provider API**
4. If sequencer enabled → **hold until predecessor events arrive**
5. Apply transformations if configured
6. Deliver to destination (HTTP, SQS, Kafka, Pub/Sub)
7. Record delivery + update health + circuit state
8. Smart retry based on error type

---

## New Capabilities (v5)

### Pillar 5: Idempotency-as-a-Service
Dedup at HookWise layer via provider_event_id. Customer endpoint never sees duplicates. Toggle per integration. Eliminates an entire class of bugs — no more duplicate orders, double emails, or repeated fulfillments.

### Pillar 6: Event Sequencer
Define expected event order per integration (e.g., customer.created before card.created). HookWise holds and reorders events before delivery with configurable timeout. Solves race conditions that Stripe explicitly warns about in their docs.

### Pillar 7: Enriched Delivery
When event arrives, optionally fetch latest resource state from provider API before delivering. Customer gets current object, not stale webhook payload. Eliminates out-of-order bugs, stale data issues, and the need for "fetch-before-process" patterns in customer code.

### Pillar 8: Security Scanner
Automated security audit of customer endpoints:
- Send payloads with invalid signatures → does endpoint reject?
- Send expired timestamps → does endpoint check freshness?
- Replay previously delivered events → does endpoint dedup?
- Send malformed/injection payloads → does endpoint validate?
- Report score + specific vulnerabilities + remediation steps

### Pillar 9: Compliance Audit Trail
- Immutable, append-only event log with integrity hashes
- PCI DSS ready (12 months retention, 3 months immediately accessible)
- SOC 2 and HIPAA compatible audit exports
- Every event, delivery, state change logged with timestamp and source
- Exportable reports for auditors

### Pillar 10: Provider Status Page
- Public-facing real-time page showing webhook health for Stripe, Shopify, etc.
- Powered by cross-customer aggregate data
- Becomes the authoritative source developers check before debugging their own code
- Massive SEO and organic growth driver

---

## Additional Features

### Webhook Contract Testing
Auto-learn payload schemas per event type. Pin a version. Detect breaking changes when providers silently modify payloads. AI-suggested transformations for backward compatibility.

### Local Dev Proxy (hookwise dev)
CLI that forwards webhooks to localhost. Payload inspection, replay, event filtering. Enhanced: "this event would trigger an anomaly" and "this payload is missing fields vs schema."

### Webhook-to-Queue Bridge
Native delivery to SQS, Kafka, Google Pub/Sub, RabbitMQ. Not just HTTP endpoints.

### Multi-Environment Sync
Fan-out webhooks to dev/staging/production with environment-specific transforms.

### Natural Language Queries
"Show me failed Stripe payments over $100 from last week"

### Chaos Testing
Synthetic events (normal + edge cases). "Simulated 100 Stripe events. 3 broke your handler."

---

## Sprint Plan

### Sprint 0: The Weapon (Week 1–2)
Health scanner. Scan Stripe/Shopify, find gaps, calculate $ impact. Landing page + email capture.

### Sprint 1: The Buffer (Week 3–5)
Hono ingestion + signature verification + Postgres + Redis fallback + event dashboard v1.

### Sprint 2: The Guarantee (Week 6–8) — PUBLIC LAUNCH
Circuit breaker + smart delivery + smart retry + idempotency-as-a-service + auth + dashboard v2.

### Sprint 3: The Closer (Week 9–12)
Replay + reconciliation + enriched delivery + revenue impact dashboard + upgrade triggers.

### Sprint 4: The Intelligence (Week 13–18)
Patterns + anomalies + AI diagnosis + event sequencer + correlation + alerting + weekly email.

### Sprint 5: The Shield (Week 19–22)
Security scanner + compliance audit trail + endpoint health score + contract testing.

### Sprint 6: The Network (Week 23–28)
Benchmarks + public status page + flow tracking + predictions + transforms + chaos testing.

### Sprint 7: The Platform (Week 29+)
hookwise dev CLI + queue bridge + REST API + multi-env + additional providers + NL queries + incident threads.

---

## Pricing

| | Free | Starter $29 | Pro $79 | Team $199 | Business $499 |
|---|---|---|---|---|---|
| Events/month | 1K | 50K | 500K | 2M | 10M |
| Integrations | 1 | 3 | Unlimited | Unlimited | Unlimited |
| Retention | 3 days | 7 days | 30 days | 90 days | 1 year |
| Buffer + Circuit Breaker | ✓ | ✓ | ✓ | ✓ | ✓ |
| Idempotency | ✓ | ✓ | ✓ | ✓ | ✓ |
| Smart Retry | — | ✓ | ✓ | ✓ | ✓ |
| Ordered Replay | — | — | ✓ | ✓ | ✓ |
| Reconciliation | — | — | ✓ | ✓ | ✓ |
| Enriched Delivery | — | — | ✓ | ✓ | ✓ |
| AI Diagnosis | — | — | ✓ | ✓ | ✓ |
| Revenue Impact | — | — | ✓ | ✓ | ✓ |
| Event Sequencer | — | — | — | ✓ | ✓ |
| Anomaly Detection | — | — | — | ✓ | ✓ |
| Weekly Reports | — | — | — | ✓ | ✓ |
| Alerting | — | — | — | ✓ | ✓ |
| Flow Tracking | — | — | — | ✓ | ✓ |
| Chaos Testing | — | — | — | ✓ | ✓ |
| Security Scanner | — | — | — | — | ✓ |
| Compliance Audit Trail | — | — | — | — | ✓ |
| Contract Testing | — | — | — | — | ✓ |
| Benchmarks | — | — | — | — | ✓ |
| Queue Bridge | — | — | — | — | ✓ |
| API + CLI | — | CLI | CLI | Full | Full |
| Team Seats | 1 | 1 | 1 | 5 | Unlimited |

---

## Revenue Projections

| Milestone | Timeline | Users | Paying | MRR |
|---|---|---|---|---|
| Sprint 0–1 | Month 1–2 | 20–50 | 0–5 | $0–$150 |
| Launch (Sprint 2) | Month 2–3 | 50–150 | 10–30 | $500–$2,000 |
| Reconciliation (Sprint 3) | Month 3–4 | 150–400 | 30–80 | $2,000–$5,000 |
| Intelligence (Sprint 4) | Month 5–6 | 400–800 | 80–200 | $5,000–$15,000 |
| Security (Sprint 5) | Month 7–8 | 800–1,500 | 200–400 | $15,000–$30,000 |
| Network (Sprint 6) | Month 9–12 | 1,500–4,000 | 400–1,000 | $30,000–$60,000 |
| Platform (Sprint 7) | Month 12–18 | 4,000–10,000 | 1,000–2,500 | $60,000–$150,000 |

---

## Resilience Architecture

| Layer | What Fails | What Catches It |
|---|---|---|
| Primary | Normal operation | Postgres stores on ingestion |
| Fallback 1 | Postgres down | Redis buffers, flushes on recovery |
| Fallback 2 | Postgres + Redis down | Vercel KV / Axiom structured logs |
| Fallback 3 | All above | Reconciliation polls provider API |

Additional: separate ingestion deployment, self-monitoring heartbeat, Inngest fallback cron.

---

## Supported Providers

### Launch: Stripe + Shopify
### Sprint 7+: GitHub, WooCommerce, Generic, customer-requested
