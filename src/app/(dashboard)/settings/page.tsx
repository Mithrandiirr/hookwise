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
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Account</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-white">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">User ID</span>
            <span className="text-gray-400 font-mono text-xs">{user?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
