import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, events, integrations } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

const replaySchema = z.object({
  eventIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = replaySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { eventIds } = parsed.data;

  // Fetch events
  const eventsToReplay = await db
    .select()
    .from(events)
    .where(inArray(events.id, eventIds));

  if (eventsToReplay.length === 0) {
    return NextResponse.json({ error: "No events found" }, { status: 404 });
  }

  // Verify ownership of all events
  const integrationIds = [...new Set(eventsToReplay.map((e) => e.integrationId))];
  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(
      and(
        inArray(integrations.id, integrationIds),
        eq(integrations.userId, user.id)
      )
    );

  const ownedIntegrationIds = new Set(userIntegrations.map((i) => i.id));
  const integrationMap = Object.fromEntries(userIntegrations.map((i) => [i.id, i]));

  const authorizedEvents = eventsToReplay.filter((e) =>
    ownedIntegrationIds.has(e.integrationId)
  );

  if (authorizedEvents.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Emit webhook/received events for each
  const sends = authorizedEvents.map((evt) => ({
    name: "webhook/received" as const,
    data: {
      eventId: evt.id,
      integrationId: evt.integrationId,
      destinationUrl: integrationMap[evt.integrationId].destinationUrl,
    },
  }));

  await inngest.send(sends);

  return NextResponse.json({
    replayed: authorizedEvents.length,
    eventIds: authorizedEvents.map((e) => e.id),
  });
}
