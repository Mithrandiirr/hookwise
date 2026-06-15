export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  endpoints,
  events,
  replayQueue,
  anomalies,
  reconciliationRuns,
  transformations,
  sequencerRules,
} from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";
import {
  Chip,
  Dot,
  Icon,
  ProviderMark,
  DashTopbar,
  SectionHeader,
} from "@/components/hw";
import { IntegrationSettings } from "./integration-settings";
import { TransformationsPanel } from "./transformations-panel";
import { SequencerPanel } from "./sequencer-panel";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ integrationId: string }>;
}) {
  const { integrationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, user.id),
      ),
    )
    .limit(1);
  if (!integration) notFound();

  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.integrationId, integrationId))
    .limit(1);

  const recentEvents = await db
    .select()
    .from(events)
    .where(eq(events.integrationId, integrationId))
    .orderBy(desc(events.receivedAt))
    .limit(20);

  const pendingReplayCount = endpoint
    ? await db
        .select({ count: count() })
        .from(replayQueue)
        .where(
          and(
            eq(replayQueue.endpointId, endpoint.id),
            eq(replayQueue.status, "pending"),
          ),
        )
    : [{ count: 0 }];

  const recentAnomalies = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.integrationId, integrationId))
    .orderBy(desc(anomalies.detectedAt))
    .limit(5);

  const integrationTransformations = await db
    .select()
    .from(transformations)
    .where(eq(transformations.integrationId, integrationId));

  const integrationSequencerRules = await db
    .select()
    .from(sequencerRules)
    .where(eq(sequencerRules.integrationId, integrationId));

  const [lastReconRun] = await db
    .select()
    .from(reconciliationRuns)
    .where(eq(reconciliationRuns.integrationId, integrationId))
    .orderBy(desc(reconciliationRuns.ranAt))
    .limit(1);

  const circuit = endpoint?.circuitState ?? "closed";
  const circuitTone =
    circuit === "closed" ? "green" : circuit === "half_open" ? "amber" : "red";

  return (
    <>
      <DashTopbar
        title={
          <span className="flex items-center" style={{ gap: 10 }}>
            <Link
              href="/integrations"
              style={{ color: "var(--hw-ink-4)", fontWeight: 500, fontSize: 14 }}
            >
              Integrations /
            </Link>
            <span>{integration.name}</span>
          </span>
        }
        subtitle={
          <span className="flex items-center" style={{ gap: 8 }}>
            <ProviderMark provider={integration.provider} size={14} />
            <span className="hw-mono" style={{ fontSize: 12, color: "var(--hw-ink-3)" }}>
              {integration.provider} · created{" "}
              {new Date(integration.createdAt).toLocaleDateString()}
            </span>
          </span>
        }
        right={
          <>
            <Chip tone={integration.status === "active" ? "green" : "amber"}>
              <Dot tone={integration.status === "active" ? "green" : "amber"} quiet />
              {integration.status}
            </Chip>
          </>
        }
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        {/* Configuration */}
        <section className="hw-fade-up">
          <div
            className="hw-panel"
            style={{ background: "var(--hw-bg-2)", padding: 24 }}
          >
            <SectionHeader title="Configuration" />
            <div
              className="grid"
              style={{
                marginTop: 18,
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 18,
              }}
            >
              <ConfigRow label="Ingest URL" value={`/api/ingest/${integration.id}`} />
              <ConfigRow label="Destination" value={integration.destinationUrl} />
              {integration.providerDomain && (
                <ConfigRow label="Provider domain" value={integration.providerDomain} />
              )}
              <ConfigRow
                label="Signing secret"
                value={"•".repeat(24)}
                muted
              />
            </div>
          </div>
        </section>

        {/* Endpoint Health */}
        {endpoint && (
          <section className="hw-fade-up hw-fade-up-1">
            <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
              <span className="hw-kicker">Endpoint health</span>
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}
            >
              <HealthTile
                label="Circuit"
                value={
                  <div
                    className="flex items-center"
                    style={{ gap: 8, color: `var(--hw-${circuitTone})` }}
                  >
                    <Dot
                      tone={circuitTone}
                      quiet={circuit === "closed"}
                    />
                    <span style={{ fontSize: 18, fontWeight: 500 }}>
                      {circuit === "closed"
                        ? "Healthy"
                        : circuit === "half_open"
                          ? "Degraded"
                          : "Down"}
                    </span>
                  </div>
                }
                icon="shield"
                iconColor={`var(--hw-${circuitTone})`}
              />
              <HealthTile
                label="Success rate"
                value={
                  <span className="hw-mono hw-num" style={{ fontSize: 22, fontWeight: 500 }}>
                    {endpoint.successRate.toFixed(1)}
                    <span style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>%</span>
                  </span>
                }
                icon="chart"
              />
              <HealthTile
                label="Avg response"
                value={
                  <span className="hw-mono hw-num" style={{ fontSize: 22, fontWeight: 500 }}>
                    {endpoint.avgResponseMs.toFixed(0)}
                    <span style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>ms</span>
                  </span>
                }
                icon="stopwatch"
              />
              <HealthTile
                label="Replay queue"
                value={
                  <span className="hw-mono hw-num" style={{ fontSize: 22, fontWeight: 500 }}>
                    {pendingReplayCount[0].count}
                  </span>
                }
                icon="replay"
              />
            </div>

            {circuit === "open" && (
              <div
                className="hw-panel flex items-start"
                style={{
                  marginTop: 14,
                  padding: "14px 18px",
                  background: "#fdeaea",
                  borderColor: "#f4c4c4",
                  gap: 12,
                }}
              >
                <Dot tone="red" />
                <div>
                  <div
                    style={{ fontSize: 13, color: "var(--hw-red)", fontWeight: 500 }}
                  >
                    Circuit open — deliveries queued
                  </div>
                  <div
                    className="hw-mono"
                    style={{ marginTop: 4, fontSize: 11, color: "var(--hw-ink-4)" }}
                  >
                    Health checks run every minute. After 3 consecutive successes the
                    circuit transitions to half-open and queued events replay.
                    {endpoint.lastHealthCheck &&
                      ` Last check: ${new Date(endpoint.lastHealthCheck).toLocaleString()}`}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Recent anomalies */}
        {recentAnomalies.length > 0 && (
          <section className="hw-fade-up hw-fade-up-2">
            <div
              className="hw-panel overflow-hidden"
              style={{ background: "var(--hw-bg-2)" }}
            >
              <div
                className="flex items-center justify-between"
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <SectionHeader title="Recent anomalies" />
                <Link
                  href="/anomalies"
                  className="hw-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--hw-indigo-ink)",
                  }}
                >
                  View all →
                </Link>
              </div>
              {recentAnomalies.map((a, i) => {
                const d = parseDiagnosis(a.diagnosis);
                const tone = a.resolvedAt
                  ? "green"
                  : a.severity === "critical" || a.severity === "high"
                    ? "red"
                    : a.severity === "medium"
                      ? "amber"
                      : "indigo";
                return (
                  <Link
                    key={a.id}
                    href={`/anomalies/${a.id}`}
                    className="flex items-center"
                    style={{
                      padding: "12px 20px",
                      borderTop: i ? "1px solid var(--hw-line)" : "none",
                      gap: 12,
                    }}
                  >
                    <Dot tone={tone} quiet={!!a.resolvedAt} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--hw-ink)" }}>
                        {d.what}
                      </div>
                      <div
                        className="hw-mono"
                        style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}
                      >
                        {a.type} · sev {a.severity}
                      </div>
                    </div>
                    <span
                      className="hw-mono hw-num"
                      style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                    >
                      {new Date(a.detectedAt).toLocaleDateString()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Reconciliation */}
        <section className="hw-fade-up hw-fade-up-3">
          <div
            className="hw-panel"
            style={{ background: "var(--hw-bg-2)", padding: 20 }}
          >
            <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
              <Icon name="refresh" size={14} color="var(--hw-indigo-ink)" />
              <SectionHeader title="Reconciliation" />
              <span style={{ marginLeft: "auto" }}>
                {integration.provider === "github" ? (
                  <Chip>not available</Chip>
                ) : integration.apiKeyEncrypted ? (
                  <Chip tone="green">enabled</Chip>
                ) : (
                  <Chip tone="amber">needs api key</Chip>
                )}
              </span>
            </div>

            {integration.provider === "github" ? (
              <div style={{ fontSize: 12, color: "var(--hw-ink-4)" }}>
                GitHub does not provide a reconciliation API.
              </div>
            ) : integration.apiKeyEncrypted ? (
              lastReconRun ? (
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}
                >
                  <MiniStat label="Last run" value={new Date(lastReconRun.ranAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} />
                  <MiniStat label="Provider events" value={lastReconRun.providerEventsFound.toString()} />
                  <MiniStat label="Gaps found" value={lastReconRun.gapsDetected.toString()} tone="amber" />
                  <MiniStat label="Gaps resolved" value={lastReconRun.gapsResolved.toString()} tone="green" />
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--hw-ink-4)" }}>
                  No reconciliation runs yet. First run within 5 minutes.
                </div>
              )
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--hw-ink-3)", lineHeight: 1.55 }}>
                Provide your {integration.provider === "stripe" ? "Stripe secret key" : "Shopify API key"} to enable gap detection and automatic recovery. Keys encrypted at rest.
              </div>
            )}
          </div>
        </section>

        {/* Enrichment */}
        <section className="hw-fade-up hw-fade-up-4">
          <div
            className="hw-panel"
            style={{ background: "var(--hw-bg-2)", padding: 20 }}
          >
            <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
              <Icon name="zap" size={14} color="var(--hw-indigo-ink)" />
              <SectionHeader title="Enriched delivery" />
              <span style={{ marginLeft: "auto" }}>
                {integration.provider === "github" ? (
                  <Chip>not available</Chip>
                ) : integration.enrichmentEnabled && integration.apiKeyEncrypted ? (
                  <Chip tone="green">enabled</Chip>
                ) : integration.apiKeyEncrypted ? (
                  <Chip tone="amber">disabled</Chip>
                ) : (
                  <Chip tone="amber">needs api key</Chip>
                )}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--hw-ink-3)", lineHeight: 1.55 }}>
              {integration.provider === "github"
                ? "Enriched delivery is not available for GitHub."
                : integration.enrichmentEnabled && integration.apiKeyEncrypted
                  ? `Every ${integration.provider} webhook triggers a fresh fetch of the underlying resource before delivery, eliminating stale state from race conditions.`
                  : `Enable in settings to fetch the latest resource state from the ${integration.provider === "stripe" ? "Stripe" : "Shopify"} API before each delivery.`}
            </div>
          </div>
        </section>

        {/* Transformations */}
        <section className="hw-fade-up hw-fade-up-5">
          <TransformationsPanel
            integrationId={integrationId}
            transformations={integrationTransformations.map((t) => ({
              id: t.id,
              eventType: t.eventType,
              rules: t.rules as Array<{
                action: "rename_field" | "remove_field" | "add_field" | "map_value";
                field: string;
                value?: unknown;
                mapping?: Record<string, unknown>;
              }>,
              enabled: t.enabled,
            }))}
          />
        </section>

        {/* Sequencer */}
        <section className="hw-fade-up hw-fade-up-6">
          <SequencerPanel
            integrationId={integrationId}
            rules={integrationSequencerRules.map((r) => ({
              id: r.id,
              eventOrder: r.eventOrder as string[],
              holdTimeoutMs: r.holdTimeoutMs,
              enabled: r.enabled,
            }))}
            sequencerEnabled={integration.sequencerEnabled}
          />
        </section>

        {/* Settings */}
        <section className="hw-fade-up hw-fade-up-7">
          <IntegrationSettings
            integration={{
              id: integration.id,
              name: integration.name,
              provider: integration.provider,
              signingSecret: integration.signingSecret,
              destinationUrl: integration.destinationUrl,
              status: integration.status,
              idempotencyEnabled: integration.idempotencyEnabled,
              sequencerEnabled: integration.sequencerEnabled,
              enrichmentEnabled: integration.enrichmentEnabled,
              apiKeyEncrypted: integration.apiKeyEncrypted,
              providerDomain: integration.providerDomain,
            }}
          />
        </section>

        {/* Recent events */}
        <section className="hw-fade-up hw-fade-up-8">
          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hw-line)",
              }}
            >
              <SectionHeader title="Recent events" />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
              >
                {recentEvents.length} events
              </span>
            </div>
            {recentEvents.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--hw-ink-4)",
                }}
              >
                No events received yet.
              </div>
            ) : (
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Event type</th>
                    <th>Signature</th>
                    <th>Source</th>
                    <th>Received</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <Link
                          href={`/events/${event.id}`}
                          className="hw-mono"
                          style={{ fontSize: 12.5, color: "var(--hw-indigo-ink)" }}
                        >
                          {event.eventType}
                        </Link>
                      </td>
                      <td>
                        {event.signatureValid ? (
                          <Chip tone="green">
                            <Icon name="check" size={10} /> valid
                          </Chip>
                        ) : (
                          <Chip tone="red">
                            <Icon name="x" size={10} /> invalid
                          </Chip>
                        )}
                      </td>
                      <td>
                        <Chip>{event.source}</Chip>
                      </td>
                      <td
                        className="hw-mono hw-num"
                        style={{ color: "var(--hw-ink-3)", fontSize: 11.5 }}
                      >
                        {new Date(event.receivedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/events/${event.id}`}
                          style={{ color: "var(--hw-ink-4)" }}
                        >
                          <Icon name="chevron-right" size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function ConfigRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono"
        style={{
          marginTop: 6,
          fontSize: 12.5,
          color: muted ? "var(--hw-ink-4)" : "var(--hw-ink-2)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HealthTile({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: React.ReactNode;
  icon: "shield" | "chart" | "stopwatch" | "replay";
  iconColor?: string;
}) {
  return (
    <div
      className="hw-panel"
      style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
    >
      <div className="flex items-start justify-between">
        <div className="hw-label">{label}</div>
        <Icon name={icon} size={14} color={iconColor ?? "var(--hw-ink-4)"} />
      </div>
      <div style={{ marginTop: 10 }}>{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "green";
}) {
  const color =
    tone === "amber"
      ? "var(--hw-amber)"
      : tone === "green"
        ? "var(--hw-green)"
        : "var(--hw-ink)";
  return (
    <div>
      <div className="hw-label">{label}</div>
      <div
        className="hw-mono hw-num"
        style={{ marginTop: 4, fontSize: 15, color, fontWeight: 500 }}
      >
        {value}
      </div>
    </div>
  );
}
