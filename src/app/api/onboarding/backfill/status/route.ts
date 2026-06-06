// Day 2 — status endpoint for the live progress bar on /dashboard/loading.
// Polled every 2s by the loading page. Auth-gated; only returns runs that belong to
// integrations owned by the calling user.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, backfillRuns } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrationId = request.nextUrl.searchParams.get("integrationId");
  if (!integrationId) {
    return NextResponse.json({ error: "integrationId required" }, { status: 400 });
  }

  // Confirm caller owns the integration before exposing run state.
  const [integration] = await db
    .select({ id: integrations.id, provider: integrations.provider })
    .from(integrations)
    .where(and(eq(integrations.id, integrationId), eq(integrations.userId, user.id)));

  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Most-recent run for this integration.
  let run: typeof backfillRuns.$inferSelect | undefined;
  try {
    [run] = await db
      .select()
      .from(backfillRuns)
      .where(eq(backfillRuns.integrationId, integrationId))
      .orderBy(desc(backfillRuns.startedAt))
      .limit(1);
  } catch (err) {
    console.warn("[backfill/status] table missing — migration not applied:", err);
    return NextResponse.json({
      status: "failed",
      scanned: 0,
      total: 0,
      provider: integration.provider,
      error: "Backfill table not yet created. Run `pnpm db:migrate` and retry.",
    });
  }

  if (!run) {
    // Event was just queued; the function hasn't created the run row yet.
    return NextResponse.json({
      status: "pending",
      scanned: 0,
      total: 0,
      provider: integration.provider,
    });
  }

  return NextResponse.json({
    status: run.status,
    scanned: run.scanned,
    total: run.totalEstimate,
    summary: run.summary ?? null,
    error: run.error,
    provider: integration.provider,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  });
}
