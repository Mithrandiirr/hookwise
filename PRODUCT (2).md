# PRODUCT.md — v8 (rename pending)

## One sentence
We find the orders Shopify never told you about — and recover them.

## The rule this document obeys
Everything here is either **necessary** (required to get a stranger's store running an audit and paying) or **unprecedented** (nobody ships it as a standalone service). If a feature is neither, it is not in this document. It may exist in code; it does not exist in the product.

---

## The problem (evidence on file, June 2026)

Webhook delivery from providers is best-effort, and the failure is silent.

- Shopify's own docs: delivery "isn't always guaranteed" — apps are told to build reconciliation jobs themselves.
- Dec 2025 (Shopify dev forums): a 5-year-stable app lost ~10% of `orders/create` webhooks for a week. Dev dashboard logs didn't show it.
- Feb 2026: ~1,400 delivered orders in Admin vs ~400–500 `fulfillment_event/create` webhooks received.
- Apr 2026: open Shopify investigation into missing/delayed `products/create` for productSet-created products; `orders/paid` delays of 20+ min.
- Shopify drops events permanently after 8 retries / ~4 hours and silently auto-removes failing subscriptions.
- Stripe side: provider rarely drops, but endpoints fail silently — 16 retries over ~72h, then permanent loss. The "paid customer with no access → chargeback" failure is documented and recurring.

**Risk profile: low frequency, bursty, silent, correlated with high-stakes moments (flash sales, deploys, platform bugs).** Insurance economics. This is why we audit before we sell.

## Why nobody solves this (the unprecedented claim)

- **Proxies (Hookdeck, Svix, EventDock):** sit in the delivery path; can only protect events the provider actually sent. Provider-side loss is invisible to them. EventDock has dismissed polling as "a workaround" in writing.
- **Gadget:** runs nightly reconciliation syncs — but only for apps built entirely on their platform. Validates the need; doesn't serve anyone on their own stack. Nightly, not 5-minute.
- **Stripe first-party:** dashboard resend + 30-day Events API — reactive, assumes a human is watching.
- **Data-sync (Fivetran etc.):** completeness for warehouses, not operational event re-delivery.
- **DIY:** what the docs recommend. ~2–3 weeks to build, rarely built before an incident, rarely maintained after.

**No standalone, bring-your-own-stack, continuous webhook reconciliation service exists.** That is the entire product.

---

## The product

### Free wedge: 7-Day Gap Audit
1. Install: read-only Admin API key + an **additional** webhook subscription pointed at us (Shopify allows multiple per topic — zero risk, zero infra change, we are never in the critical path).
2. For 7 days: record what Shopify actually fires; poll the Admin API for what actually happened.
3. **Gap Report**: "Shopify created 4,312 orders. Webhooks fired for 4,297. Here are the 15 it never told you about — worth $2,840." Plus subscription-health findings (degraded/removed subscriptions, response-time risk, API-version fall-forward warnings).
4. White-labelable — agencies send it to merchants under their own brand.

The audit is simultaneously the lead magnet, the proof artifact, and the **validation instrument**: if audits across real stores consistently find zero gaps, the business thesis is falsified — cheaply, in weeks.

### Paid product: continuous Revenue Assurance — $29/store/month
- Poll every 5 minutes (✓ built — Inngest pollers, Stripe + Shopify)
- Gap detected → auto-ingest → deliver to customer endpoint with `source: reconciliation` header (✓ built)
- Idempotent by `provider_event_id` — safe alongside their existing webhooks (✓ built)
- Alert *before* Shopify auto-removes a degraded subscription
- Monthly "revenue assured" statement
- AI diagnosis on gaps and repeated failures (✓ built) — a feature inside the product, never a pillar
- Volume pricing ~$19/store at 10+ stores (agency motion; agencies re-bill merchants at margin)
- Billing: one Stripe Payment Link. No tiers, no portal, no metering until ~20 paying stores.

### Pricing anchor
Against the cost of DIY (2–3 weeks engineering + permanent maintenance, per the providers' own recommendation) — **not** against Hookdeck's $39/mo. Different category: delivery insurance vs delivery gateway. We work alongside Hookdeck/Svix; their customers are qualified leads.

### Provider sequence + expansion doctrine
1. **Shopify** (launch). Pitch: "Shopify drops events — their docs admit it."
2. **Stripe** (~6 weeks after first paying stores). Pitch shifts honestly: "Stripe rarely drops — *your endpoint* fails silently and the 72h retry window expires." Same engine, different villain.
3. **Everything after is demand-pulled, never roadmap-pushed.** The engine is provider-general (each provider = poller + diff key + maturity window + honest villain), and the addressable set is wide — money (Paddle, Chargebee, Lemon Squeezy, PayPal, Square, WooCommerce, BigCommerce), auth (Clerk — poller already built, dormant; Auth0), messaging (Resend — built, dormant; Twilio, Mailgun, Postmark), partial (GitHub, HubSpot, Salesforce). A provider gets built when (a) it has a queryable truth API, (b) a paying customer asks or the audit-signup demand field shows repeated requests, and (c) its real failure mode has been researched and honestly named. No truth API (generic/custom webhooks) = never; those customers belong to Hookdeck and we say so.

**Demand capture from day one:** the audit signup includes one optional field — "Which other provider do you want this for?" Free roadmap data at zero build cost. Collecting it is Phase 0 scope; acting on it is not.

---

## Go-to-market: one motion

**The Gap Report, via Shopify app developers and Plus agencies.**

- App devs feel the pain directly and live in the forums where missing-webhook threads are active *right now* — the Dec 2025 and Feb 2026 threads are warm public leads.
- Agencies: one install = 10–50 stores; the white-label report makes them look good to merchants.
- Content: exactly one piece, after data exists — "We audited N Shopify stores for 7 days: here's what Shopify never delivered." Primary data nobody else has; unanswerable by competitors writing listicles.

No other campaigns. No homepage brand architecture. One page, one CTA: **"Run a free 7-day gap audit on your store."**

## Plan with kill-gates

| Phase | Work | Gate (hard) |
|---|---|---|
| 0 — Weeks 1–3 | Rename + domain (one evening). Gap Report generator on existing pollers. Install flow. One-page site. 30 outreach touches. | **≥5 real-store audits running.** Below 5 → fix offer/channel before any more code. |
| 1 — Weeks 4–8 | Audit → paid conversion via Payment Link. The one content piece with real data. | **3 paying stores.** Zero → gaps don't exist or don't hurt; stop and reassess honestly. |
| 2 — Weeks 9–20 | White-label reports, volume pricing, light multi-store view. Stripe reconciliation beta. Minimal read-only MCP (demos well; not a moat). | **15 paying stores / ~$500 MRR** before anything horizontal. |
| 3 — Week 21+ | Re-evaluate expansion with paying-customer data, not specs. | — |

## Explicitly not the product (exists in code ≠ exists in product)
Smart Buffer, circuit breaker, smart retry, replay queue, anomaly detection, flow tracking, security scanner, compliance audit trail, MCP server, multi-provider tier system — all remain in the repo as supporting infrastructure or dormant surfaces. None appear on the landing page, in pricing, or in pitch copy. They re-enter the product only when a paying customer's need pulls them in.

## Honest risks
1. **Gap frequency unproven.** No published base rates exist. The audit measures it on real stores by week 3. Zero gaps across ~20 stores = thesis dead; publish the dataset and move on.
2. **Willingness to pay for silent, low-frequency risk.** Insurance is hard to sell. Mitigation: the report shows *their own* dollars, not a hypothetical.
3. **Copyable.** Hookdeck could build pollers in a quarter. Defenses: it contradicts their published positioning, requires a customer-API-key trust model proxies avoid, and our moat is accumulated gap-rate data + category language + agency relationships — which only accumulate while live. Speed is the strategy.
4. **Shopify could fix delivery or ship native reconciliation.** Same engine generalizes to Stripe/Clerk/Resend; provider risk diversifies with traction.
5. **Founder follow-through.** Named openly: planning has historically outpaced grind. The gates exist so the project self-terminates with data instead of drifting into v8.1.

## What success looks like
- **Week 3:** 5 audits live. The only metric that matters until it happens.
- **Week 8:** 3 strangers paying.
- **Month 5:** 15 stores, ~$500 MRR, the dataset post published.
- **Month 12:** if the wedge worked — agencies as channel, Stripe live, ~$3–5K MRR, and *then* we discuss platforms.

## Closing principle
**Sell the gap, not the gateway. Audit before pitch. Earn each layer.**
Every feature must answer one question: does this get the next paying store? If not, it waits.
