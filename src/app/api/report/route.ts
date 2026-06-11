// Gap Report generation — builds (or refreshes) the report for the caller's audit and
// returns it with the public share URL.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { audits } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { completeIfExpired } from "@/lib/audit";
import { generateAndCacheReport } from "@/lib/report";

const schema = z.object({
  auditId: z.string().uuid().optional(),
  // White-label: agencies set the brand the shared report renders under.
  brandName: z.string().trim().min(1).max(80).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { auditId, brandName } = parsed.data;

  const owned = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user.id));
  if (owned.length === 0) {
    return NextResponse.json({ error: "No integration connected" }, { status: 404 });
  }
  const ownedIds = owned.map((i) => i.id);

  const auditRows = await db
    .select()
    .from(audits)
    .where(
      auditId
        ? and(eq(audits.id, auditId), inArray(audits.integrationId, ownedIds))
        : inArray(audits.integrationId, ownedIds)
    )
    .orderBy(desc(audits.startedAt))
    .limit(1);

  let audit = auditRows[0];
  if (!audit) {
    return NextResponse.json({ error: "No audit found" }, { status: 404 });
  }

  if (brandName !== undefined) {
    const [updated] = await db
      .update(audits)
      .set({ brandName })
      .where(eq(audits.id, audit.id))
      .returning();
    audit = updated ?? audit;
  }

  audit = await completeIfExpired(audit);
  const integration = owned.find((i) => i.id === audit.integrationId)!;
  const report = await generateAndCacheReport(audit, integration);

  return NextResponse.json({
    auditId: audit.id,
    status: audit.status,
    shareUrl: `${new URL(request.url).origin}/api/report/${audit.shareToken}`,
    report,
  });
}
