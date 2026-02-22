import type { Provider } from "@/types";

export function extractCorrelationKey(
  provider: Provider,
  payload: Record<string, unknown>
): string | null {
  switch (provider) {
    case "stripe":
      return extractStripeCorrelationKey(payload);
    case "shopify":
      return extractShopifyCorrelationKey(payload);
    case "github":
      return extractGitHubCorrelationKey(payload);
    default:
      return null;
  }
}

function extractStripeCorrelationKey(payload: Record<string, unknown>): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;
  if (!obj) return null;

  if (typeof obj.customer === "string") return `stripe:customer:${obj.customer}`;
  if (typeof obj.id === "string") return `stripe:object:${obj.id}`;
  return null;
}

function extractShopifyCorrelationKey(payload: Record<string, unknown>): string | null {
  if (typeof payload.order_id === "number" || typeof payload.order_id === "string") {
    return `shopify:order:${payload.order_id}`;
  }
  if (typeof payload.id === "number" || typeof payload.id === "string") {
    return `shopify:resource:${payload.id}`;
  }
  return null;
}

function extractGitHubCorrelationKey(payload: Record<string, unknown>): string | null {
  const repo = payload.repository as Record<string, unknown> | undefined;
  if (repo && typeof repo.full_name === "string") {
    return `github:repo:${repo.full_name}`;
  }
  return null;
}
