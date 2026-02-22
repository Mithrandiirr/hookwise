export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Plug, Plus } from "lucide-react";
import Link from "next/link";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400 mt-1">Manage your webhook integrations</p>
        </div>
        <Link
          href="/integrations/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New integration
        </Link>
      </div>

      {userIntegrations.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <Plug className="mx-auto h-10 w-10 text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">No integrations yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Connect Stripe, Shopify, GitHub, or any webhook provider.
          </p>
          <Link
            href="/integrations/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add integration
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {userIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">{integration.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      integration.status === "active"
                        ? "bg-green-900/30 text-green-400"
                        : integration.status === "paused"
                        ? "bg-yellow-900/30 text-yellow-400"
                        : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    {integration.status}
                  </span>
                  <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400 capitalize">
                    {integration.provider}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  Ingest: {process.env.NEXT_PUBLIC_APP_URL}/api/ingest/{integration.id}
                </div>
                <div className="text-xs text-gray-500">
                  → {integration.destinationUrl}
                </div>
              </div>
              <Link
                href={`/integrations/${integration.id}`}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Manage →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
