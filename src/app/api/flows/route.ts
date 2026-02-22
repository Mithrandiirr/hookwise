import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { flows } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createFlowSchema = z.object({
  name: z.string().min(1).max(100),
  steps: z
    .array(
      z.object({
        integrationId: z.string().uuid(),
        eventType: z.string().min(1),
        correlationField: z.string().min(1),
      })
    )
    .min(2),
  timeoutMinutes: z.number().int().min(1).max(10080).default(60),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userFlows = await db
    .select()
    .from(flows)
    .where(eq(flows.userId, user.id))
    .orderBy(desc(flows.createdAt));

  return NextResponse.json(userFlows);
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
  const parsed = createFlowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(flows)
    .values({
      userId: user.id,
      name: parsed.data.name,
      steps: parsed.data.steps,
      timeoutMinutes: parsed.data.timeoutMinutes,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
