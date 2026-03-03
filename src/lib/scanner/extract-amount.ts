/**
 * Extracts dollar amount (in cents) from a provider event payload.
 * Returns 0 when the event doesn't carry monetary data.
 */
export function extractAmountCents(
  provider: "stripe" | "shopify" | "github",
  eventType: string,
  data: Record<string, unknown>
): number {
  if (provider === "stripe") {
    return extractStripeAmount(eventType, data);
  }
  if (provider === "shopify") {
    return extractShopifyAmount(eventType, data);
  }
  return 0;
}

function extractStripeAmount(
  eventType: string,
  data: Record<string, unknown>
): number {
  const obj = (data.object ?? data) as Record<string, unknown>;

  // payment_intent.*, charge.*
  if (eventType.startsWith("payment_intent.") || eventType.startsWith("charge.")) {
    return toInt(obj.amount);
  }

  // invoice.*
  if (eventType.startsWith("invoice.")) {
    return toInt(obj.amount_due) || toInt(obj.total);
  }

  // checkout.session.*
  if (eventType.startsWith("checkout.session.")) {
    return toInt(obj.amount_total);
  }

  // customer.subscription.*
  if (eventType.startsWith("customer.subscription.")) {
    const items = obj.items as { data?: Array<{ plan?: { amount?: unknown } }> } | undefined;
    if (items?.data?.length) {
      return items.data.reduce(
        (sum, item) => sum + toInt(item.plan?.amount),
        0
      );
    }
  }

  // Fallback: look for common amount fields
  return toInt(obj.amount) || toInt(obj.amount_total) || toInt(obj.total) || 0;
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

function toInt(value: unknown): number {
  if (typeof value === "number") return Math.round(value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function dollarsToCents(value: unknown): number {
  if (typeof value === "number") return Math.round(value * 100);
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : Math.round(n * 100);
  }
  return 0;
}
