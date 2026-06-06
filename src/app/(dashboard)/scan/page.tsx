export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DashTopbar } from "@/components/hw";
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
    <>
      <DashTopbar
        title="Scanner"
        subtitle="diff your provider API against the ingest log · surface gaps in dollars"
      />
      <div
        style={{
          padding: "24px 32px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScannerClient integrations={userIntegrations} />
      </div>
    </>
  );
}
