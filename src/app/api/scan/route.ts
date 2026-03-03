import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { runScan } from "@/lib/scanner/scan";

const scanRequestSchema = z.object({
  provider: z.enum(["stripe", "shopify"]),
  apiKey: z.string().min(1, "API key is required"),
  shopDomain: z.string().optional(),
  integrationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { provider, apiKey, shopDomain, integrationId } = parsed.data;

  if (provider === "shopify" && !shopDomain) {
    return NextResponse.json(
      { error: "shopDomain is required for Shopify scans" },
      { status: 400 }
    );
  }

  try {
    const report = await runScan({
      provider,
      apiKey,
      shopDomain,
      integrationId,
    });
    return NextResponse.json(report);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Scan failed";

    // Handle common API key errors
    if (message.includes("401") || message.includes("Unauthorized") || message.includes("Invalid API Key")) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your credentials." },
        { status: 401 }
      );
    }

    console.error("[HookWise Scanner] Scan error:", err);
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}
