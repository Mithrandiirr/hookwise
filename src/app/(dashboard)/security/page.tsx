export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { endpoints, integrations, securityScans } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { SecurityClient } from "./security-client";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  const userEndpoints =
    integrationIds.length > 0
      ? await db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : [];

  const endpointIds = userEndpoints.map((e) => e.id);

  const latestScans =
    endpointIds.length > 0
      ? await db
          .select()
          .from(securityScans)
          .where(inArray(securityScans.endpointId, endpointIds))
          .orderBy(desc(securityScans.scannedAt))
          .limit(100)
      : [];

  // Build scan map: latest scan per endpoint
  const scansByEndpoint = new Map<string, typeof latestScans[number]>();
  for (const scan of latestScans) {
    if (!scansByEndpoint.has(scan.endpointId)) {
      scansByEndpoint.set(scan.endpointId, scan);
    }
  }

  const integrationMap = Object.fromEntries(
    userIntegrations.map((i) => [i.id, i])
  );

  const endpointsWithScans = userEndpoints.map((ep) => ({
    id: ep.id,
    url: ep.url,
    integrationId: ep.integrationId,
    integrationName: integrationMap[ep.integrationId]?.name ?? "Unknown",
    provider: integrationMap[ep.integrationId]?.provider ?? "stripe",
    latestScan: scansByEndpoint.get(ep.id) ?? null,
  }));

  return (
    <>
      <RealtimeRefresh tables={["security_scans"]} />
      <SecurityClient endpoints={endpointsWithScans} />
    </>
  );
}
