export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, events, deliveries } from "@/lib/db";
import { eq, desc, count, and, gte } from "drizzle-orm";
import { Activity, CheckCircle, AlertTriangle, Plug } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const stats = {
    integrations: userIntegrations.length,
    activeIntegrations: userIntegrations.filter((i) => i.status === "active").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-400 mt-1">Your webhook intelligence dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Integrations"
          value={stats.integrations}
          icon={<Plug className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Active"
          value={stats.activeIntegrations}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Events (1h)"
          value="—"
          icon={<Activity className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Anomalies"
          value="—"
          icon={<AlertTriangle className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Integrations</h2>
        {userIntegrations.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
            <Plug className="mx-auto h-10 w-10 text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium">No integrations yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Add your first integration to start receiving webhooks.
            </p>
            <a
              href="/integrations"
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Add integration
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingest URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {userIntegrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-white">{integration.name}</td>
                    <td className="px-6 py-4 text-gray-400 capitalize">{integration.provider}</td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      /api/ingest/{integration.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "indigo" | "green" | "blue" | "yellow";
}) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-900/30",
    green: "text-green-400 bg-green-900/30",
    blue: "text-blue-400 bg-blue-900/30",
    yellow: "text-yellow-400 bg-yellow-900/30",
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
