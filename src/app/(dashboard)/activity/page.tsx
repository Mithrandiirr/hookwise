export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, auditLog, integrations } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import {
  DashTopbar,
  PageHead,
  Panel,
  Pill,
  ProviderTag,
  fmtAgo,
} from "@/components/hw";

type AuditAction =
  | "event.received"
  | "event.delivered"
  | "event.failed"
  | "event.replayed"
  | "circuit.opened"
  | "circuit.closed"
  | "circuit.half_open"
  | "integration.created"
  | "integration.updated"
  | "integration.deleted"
  | "scan.completed"
  | "export.created";

type Tone = "green" | "amber" | "red" | "violet" | "ember" | "ink";

type Meta = {
  label: string;
  glyph: string;
  tone: Tone;
  category: "delivery" | "retry" | "recon" | "circuit" | "integration" | "alert" | "scan";
};

const ACTION: Record<AuditAction, Meta> = {
  "event.received":     { label: "Event received",      glyph: "↓", tone: "ink",    category: "delivery" },
  "event.delivered":    { label: "Event delivered",     glyph: "✓", tone: "green",  category: "delivery" },
  "event.failed":       { label: "Event failed",        glyph: "✕", tone: "red",    category: "delivery" },
  "event.replayed":     { label: "Event replayed",      glyph: "↻", tone: "amber",  category: "retry" },
  "circuit.opened":     { label: "Circuit opened",      glyph: "⊘", tone: "red",    category: "circuit" },
  "circuit.closed":     { label: "Circuit closed",      glyph: "✓", tone: "green",  category: "circuit" },
  "circuit.half_open":  { label: "Circuit half-open",   glyph: "◐", tone: "amber",  category: "circuit" },
  "integration.created":{ label: "Integration created", glyph: "+", tone: "violet", category: "integration" },
  "integration.updated":{ label: "Integration updated", glyph: "⚙", tone: "ink",    category: "integration" },
  "integration.deleted":{ label: "Integration deleted", glyph: "✕", tone: "red",    category: "integration" },
  "scan.completed":     { label: "Scan completed",      glyph: "⌕", tone: "violet", category: "scan" },
  "export.created":     { label: "Export created",      glyph: "⇪", tone: "violet", category: "scan" },
};

const TONE_FG: Record<Tone, string> = {
  green: "#7ed98a",
  amber: "#fbbf24",
  red: "#f29a9a",
  violet: "#c4a5ff",
  ember: "var(--hf-accent)",
  ink: "var(--hf-ink-2)",
};
const TONE_BG: Record<Tone, string> = {
  green: "rgba(126,217,138,0.10)",
  amber: "rgba(251,191,36,0.10)",
  red: "rgba(242,154,154,0.10)",
  violet: "rgba(196,165,255,0.10)",
  ember: "rgba(163,230,53,0.10)",
  ink: "rgba(255,255,255,0.04)",
};

type CategoryFilter = "all" | Meta["category"];

const CATEGORIES: Array<[CategoryFilter, string, string | null]> = [
  ["all",         "All",          null],
  ["delivery",    "Deliveries",   "#7ed98a"],
  ["retry",       "Retries",      "#fbbf24"],
  ["recon",       "Reconciler",   "#7ed98a"],
  ["circuit",     "Circuit",      "#fbbf24"],
  ["integration", "Integrations", "#c4a5ff"],
  ["scan",        "Scans",        "#c4a5ff"],
];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const cat = parseCategory(sp.category);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allRows = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, user!.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  const integrationIds = Array.from(
    new Set(allRows.map((r) => r.integrationId).filter((x): x is string => !!x)),
  );
  const integrationRows = integrationIds.length
    ? await db
        .select({
          id: integrations.id,
          name: integrations.name,
          provider: integrations.provider,
        })
        .from(integrations)
        .where(eq(integrations.userId, user!.id))
    : [];
  const integrationMap = new Map(integrationRows.map((i) => [i.id, i] as const));

  // Counts pre-filter so chips are honest.
  const counts: Record<CategoryFilter, number> = {
    all: allRows.length,
    delivery: 0,
    retry: 0,
    recon: 0,
    circuit: 0,
    integration: 0,
    alert: 0,
    scan: 0,
  };
  for (const r of allRows) {
    const meta = ACTION[r.action as AuditAction];
    if (meta) counts[meta.category] += 1;
  }

  const filtered = allRows.filter((r) => {
    if (cat === "all") return true;
    const meta = ACTION[r.action as AuditAction];
    return meta?.category === cat;
  });

  // Split into Today / Earlier.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = filtered.filter((r) => new Date(r.createdAt) >= todayStart);
  const earlier = filtered.filter((r) => new Date(r.createdAt) < todayStart);

  return (
    <>
      <DashTopbar
        title="Activity"
        subtitle="Append-only audit trail · integrity-hashed"
        right={
          <Pill tone="ink">
            <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--hf-accent)" }} />
            integrity-hashed
          </Pill>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Activity log"
          title={
            <>
              Every action, every signal.{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                One feed
              </span>
              .
            </>
          }
          sub="A chronological log of every event HookWise handled, every retry it absorbed, every investigation it ran, and every action a teammate took — searchable and exportable."
          actions={
            <>
              <button type="button" className="hf-btn outline small">Export CSV</button>
              <button type="button" className="hf-btn pill small">Stream</button>
            </>
          }
        />

        {/* Category chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {CATEGORIES.map(([k, l, dot]) => {
            const active = cat === k;
            const num = counts[k];
            return (
              <Link
                key={k}
                href={k === "all" ? "/activity" : `/activity?category=${k}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  background: active ? "var(--hf-bg-4)" : "transparent",
                  color: active ? "var(--hf-ink)" : "var(--hf-ink-3)",
                  border: `1px solid ${active ? "var(--hf-line-2)" : "var(--hf-line)"}`,
                }}
              >
                {dot && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: dot,
                    }}
                  />
                )}
                {l}
                <span
                  className="hf-num"
                  style={{ color: "var(--hf-ink-4)", fontSize: 11 }}
                >
                  {num}
                </span>
              </Link>
            );
          })}
          <span style={{ flex: 1 }} />
          <span
            className="hf-mono"
            style={{
              fontSize: 11,
              color: "var(--hf-ink-4)",
              letterSpacing: "0.04em",
              alignSelf: "center",
            }}
          >
            showing {filtered.length} of {counts.all}
          </span>
        </div>

        <Panel padded={false}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--hf-ink-4)",
              }}
            >
              No activity recorded yet.
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <Section
                  label="TODAY"
                  rows={today}
                  integrationMap={integrationMap}
                />
              )}
              {earlier.length > 0 && (
                <Section
                  label="EARLIER"
                  rows={earlier}
                  integrationMap={integrationMap}
                />
              )}
            </>
          )}
        </Panel>

        <p
          className="hf-mono"
          style={{
            fontSize: 10.5,
            color: "var(--hf-ink-4)",
            letterSpacing: "0.04em",
            lineHeight: 1.55,
            marginTop: 18,
          }}
        >
          Append-only with per-row integrity hashes. Showing the most recent 200 entries.
          Full export available on Business tier via{" "}
          <Link href="/compliance" className="hf-link-accent">
            /compliance
          </Link>
          .
        </p>
      </div>
    </>
  );
}

function Section({
  label,
  rows,
  integrationMap,
}: {
  label: string;
  rows: Array<typeof auditLog.$inferSelect>;
  integrationMap: Map<string, { id: string; name: string; provider: string }>;
}) {
  return (
    <div>
      <div
        className="hf-mono"
        style={{
          fontSize: 10.5,
          color: "var(--hf-ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          padding: "16px 24px 10px",
          borderBottom: "1px solid var(--hf-line)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        {label} · {rows.length}
      </div>
      {rows.map((r, i) => {
        const meta = ACTION[r.action as AuditAction] ?? {
          label: r.action,
          glyph: "·",
          tone: "ink" as Tone,
          category: "delivery" as const,
        };
        const integ = r.integrationId ? integrationMap.get(r.integrationId) : undefined;
        const detail = formatDetailSnippet(r.action as AuditAction, r.details as Record<string, unknown>);
        return (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 100px",
              gap: 14,
              padding: "14px 24px",
              borderBottom:
                i < rows.length - 1
                  ? "1px solid rgba(255,255,255,0.03)"
                  : "none",
              alignItems: "center",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: TONE_BG[meta.tone],
                color: TONE_FG[meta.tone],
                display: "grid",
                placeItems: "center",
                fontSize: 13,
              }}
            >
              {meta.glyph}
            </span>
            <div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--hf-ink)",
                  lineHeight: 1.4,
                  letterSpacing: "-0.005em",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {meta.label}
                {integ && (
                  <>
                    <span style={{ color: "var(--hf-ink-4)" }}>·</span>
                    <ProviderTag name={integ.provider} />
                    <span
                      className="hf-mono"
                      style={{ fontSize: 11.5, color: "var(--hf-ink-3)" }}
                    >
                      {integ.name}
                    </span>
                  </>
                )}
              </div>
              {detail && (
                <div
                  className="hf-mono"
                  style={{
                    fontSize: 11.5,
                    color: "var(--hf-ink-3)",
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {detail}
                </div>
              )}
            </div>
            <span
              className="hf-mono"
              style={{
                fontSize: 11,
                color: "var(--hf-ink-4)",
                textAlign: "right",
              }}
              title={new Date(r.createdAt).toLocaleString()}
            >
              {fmtAgo(r.createdAt)} ago
            </span>
          </div>
        );
      })}
    </div>
  );
}

function parseCategory(v: string | string[] | undefined): CategoryFilter {
  const s = Array.isArray(v) ? v[0] : v;
  if (
    s === "delivery" ||
    s === "retry" ||
    s === "recon" ||
    s === "circuit" ||
    s === "integration" ||
    s === "alert" ||
    s === "scan"
  ) {
    return s;
  }
  return "all";
}

function formatDetailSnippet(action: AuditAction, details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "";
  switch (action) {
    case "integration.created":
    case "integration.updated":
      return [
        details.name && `name=${String(details.name)}`,
        details.provider && `provider=${String(details.provider)}`,
        details.destinationUrl && `→ ${String(details.destinationUrl)}`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "event.failed":
    case "event.delivered":
    case "event.replayed":
      return [
        details.eventType && `type=${String(details.eventType)}`,
        details.statusCode && `status=${String(details.statusCode)}`,
        details.responseTimeMs && `${String(details.responseTimeMs)}ms`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "circuit.opened":
    case "circuit.closed":
    case "circuit.half_open":
      return [
        details.endpointId && `endpoint=${String(details.endpointId).slice(0, 8)}`,
        details.consecutiveFailures != null &&
          `consec=${String(details.consecutiveFailures)}`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "scan.completed":
      return [
        details.score != null && `score=${String(details.score)}`,
        details.findingsCount != null && `findings=${String(details.findingsCount)}`,
      ]
        .filter(Boolean)
        .join(" · ");
    default: {
      const pairs = Object.entries(details).slice(0, 3);
      return pairs
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" · ");
    }
  }
}
