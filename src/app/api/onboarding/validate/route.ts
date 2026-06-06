// Day 1 — server-side API key probe.
// Shopify: GET /admin/api/2024-01/shop.json → returns shop name on success.
// Stripe:  GET /v1/charges?limit=1 → 200 == valid live or test key.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["shopify", "stripe"]),
  apiKey: z.string().min(8),
  shopDomain: z.string().optional(),
});

const TIMEOUT_MS = 8_000;

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function normalizeShopDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmed) return null;
  // Reject anything that isn't *.myshopify.com — caller can paste a custom domain later if needed
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(trimmed)) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  const { provider, apiKey, shopDomain } = parsed.data;

  try {
    if (provider === "shopify") {
      const domain = normalizeShopDomain(shopDomain ?? "");
      if (!domain) {
        return NextResponse.json({
          ok: false,
          error: "Shop domain must look like your-store.myshopify.com",
        });
      }
      const res = await timedFetch(`https://${domain}/admin/api/2024-01/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": apiKey,
          "Accept": "application/json",
        },
      });
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ ok: false, error: "Shopify rejected this key (401/403). Check the token has read_orders + read_products scopes." });
      }
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Shopify returned ${res.status}.` });
      }
      const body = (await res.json()) as { shop?: { name?: string; domain?: string; myshopify_domain?: string } };
      const label = body.shop?.name ?? body.shop?.domain ?? domain;
      return NextResponse.json({ ok: true, label, shopDomain: domain });
    }

    if (provider === "stripe") {
      const res = await timedFetch("https://api.stripe.com/v1/charges?limit=1", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      });
      if (res.status === 401) {
        return NextResponse.json({ ok: false, error: "Stripe rejected this key (401). Use a restricted or secret key with read access to charges." });
      }
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Stripe returned ${res.status}.` });
      }
      // Stripe key prefixes: sk_live_, sk_test_, rk_live_, rk_test_
      const mode = apiKey.startsWith("sk_live_") || apiKey.startsWith("rk_live_") ? "live" : "test";
      return NextResponse.json({ ok: true, label: `Stripe account (${mode})`, mode });
    }

    return NextResponse.json({ ok: false, error: "Unsupported provider" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Provider didn't respond in 8s. Network blocked?"
      : "Unable to reach the provider. Try again.";
    return NextResponse.json({ ok: false, error: msg });
  }
}
