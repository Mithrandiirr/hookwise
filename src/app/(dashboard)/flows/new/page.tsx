export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DashTopbar } from "@/components/hw";
import { CreateFlowForm } from "./create-flow-form";

export default async function NewFlowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  return (
    <>
      <DashTopbar
        title={
          <span className="flex items-center" style={{ gap: 10 }}>
            <Link
              href="/flows"
              style={{
                color: "var(--hw-ink-4)",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Flows /
            </Link>
            <span>New</span>
          </span>
        }
        subtitle="define a multi-step event chain to track by correlation key"
      />
      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 16,
          overflow: "auto",
          flex: 1,
        }}
      >
        <div style={{ maxWidth: 820 }}>
          <CreateFlowForm integrations={userIntegrations} />
        </div>
      </div>
    </>
  );
}
