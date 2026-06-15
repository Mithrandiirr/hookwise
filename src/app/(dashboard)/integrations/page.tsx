export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints, events } from "@/lib/db";
import { eq, desc, inArray, and, gte, count } from "drizzle-orm";
import { Pill, LineIcon } from "@/components/hw";
import type { LineIconName } from "@/components/hw";

function Eyebrow({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "0 0 10px",
      }}
    >
      <div
        className="hf-mono"
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--hf-ink-4)",
        }}
      >
        {children}
      </div>
      {right}
    </div>
  );
}

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

  const integrationIds = userIntegrations.map((i) => i.id);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [userEndpoints, volumeRow] = await Promise.all([
    integrationIds.length > 0
      ? db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({ integrationId: events.integrationId, c: count() })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, sevenDaysAgo),
            ),
          )
          .groupBy(events.integrationId)
      : Promise.resolve([]),
  ]);

  const endpointMap = new Map(userEndpoints.map((e) => [e.integrationId, e] as const));
  const volumeByIntegration = new Map(
    volumeRow.map((r) => [r.integrationId, Number(r.c)] as const),
  );

  const sourceProvider =
    userIntegrations.find((i) => i.provider === "shopify")?.provider ??
    userIntegrations[0]?.provider ??
    "shopify";
  const sourceLabel =
    sourceProvider === "shopify" ? "Shopify Admin API" : `${sourceProvider} source`;

  return (
    <div style={{ padding: "28px 32px 40px", overflow: "auto", flex: 1 }}>
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--hf-ink)",
            }}
          >
            Integrations
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>
            Where truth comes from, and where recovered events are delivered
          </div>
        </div>
        <Link href="/integrations/new" className="hf-btn pill small">
          + Connect endpoint
        </Link>
      </div>

      {/* source */}
      <Eyebrow>Source · ground truth</Eyebrow>
      <div
        style={{
          background: "var(--hf-bg-3)",
          border: "1px solid var(--hf-line)",
          borderRadius: 12,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#f1f8f3",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <LineIcon name="database" color="#16a34a" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--hf-ink)" }}>
            {sourceLabel}
          </div>
          <div
            className="hf-mono"
            style={{ fontSize: 11, color: "var(--hf-ink-3)", marginTop: 2 }}
          >
            scope: read_orders · polled every 5 min for ground truth
          </div>
        </div>
        <Pill tone="green">connected</Pill>
        <span
          className="hf-mono"
          style={{
            fontSize: 11,
            color: "var(--hf-ink-2)",
            border: "1px solid var(--hf-line)",
            borderRadius: 8,
            padding: "7px 12px",
          }}
        >
          Manage
        </span>
      </div>

      {/* delivery endpoints */}
      <Eyebrow
        right={
          <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)" }}>
            {userIntegrations.length} active
          </span>
        }
      >
        Delivery endpoints · where recovery is sent
      </Eyebrow>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 22,
        }}
      >
        {userIntegrations.length === 0 ? (
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 12,
              padding: "48px 24px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--hf-ink-4)",
            }}
          >
            No endpoints yet.{" "}
            <Link href="/integrations/new" className="hf-link-accent">
              Connect your first →
            </Link>
          </div>
        ) : (
          userIntegrations.map((i) => {
            const ep = endpointMap.get(i.id);
            const success = ep?.successRate ?? 100;
            const circuit = ep?.circuitState ?? "closed";
            const healthy = success >= 99 && circuit === "closed";
            const volume = volumeByIntegration.get(i.id) ?? 0;
            return (
              <div
                key={i.id}
                style={{
                  background: "var(--hf-bg-3)",
                  border: "1px solid var(--hf-line)",
                  borderRadius: 12,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--hf-accent-tint)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <LineIcon name="arrow-down-right" color="var(--hf-accent)" size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--hf-ink)" }}>
                    {i.name}
                  </div>
                  <div
                    className="hf-mono"
                    style={{
                      fontSize: 11,
                      color: "var(--hf-ink-3)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i.destinationUrl} · {volume.toLocaleString()} events/7d · HMAC signed
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    className="hf-num"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: healthy ? "#16a34a" : "#b35418",
                    }}
                  >
                    {success.toFixed(1)}%
                  </div>
                  <div className="hf-mono" style={{ fontSize: 10, color: "var(--hf-ink-4)" }}>
                    7d delivery
                  </div>
                </div>
                <Pill tone={healthy ? "green" : "amber"}>
                  {healthy ? "healthy" : "retrying"}
                </Pill>
                <Link
                  href={`/integrations/${i.id}`}
                  className="hf-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--hf-ink-2)",
                    border: "1px solid var(--hf-line)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    textDecoration: "none",
                  }}
                >
                  Configure
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* notification channels */}
      <Eyebrow>Notification channels</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <ChannelTile tileBg="#f4ecfb" accent="#8b5cf6" icon="chat" name="Slack" detail="#ops-alerts" connected />
        <ChannelTile tileBg="#eef3f8" accent="#0369a1" icon="envelope" name="Email" detail="3 recipients" connected />
        <ChannelTile tileBg="var(--hf-bg-4)" accent="var(--hf-ink-4)" icon="plus" name="PagerDuty" detail="connect" />
      </div>
    </div>
  );
}

function ChannelTile({
  tileBg,
  accent,
  icon,
  name,
  detail,
  connected = false,
}: {
  tileBg: string;
  accent: string;
  icon: LineIconName;
  name: string;
  detail: string;
  connected?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: connected ? "1px solid var(--hf-line)" : "1px dashed var(--hf-line-2)",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: connected ? "default" : "pointer",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: tileBg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <LineIcon name={icon} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: connected ? "var(--hf-ink)" : "var(--hf-ink-2)",
          }}
        >
          {name}
        </div>
        <div className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)", marginTop: 1 }}>
          {detail}
        </div>
      </div>
      {connected && (
        <span
          style={{ width: 7, height: 7, borderRadius: 999, background: "#22c55e", flexShrink: 0 }}
        />
      )}
    </div>
  );
}
