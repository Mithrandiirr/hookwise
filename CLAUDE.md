# CLAUDE.md — HookWise Project Instructions

## What is this project?
HookWise is an AI-powered webhook intelligence platform. It sits between webhook providers (Stripe, Shopify, GitHub) and the customer's application. It receives webhooks reliably, delivers them with smart retries, and uses AI to detect anomalies, diagnose root causes, track event flows, predict failures, and generate weekly intelligence reports.

## One-line pitch
Never miss a webhook. Know why when things break. Get smarter every week.

## Core Value Proposition — Protect, Diagnose, Recover
HookWise does NOT fix customer code or modify provider webhooks. It is a middleman that owns the pipe between sender and receiver. The three things it does:
- **Protect** — Buffer, circuit breaker, reconciliation. Events are never lost.
- **Diagnose** — AI root cause analysis, cross-integration correlation, surgical context so devs fix issues in minutes not hours.
- **Recover** — Ordered replay, payload transformation, skip-and-continue delivery.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + Hono (for high-perf ingestion endpoints)
- **Database**: Supabase (Postgres + Auth + Realtime)
- **ORM**: Drizzle ORM
- **Job Queue**: Inngest (event-driven workflows)
- **AI/LLM**: Claude API (Anthropic) for root cause analysis
- **Deployment**: Vercel
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Language**: TypeScript (strict mode)

## Project Structure
```
hookwise/
├── CLAUDE.md                  # This file — Claude Code reads this
├── PRODUCT.md                 # Full product plan and feature specs
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Dashboard pages (protected)
│   │   │   ├── events/        # Event stream view
│   │   │   ├── integrations/  # Integration management
│   │   │   ├── anomalies/     # Anomaly timeline
│   │   │   ├── flows/         # Event flow tracking
│   │   │   └── settings/      # Account settings
│   │   └── api/               # API routes
│   │       ├── ingest/        # Webhook ingestion (Hono)
│   │       └── webhooks/      # Internal webhook handlers
│   ├── lib/                   # Shared utilities
│   │   ├── db/                # Drizzle schema + queries
│   │   ├── supabase/          # Supabase client config
│   │   ├── inngest/           # Inngest client + functions
│   │   ├── ai/                # Claude API integration
│   │   ├── providers/         # Provider-specific logic (Stripe, Shopify, GitHub)
│   │   ├── mitigation/        # Circuit breaker, replay engine, reconciliation
│   │   └── utils/             # Helper functions
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── shared/            # Shared components
│   └── types/                 # TypeScript type definitions
├── supabase/
│   └── migrations/            # Database migrations
├── inngest/                   # Inngest function definitions
├── drizzle/                   # Drizzle config and migrations
└── public/                    # Static assets
```

## Database Schema (Core Tables)

### Infrastructure Tables
- `users` — Managed by Supabase Auth
- `integrations` — id, user_id, provider, signing_secret, destination_url, status, api_key_encrypted (optional, for reconciliation)
- `endpoints` — id, integration_id, url, circuit_state (CLOSED/HALF_OPEN/OPEN), success_rate, avg_response_ms, consecutive_failures, last_health_check, state_changed_at
- `events` — id, integration_id, event_type, payload (JSONB), headers (JSONB), received_at, signature_valid, provider_event_id, source (webhook/reconciliation)
- `deliveries` — id, event_id, endpoint_id, status_code, response_time_ms, response_body, attempted_at, next_retry_at, error_type (timeout/server_error/rate_limit/ssl/unknown)

### Mitigation Tables
- `replay_queue` — id, endpoint_id, event_id, position, correlation_key, status (pending/delivering/delivered/failed), attempts, created_at, delivered_at
- `reconciliation_runs` — id, integration_id, provider_events_found, hookwise_events_found, gaps_detected, gaps_resolved, ran_at
- `transformations` — id, integration_id, event_type, rules (JSONB), enabled

### AI Tables
- `patterns` — integration_id, metric_name, rolling_avg, rolling_stddev, last_updated
- `anomalies` — id, integration_id, type, severity, diagnosis (JSONB), detected_at, resolved_at
- `flows` — id, user_id, name, steps (JSONB), timeout_minutes
- `flow_instances` — id, flow_id, correlation_key, status, started_at, completed_at
- `payload_schemas` — integration_id, event_type, json_schema (JSONB), last_updated

### Config Tables
- `alert_configs` — integration_id, channel, threshold, enabled
- `intelligence_reports` — user_id, period_start, period_end, report (JSONB), sent_at

## Architecture Overview — The 4 Mitigation Layers

### Layer 1: Smart Buffer (Ingestion)
The ingestion endpoint is a BUFFER, not a proxy. This decoupling is the entire product.
1. Provider sends POST to `https://app.hookwise.dev/ingest/{integration_id}`
2. Hono endpoint receives request (<50ms response time target)
3. Verify signature using provider-specific method (HMAC SHA-256)
4. Store event in `events` table with full payload + headers
5. Return 200 OK immediately to provider — provider ALWAYS sees success
6. Emit Inngest event `webhook/received` to trigger async delivery

Critical: Because we always return 200 to the provider, the provider never retries against us and never removes the webhook subscription. Shopify deletes subscriptions after 8 failed deliveries in 4 hours — our buffer prevents that entirely.

### Layer 2: Circuit Breaker + Endpoint Health Monitor
Each endpoint has three states tracked in the `endpoints` table:

**CLOSED (healthy)** — success rate >90%, response time <5s. Deliver normally.
**HALF-OPEN (degraded)** — success rate 50-90% OR response time 5-10s. Rate-limit delivery to 1 event/sec.
**OPEN (broken)** — success rate <50% OR response time >10s OR 5 consecutive failures. Stop delivery, queue events in `replay_queue`, start health checks every 30s.

State transitions:
```
CLOSED → OPEN:     5 consecutive failures OR success rate <50%
OPEN → HALF-OPEN:  3 consecutive successful health checks (HEAD requests)
HALF-OPEN → CLOSED: 10 consecutive successful deliveries
HALF-OPEN → OPEN:  2 failures during half-open state
```

Implementation: Track sliding window of last 20 deliveries per endpoint. Health checks during OPEN state are lightweight HEAD requests every 30 seconds. All state transitions must be atomic (database transaction).

### Layer 3: Ordered Replay Engine
When endpoint transitions from OPEN → HALF-OPEN, replay engine activates:
1. Sort queued events by `received_at` (strict chronological order)
2. Group by correlation key (order_id, customer_id) — related events replay together in order
3. Adaptive rate limiting: start at 1/sec, scale up to 2 → 5 → 10/sec as endpoint proves healthy. Immediately back off on any failure.
4. Checkpoint after each delivery — if interrupted, resume from last checkpoint. No duplicates, no gaps.
5. Deduplication via provider_event_id — skip events already processed through other paths
6. Skip-and-continue: if one specific event keeps failing, skip it, deliver the rest, surface the failing event separately for manual inspection

### Layer 4: Reconciliation Engine (Phase 2 — requires provider API key)
Detects events the provider generated but never sent as webhooks. Runs every 5 minutes per integration.
- **Stripe**: Call `GET /v1/events?delivery_success=false` + compare all events in time range against events table
- **Shopify**: Call Admin API to list recent orders/resources, compare against received webhooks, construct missing events from API data
- Log every run in `reconciliation_runs` table
- Customer enables per-integration by providing API key (encrypted at rest via Supabase Vault)
- This makes webhooks 100% reliable — even if Shopify silently drops 10% of webhooks (real reported issue), reconciliation catches them within 5 minutes

### Delivery Flow (Inngest)
1. `webhook/received` event triggers delivery function
2. Check endpoint circuit state:
   - If OPEN → add to `replay_queue`, return immediately
   - If HALF_OPEN → rate-limit (1/sec max)
   - If CLOSED → deliver normally
3. Apply any transformation rules from `transformations` table (payload field mapping, restructuring — original event stored intact)
4. POST transformed payload to customer's destination URL
5. Record delivery attempt in `deliveries` table with error_type classification
6. Update endpoint health metrics (success_rate, avg_response_ms, consecutive_failures)
7. Update circuit breaker state if threshold crossed
8. Smart retry based on error type:
   - 429 (rate limited): read Retry-After header, wait exactly that long
   - 503 (server down): aggressive backoff (30s, 2min, 10min, 1hr)
   - 500 (code bug): retry once, then hold — retrying a bug is pointless noise
   - Timeout: retry once with 2x timeout
   - SSL error: do NOT retry, alert immediately — won't fix itself
   - Connection refused: treat as endpoint down, transition to OPEN state

### AI Anomaly Detection Flow (Inngest)
1. Cron function runs every 5 minutes per active integration
2. Compute current metrics (event volume, response time, failure rate)
3. Compare against rolling baselines in `patterns` table
4. If anomaly detected: call Claude API with structured context (baseline, current, last 20 events, other integrations status)
5. Store diagnosis in `anomalies` table — diagnosis includes:
   - WHAT happened (specific metrics that deviated)
   - WHY (root cause analysis — is it the endpoint, the provider, or a payload pattern?)
   - IMPACT (affected events count + revenue if payment/order events)
   - RECOMMENDATION (specific actionable advice for the developer)
6. Send alert via configured channel (email, Slack)

### What HookWise Can and Cannot Do
**CAN do:**
- Guarantee delivery via buffering + circuit breaker + reconciliation
- Alert with surgical context (which events, what pattern, what payload data, what revenue impact)
- Transform payloads before delivery (field mapping, restructuring) — original stored intact in database
- Detect provider-side outages by observing patterns across all customers
- Fetch missed events via provider API reconciliation (goes around webhooks entirely)
- Skip failing events and continue delivery (don't block queue on one bad event)
- Rate-limit delivery to protect recovering endpoints
- Group failing events by pattern so developer sees "these 4 all fail because X" not 4 individual alerts

**CANNOT do:**
- Modify the original webhook event (provider signatures would break)
- Fix customer's handler code (can only diagnose and recommend)
- Fix provider-side bugs (can only detect and work around via reconciliation)
- Guarantee zero added latency (buffering adds 100-500ms to delivery path)

## Supported Providers (Phase 1)
- **Stripe**: HMAC SHA-256 via `stripe-signature` header. Webhook secret starts with `whsec_`. Reconciliation via `GET /v1/events` API.
- **Shopify**: HMAC SHA-256 via `X-Shopify-Hmac-Sha256` header. Topic from `X-Shopify-Topic`. Reconciliation via Admin REST API.
- **GitHub**: HMAC SHA-256 via `X-Hub-Signature-256` header. Event from `X-GitHub-Event`. No reconciliation API available.

## Coding Standards
- TypeScript strict mode, no `any` types
- All database queries through Drizzle ORM
- Server components by default, client components only when needed
- Error handling: never swallow errors, always log with context
- Ingestion endpoint must respond in <50ms (defer all processing to Inngest)
- All secrets in environment variables, never hardcoded
- Provider API keys encrypted at rest (Supabase Vault or pgcrypto)
- Use Zod for request/response validation
- Circuit breaker state changes must be atomic (database transactions with row-level locks)
- Replay queue operations must be idempotent (use provider_event_id for deduplication)

## Build Phases
- Phase 1 (Weeks 1-4): Smart buffer + circuit breaker + delivery + ordered replay + basic dashboard + auth
- Phase 2 (Weeks 5-8): AI layer (patterns, anomalies, diagnosis, alerts) + reconciliation engine
- Phase 3 (Weeks 9-12): Growth features (NL queries, weekly reports, CLI, payload transformations)
- Phase 4 (Weeks 10-16): Billing + monetization
- Phase 5 (Month 4-8): Moat features (incident threads, revenue impact, status pages, benchmarks, contract testing)
- Phase 6 (Month 8-14): Platform (code gen, templates, cost analytics, multi-env)

## Current Phase: Phase 1 — MVP
Focus: Smart buffer → Circuit breaker → Delivery worker with smart retry → Ordered replay engine → Dashboard v1 → Auth → Stripe/Shopify/GitHub support

## Environment Variables Needed
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Claude API (Phase 2)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
