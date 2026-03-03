export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ScannerClient } from "./scanner-client";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = user
    ? await db
        .select({
          id: integrations.id,
          name: integrations.name,
          provider: integrations.provider,
        })
        .from(integrations)
        .where(eq(integrations.userId, user.id))
    : [];

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">
          Health Scanner
        </h1>
        <p className="text-[var(--text-tertiary)] mt-1 text-[15px]">
          Scan your provider API to find missed webhooks and calculate dollar
          impact
        </p>
      </div>

      <ScannerClient integrations={userIntegrations} />
    </div>
  );
}
