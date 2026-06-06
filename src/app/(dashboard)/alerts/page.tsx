export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, alertConfigs } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { AlertsClient } from "./alerts-client";
import { DashTopbar, PageHead, StatTile } from "@/components/hw";

export default async function AlertsPage() {
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

  const integrationIds = userIntegrations.map((i) => i.id);

  const configs =
    integrationIds.length > 0
      ? await db
          .select()
          .from(alertConfigs)
          .where(inArray(alertConfigs.integrationId, integrationIds))
      : [];

  const activeRules = configs.filter((c) => c.enabled).length;
  const channels = new Set(configs.map((c) => c.channel)).size;

  return (
    <>
      <DashTopbar
        title="Alerts"
        subtitle="Routing rules · channels · audit"
        right={
          <button type="button" className="hf-btn pill small">
            + Rule
          </button>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Settings · Alerts"
          title={
            <>
              Wake the{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                right person
              </span>{" "}
              at the right time.
            </>
          }
          sub="HookWise routes anomalies to the channel that fits their severity. Investigations attach to alerts automatically, so on-call gets root cause and a fix — not just a notification."
          actions={
            <>
              <button type="button" className="hf-btn outline small">Test alert</button>
              <button type="button" className="hf-btn pill small">+ Rule</button>
            </>
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile
            label="ACTIVE RULES"
            value={`${activeRules} of ${configs.length}`}
            sub={configs.length > 0 ? `${configs.length - activeRules} paused` : "no rules yet"}
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
          <StatTile label="FIRED · 24H" value="0" sub="no incidents fit a rule" />
          <StatTile
            label="CHANNELS"
            value={channels}
            sub={channels === 0 ? "configure below" : "configured"}
          />
          <StatTile
            label="MEAN ACK"
            value="—"
            sub="from fire to acknowledge"
            color="#7ed98a"
            accent="#7ed98a"
          />
        </div>

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
      </div>
    </>
  );
}
