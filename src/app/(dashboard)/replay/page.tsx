export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints, replayQueue, events } from "@/lib/db";
import { eq, desc, inArray, and } from "drizzle-orm";
import { ReplayClient, type ReplayItem } from "./replay-client";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

export default async function ReplayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, name: integrations.name, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));
  const integrationIds = userIntegrations.map((i) => i.id);

  const userEndpoints =
    integrationIds.length > 0
      ? await db.select().from(endpoints).where(inArray(endpoints.integrationId, integrationIds))
      : [];
  const endpointIds = userEndpoints.map((e) => e.id);
  const endpointMap = new Map(userEndpoints.map((e) => [e.id, e] as const));

  const queue =
    endpointIds.length > 0
      ? await db
          .select({
            id: replayQueue.id,
            eventId: replayQueue.eventId,
            endpointId: replayQueue.endpointId,
            status: replayQueue.status,
            attempts: replayQueue.attempts,
            createdAt: replayQueue.createdAt,
            eventType: events.eventType,
            providerEventId: events.providerEventId,
            amountCents: events.amountCents,
          })
          .from(replayQueue)
          .innerJoin(events, eq(replayQueue.eventId, events.id))
          .where(and(inArray(replayQueue.endpointId, endpointIds), inArray(replayQueue.status, ["pending", "delivered"])))
          .orderBy(desc(replayQueue.createdAt))
          .limit(12)
      : [];

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const items: ReplayItem[] = queue.map((q) => ({
    id: q.id,
    eventId: q.eventId,
    endpointId: q.endpointId,
    status: q.status as "pending" | "delivered",
    attempts: q.attempts,
    eventType: q.eventType,
    providerEventId: q.providerEventId,
    amountCents: q.amountCents,
    endpointUrl: endpointMap.get(q.endpointId)?.url ?? null,
  }));

  return (
    <div style={{ padding: "28px 32px 32px", flex: 1, overflow: "auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Replay</h3>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>
            Missed events, re-delivered to your endpoint — idempotent and tagged{" "}
            <span style={{ fontFamily: mono, fontSize: 11 }}>source: &#39;reconciliation&#39;</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontFamily: mono, fontSize: 12, color: "var(--hf-ink-2)", border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", borderRadius: 8, padding: "9px 13px" }}>
            Auto-replay <span style={{ color: "var(--hf-green)", fontWeight: 600 }}>on</span>
          </div>
          <div className="hf-btn pill" style={{ fontSize: 12.5 }}>Replay all pending ({pendingCount})</div>
        </div>
      </div>

      <ReplayClient queue={items} />
    </div>
  );
}
