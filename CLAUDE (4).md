# CLAUDE.md — Project Instructions (v8)

## What is this project?
A standalone webhook reconciliation service (working name HookWise — **rename pending**, Hook* namespace is saturated: Hookdeck, Hook0, Hooklistener, HookRescue, HookWatch). We poll the provider's API for ground truth, diff it against webhooks actually delivered, and recover the gaps. First provider: Shopify. First product: a free 7-Day Gap Audit that converts into $29/store/month continuous monitoring.

One sentence: **we find the orders Shopify never told you about, and recover them.**

## What changed from v7.1
v7.1 was a horizontal webhook platform (buffer + AI + MCP pillars, tier system, three-layer brand model, 11 launch blockers). Research (June 2026) showed two of three pillars already shipped by competitors (EventDock/HookRescue cloned the proxy+AI play; Hooklistener/Unhook shipped webhook MCP servers), and the commodity layer is price-impossible vs Hookdeck ($39/mo, SOC 2 on free tier). The only uncontested, structurally defensible capability was reconciliation — so v8 **inverts the architecture: reconciliation is no longer the moat of a platform, it IS the product.** Everything else is supporting infrastructure or deleted from scope.

When asked about positioning, default to: *"Proxies protect events the provider actually sent. We sit against the provider's API truth and catch what was never delivered at all. We work alongside Hookdeck/Svix, not against them."*

## Scope law (overrides everything below)
A task is in scope only if it is **necessary** (on the path to the current phase gate) or **unprecedented** (part of the reconciliation core nobody else ships). When asked to build anything else, push back once and name the gate it doesn't serve. If the user insists, comply — but never *suggest* out-of-scope work.

## Current phase: Phase 0 (3 weeks)
Build exactly:
1. **Gap Report generator** — consumes existing poller + events data, outputs the 7-day audit report (HTML + PDF): gaps found, dollar value, subscription-health findings, white-label option.
2. **Install flow** — read-only Admin API key + additional webhook subscription (Shopify allows multiple per topic; we never touch their existing flow). Evaluate packaging as a Shopify app for OAuth + distribution.
3. **One-page landing** — single CTA: "Run a free 7-day gap audit on your store."
4. **Rename execution** once the user decides (config, domain, copy).

**Gate: 5 real-store audits running by end of week 3.** When asked what to work on next, default to whichever of 1–3 is least finished.

## Do-not-build list (do not suggest, scope, or scaffold these)
- Multi-org / RBAC migration (stores-under-one-account is sufficient until an agency with 10+ stores demands more)
- Three-tier billing, billing portal, usage metering (one Stripe Payment Link)
- Node SDK, docs site (one quickstart page max)
- MCP server work (Phase 2, post-revenue; read-only, demo-grade; it is a feature, never a moat — Hooklistener has 46 tools live)
- Tier A/B/C adaptive dashboard system (one provider = one dashboard; tier logic returns with provider #2)
- New providers beyond Shopify (Stripe is Phase 2, gated on 3 paying stores; everything after is governed by the Provider Expansion Doctrine below)
- Event Sequencer, enriched delivery, provider status page, security scanner / compliance marketing, `hookwise dev` CLI, queue bridges
- Brand-layer / homepage-architecture / campaign-matrix documents
- Any spec revision (v8.1) before the Phase 0 gate is met — if asked to revise strategy docs, remind the user the next milestone is a stranger's audit, not a document

## Core mechanism (the unprecedented part — protect its quality above all)
```
SUBSCRIBE (additional, non-invasive) → RECORD what provider fires
POLL provider API every 5 min (Inngest cron) → GROUND TRUTH
DIFF by provider_event_id / resource id+updated_at → GAPS
AUTO-INGEST gaps → deliver to customer endpoint, source: 'reconciliation'
REPORT → dollars + subscription health
```
Already built ✓: Inngest pollers (Stripe + Shopify), diff against `events`, auto-ingest, idempotency by `provider_event_id`, smart retry, replay, AI diagnosis.
New in Phase 0 ☐: Gap Report generator, install flow, landing page, audit-mode (record-only, no delivery interception).

Correctness rules for this core:
- Reconciliation-ingested events must be idempotent and clearly tagged (`source: 'reconciliation'`) so customer endpoints can distinguish them.
- Never claim a gap without double-checking the delivery log AND allowing for webhook latency (provider delays of 20+ min are documented — use a maturity window, e.g. don't flag events younger than 60 min).
- Handle Shopify API version fall-forward (X-Shopify-Api-Version mismatch) — flag it in reports.
- Respect Admin API rate limits; back off, never let polling degrade a merchant's API budget.
- False positives in a Gap Report are fatal to credibility. When uncertain, label "unconfirmed" rather than "lost."

## Supporting infrastructure (in code, not in product)
Smart Buffer, circuit breaker, retry, replay, anomaly detection, flow tracking, security scanner, compliance audit trail, MCP scaffolding, tier resolution — keep compiling, keep tested, keep OFF the landing page, pricing, and pitch copy. Reference them only as internal plumbing.

## Provider Expansion Doctrine
The engine is provider-general by design: each provider is a plugin = poller + diff key + maturity window + an honestly-identified villain. Shopify and Stripe are the launch *sequence*, not the ceiling. But provider count before revenue is a vanity metric (EventDock claims 20+ and it bought them nothing), so expansion is **demand-pulled, never roadmap-pushed**.

A provider gets built only when ALL three hold:
1. **Queryable truth API** — a list-events or list-resources-since-X endpoint to reconcile against. No truth API = never (generic/custom webhooks belong to Hookdeck; say so plainly).
2. **Demonstrated pull** — a paying customer asks, or the demand-capture field on the audit signup ("Which other provider do you want this for?") shows repeated requests for it.
3. **Honest villain identified** — per-provider failure-mode research done first. Shopify: the provider drops (documented). Stripe: the endpoint fails silently inside a 72h retry window. Twilio: flaky status callbacks vs fully queryable message logs. Never copy-paste the Shopify pitch onto a provider whose failure mode differs — devs will call it out.

Candidate map (do NOT build ahead of pull): money — Paddle, Chargebee, Lemon Squeezy, PayPal, Square, WooCommerce, BigCommerce; auth — Clerk (poller ✓ built, dormant), Auth0; messaging — Resend (✓ built, dormant), Twilio, Mailgun, Postmark; partial — GitHub, HubSpot, Salesforce.

The demand-capture field on audit signup is in scope for Phase 0 (it's one form field). Acting on its results is not.

## Tech stack (unchanged)
Next.js 16 (App Router, Turbopack) + Hono ingestion · Supabase (Postgres/Auth) · Drizzle ORM · Inngest · Claude API for diagnosis · Upstash Redis fallback · Vercel · Stripe Payment Link (not Billing tiers) · pnpm · Tailwind v4 + F-design tokens · TypeScript strict · React 19.2

## Project structure deltas from v7.1
```
src/app/
├── page.tsx              # REWRITE: gap-audit landing, single CTA
├── (dashboard)/
│   ├── dashboard/        # simplify: audit status + gaps found + $ value
│   ├── reconciliation/   # now the PRIMARY surface
│   ├── events/ replay/ integrations/ alerts/ settings/   # keep, minimal
│   ├── audit/            # 🆕 audit progress + Gap Report viewer/share
│   ├── mcp/ billing/ flows/ scan/ security/ compliance/ analytics/  # DORMANT — do not extend
├── api/
│   ├── ingest/ inngest/  # keep
│   ├── report/           # 🆕 Gap Report generation + white-label render
src/lib/
├── audit/                # 🆕 audit-mode logic, gap classification, maturity windows
├── report/               # 🆕 report templating ($ aggregation, findings)
├── providers/shopify     # primary; stripe kept warm for Phase 2
├── tier/                 # FROZEN — do not extend
```

## Design system
F-design tokens stay. Simplification: **sky blue everywhere; orange exclusively for dollar amounts inside Gap Reports and gap tiles.** The conditional tier-based orange logic is frozen with the tier system. No orange on the landing page.

## Coding standards (unchanged where not superseded)
TypeScript strict, no `any` · Drizzle for all queries · server components by default · Zod validation · secrets in env / encrypted at rest · ingestion <50ms, defer to Inngest · never swallow errors · replay idempotent by `provider_event_id` · append-only audit log.

## Pitch discipline (for any copy, email, or report text Claude writes)
- Shopify pitch: "Shopify drops events — their own docs tell you to build reconciliation. We are that, as a service."
- Stripe pitch (Phase 2): "Stripe rarely drops — *your endpoint* fails silently and the 72-hour retry window expires." Never claim Stripe loses events; devs will call it out.
- Never lead with AI, MCP, buffering, or "platform." Lead with the gap and the dollars.
- Anchor price against DIY (2–3 weeks build + maintenance), never against Hookdeck's $39.
- Evidence quotes available for copy: Shopify docs ("delivery isn't always guaranteed"), Dec 2025 forum thread (~10% of orders/create missing for a week), 8-retries/4-hour drop policy, silent subscription auto-removal.

## When asked about progress
Default: *"Phase 0 — Gap Report generator + install flow + landing page. Gate: 5 real-store audits by week 3. Nothing else matters until then."*
