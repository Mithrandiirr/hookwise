import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, sequencerRules } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createRuleSchema = z.object({
  eventOrder: z.array(z.string().min(1)).min(2),
  holdTimeoutMs: z.number().min(1000).max(300000).default(30000),
  enabled: z.boolean().default(true),
});

const updateRuleSchema = z.object({
  eventOrder: z.array(z.string().min(1)).min(2).optional(),
  holdTimeoutMs: z.number().min(1000).max(300000).optional(),
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

  const rules = await db
    .select()
    .from(sequencerRules)
    .where(eq(sequencerRules.integrationId, integrationId));

  return NextResponse.json(rules);
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
  const parsed = createRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(sequencerRules)
    .values({
      integrationId,
      eventOrder: parsed.data.eventOrder,
      holdTimeoutMs: parsed.data.holdTimeoutMs,
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
  const parsed = updateRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.eventOrder !== undefined) updates.eventOrder = parsed.data.eventOrder;
  if (parsed.data.holdTimeoutMs !== undefined) updates.holdTimeoutMs = parsed.data.holdTimeoutMs;
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;

  const [updated] = await db
    .update(sequencerRules)
    .set(updates)
    .where(
      and(
        eq(sequencerRules.id, id),
        eq(sequencerRules.integrationId, integrationId)
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
    .delete(sequencerRules)
    .where(
      and(
        eq(sequencerRules.id, id),
        eq(sequencerRules.integrationId, integrationId)
      )
    );

  return NextResponse.json({ success: true });
}
