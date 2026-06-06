export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, events, integrations, deliveries } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { EventsStreamClient, type EventRow } from "./events-stream";
import { DashTopbar } from "@/components/hw";

const PAGE_SIZE = 120;

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  const rows =
    integrationIds.length > 0
      ? await db
          .select({
            id: events.id,
            integrationId: events.integrationId,
            type: events.eventType,
            receivedAt: events.receivedAt,
            providerEventId: events.providerEventId,
            source: events.source,
            amountCents: events.amountCents,
            deliveryStatus: deliveries.status,
            deliveryResponseMs: deliveries.responseTimeMs,
          })
          .from(events)
          .leftJoin(deliveries, eq(deliveries.eventId, events.id))
          .where(inArray(events.integrationId, integrationIds))
          .orderBy(desc(events.receivedAt))
          .limit(PAGE_SIZE)
      : [];

  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));

  const seen = new Set<string>();
  const normalized: EventRow[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const integ = integrationMap.get(r.integrationId);
    const provider = integ?.provider ?? "generic";
    const destination = integ?.name ?? "unknown";
    let status: EventRow["status"] = "ok";
    if (r.source === "reconciliation") status = "recon";
    else if (r.deliveryStatus === "failed") status = "fail";
    else if (r.deliveryStatus === "dead_letter") status = "fail";
    else if (r.deliveryStatus === "pending") status = "hold";
    else if (r.deliveryStatus === null) status = "hold";
    normalized.push({
      id: r.id,
      providerEventId: r.providerEventId ?? r.id.slice(0, 12),
      type: r.type,
      provider,
      destination,
      receivedAt: r.receivedAt.toISOString(),
      latencyMs: r.deliveryResponseMs ?? -1,
      amountCents: r.amountCents ?? null,
      status,
    });
  }

  return (
    <>
      <DashTopbar
        title="Live feed"
        subtitle="every webhook · every delivery · every retry"
      />
      <EventsStreamClient rows={normalized} />
    </>
  );
}
