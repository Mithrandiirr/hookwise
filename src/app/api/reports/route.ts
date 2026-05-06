import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { intelligenceReports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await db
    .select()
    .from(intelligenceReports)
    .where(eq(intelligenceReports.userId, user.id))
    .orderBy(desc(intelligenceReports.createdAt))
    .limit(20);

  return NextResponse.json(reports);
}
