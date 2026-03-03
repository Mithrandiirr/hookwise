import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { securityScans, securityFindings, endpoints, integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scanId } = await params;

  const [scan] = await db
    .select()
    .from(securityScans)
    .where(eq(securityScans.id, scanId))
    .limit(1);

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Validate ownership
  const [endpoint] = await db
    .select({ integrationId: endpoints.integrationId })
    .from(endpoints)
    .where(eq(endpoints.id, scan.endpointId))
    .limit(1);

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const [integration] = await db
    .select({ userId: integrations.userId })
    .from(integrations)
    .where(eq(integrations.id, endpoint.integrationId))
    .limit(1);

  if (!integration || integration.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const findings = await db
    .select()
    .from(securityFindings)
    .where(eq(securityFindings.scanId, scanId));

  return NextResponse.json({ ...scan, findings });
}
