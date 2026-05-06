import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  destinationUrl: z.string().min(1).optional(),
  status: z.enum(["active", "paused", "error"]).optional(),
  signingSecret: z.string().min(1).optional(),
  apiKeyEncrypted: z.string().optional(),
  idempotencyEnabled: z.boolean().optional(),
  sequencerEnabled: z.boolean().optional(),
  enrichmentEnabled: z.boolean().optional(),
  providerDomain: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, user.id))
    )
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(integration);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [existing] = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, user.id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = updateIntegrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };

  // Remove undefined values
  for (const key of Object.keys(updates)) {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  }

  const [updated] = await db
    .update(integrations)
    .set(updates)
    .where(eq(integrations.id, integrationId))
    .returning();

  // If destination URL changed, update endpoint too
  if (parsed.data.destinationUrl) {
    await db
      .update(endpoints)
      .set({ url: parsed.data.destinationUrl })
      .where(eq(endpoints.integrationId, integrationId));
  }

  // Audit log
  import("@/lib/compliance/audit")
    .then(({ logAuditEvent }) =>
      logAuditEvent({
        userId: user.id,
        integrationId,
        action: "integration.updated",
        details: parsed.data,
      })
    )
    .catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [existing] = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, user.id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete endpoint first (foreign key), then integration
  await db
    .delete(endpoints)
    .where(eq(endpoints.integrationId, integrationId));

  await db.delete(integrations).where(eq(integrations.id, integrationId));

  // Audit log
  import("@/lib/compliance/audit")
    .then(({ logAuditEvent }) =>
      logAuditEvent({
        userId: user.id,
        integrationId,
        action: "integration.deleted",
        details: { name: existing.name, provider: existing.provider },
      })
    )
    .catch(() => {});

  return NextResponse.json({ success: true });
}
