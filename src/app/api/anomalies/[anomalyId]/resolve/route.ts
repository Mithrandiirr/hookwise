import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { anomalies, integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ anomalyId: string }> }
) {
  const { anomalyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch anomaly and verify ownership
  const [anomaly] = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.id, anomalyId))
    .limit(1);

  if (!anomaly) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, anomaly.integrationId),
        eq(integrations.userId, user.id)
      )
    )
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(anomalies)
    .set({ resolvedAt: new Date() })
    .where(eq(anomalies.id, anomalyId));

  return NextResponse.json({ resolved: true });
}
