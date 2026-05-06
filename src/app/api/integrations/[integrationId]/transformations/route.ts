import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, transformations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createTransformationSchema = z.object({
  eventType: z.string().min(1),
  rules: z.array(
    z.object({
      action: z.enum(["rename_field", "remove_field", "add_field", "map_value"]),
      field: z.string().min(1),
      value: z.unknown().optional(),
      mapping: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  enabled: z.boolean().default(true),
});

const updateTransformationSchema = z.object({
  rules: z
    .array(
      z.object({
        action: z.enum(["rename_field", "remove_field", "add_field", "map_value"]),
        field: z.string().min(1),
        value: z.unknown().optional(),
        mapping: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
  enabled: z.boolean().optional(),
});

async function verifyOwnership(integrationId: string, userId: string) {
  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, userId))
    )
    .limit(1);
  return !!integration;
}

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

  if (!(await verifyOwnership(integrationId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await db
    .select()
    .from(transformations)
    .where(eq(transformations.integrationId, integrationId));

  return NextResponse.json(result);
}

export async function POST(
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

  if (!(await verifyOwnership(integrationId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = createTransformationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(transformations)
    .values({
      integrationId,
      eventType: parsed.data.eventType,
      rules: parsed.data.rules,
      enabled: parsed.data.enabled,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifyOwnership(integrationId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = updateTransformationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.rules !== undefined) updates.rules = parsed.data.rules;
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;

  const [updated] = await db
    .update(transformations)
    .set(updates)
    .where(
      and(
        eq(transformations.id, id),
        eq(transformations.integrationId, integrationId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifyOwnership(integrationId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(transformations)
    .where(
      and(
        eq(transformations.id, id),
        eq(transformations.integrationId, integrationId)
      )
    );

  return NextResponse.json({ success: true });
}
