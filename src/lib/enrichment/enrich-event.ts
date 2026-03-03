import {
  extractStripeResourceInfo,
  fetchStripeResource,
} from "@/lib/providers/stripe-api";
import {
  extractShopifyResourceInfo,
  fetchShopifyResource,
  extractShopifyDomain,
} from "@/lib/providers/shopify-api";

// Use Pick to only require the fields we actually use — avoids Date vs string
// serialization issues from Inngest step.run
interface EnrichableIntegration {
  provider: string;
  apiKeyEncrypted: string | null;
  destinationUrl: string;
}

interface EnrichableEvent {
  eventType: string;
  payload: unknown;
  headers: unknown;
}

export interface EnrichmentResult {
  success: boolean;
  enrichedPayload: Record<string, unknown> | null;
  resourceType: string | null;
  resourceId: string | null;
  fetchTimeMs: number;
  error: string | null;
}

const EMPTY_RESULT: EnrichmentResult = {
  success: false,
  enrichedPayload: null,
  resourceType: null,
  resourceId: null,
  fetchTimeMs: 0,
  error: null,
};

export async function enrichEvent(
  integration: EnrichableIntegration,
  webhookEvent: EnrichableEvent
): Promise<EnrichmentResult> {
  if (!integration.apiKeyEncrypted) {
    return { ...EMPTY_RESULT, error: "No API key configured" };
  }

  const apiKey = integration.apiKeyEncrypted;
  const payload = webhookEvent.payload as Record<string, unknown>;
  const headers = webhookEvent.headers as Record<string, string>;

  if (integration.provider === "stripe") {
    return enrichStripeEvent(apiKey, webhookEvent.eventType, payload);
  }

  if (integration.provider === "shopify") {
    const shopDomain =
      headers["x-shopify-shop-domain"] ??
      extractShopifyDomain(integration.destinationUrl);

    if (!shopDomain) {
      return { ...EMPTY_RESULT, error: "Could not determine Shopify shop domain" };
    }

    return enrichShopifyEvent(apiKey, shopDomain, webhookEvent.eventType, payload);
  }

  return { ...EMPTY_RESULT, error: `Enrichment not supported for provider: ${integration.provider}` };
}

async function enrichStripeEvent(
  apiKey: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<EnrichmentResult> {
  const resourceInfo = extractStripeResourceInfo(eventType, payload);
  if (!resourceInfo) {
    return { ...EMPTY_RESULT, error: `Cannot extract resource info from event type: ${eventType}` };
  }

  const start = Date.now();
  const freshResource = await fetchStripeResource(
    apiKey,
    resourceInfo.resourcePath,
    resourceInfo.resourceId
  );
  const fetchTimeMs = Date.now() - start;

  if (!freshResource) {
    return {
      ...EMPTY_RESULT,
      resourceType: resourceInfo.resourcePath,
      resourceId: resourceInfo.resourceId,
      fetchTimeMs,
      error: "Failed to fetch resource from Stripe API",
    };
  }

  // Merge: replace data.object with fresh resource, preserve event envelope
  const enrichedPayload: Record<string, unknown> = {
    ...payload,
    data: {
      ...(payload.data as Record<string, unknown>),
      object: freshResource,
    },
    _hookwise_enriched: true,
    _hookwise_enriched_at: new Date().toISOString(),
  };

  return {
    success: true,
    enrichedPayload,
    resourceType: resourceInfo.resourcePath,
    resourceId: resourceInfo.resourceId,
    fetchTimeMs,
    error: null,
  };
}

async function enrichShopifyEvent(
  apiKey: string,
  shopDomain: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<EnrichmentResult> {
  const resourceInfo = extractShopifyResourceInfo(eventType, payload);
  if (!resourceInfo) {
    return { ...EMPTY_RESULT, error: `Cannot extract resource info from topic: ${eventType}` };
  }

  const start = Date.now();
  const freshResource = await fetchShopifyResource(
    shopDomain,
    apiKey,
    resourceInfo.resourcePath,
    resourceInfo.resourceId
  );
  const fetchTimeMs = Date.now() - start;

  if (!freshResource) {
    return {
      ...EMPTY_RESULT,
      resourceType: resourceInfo.resourcePath,
      resourceId: resourceInfo.resourceId,
      fetchTimeMs,
      error: "Failed to fetch resource from Shopify API",
    };
  }

  // Replace payload with fresh resource + markers
  const enrichedPayload: Record<string, unknown> = {
    ...freshResource,
    _hookwise_enriched: true,
    _hookwise_enriched_at: new Date().toISOString(),
    _hookwise_original_topic: eventType,
  };

  return {
    success: true,
    enrichedPayload,
    resourceType: resourceInfo.resourcePath,
    resourceId: resourceInfo.resourceId,
    fetchTimeMs,
    error: null,
  };
}
