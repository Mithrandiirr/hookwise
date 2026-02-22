import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { alertConfigs, integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createAlertConfigSchema = z.object({
  integrationId: z.string().uuid(),
  channel: z.enum(["email", "slack"]),
  destination: z.string().min(1),
  threshold: z.number().min(1).max(4).nullable().default(null),
  enabled: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrationId = request.nextUrl.searchParams.get("integrationId");

  // Verify the user owns the integration
  if (integrationId) {
    const [integration] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.id, integrationId),
          eq(integrations.userId, user.id)
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const configs = await db
      .select()
      .from(alertConfigs)
      .where(eq(alertConfigs.integrationId, integrationId));

    return NextResponse.json(configs);
  }

  // Return all alert configs for user's integrations
  const userIntegrations = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.userId, user.id));

  if (userIntegrations.length === 0) {
    return NextResponse.json([]);
  }

  const allConfigs = [];
  for (const integration of userIntegrations) {
    const configs = await db
      .select()
      .from(alertConfigs)
      .where(eq(alertConfigs.integrationId, integration.id));
    allConfigs.push(...configs);
  }

  return NextResponse.json(allConfigs);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createAlertConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify ownership
  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, parsed.data.integrationId),
        eq(integrations.userId, user.id)
      )
    )
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const [created] = await db
    .insert(alertConfigs)
    .values({
      integrationId: parsed.data.integrationId,
      channel: parsed.data.channel,
      destination: parsed.data.destination,
      threshold: parsed.data.threshold,
      enabled: parsed.data.enabled,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configId = request.nextUrl.searchParams.get("id");
  if (!configId) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  // Verify ownership via integration
  const [config] = await db
    .select()
    .from(alertConfigs)
    .where(eq(alertConfigs.id, configId))
    .limit(1);

  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, config.integrationId),
        eq(integrations.userId, user.id)
      )
    )
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(alertConfigs).where(eq(alertConfigs.id, configId));

  return NextResponse.json({ deleted: true });
}
