// Public Gap Report render, addressed by unguessable share token. White-labelable —
// agencies forward this URL to merchants under their own brand.

import { NextRequest, NextResponse } from "next/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { completeIfExpired, getAuditByShareToken } from "@/lib/audit";
import { generateAndCacheReport, renderGapReportHtml } from "@/lib/report";
import type { GapReportData } from "@/lib/report";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let audit = await getAuditByShareToken(token);
  if (!audit) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, audit.integrationId))
    .limit(1);
  if (!integration) {
    return new NextResponse("Report not found", { status: 404 });
  }

  audit = await completeIfExpired(audit);
  const report = await generateAndCacheReport(audit, integration);

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json(report);
  }

  // ?brand= lets an agency preview a different label without persisting it.
  const brandOverride = url.searchParams.get("brand")?.trim();
  const rendered: GapReportData = brandOverride
    ? { ...report, brandName: brandOverride.slice(0, 80) }
    : report;

  return new NextResponse(renderGapReportHtml(rendered), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=60",
      "X-Robots-Tag": "noindex",
    },
  });
}
