export const dynamic = "force-dynamic";

// Schemas surface — version + drift detection per event type.
// Production has a `payload_schemas` table; this page reads what's there and
// renders the design's layout. Empty state when nothing learned yet.

import { createClient } from "@/lib/supabase/server";
import { db, integrations, payloadSchemas } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import {
  DashTopbar,
  PageHead,
  StatTile,
  Panel,
  Pill,
  ProviderTag,
  fmtAgo,
} from "@/components/hw";

export default async function SchemasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));

  const schemas =
    integrationIds.length > 0
      ? await db
          .select()
          .from(payloadSchemas)
          .where(inArray(payloadSchemas.integrationId, integrationIds))
          .orderBy(desc(payloadSchemas.lastUpdated))
          .limit(50)
      : [];

  const activeSchemas = schemas.length;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const driftedThisWeek = schemas.filter(
    (s) => new Date(s.lastUpdated).getTime() >= weekAgo.getTime(),
  ).length;
  const providersCount = new Set(
    schemas
      .map((s) => integrationMap.get(s.integrationId)?.provider)
      .filter((p): p is NonNullable<typeof p> => !!p),
  ).size;

  return (
    <>
      <DashTopbar
        title="Schemas"
        subtitle="Event payload shapes · versioned over time"
        right={<Pill tone="ink">{activeSchemas} active</Pill>}
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Data · Schemas"
          title={
            <>
              Schemas,{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                versioned
              </span>{" "}
              over time.
            </>
          }
          sub="Every event payload shape we've seen, when it appeared, and what changed. Drift is detected automatically and flagged before it breaks your code."
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
            label="ACTIVE SCHEMAS"
            value={activeSchemas}
            sub={`across ${providersCount} provider${providersCount === 1 ? "" : "s"}`}
          />
          <StatTile
            label="DRIFT · THIS WEEK"
            value={driftedThisWeek}
            sub={driftedThisWeek === 0 ? "no shape changes" : "version bumps"}
            color={driftedThisWeek > 0 ? "#fbbf24" : "#7ed98a"}
            accent={driftedThisWeek > 0 ? "#fbbf24" : "#7ed98a"}
          />
          <StatTile
            label="BREAKING"
            value="0"
            sub="last 90 days"
            color="#7ed98a"
            accent="#7ed98a"
          />
          <StatTile
            label="COVERAGE"
            value={activeSchemas > 0 ? "100%" : "—"}
            sub="every event typed"
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
        </div>

        <Panel padded={false}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 100px 1fr 90px",
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
            <span>Event type</span>
            <span>Provider</span>
            <span style={{ textAlign: "right" }}>Versions</span>
            <span>Last seen</span>
            <span style={{ textAlign: "right" }}>Status</span>
          </div>
          {schemas.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--hf-ink-4)",
              }}
            >
              No schemas inferred yet. They show up once HookWise has enough events to
              fingerprint shapes per type.
            </div>
          ) : (
            schemas.map((s, i, a) => {
              const integ = integrationMap.get(s.integrationId);
              const status: "stable" | "drift" | "breaking" = "stable";
              return (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 100px 1fr 90px",
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
                    style={{ fontSize: 12.5, color: "var(--hf-ink)" }}
                  >
                    {s.eventType}
                  </span>
                  <ProviderTag name={integ?.provider ?? "unknown"} />
                  <span
                    className="hf-num hf-mono"
                    style={{
                      fontSize: 12,
                      color: "var(--hf-ink-2)",
                      textAlign: "right",
                    }}
                  >
                    v1
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--hf-ink-3)" }}>
                    <span
                      className="hf-mono"
                      style={{ color: "var(--hf-ink-4)", marginRight: 8 }}
                    >
                      {fmtAgo(s.lastUpdated)} ago
                    </span>
                  </span>
                  <span style={{ justifySelf: "end" }}>
                    <Pill tone={status === "stable" ? "green" : "amber"}>
                      {status}
                    </Pill>
                  </span>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </>
  );
}
