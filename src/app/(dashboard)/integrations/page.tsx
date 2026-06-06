export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints, events, deliveries } from "@/lib/db";
import { eq, desc, inArray, and, gte, count } from "drizzle-orm";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Panel,
  Pill,
  ProviderTag,
} from "@/components/hw";

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
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [userEndpoints, volumeRow, retryRow] = await Promise.all([
    integrationIds.length > 0
      ? db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({
            integrationId: events.integrationId,
            c: count(),
          })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, oneDayAgo),
            ),
          )
          .groupBy(events.integrationId)
      : Promise.resolve([]),
    integrationIds.length > 0
      ? db
          .select({ c: count() })
          .from(deliveries)
          .innerJoin(events, eq(deliveries.eventId, events.id))
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              eq(deliveries.status, "pending"),
            ),
          )
      : Promise.resolve([{ c: 0 }]),
  ]);

  const endpointMap = new Map(userEndpoints.map((e) => [e.integrationId, e] as const));
  const volumeByIntegration = new Map(
    volumeRow.map((r) => [r.integrationId, Number(r.c)] as const),
  );

  const totalVolume24h = volumeRow.reduce((s, r) => s + Number(r.c), 0);
  const aggSuccess =
    userEndpoints.length > 0
      ? userEndpoints.reduce((s, e) => s + (e.successRate ?? 100), 0) /
        userEndpoints.length
      : 100;
  const aggP95 =
    userEndpoints.length > 0
      ? Math.max(...userEndpoints.map((e) => e.avgResponseMs ?? 0))
      : 0;
  const retriesInFlight = Number(retryRow[0]?.c ?? 0);

  return (
    <>
      <DashTopbar
        title="Endpoints"
        subtitle="Every URL HookWise delivers to"
        right={
          <Link href="/integrations/new" className="hf-btn pill small">
            + Endpoint
          </Link>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Data · Endpoints"
          title={
            <>
              {userIntegrations.length}{" "}
              {userIntegrations.length === 1 ? "endpoint" : "endpoints"},{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                one truth
              </span>
              .
            </>
          }
          sub="Every URL HookWise delivers to, with live latency, success rate, and the circuit breaker state."
          actions={
            <>
              <button type="button" className="hf-btn outline small">Filter</button>
              <Link href="/integrations/new" className="hf-btn pill small">
                + Endpoint
              </Link>
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
            label="ENDPOINTS"
            value={userIntegrations.length}
            sub={`across ${new Set(userIntegrations.map((i) => i.provider)).size} provider${new Set(userIntegrations.map((i) => i.provider)).size === 1 ? "" : "s"}`}
          />
          <StatTile
            label="DELIVERIES · 24H"
            value={totalVolume24h.toLocaleString()}
            sub={`${aggSuccess.toFixed(2)}% success`}
            color="#7ed98a"
            accent="#7ed98a"
          />
          <StatTile
            label="P95 LATENCY"
            value={aggP95 > 0 ? `${Math.round(aggP95)}ms` : "—"}
            sub="aggregate"
          />
          <StatTile
            label="RETRIES IN FLIGHT"
            value={retriesInFlight}
            sub={retriesInFlight === 0 ? "all delivered" : "exponential backoff"}
            color={retriesInFlight === 0 ? "#7ed98a" : "#fbbf24"}
            accent={retriesInFlight === 0 ? "#7ed98a" : "#fbbf24"}
          />
        </div>

        <Panel padded={false}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 110px 100px 110px 110px",
              gap: 14,
              padding: "12px 24px",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10.5,
              color: "var(--hf-ink-4)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--hf-line)",
            }}
          >
            <span>URL</span>
            <span>Provider · name</span>
            <span style={{ textAlign: "right" }}>24h volume</span>
            <span style={{ textAlign: "right" }}>p95</span>
            <span style={{ textAlign: "right" }}>Success</span>
            <span style={{ textAlign: "right" }}>Circuit</span>
          </div>
          {userIntegrations.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--hf-ink-4)",
              }}
            >
              No endpoints yet.{" "}
              <Link href="/integrations/new" className="hf-link-accent">
                Add your first →
              </Link>
            </div>
          ) : (
            userIntegrations.map((i, idx, a) => {
              const ep = endpointMap.get(i.id);
              const volume = volumeByIntegration.get(i.id) ?? 0;
              const p95 = ep?.avgResponseMs ?? 0;
              const success = ep?.successRate ?? 100;
              const circuit = (ep?.circuitState ?? "closed") as
                | "open"
                | "closed"
                | "half_open";
              return (
                <Link
                  key={i.id}
                  href={`/integrations/${i.id}`}
                  className="hf-incident-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 110px 100px 110px 110px",
                    gap: 14,
                    padding: "14px 24px",
                    borderBottom:
                      idx < a.length - 1
                        ? "1px solid rgba(255,255,255,0.03)"
                        : "none",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "var(--hf-ink)",
                  }}
                >
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 12,
                      color: "var(--hf-ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i.destinationUrl}
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ProviderTag name={i.provider} />
                    <span
                      className="hf-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--hf-ink-4)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {i.name}
                    </span>
                  </span>
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 12,
                      color: "var(--hf-ink-2)",
                      textAlign: "right",
                    }}
                  >
                    {volume.toLocaleString()}
                  </span>
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 12,
                      color: p95 > 50 ? "#fbbf24" : "var(--hf-ink-2)",
                      textAlign: "right",
                    }}
                  >
                    {p95 > 0 ? `${Math.round(p95)}ms` : "—"}
                  </span>
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 12,
                      color: success < 99 ? "#fbbf24" : "#7ed98a",
                      textAlign: "right",
                    }}
                  >
                    {success.toFixed(2)}%
                  </span>
                  <span style={{ justifySelf: "end" }}>
                    <Pill
                      tone={
                        circuit === "closed"
                          ? "green"
                          : circuit === "half_open"
                            ? "amber"
                            : "red"
                      }
                    >
                      {circuit.replace("_", "-")}
                    </Pill>
                  </span>
                </Link>
              );
            })
          )}
        </Panel>
      </div>
    </>
  );
}
