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
      created: JSON.stringify({
        gte: Math.floor(since.getTime() / 1000),
        lte: Math.floor(until.getTime() / 1000),
      }),
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
