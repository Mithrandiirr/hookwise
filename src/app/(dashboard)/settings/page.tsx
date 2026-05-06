export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { DashTopbar, SectionHeader } from "@/components/hw";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <DashTopbar
        title="Settings"
        subtitle="manage your HookWise account"
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
        <div style={{ maxWidth: 720 }}>
          <div
            className="hw-fade-up hw-panel"
            style={{ padding: 24, background: "var(--hw-bg-2)" }}
          >
            <SectionHeader title="Account" />
            <div
              className="grid"
              style={{
                marginTop: 18,
                gridTemplateColumns: "120px 1fr",
                gap: "14px 24px",
                alignItems: "center",
              }}
            >
              <div className="hw-label">Email</div>
              <div
                className="hw-mono"
                style={{ fontSize: 13, color: "var(--hw-ink)" }}
              >
                {user?.email}
              </div>
              <div className="hw-label">User ID</div>
              <div
                className="hw-mono"
                style={{ fontSize: 11.5, color: "var(--hw-ink-3)", wordBreak: "break-all" }}
              >
                {user?.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
