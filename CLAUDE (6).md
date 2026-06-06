# CLAUDE.md — HookWise Project Instructions (v7.1)

## What is this project?
HookWise is a webhook reliability platform that catches what providers drop, diagnoses what endpoints break, and exposes the customer's webhook history as an MCP tool any agent (Claude, Cursor) can query and operate on. Works with any webhook source.

## What changed from v7.0
v7.0 conflated three things that should be separate: what the product is, who we sell to first, and how we frame value. Brand layer drifted toward revenue framing because revenue framing is commercially seductive — but it's only meaningful for ~half of potential customers. v7.1 separates **Product (universal) / Wedge (acquisition) / Brand (honest)** explicitly so the docs stop drifting and the team stops re-arguing them. Engineering scope is unchanged.

When asked about positioning, default to: *"The product is universal. Shopify Plus agencies are the first acquisition wedge, not what HookWise is. Revenue framing renders conditionally on Tier A dashboards only."*

## Three-Layer Model

### Layer 1 — Product (universal)
Three pillars work for any webhook source: Smart Buffer + Idempotency + Smart Retry + Circuit Breaker (table stakes), AI Diagnosis (universal), MCP Server (universal). Reconciliation is broader-than-commerce but not universal — it works wherever the provider has a queryable events API.

### Layer 2 — Wedge (acquisition)
Shopify Plus agencies for first ~50 customers. After that: Stripe-native SaaS, then horizontal. This is acquisition strategy, not product identity.

### Layer 3 — Brand (honest)
Universal homepage. Sky blue, not orange. Revenue tiles render conditionally on Tier A dashboards only. Cold-email campaigns can lead with revenue (Shopify agency campaign) or reliability (devtools campaign) — those are campaigns, not the brand.

## Provider Tier Model (CRITICAL)

The dashboard renders differently based on which providers are connected. Internalize this — it drives most of the conditional UX logic.

| Tier | Providers | Reconciliation? | Revenue framing? | Dashboard |
|---|---|---|---|---|
| A — Money + Reconciliation | Stripe, Shopify, Paddle, Chargebee, Lemon Squeezy | ✓ | ✓ | Revenue tiles + reliability tiles, orange visible |
| B — Ops + Reconciliation | Clerk, Resend | ✓ | — | Reliability tiles only, no orange |
| C — Ops only | GitHub, Linear, Sentry, PagerDuty, Slack, Twilio, Discord, generic | — | — | Reliability tiles only, no orange |

**Tier A** customers see "Revenue protected: $X this month" tiles. Qualify for the optional revenue-protected pricing model.
**Tier B** customers see "Deliveries auto-recovered: X this week" tiles. Reconciliation is on.
**Tier C** customers see the same reliability tiles. Reconciliation is unavailable; they get five of seven things HookWise does — still a real product.

When generating UI code, **never assume Tier A**. Always check connected integration types and render conditionally.

## Naming caveat
A product called **HookWatch** launched on Product Hunt in February 2026. Their MCP play is *watching agents* (observability); ours is *agents acting on the webhook system* (operational) — different direction, but the name collision is real. Final HookWise rename decision is the user's call. Until then, lean into the operational-vs-observability distinction in copy.

## Core Identity
- **Category**: Webhook reliability + agent-readable event history
- **Hookdeck / Svix**: webhook gateways. We don't compete head-on. They proxy and deliver. We sit on top via read-only API keys (where applicable)
- **HookWise**: works alongside Hookdeck/Svix or a hand-rolled endpoint. We don't ask customers to change their infra to adopt us
- **Universal**: any webhook source. The product doesn't shrink based on the provider — only the *features available* per tier do

## Core Value Loop
```
INGEST → PROTECT → RECONCILE (Tier A/B) → DIAGNOSE → EXPOSE-TO-AGENTS
```

## The Three Pillars

1. **Reconciliation Engine (the moat where applicable)** — Read-only API keys → poll provider events endpoint every 5 min → diff against `events` table → auto-ingest gaps into the same delivery pipeline. Provider's own docs tell developers to build this. Tier A and B providers only.
2. **AI Diagnosis (universal brain)** — Claude given 7 parallel inputs (event payload, endpoint history, provider known issues, prior incidents, schema diff, correlated events, provider reliability score) → returns root cause + remediation as structured JSON. Works for any provider whose payloads are JSON.
3. **MCP Server (universal agentic surface)** — Hosted at `mcp.hookwise.com`. Tools listed in the MCP section below. Works for any provider — the agent doesn't care which provider populated the event store.

## What about everything else from earlier versions?
Still implemented in code, still useful, just not on the landing page:
- **Smart Buffer / Idempotency / Smart Retry / Circuit Breaker / Replay** — table stakes, bundled
- **Event Sequencer** — deferred to v8 unless 10+ customers ask
- **Enriched Delivery** — dropped from default pipeline (opt-in flag only)
- **Security Scanner / Compliance Audit Trail** — Business-tier features, not landing-page features
- **Provider Status Page** — SEO surface, separate marketing site

## The Three Moats
1. **Reconciliation Engine** — requires customer API keys. Different trust model than proxy-only competitors. Applies to Tier A and B providers. Compounds with provider expansion.
2. **Cross-provider AI diagnosis** — payload-aware, correlates across providers. Universal. Compounds with customer base.
3. **MCP Server (operational, not observability)** — first-mover on agent-native webhook surface. Universal. Compounds as agent-driven debugging becomes default workflow.

## What MCP is NOT about
Earlier docs invoked Stripe Agentic Commerce / Shopify Agentic Storefronts as a tailwind for the MCP server. That framing was overreach — agentic commerce is about checkout authorization, not webhooks. **The MCP pillar stands on its own merits**: debugging-through-agents is becoming the default developer workflow regardless of what the underlying webhooks are about. Don't invoke agentic-commerce hype in product copy or docs.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack) + Hono (high-perf ingestion endpoints)
- **Database**: Supabase (Postgres + Auth + Realtime)
- **ORM**: Drizzle ORM
- **Job Queue**: Inngest (event-driven workflows + reconciliation crons)
- **AI/LLM**: Claude API (`@anthropic-ai/sdk`) for root cause analysis
- **MCP Server**: Anthropic MCP TypeScript SDK, hosted on Vercel as separate deployment (`mcp.hookwise.com`)
- **Cache/Fallback**: Upstash Redis (ingestion buffer during DB outages)
- **Deployment**: Vercel (Edge Functions — multi-region ingestion)
- **Billing**: Stripe Billing (usage-based + flat tiers)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS v4 + custom F-design system
- **Language**: TypeScript (strict mode)
- **React**: 19.2

## Project Structure
```
hookwise/
├── CLAUDE.md                  # This file — v7.1
├── PRODUCT.md                 # Full product spec — v7.1
├── public/
│   └── art/                   # Optional artwork backgrounds (not currently wired)
├── src/
│   ├── app/
│   │   ├── globals.css        # ⭐ F-design tokens + light/dark themes
│   │   ├── layout.tsx         # Root — wires Inter, JetBrains Mono, Instrument Serif
│   │   ├── page.tsx           # Landing (universal pitch, sky blue, NOT orange)
│   │   ├── (auth)/            # Auth pages
│   │   ├── (dashboard)/       # Dashboard pages — render conditionally per tier
│   │   │   ├── dashboard/     # Overview — adapts per connected providers
│   │   │   ├── events/        # Live feed — universal
│   │   │   ├── reconciliation/# Reconciler — only visible to Tier A/B orgs
│   │   │   ├── anomalies/     # Investigations — universal
│   │   │   ├── flows/         # Sequencer — deferred surface, kept in tree
│   │   │   ├── integrations/  # Endpoints — universal
│   │   │   ├── replay/        # Retries — universal
│   │   │   ├── analytics/     # Analytics
│   │   │   ├── scan/          # Scanner (lead-gen + Tier A check)
│   │   │   ├── alerts/        # Alerts — universal
│   │   │   ├── settings/      # Project settings
│   │   │   ├── security/      # Security findings (Business tier)
│   │   │   ├── compliance/    # Audit trail (Business tier)
│   │   │   ├── mcp/           # 🆕 MCP server config + token mgmt + tool toggles
│   │   │   └── billing/       # 🆕 Stripe billing portal + usage metering
│   │   ├── api/               # API routes
│   │   │   ├── ingest/        # Webhook ingestion (Hono, Edge runtime)
│   │   │   ├── inngest/       # Inngest function handler
│   │   │   ├── mcp/           # 🆕 MCP server endpoint (HTTP+SSE transport)
│   │   │   ├── billing/       # 🆕 Stripe webhook handler + portal session
│   │   │   ├── ...            # all other endpoints from v6.0
│   │   ├── scanner/           # Public health scanner UI (wedge lead-gen)
│   │   └── status/            # Public provider status page (SEO surface)
│   ├── components/
│   │   ├── hw/                # Shared dashboard components
│   │   │   ├── tier-aware-tile.tsx   # 🆕 Conditionally renders revenue vs reliability
│   │   │   └── ...                    # rest unchanged
│   │   └── ...
│   ├── lib/
│   │   ├── tier/              # 🆕 Provider tier resolution (A/B/C)
│   │   ├── mcp/               # 🆕 MCP server tool definitions + auth + audit
│   │   ├── billing/           # 🆕 Stripe Billing integration + usage metering
│   │   ├── providers/         # stripe, shopify, github, clerk, resend, generic
│   │   └── ...                # unchanged from v6.0
│   └── types/
├── middleware.ts              # ⭐ Auth gate
└── ...
```

🆕 markers indicate v7.1 additions.

## Provider Tier Resolution

Implemented in `src/lib/tier/index.ts`. Resolves an org's tier based on connected integrations:

```ts
type ProviderTier = 'A' | 'B' | 'C';
type DashboardMode = 'revenue+reliability' | 'reliability';

const TIER_A_PROVIDERS = ['stripe', 'shopify', 'paddle', 'chargebee', 'lemonsqueezy'];
const TIER_B_PROVIDERS = ['clerk', 'resend'];
// Anything else is Tier C

function resolveOrgTier(integrations: Integration[]): {
  tier: ProviderTier;          // highest tier of any connected integration
  dashboardMode: DashboardMode;
  revenueTrackingEnabled: boolean;  // true iff at least one Tier A integration
  reconciliationEnabled: boolean;   // true iff at least one Tier A/B integration
}
```

**The dashboard reads `revenueTrackingEnabled` to decide whether to render orange revenue tiles.** Never hardcode this check; always go through `resolveOrgTier`.

---

## Database Schema

### Data Layer
- `integrations` — id, org_id, user_id, provider, signing_secret, destination_url, destination_type, status, api_key_encrypted, idempotency_enabled, sequencer_enabled, enrichment_enabled, name, created_at, **tier (computed: 'A' | 'B' | 'C')**
- `endpoints` — id, integration_id, url, circuit_state, success_rate, avg_response_ms, consecutive_failures, last_health_check, state_changed_at, health_score
- `events` — id, integration_id, event_type, payload (JSONB), headers (JSONB), received_at, signature_valid, provider_event_id, source (webhook/reconciliation/enrichment), amount_cents (nullable, only populated for Tier A providers), enriched_payload (JSONB), sequence_position
- `deliveries` — id, event_id, endpoint_id, status_code, response_time_ms, response_body, attempted_at, next_retry_at, error_type, idempotency_key, delivery_type, status

### Mitigation Layer
- `replay_queue`, `reconciliation_runs` (only populated for Tier A/B integrations), `transformations`, `idempotency_log`

### Intelligence Layer
- `patterns`, `anomalies`, `flows`, `flow_instances`, `payload_schemas`, `sequencer_rules`

### Security & Compliance Layer (Business tier)
- `security_scans`, `security_findings`, `audit_log`, `compliance_exports`, `alert_configs`

### Network Layer
- `provider_health`, `benchmarks`

### MCP Layer (v7.0+)
- `mcp_tokens`, `mcp_invocations`, `mcp_tool_settings`

### Billing & Org Layer (v7.0+)
- `orgs`, `org_members`, `usage_meters` (includes `revenue_protected_cents` field that stays NULL for orgs without Tier A integrations)

**Schema migration note**: v6.0 was single-tenant per user. v7.0+ is multi-org via `orgs` + `org_members`. Do this migration before public launch.

---

## Design System (F-design — Cursor-inspired)

### Token Architecture
All tokens live in `src/app/globals.css`. Two-layer system: F-design (`--hf-*`) is the active design language; legacy compatibility shim (`--hw-*`) auto-aliases to `--hf-*` inside `.hf-root`.

### Theme Modes
- **Light** = `:root` defaults (warm cream bg, white panels, deeper sky blue accent)
- **Dark** = `.dark` overrides (warm dark bg, brighter sky blue accent)
- **Toggle** = `ThemeToggleFooter` in landing footer ONLY. Persists via `useTheme()` hook + `hookwise-theme` localStorage key
- **Initial render** = `<html class="dark">` is hardcoded; the inline script in `layout.tsx` flips before paint

### Color Semantics (CRITICAL)
- **Sky blue (`--hf-accent`)** = system, infrastructure, intelligence. **The homepage is sky blue.** All eyebrows, serif italic accents, sidebar active border, link-accent text, charts, default brand color
- **Warm orange (`--hf-accent-warm`)** = MONEY ONLY. **Conditional render rule**: orange tokens only resolve to visible UI on dashboards where `resolveOrgTier(...).revenueTrackingEnabled === true`. Never on the homepage. Never on Tier B/C dashboards. Never on the auth flow.

If you find yourself writing orange-token UI for the marketing site or for a Tier B/C surface, **stop and ask** — that's a positioning regression, not a design choice.

### Typography
- Inter (display + UI body)
- JetBrains Mono (data, eyebrows, mono labels — tabular numerals)
- Instrument Serif Italic (editorial accent, paired with sky-blue)

### Implementation Status (which pages use F-design directly vs the shim)
- ✓ **Direct F-design**: `/`, `/dashboard`, `/events`, `/reconciliation`, `/anomalies`, `/flows`, `/integrations`, `/replay`, `/settings`
- ☐ **New in v7.1, needs F-design from scratch**: `/mcp`, `/billing`, tier-aware dashboard tiles
- 〜 **Via compatibility shim**: `/analytics`, `/scan`, `/alerts`, `/security`, `/compliance`, all `[id]` detail pages, all `/new` form pages

---

## Delivery Pipeline

1. `webhook/received` (or reconciliation poller emits same internal event for Tier A/B integrations)
2. Idempotency check (skip if already delivered by `provider_event_id`)
3. Check circuit state → OPEN: queue for replay
4. Apply transformations if configured
5. Deliver to destination (HTTP, SQS, Kafka, Pub/Sub)
6. Record delivery + update health metrics + circuit state
7. Smart retry based on error type
8. On repeated failure → AI Diagnosis kicks in → anomaly created

Note: Enriched delivery is **opt-in only** via integration flag. Sequencer is deferred surface, kept in code.

## Resilience Architecture
- Primary: Postgres on ingestion
- Fallback 1: Redis buffer if Postgres down
- Fallback 2: Vercel KV / Axiom if both down
- Fallback 3 (Tier A/B only): Reconciliation catches everything else
- Self-monitoring: synthetic webhook every 60s
- Separate deployment: Ingestion in own Vercel project; MCP server in another own Vercel project

## Supported Providers

### Tier A — Money + Reconciliation
- ✓ **Stripe** (Phase 1 launch — Events API)
- ✓ **Shopify** (Phase 1 launch, lead — Admin API per resource)
- ☐ Paddle (Phase 4)
- ☐ Chargebee (Phase 4)
- ☐ Lemon Squeezy (Phase 4)

### Tier B — Ops + Reconciliation
- ✓ **Clerk** (already implemented)
- ✓ **Resend** (already implemented — sent-emails endpoint)

### Tier C — Ops only (no reconciliation)
- ✓ **GitHub** (already implemented)
- ☐ Linear (Phase 3)
- ☐ Sentry (Phase 3)
- ☐ PagerDuty (Phase 3)
- ☐ Slack (Phase 4)
- ☐ Twilio (Phase 4)
- ☐ Discord (Phase 4)
- ✓ **Generic** (custom webhook endpoint, any provider)

When asked which providers HookWise supports: *"Any webhook source. Tier A providers (Stripe, Shopify, Paddle, etc.) get reconciliation and revenue framing. Tier B providers (Clerk, Resend) get reconciliation. Tier C providers (GitHub, Linear, Sentry, etc.) get table stakes plus AI Diagnosis plus MCP."*

---

## MCP Server Implementation Notes

### Transport
HTTP + SSE (server-sent events). Modern remote MCP transport, what Claude Desktop, Cursor, and most agent frameworks expect for hosted servers.

### Auth
Customer's HookWise API key as `Authorization: Bearer <token>` header. Tokens are scoped — each token can be configured with a subset of allowed tools and a rate limit. Per-tool RBAC at the token level.

### Tool surface (Phase 1)

**Universal tools (all tiers):**
- `query_events(filters, limit)` — search the org's webhook history
- `get_event(event_id)` — full payload + delivery history
- `get_delivery_status(event_id)` — current state, retry count, next retry timestamp
- `replay_event(event_id, target_url?)` — re-deliver an event (with confirmation flag for non-idempotent endpoints)
- `diagnose_failure(event_id)` — invoke Claude diagnosis on demand (counts against AI Diagnosis quota)
- `list_failed_critical_events(window)` — events that failed delivery and weren't recovered (universal version of revenue-at-risk)
- `get_endpoint_health(endpoint_id)` — circuit state, p50/p95, success rate, consecutive failures
- `list_anomalies(window, severity?)` — recent anomalies with diagnoses
- `list_incidents_prevented(window)` — counts of retries that succeeded + reconciliation hits

**Tier A only (revenue-aware):**
- `list_revenue_at_risk(window)` — events containing `amount` not yet confirmed delivered
- Returns `tier_unsupported` error for orgs without Tier A integrations

**Tier A/B only (reconciliation-aware):**
- `reconcile_provider(provider, since)` — trigger out-of-band reconciliation run
- Returns `tier_unsupported` error for Tier C orgs

### Audit & rate limiting
Every tool invocation writes to `mcp_invocations`. Rate limits enforced per token, default 60/min. `replay_event` and `reconcile_provider` are write tools and require explicit scope grants.

### What NOT to expose via MCP (Phase 1)
- No raw SQL or unbounded queries
- No org config mutation (no creating integrations, no rotating signing secrets)
- No PII export at scale (`query_events` caps at 100 rows per call)
- No billing actions

### Onboarding flow for MCP
On the `/mcp` dashboard page:
1. User clicks "Generate token"
2. Picks scopes (default: read-only set; explicit opt-in for `replay_event` and `reconcile_provider`)
3. Gets a one-time-display token + a copy-paste config block for Claude Desktop / Cursor
4. Live preview: an embedded MCP playground that calls the user's own server with sample tools

---

## Coding Standards
- TypeScript strict mode, no `any` types
- All database queries through Drizzle ORM
- Server components by default, client components only when needed (`"use client"` at top)
- Error handling: never swallow errors, always log with context
- Ingestion endpoint: <50ms response, defer everything to Inngest
- All secrets in env vars, API keys encrypted at rest (Supabase Vault)
- Use Zod for request/response validation. **MCP tool schemas are Zod-first** and exported to JSON Schema for the MCP transport
- Circuit breaker transitions: atomic (database transactions with row-level locks)
- Replay operations: idempotent (dedup via `provider_event_id`)
- Audit log: append-only, integrity hashes, never delete or modify
- MCP audit log: same rules
- **Tier-aware UI**: never hardcode revenue checks. Always go through `resolveOrgTier(...).revenueTrackingEnabled`. The same applies to dashboard tile rendering, email reports, and MCP tool gating

## Design Standards
- **Tokens over hex**: Use `var(--hf-*)` not hardcoded colors
- **Money is orange, system is blue. Money is conditional.** The homepage and Tier B/C surfaces are sky blue everywhere
- **Inline styles are fine** — F-design uses inline `style={}` heavily for layout. Reference tokens, not hex
- **Spacing comes from the scale**: `var(--s2)`, `var(--s3)`, etc.
- **Don't add a toggle outside the landing footer** unless asked
- **No orange on the homepage. Ever.**

---

## Auth & Routing
- Middleware at `middleware.ts` gates protected routes via Supabase auth
- `PUBLIC_ROUTES = ["/", "/login", "/signup", "/auth/callback", "/auth/reset-password", "/forgot-password", "/scan", "/status"]`
- Webhook ingest paths (`/api/ingest`, `/api/inngest`, `/api/dev`) are public
- MCP endpoint `/api/mcp` is public at the HTTP level but auth-gated by Bearer token
- Stripe billing webhook `/api/billing/stripe` is public, signature-verified

## Dev Workflow
```
pnpm dev               # Next.js dev server (Turbopack)
pnpm dev:inngest       # Inngest dev server (separate terminal)
pnpm dev:mcp           # 🆕 MCP server dev mode (separate Vercel project locally)
pnpm db:generate       # Drizzle: generate migration from schema
pnpm db:migrate        # Drizzle: apply migrations
pnpm db:studio         # Drizzle Studio
pnpm test              # Vitest
pnpm lint              # ESLint
```

---

## Current Phase (May 2026)

**Phase 1 — Launch.** The engineering surface from v6.0 is largely shipped. Work to public launch:

1. **MCP server at `mcp.hookwise.com`** — universal differentiator. Highest priority
2. **Tier-aware dashboard rendering** — revenue tiles render conditionally; reliability tiles render universally
3. **Stripe billing wiring + 3-tier paid signup** — billing isn't real until a card can be swiped
4. **Landing page rewrite to v7.1 universal positioning** — sky blue, no orange
5. **Multi-org / RBAC migration** — schema change before launch, not after
6. **Onboarding flow polish** — signup → first event in <5 min, with provider tier detection
7. **SLA + status page for HookWise itself** — separate from "provider status page" SEO surface
8. **Trust scaffolding** — DPA, privacy policy, GDPR baseline, "SOC 2 in progress" page
9. **Free Shopify health scanner GA** — the wedge campaign weapon
10. **Docs site at `docs.hookwise.com`** — quickstart per provider, OpenAPI spec, Node SDK

When asked about progress, default to: *"Phase 1 of v7.1 — MCP server + tier-aware dashboard + billing + multi-org migration are the launch blockers."*

When asked which feature to work on next, default to **MCP server** unless billing, multi-org, or tier-aware dashboard is explicitly the topic.

---

## Out of scope for v7.1 (don't suggest these)
- Event Sequencer marketing surface (kept in code, not on landing)
- Enriched Delivery as a default behavior (opt-in flag only)
- Provider Status Page as a product feature (SEO surface, separate site)
- `hookwise dev` CLI (Phase 4)
- Linear / Sentry / PagerDuty / Slack / Twilio / Discord providers (Phase 3+)
- Native queue bridges beyond HTTP (only if a paying customer asks)
- Chaos testing, contract testing, NL queries (deferred — interesting but not the wedge)
- **Agentic-commerce framing in marketing copy** — stripped in v7.1, don't reintroduce. The MCP pillar stands on agent-native debugging being the default workflow, not on Stripe ACP or Shopify Agentic Storefronts
