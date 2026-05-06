import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [integrationCount] = await db
    .select({ count: count() })
    .from(integrations)
    .where(eq(integrations.userId, user.id));

  return NextResponse.json({
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    integrationCount: integrationCount.count,
  });
}
