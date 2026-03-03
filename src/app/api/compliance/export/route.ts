import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateComplianceExport } from "@/lib/compliance/export";
import { z } from "zod";

const exportSchema = z.object({
  format: z.enum(["json", "csv"]),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = exportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await generateComplianceExport({
    userId: user.id,
    format: parsed.data.format,
    periodStart: new Date(parsed.data.periodStart),
    periodEnd: new Date(parsed.data.periodEnd),
  });

  return NextResponse.json({
    exportId: result.exportId,
    format: result.format,
    entryCount: result.entryCount,
    data: result.data,
  });
}
