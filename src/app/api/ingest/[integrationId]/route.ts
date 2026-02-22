import { NextRequest, NextResponse } from "next/server";
import { db, integrations, events } from "@/lib/db";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { verifyStripeSignature, extractStripeEventType, extractStripeEventId } from "@/lib/providers/stripe";
import { verifyShopifySignature, extractShopifyEventType, extractShopifyEventId } from "@/lib/providers/shopify";
import { verifyGitHubSignature, extractGitHubEventType, extractGitHubEventId } from "@/lib/providers/github";

export const runtime = "nodejs";
// Edge would be ideal for latency, but we need crypto (Node built-ins)

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function verifySignature(
  provider: string,
  payload: string,
  headers: Record<string, string>,
  secret: string
): { valid: boolean; eventType: string; providerEventId: string | null } {
  switch (provider) {
    case "stripe": {
      const header = headers["stripe-signature"] ?? "";
      return {
        valid: verifyStripeSignature(payload, header, secret),
        eventType: extractStripeEventType(payload),
        providerEventId: extractStripeEventId(payload),
      };
    }
    case "shopify": {
      const header = headers["x-shopify-hmac-sha256"] ?? "";
      return {
        valid: verifyShopifySignature(payload, header, secret),
        eventType: extractShopifyEventType(headers),
        providerEventId: extractShopifyEventId(headers),
      };
    }
    case "github": {
      const header = headers["x-hub-signature-256"] ?? "";
      return {
        valid: verifyGitHubSignature(payload, header, secret),
        eventType: extractGitHubEventType(headers),
        providerEventId: extractGitHubEventId(headers),
      };
    }
    default:
      return { valid: false, eventType: "unknown", providerEventId: null };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;

  // Fetch integration (must exist and be active)
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (integration.status !== "active") {
    return NextResponse.json({ error: "Integration is not active" }, { status: 409 });
  }

  const payload = await request.text();
  const headerRecord = headersToRecord(request.headers);

  const { valid, eventType, providerEventId } = verifySignature(
    integration.provider,
    payload,
    headerRecord,
    integration.signingSecret
  );

  // Parse payload as JSON (store raw if not JSON)
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    parsedPayload = { raw: payload };
  }

  // Store event
  const [newEvent] = await db
    .insert(events)
    .values({
      integrationId,
      eventType,
      payload: parsedPayload as Record<string, unknown>,
      headers: headerRecord,
      signatureValid: valid,
      providerEventId,
    })
    .returning({ id: events.id });

  // Emit Inngest event async — do NOT await, we need <50ms response
  inngest
    .send({
      name: "webhook/received",
      data: {
        eventId: newEvent.id,
        integrationId,
        destinationUrl: integration.destinationUrl,
      },
    })
    .catch((err: unknown) => {
      console.error("[ingest] Failed to emit inngest event", { eventId: newEvent.id, err });
    });

  return NextResponse.json({ received: true }, { status: 200 });
}
