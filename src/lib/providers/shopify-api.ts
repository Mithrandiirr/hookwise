export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export async function fetchShopifyOrders(
  shopDomain: string,
  apiKey: string,
  since: Date
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let pageUrl: string | null =
    `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${since.toISOString()}&limit=250`;

  while (pageUrl) {
    const res: Response = await fetch(pageUrl, {
      headers: {
        "X-Shopify-Access-Token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[HookWise Reconciliation] Shopify API error ${res.status}:`,
        text
      );
      break;
    }

    const body = (await res.json()) as { orders: ShopifyOrder[] };
    allOrders.push(...body.orders);

    // Handle pagination via Link header
    const linkHeader: string | null = res.headers.get("link");
    const nextMatch: RegExpMatchArray | null | undefined = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1] : null;
  }

  return allOrders;
}

// --- Enrichment: Resource Fetchers ---

const SHOPIFY_TOPIC_TO_RESOURCE: Record<string, string> = {
  orders: "orders",
  products: "products",
  customers: "customers",
  collections: "collections",
  checkouts: "checkouts",
  inventory_items: "inventory_items",
  inventory_levels: "inventory_levels",
  fulfillments: "fulfillments",
  refunds: "refunds",
  draft_orders: "draft_orders",
  carts: "carts",
  themes: "themes",
  shop: "shop",
};

export function shopifyTopicToResourcePath(topic: string): string | null {
  // Shopify topics are like "orders/create", "products/update"
  const resourceKey = topic.split("/")[0];
  return SHOPIFY_TOPIC_TO_RESOURCE[resourceKey] ?? null;
}

export function extractShopifyResourceInfo(
  topic: string,
  payload: Record<string, unknown>
): { resourcePath: string; resourceId: string } | null {
  const resourcePath = shopifyTopicToResourcePath(topic);
  if (!resourcePath) return null;

  const resourceId = payload.id as string | number | undefined;
  if (!resourceId) return null;

  return { resourcePath, resourceId: String(resourceId) };
}

export interface ShopifyResource {
  id: number | string;
  [key: string]: unknown;
}

export async function fetchShopifyResource(
  shopDomain: string,
  apiKey: string,
  resourcePath: string,
  resourceId: string
): Promise<ShopifyResource | null> {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-01/${resourcePath}/${resourceId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        `[HookWise Enrichment] Shopify resource fetch failed ${response.status}: ${resourcePath}/${resourceId}`
      );
      return null;
    }

    const body = (await response.json()) as Record<string, unknown>;
    // Shopify wraps responses in a singular key, e.g. { "order": {...} }
    // Convert plural resource path to singular key
    const singularKey = resourcePath.replace(/s$/, "").replace(/ie$/, "y");
    const resource = (body[singularKey] ?? Object.values(body)[0]) as ShopifyResource | undefined;
    return resource ?? null;
  } catch (error) {
    console.error(
      `[HookWise Enrichment] Shopify resource fetch error:`,
      error
    );
    return null;
  }
}

export function extractShopifyDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".myshopify.com")) {
      return parsed.hostname;
    }
    return null;
  } catch {
    return null;
  }
}
