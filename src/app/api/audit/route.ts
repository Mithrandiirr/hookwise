// Starts a 7-Day Gap Audit on the caller's integration. Idempotent: returns the
// running audit if one already exists.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createAudit, getActiveAudit } from "@/lib/audit";

const schema = z.object({
  integrationId: z.string().uuid().optional(),
  brandName: z.string().trim().min(1).max(80).optional(),
  desiredProvider: z.string().trim().max(80).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { integrationId, brandName, desiredProvider } = parsed.data;

  const owned = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user.id))
    .orderBy(desc(integrations.createdAt));

  const integration = integrationId
    ? owned.find((i) => i.id === integrationId)
    : owned[0];
  if (!integration) {
    return NextResponse.json(
      { error: "Connect a store first" },
      { status: 404 }
    );
  }

  const existing = await getActiveAudit(integration.id);
  if (existing) {
    return NextResponse.json({ auditId: existing.id, status: existing.status });
  }

  const audit = await createAudit({
    integrationId: integration.id,
    brandName,
    desiredProvider,
  });

  return NextResponse.json({ auditId: audit.id, status: audit.status }, { status: 201 });
}
