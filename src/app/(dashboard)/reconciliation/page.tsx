export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, reconciliationRuns } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import {
  Chip,
  Dot,
  Icon,
  ProviderMark,
  DashTopbar,
  SectionHeader,
} from "@/components/hw";

export default async function ReconciliationPage() {
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
  const integrationMap = new Map(userIntegrations.map((i) => [i.id, i] as const));

  const runs =
    integrationIds.length > 0
      ? await db
          .select()
          .from(reconciliationRuns)
          .where(inArray(reconciliationRuns.integrationId, integrationIds))
          .orderBy(desc(reconciliationRuns.ranAt))
          .limit(100)
      : [];

  let totalRuns = runs.length;
  let totalGapsDetected = 0;
  let totalGapsResolved = 0;
  let totalProviderEvents = 0;
  for (const run of runs) {
    totalGapsDetected += run.gapsDetected;
    totalGapsResolved += run.gapsResolved;
    totalProviderEvents += run.providerEventsFound;
  }

  return (
    <>
      <DashTopbar
        title="Reconciliation"
        subtitle="HookWise polls provider APIs, compares with ingest log, recovers gaps"
        right={
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: "6px 10px",
              border: "1px solid var(--hw-line-2)",
              borderRadius: 7,
            }}
          >
            <Dot tone={totalGapsDetected > totalGapsResolved ? "amber" : "green"} />
            <span
              className="hw-mono"
              style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
            >
              {totalGapsResolved} recovered · {totalProviderEvents.toLocaleString()} events scanned
            </span>
          </div>
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
        <section
          className="hw-fade-up grid"
          style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
        >
          <Stat
            label="Total runs"
            value={totalRuns.toString()}
            tone="indigo"
            icon="refresh"
          />
          <Stat
            label="Gaps detected"
            value={totalGapsDetected.toString()}
            tone="amber"
            icon="search"
          />
          <Stat
            label="Gaps resolved"
            value={totalGapsResolved.toString()}
            tone="green"
            icon="check"
          />
        </section>

        <section className="hw-fade-up hw-fade-up-1">
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
              <SectionHeader title="Run history" />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
              >
                {runs.length} runs
              </span>
            </div>

            {runs.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                }}
              >
                No reconciliation runs yet. Runs happen every 5 minutes for integrations with API keys configured.
              </div>
            ) : (
              <div>
                {runs.map((run, i) => {
                  const integ = integrationMap.get(run.integrationId);
                  const tone = run.gapsDetected > 0 ? "amber" : "green";
                  return (
                    <div
                      key={run.id}
                      className="flex items-center"
                      style={{
                        padding: "14px 20px",
                        gap: 14,
                        borderTop: i ? "1px solid var(--hw-line)" : "none",
                      }}
                    >
                      <div
                        className="grid place-items-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "var(--hw-bg-3)",
                          border: "1px solid var(--hw-line-2)",
                        }}
                      >
                        <Icon
                          name={run.gapsDetected > 0 ? "alert" : "check"}
                          size={14}
                          color={`var(--hw-${tone})`}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="flex items-center flex-wrap"
                          style={{ gap: 8, marginBottom: 4 }}
                        >
                          {integ && (
                            <ProviderMark provider={integ.provider} size={14} />
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--hw-ink)",
                              fontWeight: 500,
                            }}
                          >
                            {integ?.name ?? "—"}
                          </span>
                          {integ && (
                            <Chip>{integ.provider}</Chip>
                          )}
                        </div>
                        <div
                          className="flex items-center flex-wrap"
                          style={{ gap: 10 }}
                        >
                          <span
                            className="hw-mono"
                            style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                          >
                            {run.providerEventsFound} provider · {run.hookwiseEventsFound} received
                          </span>
                          {run.gapsDetected > 0 && (
                            <Chip tone="amber">
                              {run.gapsDetected} gap
                              {run.gapsDetected === 1 ? "" : "s"}
                            </Chip>
                          )}
                          {run.gapsResolved > 0 && (
                            <Chip tone="green">
                              {run.gapsResolved} resolved
                            </Chip>
                          )}
                        </div>
                      </div>
                      <span
                        className="hw-mono hw-num"
                        style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                      >
                        {new Date(run.ranAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "amber" | "green" | "indigo";
  icon: "refresh" | "search" | "check";
}) {
  const color =
    tone === "amber"
      ? "var(--hw-amber)"
      : tone === "green"
        ? "var(--hw-green)"
        : "var(--hw-indigo-ink)";
  return (
    <div
      className="hw-panel"
      style={{ padding: "18px 20px", background: "var(--hw-bg-2)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="hw-label">{label}</div>
          <div
            className="hw-mono hw-num"
            style={{ fontSize: 26, fontWeight: 500, marginTop: 6, color }}
          >
            {value}
          </div>
        </div>
        <Icon name={icon} size={16} color={color} />
      </div>
    </div>
  );
}
