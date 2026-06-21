/**
 * Extracts dollar amount (in cents) from a provider event payload.
 * Returns 0 when the event doesn't carry monetary data.
 */
export function extractAmountCents(
  provider: "shopify",
  eventType: string,
  data: Record<string, unknown>
): number {
  if (provider === "shopify") {
    return extractShopifyAmount(eventType, data);
  }
  return 0;
}

function extractShopifyAmount(
  eventType: string,
  data: Record<string, unknown>
): number {
  // Orders
  if (eventType.startsWith("orders/") || eventType === "order") {
    return dollarsToCents(data.total_price);
  }

  // Refunds
  if (eventType.startsWith("refunds/") || eventType === "refund") {
    const transactions = data.transactions as Array<{ amount?: unknown }> | undefined;
    if (transactions?.length) {
      return transactions.reduce(
        (sum, t) => sum + dollarsToCents(t.amount),
        0
      );
    }
  }

  return dollarsToCents(data.total_price) || 0;
}

function dollarsToCents(value: unknown): number {
  if (typeof value === "number") return Math.round(value * 100);
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : Math.round(n * 100);
  }
  return 0;
}
