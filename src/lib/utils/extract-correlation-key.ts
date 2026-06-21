import type { Provider } from "@/types";

export function extractCorrelationKey(
  provider: Provider,
  payload: Record<string, unknown>
): string | null {
  switch (provider) {
    case "shopify":
      return extractShopifyCorrelationKey(payload);
    default:
      return null;
  }
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
