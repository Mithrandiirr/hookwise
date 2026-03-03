export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-tertiary)] mt-1">Manage your account preferences</p>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Account</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Email</span>
            <span className="text-[var(--text-primary)]">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">User ID</span>
            <span className="text-[var(--text-secondary)] font-mono text-xs">{user?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
