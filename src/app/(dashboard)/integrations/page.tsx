export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { Chip, Dot, Icon, ProviderMark, DashTopbar } from "@/components/hw";

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
  const userEndpoints =
    integrationIds.length > 0
      ? await db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : [];
  const endpointMap = new Map(
    userEndpoints.map((e) => [e.integrationId, e] as const),
  );

  const activeCount = userIntegrations.filter((i) => i.status === "active").length;
  const pausedCount = userIntegrations.filter((i) => i.status === "paused").length;
  const degraded = userEndpoints.filter(
    (e) => e.circuitState !== "closed",
  ).length;

  return (
    <>
      <DashTopbar
        title="Integrations"
        subtitle="every source pushing events into HookWise"
        right={
          <>
            <div
              className="flex items-center"
              style={{
                gap: 8,
                padding: "6px 10px",
                border: "1px solid var(--hw-line-2)",
                borderRadius: 7,
              }}
            >
              <Dot tone={degraded > 0 ? "amber" : "green"} />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
              >
                {activeCount} active · {pausedCount} paused · {degraded} degraded
              </span>
            </div>
            <Link href="/integrations/new" className="hw-btn hw-btn-indigo">
              <Icon name="plug" size={13} /> New integration
            </Link>
          </>
        }
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 24,
          overflow: "auto",
          flex: 1,
        }}
      >
        {userIntegrations.length === 0 ? (
          <section className="hw-fade-up">
            <div
              className="hw-panel flex flex-col items-center justify-center"
              style={{
                padding: "72px 24px",
                background: "var(--hw-bg-2)",
                textAlign: "center",
                gap: 14,
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "var(--hw-panel)",
                  border: "1px solid var(--hw-line)",
                }}
              >
                <Icon name="plug" size={22} color="var(--hw-ink-4)" />
              </div>
              <div style={{ fontSize: 16, color: "var(--hw-ink)" }}>
                No integrations yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--hw-ink-4)",
                  maxWidth: 380,
                }}
              >
                Connect Stripe, Shopify, GitHub, or any generic webhook source.
                HookWise starts protecting from the first event.
              </div>
              <Link href="/integrations/new" className="hw-btn hw-btn-primary">
                <Icon name="plug" size={13} /> Add integration
              </Link>
            </div>
          </section>
        ) : (
          <section className="hw-fade-up">
            <div
              className="hw-panel overflow-hidden"
              style={{ background: "var(--hw-bg-2)" }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <span className="hw-label">
                  {userIntegrations.length} INTEGRATION{userIntegrations.length === 1 ? "" : "S"}
                </span>
              </div>
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Integration</th>
                    <th>Provider</th>
                    <th>Destination</th>
                    <th style={{ textAlign: "right" }}>Success</th>
                    <th style={{ textAlign: "right" }}>p95</th>
                    <th>Health</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {userIntegrations.map((integration) => {
                    const endpoint = endpointMap.get(integration.id);
                    const success = endpoint?.successRate ?? 100;
                    const p95 = endpoint?.avgResponseMs ?? 0;
                    const circuit = endpoint?.circuitState ?? "closed";
                    return (
                      <tr key={integration.id}>
                        <td>
                          <Link
                            href={`/integrations/${integration.id}`}
                            className="flex items-center"
                            style={{ gap: 10 }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "var(--hw-ink)",
                                  fontWeight: 500,
                                }}
                              >
                                {integration.name}
                              </div>
                              <div
                                className="hw-mono"
                                style={{
                                  fontSize: 11,
                                  color: "var(--hw-ink-4)",
                                  marginTop: 2,
                                }}
                              >
                                /api/ingest/{integration.id.slice(0, 8)}…
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <div className="flex items-center" style={{ gap: 8 }}>
                            <ProviderMark
                              provider={integration.provider}
                              size={16}
                            />
                            <span
                              style={{
                                color: "var(--hw-ink-2)",
                                textTransform: "capitalize",
                              }}
                            >
                              {integration.provider}
                            </span>
                          </div>
                        </td>
                        <td
                          className="hw-mono"
                          style={{
                            fontSize: 11.5,
                            color: "var(--hw-ink-3)",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {integration.destinationUrl}
                        </td>
                        <td
                          className="hw-mono hw-num"
                          style={{
                            textAlign: "right",
                            color:
                              success < 95
                                ? "var(--hw-amber)"
                                : "var(--hw-ink-2)",
                          }}
                        >
                          {success.toFixed(1)}%
                        </td>
                        <td
                          className="hw-mono hw-num"
                          style={{
                            textAlign: "right",
                            color:
                              p95 > 400
                                ? "var(--hw-amber)"
                                : "var(--hw-ink-3)",
                          }}
                        >
                          {Math.round(p95)}ms
                        </td>
                        <td>
                          {circuit === "closed" && (
                            <Chip tone="green">
                              <Dot tone="green" quiet /> healthy
                            </Chip>
                          )}
                          {circuit === "half_open" && (
                            <Chip tone="amber">
                              <Dot tone="amber" quiet /> degraded
                            </Chip>
                          )}
                          {circuit === "open" && (
                            <Chip tone="red">
                              <Dot tone="red" quiet /> down
                            </Chip>
                          )}
                        </td>
                        <td>
                          <Chip
                            tone={
                              integration.status === "active"
                                ? "green"
                                : integration.status === "paused"
                                  ? "amber"
                                  : "red"
                            }
                          >
                            {integration.status}
                          </Chip>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            href={`/integrations/${integration.id}`}
                            style={{ color: "var(--hw-ink-4)" }}
                          >
                            <Icon name="chevron-right" size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
