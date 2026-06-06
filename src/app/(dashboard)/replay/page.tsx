export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  endpoints,
  replayQueue,
  events,
} from "@/lib/db";
import { eq, desc, inArray, and, count } from "drizzle-orm";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Panel,
  Pill,
} from "@/components/hw";

export default async function ReplayPage() {
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

  const userEndpoints =
    integrationIds.length > 0
      ? await db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : [];
  const endpointIds = userEndpoints.map((e) => e.id);
  const endpointMap = new Map(userEndpoints.map((e) => [e.id, e] as const));
  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));

  const [pendingRows, deliveredRow, failedRow] = await Promise.all([
    endpointIds.length > 0
      ? db
          .select({
            id: replayQueue.id,
            eventId: replayQueue.eventId,
            endpointId: replayQueue.endpointId,
            status: replayQueue.status,
            attempts: replayQueue.attempts,
            createdAt: replayQueue.createdAt,
            eventType: events.eventType,
          })
          .from(replayQueue)
          .innerJoin(events, eq(replayQueue.eventId, events.id))
          .where(
            and(
              inArray(replayQueue.endpointId, endpointIds),
              eq(replayQueue.status, "pending"),
            ),
          )
          .orderBy(desc(replayQueue.createdAt))
          .limit(50)
      : Promise.resolve([]),
    endpointIds.length > 0
      ? db
          .select({ c: count() })
          .from(replayQueue)
          .where(
            and(
              inArray(replayQueue.endpointId, endpointIds),
              eq(replayQueue.status, "delivered"),
            ),
          )
      : Promise.resolve([{ c: 0 }]),
    endpointIds.length > 0
      ? db
          .select({ c: count() })
          .from(replayQueue)
          .where(
            and(
              inArray(replayQueue.endpointId, endpointIds),
              eq(replayQueue.status, "failed"),
            ),
          )
      : Promise.resolve([{ c: 0 }]),
  ]);

  const inFlight = pendingRows.length;
  const delivered = Number(deliveredRow[0]?.c ?? 0);
  const exhausted = Number(failedRow[0]?.c ?? 0);

  return (
    <>
      <DashTopbar
        title="Retries"
        subtitle="Replay queue · exponential backoff per error type"
        right={
          <Pill tone={inFlight === 0 ? "green" : "amber"}>
            {inFlight} in flight
          </Pill>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Data · Retries"
          title={
            <>
              {inFlight === 0 ? (
                <>
                  No retries in flight.{" "}
                  <span
                    className="hf-serif"
                    style={{ color: "var(--hf-accent)" }}
                  >
                    All clear
                  </span>
                  .
                </>
              ) : (
                <>
                  {inFlight} {inFlight === 1 ? "retry" : "retries"} in flight.{" "}
                  <span
                    className="hf-serif"
                    style={{ color: "var(--hf-accent)" }}
                  >
                    Zero lost
                  </span>
                  .
                </>
              )}
            </>
          }
          sub="Every retry HookWise is actively running, with backoff state, attempt count, and the original event for replay. Nothing dies in a queue."
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
            label="IN FLIGHT"
            value={inFlight}
            sub="exponential backoff"
            color={inFlight === 0 ? "#7ed98a" : "#fbbf24"}
            accent={inFlight === 0 ? "#7ed98a" : "#fbbf24"}
          />
          <StatTile
            label="DELIVERED"
            value={delivered.toLocaleString()}
            sub="auto-recovered · all time"
            color="#7ed98a"
            accent="#7ed98a"
          />
          <StatTile
            label="EXHAUSTED"
            value={exhausted}
            sub="reached attempt limit"
            color={exhausted === 0 ? "#7ed98a" : "#f29a9a"}
            accent={exhausted === 0 ? "#7ed98a" : "#f29a9a"}
          />
          <StatTile label="DLQ DEPTH" value={exhausted} sub="manual review queue" />
        </div>

        <Panel padded={false}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr 90px 100px 100px",
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
            <span>Event ID</span>
            <span>Endpoint</span>
            <span style={{ textAlign: "right" }}>Attempt</span>
            <span style={{ textAlign: "right" }}>Created</span>
            <span style={{ textAlign: "right" }}>Action</span>
          </div>
          {pendingRows.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--hf-ink-4)",
              }}
            >
              No pending retries. Smart Retry would queue rows here if any deliveries
              were failing.
            </div>
          ) : (
            pendingRows.map((r, i, a) => {
              const ep = endpointMap.get(r.endpointId);
              const integ = ep ? integrationMap.get(ep.integrationId) : undefined;
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 90px 100px 100px",
                    gap: 14,
                    padding: "14px 24px",
                    borderBottom:
                      i < a.length - 1
                        ? "1px solid rgba(255,255,255,0.03)"
                        : "none",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="hf-mono"
                    style={{ fontSize: 11.5, color: "var(--hf-ink-2)" }}
                  >
                    evt_{r.eventId.slice(0, 10)}
                  </span>
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
                    {integ?.name ?? "—"} · {r.eventType}
                  </span>
                  <span
                    className="hf-num hf-mono"
                    style={{
                      fontSize: 12,
                      color: "#fbbf24",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    {r.attempts}/8
                  </span>
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 11.5,
                      color: "var(--hf-ink-3)",
                      textAlign: "right",
                    }}
                  >
                    {fmtMin(r.createdAt)} ago
                  </span>
                  <button
                    type="button"
                    className="hf-btn ghost small"
                    style={{ padding: "3px 10px", justifySelf: "end" }}
                  >
                    Replay
                  </button>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </>
  );
}

function fmtMin(d: Date | string): string {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}
