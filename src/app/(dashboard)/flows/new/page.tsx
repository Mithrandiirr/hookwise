export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-4 fade-up">
        <Link
          href="/flows"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/[0.1] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">
            Create Flow
          </h1>
          <p className="text-white/30 text-[13px] mt-0.5">
            Define a multi-step event chain to track
          </p>
        </div>
      </div>

      <CreateFlowForm integrations={userIntegrations} />
    </div>
  );
}
