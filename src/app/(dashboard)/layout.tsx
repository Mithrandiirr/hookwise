export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashSidebar } from "@/components/hw";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const name = (user.user_metadata?.full_name as string | undefined) ?? email.split("@")[0] ?? "Operator";
  const initials = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "OP";

  return (
    <div className="hf-root flex min-h-screen" style={{ background: "var(--hf-bg)" }}>
      <DashSidebar user={{ name, role: "Pro plan", initials }} />
      <main
        className="flex-1 min-w-0 flex flex-col"
        style={{ background: "var(--hf-bg)" }}
      >
        {children}
      </main>
    </div>
  );
}
