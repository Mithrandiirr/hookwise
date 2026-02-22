export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, events, integrations, deliveries } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, name: integrations.name, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  const recentEvents =
    integrationIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(inArray(events.integrationId, integrationIds))
          .orderBy(desc(events.receivedAt))
          .limit(50)
      : [];

  const integrationMap = Object.fromEntries(userIntegrations.map((i) => [i.id, i]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Events</h1>
        <p className="text-gray-400 mt-1">All received webhook events across your integrations</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {recentEvents.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium">No events yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Events will appear here once webhooks start arriving.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Integration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentEvents.map((event) => {
                const integration = integrationMap[event.integrationId];
                return (
                  <tr key={event.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">{event.eventType}</td>
                    <td className="px-6 py-4 text-gray-300 capitalize">
                      {integration ? `${integration.name} (${integration.provider})` : event.integrationId}
                    </td>
                    <td className="px-6 py-4">
                      {event.signatureValid ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle className="h-3.5 w-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <XCircle className="h-3.5 w-3.5" /> Invalid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(event.receivedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
