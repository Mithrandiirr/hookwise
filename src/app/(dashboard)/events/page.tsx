export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, events, integrations, deliveries } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";

const PAGE_SIZE = 60;
const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

type Row = {
  id: string;
  type: string;
  receivedAt: Date;
  providerEventId: string | null;
  source: string;
  amountCents: number | null;
  deliveryStatus: string | null;
  provider: string;
};

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
  const providerOf = new Map(userIntegrations.map((i) => [i.id, i.provider] as const));

  const raw =
    integrationIds.length > 0
      ? await db
          .select({
            id: events.id,
            integrationId: events.integrationId,
            type: events.eventType,
            receivedAt: events.receivedAt,
            providerEventId: events.providerEventId,
            source: events.source,
            amountCents: events.amountCents,
            deliveryStatus: deliveries.status,
          })
          .from(events)
          .leftJoin(deliveries, eq(deliveries.eventId, events.id))
          .where(inArray(events.integrationId, integrationIds))
          .orderBy(desc(events.receivedAt))
          .limit(PAGE_SIZE)
      : [];

  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const r of raw) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    rows.push({ ...r, provider: providerOf.get(r.integrationId) ?? "shopify" });
  }

  const delivered = rows.filter((r) => r.source === "webhook" && r.deliveryStatus !== "failed" && r.deliveryStatus !== "pending").length;
  const recovered = rows.filter((r) => r.source === "reconciliation").length;
  const gaps = rows.filter((r) => r.source !== "reconciliation" && (r.deliveryStatus === "failed" || r.deliveryStatus === "pending" || r.deliveryStatus === null)).length;

  const cols = "110px 150px 1fr 110px 130px 90px";

  return (
    <div style={{ padding: "28px 32px 32px", flex: 1, overflow: "auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Events</h3>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>
            Every event the provider fired, every one your endpoint received — one ledger
          </div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--hf-ink-2)", border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>
          Export CSV
        </div>
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 9, padding: "9px 14px" }}>
          <span style={{ color: "var(--hf-ink-4)", fontSize: 13 }}>⌕</span>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--hf-ink-4)" }}>Search by order, event ID, or topic…</span>
        </div>
        {["All topics", "Jun 1 – 14"].map((t) => (
          <div key={t} style={{ fontFamily: mono, fontSize: 12, color: "var(--hf-ink-2)", border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", borderRadius: 9, padding: "9px 13px" }}>
            {t} <span style={{ color: "var(--hf-ink-4)" }}>▾</span>
          </div>
        ))}
      </div>

      {/* status tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Tab label="All" count={rows.length} active />
        <Tab label="Delivered" count={delivered} tone="ink" />
        <Tab label="Gaps" count={gaps} tone="warm" />
        <Tab label="Recovered" count={recovered} tone="sky" />
      </div>

      {/* table */}
      <div style={{ background: "var(--hf-bg-3)", border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "9px 20px", borderBottom: "1px solid var(--hf-line-soft)", background: "var(--hf-bg-2)", fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--hf-ink-4)" }}>
          <div>Time</div><div>Topic</div><div>Event ID · Order</div><div>Source</div><div>Status</div><div style={{ textAlign: "right" }}>Value</div>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: "20px", fontSize: 12.5, color: "var(--hf-ink-4)" }}>No events yet — they appear here as the provider fires and reconciliation runs.</div>
        ) : (
          rows.map((r, i) => {
            const isRecon = r.source === "reconciliation";
            const isGap = !isRecon && (r.deliveryStatus === "failed" || r.deliveryStatus === "pending" || r.deliveryStatus === null && r.source !== "webhook");
            const rowBg = isRecon ? "var(--hf-accent-tint)" : isGap ? "var(--hf-warm-bg)" : "transparent";
            const cents = r.amountCents ?? 0;
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "11px 20px", borderBottom: i < rows.length - 1 ? "1px solid var(--hf-line-soft)" : "none", fontSize: 12.5, background: rowBg }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)" }}>{fmtTime(r.receivedAt)}</div>
                <div style={{ fontFamily: mono, fontSize: 11 }}>{r.type}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(r.providerEventId ?? r.id).slice(0, 10)}…
                </div>
                <div style={{ fontFamily: mono, fontSize: 10.5, color: isRecon ? "var(--hf-accent)" : isGap ? "var(--hf-ink-4)" : "var(--hf-ink-3)" }}>
                  {isRecon ? "reconciliation" : isGap ? "— missing" : r.provider}
                </div>
                <div><StatusPill kind={isRecon ? "recovered" : isGap ? "gap" : "delivered"} /></div>
                <div className="hf-num" style={{ textAlign: "right", fontFamily: mono, fontSize: 11.5, fontWeight: isRecon || isGap ? 600 : 400, color: isRecon || isGap ? "var(--hf-accent-warm)" : "var(--hf-ink-3)" }}>
                  {cents > 0 ? fmtMoney(cents) : "—"}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 4px 0", fontSize: 12, color: "var(--hf-ink-4)" }}>
        <div style={{ fontFamily: mono }}>showing 1–{rows.length}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ fontFamily: mono, fontSize: 11, border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", borderRadius: 7, padding: "6px 11px", color: "var(--hf-ink-5)" }}>← Prev</div>
          <div style={{ fontFamily: mono, fontSize: 11, border: "1px solid var(--hf-line)", background: "var(--hf-bg-3)", borderRadius: 7, padding: "6px 11px", color: "var(--hf-ink-2)", cursor: "pointer" }}>Next →</div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, count, active, tone }: { label: string; count: number; active?: boolean; tone?: "ink" | "warm" | "sky" }) {
  const color = active ? "var(--hf-ink)" : tone === "warm" ? "var(--hf-warm)" : tone === "sky" ? "var(--hf-accent)" : "var(--hf-ink-2)";
  return (
    <div
      style={{
        fontSize: 12.5,
        fontWeight: active ? 550 : 450,
        color,
        background: active ? "var(--hf-bg-3)" : "transparent",
        border: active ? "1px solid var(--hf-line-2)" : "1px solid transparent",
        borderRadius: 999,
        padding: "6px 14px",
        cursor: "pointer",
      }}
    >
      {label} <span style={{ color: "var(--hf-ink-4)", fontFamily: mono, fontSize: 11 }}>{count.toLocaleString()}</span>
    </div>
  );
}

function StatusPill({ kind }: { kind: "delivered" | "recovered" | "gap" }) {
  if (kind === "recovered")
    return <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-accent)", background: "var(--hf-accent-soft)", border: "1px solid var(--hf-accent-border)", borderRadius: 999, padding: "2px 8px" }}>↻ recovered</span>;
  if (kind === "gap")
    return <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-warm)", background: "var(--hf-warm-bg)", borderRadius: 999, padding: "2px 8px" }}>gap · queued</span>;
  return <span style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-green)", background: "var(--hf-green-bg)", borderRadius: 999, padding: "2px 8px" }}>delivered</span>;
}

function fmtTime(d: Date): string {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
