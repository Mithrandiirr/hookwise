import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { endpoints, integrations, securityScans } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { runSecurityScan } from "@/lib/security/scanner";
import { z } from "zod";

const scanRequestSchema = z.object({
  endpointId: z.string().uuid(),
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
  const parsed = scanRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validate ownership: endpoint → integration → user
  const [endpoint] = await db
    .select({ id: endpoints.id, integrationId: endpoints.integrationId })
    .from(endpoints)
    .where(eq(endpoints.id, parsed.data.endpointId))
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

  // Try Inngest for async scan, fall back to direct execution
  if (process.env.INNGEST_EVENT_KEY) {
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "security/scan-requested",
      data: { endpointId: parsed.data.endpointId },
    });
    return NextResponse.json({ status: "running", endpointId: parsed.data.endpointId });
  }

  // Direct execution (dev mode / no Inngest key)
  const result = await runSecurityScan(parsed.data.endpointId);
  return NextResponse.json({
    status: "completed",
    scanId: result.scanId,
    endpointId: parsed.data.endpointId,
    score: result.score,
    findingsCount: result.findings.length,
  });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's endpoints through integrations
  const userIntegrations = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.userId, user.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  if (integrationIds.length === 0) {
    return NextResponse.json([]);
  }

  const userEndpoints = await db
    .select({ id: endpoints.id })
    .from(endpoints)
    .where(inArray(endpoints.integrationId, integrationIds));

  const endpointIds = userEndpoints.map((e) => e.id);

  if (endpointIds.length === 0) {
    return NextResponse.json([]);
  }

  const scans = await db
    .select()
    .from(securityScans)
    .where(inArray(securityScans.endpointId, endpointIds))
    .orderBy(desc(securityScans.scannedAt))
    .limit(100);

  return NextResponse.json(scans);
}
