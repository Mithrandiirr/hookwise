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
        title="Health scanner"
        subtitle="diff your provider API against ingest log; surface the gap in dollars"
      />
      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        <ScannerClient integrations={userIntegrations} />
      </div>
    </>
  );
}
