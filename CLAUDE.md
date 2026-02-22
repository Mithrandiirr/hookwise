# CLAUDE.md — HookWise Project Instructions

## What is this project?
HookWise is an AI-powered webhook intelligence platform. It sits between webhook providers (Stripe, Shopify, GitHub) and the customer's application. It receives webhooks reliably, delivers them with retries, and uses AI to detect anomalies, diagnose root causes, track event flows, predict failures, and generate weekly intelligence reports.

## One-line pitch
Never miss a webhook. Know why when things break. Get smarter every week.

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
- `users` — Managed by Supabase Auth
- `integrations` — id, user_id, provider, signing_secret, destination_url, status
- `events` — id, integration_id, event_type, payload (JSONB), headers (JSONB), received_at, signature_valid, provider_event_id
- `deliveries` — id, event_id, status_code, response_time_ms, response_body, attempted_at, next_retry_at
- `patterns` — integration_id, metric_name, rolling_avg, rolling_stddev, last_updated
- `anomalies` — id, integration_id, type, severity, diagnosis, detected_at, resolved_at
- `flows` — id, user_id, name, steps (JSONB), timeout_minutes
- `flow_instances` — id, flow_id, correlation_key, status, started_at, completed_at
- `payload_schemas` — integration_id, event_type, json_schema (JSONB), last_updated
- `alert_configs` — integration_id, channel, threshold, enabled
- `intelligence_reports` — user_id, period_start, period_end, report (JSONB), sent_at

## Architecture Overview

### Webhook Ingestion Flow
1. Provider sends POST to `https://app.hookwise.dev/ingest/{integration_id}`
2. Hono endpoint receives request (<50ms response time target)
3. Verify signature using provider-specific method (HMAC SHA-256)
4. Store event in `events` table with full payload + headers
5. Return 200 OK immediately to provider
6. Emit Inngest event `webhook/received` to trigger async processing

### Delivery Flow (Inngest)
1. `webhook/received` event triggers delivery function
2. POST event payload to customer's destination URL
3. Record delivery attempt in `deliveries` table
4. On failure: schedule retry with exponential backoff (5s, 30s, 2min, 10min, 1hr, 6hr)
5. After max retries: mark as dead letter, create alert

### AI Anomaly Detection Flow (Inngest)
1. Cron function runs every 5 minutes per active integration
2. Compute current metrics (event volume, response time, failure rate)
3. Compare against rolling baselines in `patterns` table
4. If anomaly detected: call Claude API with full context
5. Store diagnosis in `anomalies` table
6. Send alert via configured channel (email, Slack)

## Supported Providers (Phase 1)
- **Stripe**: HMAC SHA-256 via `stripe-signature` header. Webhook secret starts with `whsec_`.
- **Shopify**: HMAC SHA-256 via `X-Shopify-Hmac-Sha256` header. Topic from `X-Shopify-Topic`.
- **GitHub**: HMAC SHA-256 via `X-Hub-Signature-256` header. Event from `X-GitHub-Event`.

## Coding Standards
- TypeScript strict mode, no `any` types
- All database queries through Drizzle ORM
- Server components by default, client components only when needed
- Error handling: never swallow errors, always log with context
- Ingestion endpoint must respond in <50ms (defer all processing to Inngest)
- All secrets in environment variables, never hardcoded
- Use Zod for request/response validation

## Build Phases
- Phase 1 (Weeks 1-4): Ingestion + delivery + basic dashboard
- Phase 2 (Weeks 5-8): AI layer (patterns, anomalies, diagnosis, alerts)
- Phase 3 (Weeks 9-12): Growth features (NL queries, weekly reports, CLI)
- Phase 4 (Weeks 10-16): Billing + monetization
- Phase 5 (Month 4-8): Moat features (incident commander, revenue impact, status pages, benchmarks, contract testing)
- Phase 6 (Month 8-14): Platform (code gen, templates, cost analytics, multi-env)

## Current Phase: Phase 1 — MVP
Focus: Ingestion engine → Delivery worker → Dashboard v1 → Auth → Stripe/Shopify/GitHub support

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
