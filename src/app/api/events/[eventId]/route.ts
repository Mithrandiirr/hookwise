import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, events, deliveries, integrations, replayQueue } from "@/lib/db";
import { eq, and, inArray, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch event
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Verify ownership
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, event.integrationId),
        eq(integrations.userId, user.id)
      )
    )
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch deliveries for this event
  const eventDeliveries = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.eventId, eventId))
    .orderBy(desc(deliveries.attemptedAt));

  // Fetch replay queue status
  const replayItems = await db
    .select()
    .from(replayQueue)
    .where(eq(replayQueue.eventId, eventId));

  return NextResponse.json({
    event,
    integration: {
      id: integration.id,
      name: integration.name,
      provider: integration.provider,
    },
    deliveries: eventDeliveries,
    replayStatus: replayItems.length > 0 ? replayItems[0] : null,
  });
}
