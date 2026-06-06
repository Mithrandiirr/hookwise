# HookWise — Product Specification v7.1

## What HookWise is, in one sentence
A reliability and intelligence layer for webhooks: we catch what providers drop, diagnose what your endpoints break, and expose your event history as an MCP tool your agents can query and replay.

## What changed from v7.0
v7.0 mixed three different things — what the product is, who we sell to first, and how we frame value — into a single confused message. v7.1 separates them into three layers and treats them independently.

- **Product layer** — universal, provider-agnostic, three pillars
- **Wedge layer** — Shopify Plus agencies first, with a defined exit ramp
- **Brand layer** — universal reliability and agent-native event history, no money framing by default

Revenue framing is no longer the identity. It's a dashboard feature that activates for money-provider customers and a marketing campaign aimed at one specific segment. Both are real and both stay shipped — they just stop pretending to be the brand.

The "agentic commerce wave" framing from v7.0 (Stripe ACP, Shopify Winter '26 agentic storefronts) is removed. The MCP server is justified on its own merits: developers debug through agents in IDEs increasingly, and webhooks are one of the things they debug most.

---

## Layer 1 — The Product (universal)

### Brand statement
Webhook delivery is unreliable, debugging is manual, and your AI agents can't help. HookWise fixes all three.

This is true for Shopify agencies, true for devtools companies on GitHub, true for SaaS founders on Stripe, true for infrastructure products firing custom events. It does not shrink the TAM and it does not require revenue framing to land.

### The 3 Pillars

**1. Reliability — catch what providers drop, recover what endpoints fail**
Smart Buffer (Hono on Edge, sub-50ms ingestion). Idempotency dedup by `provider_event_id`. Smart Retry per error type. Three-state circuit breaker. Replay queue. Reconciliation Engine where the provider has a queryable Events API (the moat).

**2. Intelligence — diagnose with payload-aware reasoning, not log search**
On any anomaly, Claude is given seven structured inputs in parallel: event payload, endpoint response history, provider known-issues feed, customer's prior incidents, payload schema diff, correlated events from same `correlation_key`, and provider reliability score. Returns a root cause and remediation as structured JSON. Works for any provider whose payloads we can parse.

**3. Agent surface — your event history as MCP tools**
A hosted MCP endpoint at `mcp.hookwise.com`. Tools: `query_events`, `get_event`, `get_delivery_status`, `replay_event`, `diagnose_failure`, `list_failed_critical_events`, `reconcile_provider`, `get_endpoint_health`, `list_anomalies`, and (for money providers only) `list_revenue_at_risk`. Auth via the customer's HookWise API key. Per-tool RBAC. Audit log of every invocation.

### Per-provider capability matrix

This is the honest version of "we support all providers." Different capabilities apply to different providers based on what their APIs allow.

| Capability | Stripe | Shopify | Paddle / Chargebee / Lemon Squeezy | Clerk | GitHub | Resend | Linear / Sentry / generic |
|---|---|---|---|---|---|---|---|
| Smart Buffer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Idempotency | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Smart Retry | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Circuit Breaker | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Replay | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI Diagnosis | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MCP Server | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Reconciliation** | ✓ | ✓ | planned | ✓ | partial | ✓ | depends on API |
| **Revenue tiles** | ✓ | ✓ | ✓ | — | — | — | — |

Reconciliation is the moat. It works wherever the provider exposes a "list events since X" API. The five money providers in column 1 plus Clerk and Resend support it cleanly. GitHub partially. Generic providers depend on whether their API has the right shape.

Revenue tiles render in the dashboard only when at least one money provider is connected. For an org connected to GitHub + Clerk only, the dashboard shows reliability tiles (deliveries auto-recovered, incidents prevented, hours saved) instead. Same data, different framing.

### What we deliberately don't do
- We are not a webhook delivery gateway competing head-on with Hookdeck or Svix. They proxy and deliver; we sit on top via API keys. Use us alongside them or instead of them.
- We are not an APM. Datadog and Sentry have that market. We focus narrowly on the webhook pipeline.
- We do not lead with compliance certifications. Svix has SOC 2 Type II + HIPAA + PCI-DSS already; we don't. Compliance becomes a Business-tier feature once we ship SOC 2 Type I.

---

## Layer 2 — The Wedge (acquisition strategy with exit ramp)

### Why a wedge at all
At launch we do not have the bandwidth to acquire across every webhook-using segment. The wedge is the segment we attack first, where pain is most quantifiable and a channel exists. It is **acquisition strategy, not product identity.**

### The wedge: Shopify Plus agencies → Stripe-native SaaS → horizontal

**Phase 1 wedge — Shopify Plus agencies (first 50 paying customers).** One agency = 10–50 stores. Free Shopify health scanner produces a one-page report with revenue at risk per store. Agency shares with merchant. Pain is quantifiable in dollars. Cold email lands hard ("you lost $940 last month"). The Dec 2025 Shopify webhook incident gives a perfect opener. Reconciliation moat is sharpest here because Shopify officially recommends polling the Admin API.

**Phase 2 expansion — Stripe-native SaaS founders (paying customers 50–200).** Once Shopify reconciliation is bulletproof and the cold email plays at scale, expand to indie SaaS founders on Stripe. Same pain, same dollar framing, different channel (content marketing on dev.to, lobste.rs, r/saas, indiehackers).

**Phase 3 horizontal — any webhook source (paying customers 200+).** By this point AI Diagnosis and MCP server have enough event volume to be genuinely better than competitors. Brand-level marketing leans on universal reliability + agent-native, not commerce-specific. Customer base diversifies into devtools, infrastructure, internal-tooling.

### Each phase gets its own marketing campaign

Different segments need different cold emails and different landing-page entry points. The brand homepage is universal; the campaigns are specific.

| Campaign | Target | Lead with | Channel |
|---|---|---|---|
| "Lost revenue on Shopify" | Shopify Plus agencies | Free scanner, dollars at risk | Cold email + agency partnerships |
| "Stripe webhooks that don't drop" | Indie SaaS founders | MRR recovery story | Content + community |
| "Debug webhooks from Cursor" | Devtools / Claude / Cursor users | MCP demo video | HN, Twitter, Cursor community |
| "GitHub webhooks worth trusting" | DevOps / CI-CD teams | Reliability + AI diagnosis | Content + DevOps newsletters |
| "We catch what your provider drops" | Infra / SRE leaders | Reconciliation + incident reduction | Conferences, SRE communities |

The first campaign is the Phase 1 wedge. The others get spun up in Phases 2 and 3. None of them define what HookWise is on the homepage.

### Exit ramp from the wedge
The wedge is over when:
- 50 paying customers have come from Shopify and the cold email has hit response saturation (typically 3–6 months)
- Shopify reconciliation has zero novel bugs reported for 30 days
- At least one piece of organic content ("we analyzed 10M Shopify webhooks") has driven inbound from outside the agency channel

At that point, marketing budget shifts from agency cold email to multi-segment content + community + paid search on broader webhook keywords.

---

## Layer 3 — The Brand (universal, neutral)

### Homepage positioning
Reliability and agent-native event history. No orange-by-default. No "$940 saved" hero. Revenue gets surfaced contextually for customers who have it.

### Hero copy (proposed)
> **Webhooks that don't drop. Debugging that doesn't take all day. An event history your agents can actually use.**
>
> HookWise sits on top of your webhooks — Stripe, Shopify, GitHub, Clerk, Resend, anything that fires HTTP events. We catch what providers miss, diagnose failures with payload-aware AI, and expose your event history as MCP tools your agents can query.

### Visual brand
- Sky blue is the default brand color, used for system, infrastructure, and intelligence surfaces.
- Warm orange is reserved for **money-bearing data only** — and only renders on the dashboard when a money provider is connected. It does not appear on the public homepage.
- Density matches Datadog/Linear: small fonts, tight scale, dense data surfaces. Cursor-inspired command center.

### Three brand pillars on the homepage
1. **Reliability** — Smart Buffer, Idempotency, Retry, Circuit Breaker, Reconciliation. Tagline: "Never lose an event."
2. **Intelligence** — AI Diagnosis with payload-aware reasoning. Tagline: "Know what broke and why."
3. **Agent-ready** — MCP server, agent-native API. Tagline: "Built for the way developers actually debug now."

Below the fold: per-provider capability matrix, customer logos (when available), and segment-specific entry points ("HookWise for Shopify," "HookWise for Stripe," "HookWise from Cursor") that lead to dedicated landing pages with appropriate framing for each.

### Dashboard adapts per integration

When a customer connects integrations, the dashboard renders conditionally:

- **Money provider connected** (Stripe / Shopify / Paddle / Chargebee / Lemon Squeezy)
  - Top tile: "Revenue protected this month: $47,320" (orange)
  - Recovery summary in dollars
  - Weekly email with dollar framing
- **Operational provider connected** (GitHub / Clerk / Resend / Linear / Sentry / generic)
  - Top tile: "Deliveries auto-recovered this month: 312" (sky blue)
  - Reliability summary in incidents prevented and hours saved
  - Weekly email with reliability framing
- **Both connected** (most realistic case for SaaS)
  - Both tiles render side-by-side, each labeled clearly
  - Weekly email shows both

This is not two products. It's one product with conditional UI based on what a customer is actually doing.

---

## Pricing — universal, with one optional money-provider variant

| | Free | Pro $79 | Business $299 |
|---|---|---|---|
| Events / month | 10K | 500K | 5M |
| Integrations | 1 | Unlimited | Unlimited |
| Retention | 7 days | 30 days | 1 year |
| Smart Buffer + Circuit Breaker + Idempotency | ✓ | ✓ | ✓ |
| Reconciliation Engine (where supported) | 1 provider | ✓ | ✓ |
| AI Diagnosis | 10/mo | Unlimited | Unlimited |
| MCP Server access | ✓ | ✓ | ✓ |
| Dashboard tiles (revenue or reliability) | ✓ | ✓ | ✓ |
| Anomaly detection + weekly report | — | ✓ | ✓ |
| Alerting (Slack / email / webhook) | — | ✓ | ✓ |
| Compliance audit trail + exports | — | — | ✓ |
| Security scanner | — | — | ✓ |
| Custom retention | — | — | ✓ |
| Team seats | 1 | 3 | Unlimited |
| Support | community | email | priority + Slack |

**Optional: Revenue-protected pricing for money-provider Business customers.** 1% of reconciled revenue, capped at $999/mo. Available only to orgs with a money provider connected. Sales conversation, not the default. This is genuinely defensible because Hookdeck and Svix bill on event volume — we can bill on outcomes for the customers where outcomes are dollar-measurable.

---

## Architecture (unchanged from v7.0, kept for reference)

### Layer 1 — Smart Buffer
Hono on Vercel Edge. Verify signature → store in Postgres → return 200 in <50ms. Redis fallback if DB unreachable. Provider always sees success.

### Layer 2 — Reliability
3-state circuit breaker (CLOSED / HALF-OPEN / OPEN) with sliding window of 20 deliveries. Smart retry per error type. Ordered replay grouped by correlation key.

### Layer 3 — Reconciliation (the moat, where supported)
Inngest cron polls each money provider's Events API every 5 minutes. Diffs against `events` table by `provider_event_id`. Gaps are auto-ingested into the same delivery pipeline with `source: 'reconciliation'`.

### Layer 4 — AI Diagnosis
On anomaly or repeated failure, Claude given seven parallel inputs. Returns root cause + remediation as structured JSON.

### Layer 5 — MCP Server
Hosted at `mcp.hookwise.com`. HTTP+SSE transport. Auth via customer API key. Per-tool RBAC. Append-only audit log.

### Resilience
- Primary: Postgres on ingestion
- Fallback 1: Redis buffer if Postgres down
- Fallback 2: Vercel KV / Axiom if both down
- Fallback 3: Reconciliation catches everything else (the moat is also the safety net)

---

## Roadmap

### Phase 0 — Sharpen (Weeks 1–2, NOW)
- Land v7.1 positioning on the homepage. Universal brand, no revenue-by-default, three pillars.
- Free Shopify health scanner live and shareable.
- Final HookWise vs rename decision (HookWatch collision flagged).

### Phase 1 — Launch (Weeks 3–8)
- MCP server live at `mcp.hookwise.com`.
- Stripe billing wired. Three-tier pricing.
- Multi-org / RBAC schema migration (before launch, not after — Shopify Plus agencies need it).
- Auth, dashboard with adaptive tiles, basic event explorer.
- Public launch on HN / Twitter / Cursor community. Lead with the universal pitch and the Cursor MCP demo. Run the Shopify Plus agency cold email separately.
- Target: 15 paying customers.

### Phase 2 — Wedge → Adjacent (Weeks 9–20)
- Shopify reconciliation bulletproof.
- Stripe reconciliation in beta.
- Paddle / Chargebee / Lemon Squeezy reconciliation in roadmap.
- Adaptive dashboard logic shipped per the per-provider matrix.
- Weekly email with framing-per-integration.
- Cold outreach to 200 Shopify Plus agencies + first content campaigns aimed at indie SaaS founders.
- Target: 50 paying customers, $5K MRR.

### Phase 3 — Horizontal expansion (Weeks 21–40)
- Expand MCP tool surface (custom tools per customer, scoped tokens).
- Reconciliation for Clerk, Resend; partial for GitHub.
- "We analyzed 50M webhooks across N providers" content piece — the SEO play.
- SOC 2 Type I in progress.
- Target: 200 paying customers, $20K MRR. Customer base starts to diversify outside commerce.

### Phase 4 — Scale (Weeks 41–80)
- SOC 2 Type II.
- Compliance Audit Trail + Security Scanner GA on Business tier.
- `hookwise dev` CLI for local development.
- Additional provider support driven by paying-customer demand.
- Target: 500 paying customers, $50K MRR. Customer base ~40% commerce / 40% other SaaS / 20% devtools/infra.

### Deferred (still in code, not on roadmap)
- Event Sequencer — bring back if 10+ customers ask.
- Public Provider Status Page — SEO surface, build only when content engine demands it.
- Native queue bridges (SQS / Kafka / Pub/Sub) beyond HTTP — only if a paying customer asks.

---

## Customer Stories — adapted per segment

### Money provider customer: Maya R., CTO at Thursday Bloom (Shopify + Stripe)
Sees revenue tiles. Cold email talked dollars. Cares about not losing orders. Maya's Cursor session at 23:15 asks "why was the second order slow?" and the agent walks the chain in one turn.

### Operational provider customer: Devin O., infra lead at a developer-tools SaaS (GitHub + Clerk + Resend)
Sees reliability tiles. Cold email talked incidents prevented. Cares about CI/CD reliability and auth event delivery. Devin's Cursor session asks "did the last GitHub deploy webhook fail?" — agent confirms it failed twice, recovered on retry 3, includes the exact diff that caused the endpoint timeout.

### Mixed customer: a fintech SaaS (Stripe + Linear + Slack + GitHub)
Sees both tiles. Two campaigns landed them — Stripe content brought them in, the MCP server demo got them to upgrade to Pro. They use HookWise for payment-event reliability *and* internal operational visibility.

The same product. Three customer experiences. None of them require us to lie about what HookWise is.

---

## Implementation Status (May 2026)

### Already shipped
- ✓ Smart Buffer, Circuit Breaker, Smart Retry, Replay, Idempotency
- ✓ Reconciliation Engine (Stripe + Shopify pollers via Inngest)
- ✓ AI Diagnosis (Claude API, parallel queries)
- ✓ Anomaly Detection, Flow Tracking, Pattern Learning
- ✓ Security Scanner, Compliance Audit Trail (Business tier)
- ✓ Alert configuration, Weekly report generation
- ✓ Provider implementations: Stripe, Shopify, Clerk, GitHub, Resend

### Phase 1 launch blockers
- ☐ MCP server at `mcp.hookwise.com`
- ☐ Stripe billing wiring + three-tier paid signup
- ☐ Public homepage reflecting v7.1 universal positioning
- ☐ Adaptive dashboard tiles (revenue vs reliability based on integrations)
- ☐ Free Shopify health scanner GA
- ☐ Onboarding: API key → first event in <5 min
- ☐ SLA + status page for HookWise itself
- ☐ DPA + privacy policy + GDPR baseline
- ☐ Multi-org / RBAC schema migration
- ☐ Docs site at `docs.hookwise.com`
- ☐ Node SDK (TypeScript-first)

---

## What success looks like

- **Month 6**: 50 paying customers, mostly Shopify-driven. The wedge worked. One viral content piece. MCP server has 100+ active integrations. Customer base starts to show non-Shopify entries from MCP demo.
- **Month 12**: $20K MRR. SOC 2 Type I. Customer base ~70% commerce / 30% other. Two distinct GTM campaigns running. Brand recognized as universal, not Shopify-specific.
- **Month 18**: $50K MRR. SOC 2 Type II. Customer base ~50/50 commerce vs other. Multiple campaigns in market. The "Datadog of webhooks" framing finally feels accurate, but we still don't say it on the homepage.
- **Month 24**: $100K+ MRR. Customer base diversified across commerce, devtools, infrastructure. HookWise is a horizontal webhook reliability platform with a known-good wedge story.

---

## The closing principle

**Product is universal. Wedge is specific. Brand is honest.**

The product works for any webhook source. The wedge is Shopify Plus agencies because that's where pain is most quantifiable and the channel exists, but the wedge is acquisition strategy with an exit ramp — not the product's identity. The brand is the universal value proposition (reliability + intelligence + agent surface), not the wedge's framing.

Revenue impact is a feature that activates for money-provider customers and a campaign aimed at one specific segment. Both stay shipped. Neither is the brand.

If a feature, page, or piece of copy doesn't make sense for *every* webhook customer, it goes in the conditional dashboard layer or the segment-specific marketing layer — never the brand layer.
