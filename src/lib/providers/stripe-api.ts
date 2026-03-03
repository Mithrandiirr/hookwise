export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: Record<string, unknown>;
}

export async function fetchStripeEvents(
  apiKey: string,
  since: Date,
  until: Date
): Promise<StripeEvent[]> {
  const allEvents: StripeEvent[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params = new URLSearchParams({
      "created[gte]": String(Math.floor(since.getTime() / 1000)),
      "created[lte]": String(Math.floor(until.getTime() / 1000)),
      limit: "100",
    });
    if (startingAfter) {
      params.set("starting_after", startingAfter);
    }

    const response = await fetch(
      `https://api.stripe.com/v1/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[HookWise Reconciliation] Stripe API error ${response.status}:`,
        text
      );
      break;
    }

    const body = (await response.json()) as {
      data: StripeEvent[];
      has_more: boolean;
    };

    allEvents.push(...body.data);
    hasMore = body.has_more;

    if (body.data.length > 0) {
      startingAfter = body.data[body.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  return allEvents;
}

// --- Enrichment: Resource Fetchers ---

const STRIPE_EVENT_TYPE_TO_RESOURCE: Record<string, string> = {
  charge: "charges",
  customer: "customers",
  invoice: "invoices",
  payment_intent: "payment_intents",
  subscription: "subscriptions",
  product: "products",
  price: "prices",
  refund: "refunds",
  dispute: "disputes",
  payout: "payouts",
  setup_intent: "setup_intents",
  checkout: "checkout/sessions",
  coupon: "coupons",
  balance_transaction: "balance_transactions",
  transfer: "transfers",
  payment_method: "payment_methods",
  promotion_code: "promotion_codes",
  tax_rate: "tax_rates",
};

export function stripeEventTypeToResourcePath(eventType: string): string | null {
  // Stripe event types are like "charge.succeeded", "customer.subscription.created"
  // The resource is the first segment (or first two for nested resources)
  const parts = eventType.split(".");

  // Try two-part match first (e.g. "payment_intent", "setup_intent", "balance_transaction")
  if (parts.length >= 2) {
    const twoPartKey = `${parts[0]}.${parts[1]}`;
    // Check for "checkout.session" -> "checkout/sessions"
    if (twoPartKey === "checkout.session") {
      return "checkout/sessions";
    }
  }

  // Single-part match
  const resource = STRIPE_EVENT_TYPE_TO_RESOURCE[parts[0]];
  return resource ?? null;
}

export function extractStripeResourceInfo(
  eventType: string,
  payload: Record<string, unknown>
): { resourcePath: string; resourceId: string } | null {
  const resourcePath = stripeEventTypeToResourcePath(eventType);
  if (!resourcePath) return null;

  const data = payload.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;
  const resourceId = obj?.id as string | undefined;

  if (!resourceId) return null;

  return { resourcePath, resourceId };
}

export interface StripeResource {
  id: string;
  object: string;
  [key: string]: unknown;
}

export async function fetchStripeResource(
  apiKey: string,
  resourcePath: string,
  resourceId: string
): Promise<StripeResource | null> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/${resourcePath}/${resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `[HookWise Enrichment] Stripe resource fetch failed ${response.status}: ${resourcePath}/${resourceId}`
      );
      return null;
    }

    return (await response.json()) as StripeResource;
  } catch (error) {
    console.error(
      `[HookWise Enrichment] Stripe resource fetch error:`,
      error
    );
    return null;
  }
}
