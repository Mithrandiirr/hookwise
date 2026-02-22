import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum(["stripe", "shopify", "github"]),
  signingSecret: z.string().min(1),
  destinationUrl: z.string().url(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user.id));

  return NextResponse.json(userIntegrations);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createIntegrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, provider, signingSecret, destinationUrl } = parsed.data;

  const [integration] = await db
    .insert(integrations)
    .values({
      userId: user.id,
      name,
      provider,
      signingSecret,
      destinationUrl,
      status: "active",
    })
    .returning();

  return NextResponse.json(integration, { status: 201 });
}
