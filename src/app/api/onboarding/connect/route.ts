// Day 1 — onboarding completion endpoint.
// Re-validates the key server-side (don't trust the wizard's earlier validate response),
// creates the integration in a "connecting" state with sentinel signing-secret/destination
// (real webhook config is a Day-after-onboarding step), then fires onboarding/backfill
// so reconciliation back-polls the provider for 30d of history.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { createAudit } from "@/lib/audit";

const schema = z.object({
  provider: z.enum(["shopify", "stripe"]),
  apiKey: z.string().min(8),
  shopDomain: z.string().optional(),
  label: z.string().min(1).max(80).optional(),
  // Demand capture: "Which other provider do you want this for?"
  desiredProvider: z.string().trim().min(1).max(80).optional(),
});

// Sentinels — the customer hasn't pointed webhooks at HookWise yet, but the row needs
// non-null values for the columns. UX surfaces a "wire your webhook" prompt post-onboarding.
const PENDING_SIGNING_SECRET = "PENDING_SETUP";
const PENDING_DESTINATION_URL = "https://pending.hookwise.invalid/webhook";

const BACKFILL_WINDOW_DAYS = 30;
const BACKFILL_MAX_EVENTS = 5_000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { provider, apiKey, shopDomain, label, desiredProvider } = parsed.data;

  if (provider === "shopify" && !shopDomain) {
    return NextResponse.json({ error: "shopDomain required for shopify" }, { status: 400 });
  }

  // Re-validate server-side. Cheap, keeps the wizard's earlier client-driven probe honest.
  const validateUrl = new URL("/api/onboarding/validate", request.url);
  const validateRes = await fetch(validateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth cookies so /validate sees the same session.
      Cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ provider, apiKey, shopDomain }),
  });
  const validateBody = (await validateRes.json()) as { ok?: boolean; error?: string; label?: string };
  if (!validateBody.ok) {
    return NextResponse.json({ error: validateBody.error ?? "Validation failed" }, { status: 400 });
  }

  const resolvedLabel = label?.trim() || validateBody.label || `${provider} integration`;

  const result = await db.transaction(async (tx) => {
    const [integration] = await tx
      .insert(integrations)
      .values({
        userId: user.id,
        name: resolvedLabel,
        provider,
        signingSecret: PENDING_SIGNING_SECRET,
        destinationUrl: PENDING_DESTINATION_URL,
        destinationType: "http",
        status: "active",
        // v8: new connections start as a record-only 7-day audit. Delivery to the
        // customer endpoint begins only when they upgrade to monitoring.
        mode: "audit",
        apiKeyEncrypted: apiKey,
        providerDomain: shopDomain ?? null,
      })
      .returning();

    await tx.insert(endpoints).values({
      integrationId: integration.id,
      url: PENDING_DESTINATION_URL,
      circuitState: "closed",
      successRate: 100,
      avgResponseMs: 0,
      consecutiveFailures: 0,
      consecutiveHealthChecks: 0,
      consecutiveSuccesses: 0,
    });

    return integration;
  });

  // Start the 7-day Gap Audit window immediately.
  await createAudit({ integrationId: result.id, desiredProvider });

  // Mirror demand capture to the waitlist so provider requests live in one place.
  if (desiredProvider && user.email) {
    await db
      .insert(waitlist)
      .values({ email: user.email, desiredProvider })
      .onConflictDoUpdate({
        target: waitlist.email,
        set: { desiredProvider },
      })
      .catch(() => {});
  }

  // Fire-and-forget audit log
  import("@/lib/compliance/audit").then(({ logAuditEvent }) =>
    logAuditEvent({
      userId: user.id,
      integrationId: result.id,
      action: "integration.created",
      details: { name: resolvedLabel, provider, source: "onboarding" },
    })
  ).catch(() => {});

  // Kick off the backwards-poll. Day 1 just emits — Day 2 implements the dedicated handler.
  await inngest.send({
    name: "onboarding/backfill",
    data: {
      integrationId: result.id,
      windowDays: BACKFILL_WINDOW_DAYS,
      maxEvents: BACKFILL_MAX_EVENTS,
    },
  });

  return NextResponse.json({ integrationId: result.id }, { status: 201 });
}
