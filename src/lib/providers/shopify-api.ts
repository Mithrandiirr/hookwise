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
