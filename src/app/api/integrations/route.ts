import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum(["stripe", "shopify", "github"]),
  signingSecret: z.string().min(1),
  destinationUrl: z.string().min(1),
  destinationType: z.enum(["http", "sqs", "kafka", "pubsub"]).default("http"),
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

  const { name, provider, signingSecret, destinationUrl, destinationType } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [integration] = await tx
      .insert(integrations)
      .values({
        userId: user.id,
        name,
        provider,
        signingSecret,
        destinationUrl,
        destinationType,
        status: "active",
      })
      .returning();

    await tx.insert(endpoints).values({
      integrationId: integration.id,
      url: destinationUrl,
      circuitState: "closed",
      successRate: 100,
      avgResponseMs: 0,
      consecutiveFailures: 0,
      consecutiveHealthChecks: 0,
      consecutiveSuccesses: 0,
    });

    return integration;
  });

  // Audit log: integration created (fire-and-forget)
  import("@/lib/compliance/audit").then(({ logAuditEvent }) =>
    logAuditEvent({
      userId: user.id,
      integrationId: result.id,
      action: "integration.created",
      details: { name, provider, destinationUrl },
    })
  ).catch(() => {});

  return NextResponse.json(result, { status: 201 });
}
