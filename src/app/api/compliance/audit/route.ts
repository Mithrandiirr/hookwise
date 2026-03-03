import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, type SQL } from "drizzle-orm";
import type { AuditAction } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const integrationId = searchParams.get("integrationId");
  const action = searchParams.get("action") as AuditAction | null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const conditions: SQL[] = [eq(auditLog.userId, user.id)];

  if (integrationId) {
    conditions.push(eq(auditLog.integrationId, integrationId));
  }
  if (action) {
    conditions.push(eq(auditLog.action, action));
  }
  if (from) {
    conditions.push(gte(auditLog.createdAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(auditLog.createdAt, new Date(to)));
  }

  const entries = await db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(entries);
}
