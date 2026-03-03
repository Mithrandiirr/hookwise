# CLAUDE.md — HookWise Project Instructions (v5.0)

## What is this project?
HookWise is the Datadog of webhooks — a webhook operations platform that guarantees every business event reaches the customer's application, even when providers fail, and provides AI-powered intelligence across all integrations.

## One-line pitch
Never miss a webhook. Know why when things break. Get smarter every week.

## Core Identity
- **Category**: Webhook Operations Platform (new category — NOT a Hookdeck competitor)
- **Hookdeck is**: the Vercel of webhooks (deployment infrastructure)
- **HookWise is**: the Datadog of webhooks (operations intelligence + guarantee)
- **Customers can**: use Hookdeck for delivery AND HookWise for intelligence, or HookWise standalone

## Core Value Loop
```
INGEST → PROTECT → DELIVER → UNDERSTAND → IMPROVE
```

## The 10 Pillars
1. **Smart Buffer** — Ingest + store + return 200 in <50ms. Redis fallback.
2. **Circuit Breaker + Replay** — 3-state health, smart retry, ordered replay on recovery.
3. **Reconciliation Engine** — Poll provider APIs for events never sent as webhooks.
4. **AI Intelligence** — Pattern learning, anomaly detection, root cause diagnosis.
5. **Idempotency-as-a-Service** — Exactly-once delivery. Dedup at HookWise layer via provider_event_id.
6. **Event Sequencer** — Hold and reorder events by business logic before delivery. Solves race conditions.
7. **Enriched Delivery** — Fetch latest resource state from provider API before delivering. Eliminates stale data.
8. **Security Scanner** — Audit customer endpoints for vulnerabilities (invalid sigs, replay attacks, injection).
9. **Compliance Audit Trail** — Immutable logs, PCI DSS ready, exportable reports for auditors.
10. **Provider Status Page** — Real-time cross-customer provider health. Public-facing. SEO magnet.

## 3 Impossible-to-Copy Advantages
1. **Reconciliation Engine** — Requires customer API keys (different trust model). Competitors are proxy-only.
2. **Cross-Provider Intelligence** — Correlates events across Stripe+Shopify. Parses payloads for business context.
3. **Network Effect Moat** — Cross-customer benchmarks and provider reliability scores compound with every customer.

## Sprint Plan (Revenue Execution)
- Sprint 0: Health scanner (lead gen weapon) — Week 1–2
- Sprint 1: Buffer (core product foundation) — Week 3–5
- Sprint 2: Guarantee + Idempotency (PUBLIC LAUNCH) — Week 6–8
- Sprint 3: Reconciliation + Enriched Delivery (upgrade trigger) — Week 9–12
- Sprint 4: Intelligence + Event Sequencer (upsell to Team) — Week 13–18
- Sprint 5: Security Scanner + Compliance (Business tier) — Week 19–22
- Sprint 6: Network Effects + Status Page (compound growth) — Week 23–28
- Sprint 7: Platform + Dev Tools + Queue Bridge (ecosystem) — Week 29+

**Hard rule**: Public launch at Week 8. Paying customers before building intelligence features.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + Hono (high-perf ingestion endpoints)
- **Database**: Supabase (Postgres + Auth + Realtime)
- **ORM**: Drizzle ORM
- **Job Queue**: Inngest (event-driven workflows)
- **AI/LLM**: Claude API (Anthropic) for root cause analysis
- **Cache/Fallback**: Upstash Redis (ingestion buffer during DB outages)
- **Deployment**: Vercel (Edge Functions — multi-region ingestion for free)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript (strict mode)

## Project Structure
```
hookwise/
├── CLAUDE.md                  # This file
├── PRODUCT.md                 # Full product spec
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Dashboard pages (protected)
│   │   │   ├── events/        # Event stream view
│   │   │   ├── integrations/  # Integration management
│   │   │   ├── anomalies/     # Anomaly timeline
│   │   │   ├── flows/         # Event flow tracking
│   │   │   ├── replay/        # Replay queue + controls
│   │   │   ├── security/      # Security scanner results
│   │   │   ├── compliance/    # Audit trail + compliance reports
│   │   │   └── settings/      # Account settings
│   │   ├── api/               # API routes
│   │   │   ├── ingest/        # Webhook ingestion (Hono)
│   │   │   ├── health/        # Endpoint health checks
│   │   │   ├── security/      # Security scanner API
│   │   │   └── webhooks/      # Internal webhook handlers
│   │   ├── scan/              # Health scanner (Sprint 0)
│   │   └── status/            # Public provider status page
│   ├── lib/
│   │   ├── db/                # Drizzle schema + queries
│   │   ├── supabase/          # Supabase client config
│   │   ├── redis/             # Upstash Redis client + fallback logic
│   │   ├── inngest/           # Inngest client + functions
│   │   ├── ai/                # Claude API integration
│   │   ├── providers/         # Provider-specific logic (Stripe, Shopify)
│   │   ├── scanner/           # Health scanner logic
│   │   ├── mitigation/        # Circuit breaker, replay engine, reconciliation
│   │   ├── intelligence/      # Pattern learning, anomaly detection, flow tracking
│   │   ├── idempotency/       # Dedup engine via provider_event_id
│   │   ├── sequencer/         # Event ordering + hold-and-release logic
│   │   ├── enrichment/        # Fetch-before-process / enriched delivery
│   │   ├── security/          # Endpoint security scanner
│   │   ├── compliance/        # Audit trail + compliance exports
│   │   └── utils/             # Helper functions
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── scanner/           # Health scanner UI
│   │   └── shared/            # Shared components
│   └── types/                 # TypeScript type definitions
├── supabase/migrations/       # Database migrations
├── inngest/                   # Inngest function definitions
├── drizzle/                   # Drizzle config and migrations
├── cli/                       # hookwise dev CLI tool
└── public/                    # Static assets
```

## Database Schema

### Data Layer
- `integrations` — id, user_id, provider, signing_secret, destination_url, destination_type (http/sqs/kafka/pubsub), status, api_key_encrypted, idempotency_enabled, sequencer_enabled, enrichment_enabled
- `endpoints` — id, integration_id, url, circuit_state, success_rate, avg_response_ms, consecutive_failures, last_health_check, state_changed_at, health_score
- `events` — id, integration_id, event_type, payload (JSONB), headers (JSONB), received_at, signature_valid, provider_event_id, source (webhook/reconciliation/enrichment), amount_cents, enriched_payload (JSONB), sequence_position
- `deliveries` — id, event_id, endpoint_id, status_code, response_time_ms, response_body, attempted_at, next_retry_at, error_type, idempotency_key, delivery_type

### Mitigation Layer
- `replay_queue` — id, endpoint_id, event_id, position, correlation_key, status, attempts, created_at, delivered_at
- `reconciliation_runs` — id, integration_id, provider_events_found, hookwise_events_found, gaps_detected, gaps_resolved, ran_at
- `transformations` — id, integration_id, event_type, rules (JSONB), enabled
- `idempotency_log` — id, integration_id, provider_event_id, first_seen_at, delivery_count, status

### Intelligence Layer
- `patterns` — integration_id, metric_name, rolling_avg, rolling_stddev, last_updated
- `anomalies` — id, integration_id, type, severity, diagnosis (JSONB), detected_at, resolved_at
- `flows` — id, user_id, name, steps (JSONB), timeout_minutes
- `flow_instances` — id, flow_id, correlation_key, current_step, status, started_at, completed_at
- `payload_schemas` — integration_id, event_type, json_schema (JSONB), version, last_updated, pinned
- `sequencer_rules` — id, integration_id, event_order (JSONB), hold_timeout_ms, enabled

### Security & Compliance Layer
- `security_scans` — id, endpoint_id, scan_type, findings (JSONB), score, scanned_at
- `security_findings` — id, scan_id, vulnerability_type, severity, description, remediation
- `audit_log` — id, user_id, integration_id, event_id, action, details (JSONB), integrity_hash, created_at (immutable, append-only)
- `compliance_exports` — id, user_id, format, period_start, period_end, file_url, created_at

### Network Layer
- `provider_health` — provider, metric_name, value, sample_size, measured_at
- `benchmarks` — provider, event_type, p50_latency, p95_latency, failure_rate, sample_size, period

## Delivery Pipeline (Enhanced)
1. `webhook/received` → idempotency check (skip if already delivered)
2. Check circuit state → OPEN: queue for replay
3. If enrichment enabled → fetch latest resource from provider API
4. If sequencer enabled → hold until predecessor events arrive (with timeout)
5. Apply transformations if configured
6. Deliver to destination (HTTP, SQS, Kafka, Pub/Sub)
7. Record delivery + update health metrics + circuit state
8. Smart retry based on error type

## Resilience Architecture
- **Primary**: Postgres on ingestion
- **Fallback 1**: Redis buffer if Postgres down
- **Fallback 2**: Vercel KV / Axiom if both down
- **Fallback 3**: Reconciliation catches everything else
- **Self-monitoring**: Synthetic webhook every 60s
- **Separate deployment**: Ingestion in own Vercel project

## Supported Providers
- **Launch (Sprint 0–2)**: Stripe + Shopify only
- **Sprint 7+**: GitHub, WooCommerce, Generic, customer-requested

## Coding Standards
- TypeScript strict mode, no `any` types
- All database queries through Drizzle ORM
- Server components by default, client components only when needed
- Error handling: never swallow errors, always log with context
- Ingestion endpoint: <50ms response, defer everything to Inngest
- All secrets in env vars, API keys encrypted at rest (Supabase Vault)
- Use Zod for request/response validation
- Circuit breaker transitions: atomic (database transactions with row-level locks)
- Replay operations: idempotent (dedup via provider_event_id)
- Audit log: append-only, integrity hashes, never delete or modify

## Current Sprint: Sprint 0 — The Weapon
Focus: Health scanner. Scan Stripe/Shopify, find gaps, calculate $ impact. Landing page + email capture. Ship in 2 weeks.
