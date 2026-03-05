export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, alertConfigs } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { AlertsClient } from "./alerts-client";

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, name: integrations.name, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);

  const configs =
    integrationIds.length > 0
      ? await db
          .select()
          .from(alertConfigs)
          .where(inArray(alertConfigs.integrationId, integrationIds))
      : [];

  return (
    <AlertsClient
      integrations={userIntegrations}
      configs={configs.map((c) => ({
        id: c.id,
        integrationId: c.integrationId,
        channel: c.channel,
        destination: c.destination,
        threshold: c.threshold,
        enabled: c.enabled,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
