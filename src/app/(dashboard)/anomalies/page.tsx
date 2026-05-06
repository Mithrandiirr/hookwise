export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";
import { Chip, Dot, Icon, DashTopbar } from "@/components/hw";

type Severity = "low" | "medium" | "high" | "critical";

function severityTone(s: Severity): "red" | "amber" | "indigo" {
  if (s === "critical" || s === "high") return "red";
  if (s === "medium") return "amber";
  return "indigo";
}

export default async function AnomaliesPage() {
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
  const integrationMap = new Map(
    userIntegrations.map((i) => [i.id, i] as const),
  );

  const allAnomalies =
    integrationIds.length > 0
      ? await db
          .select()
          .from(anomalies)
          .where(inArray(anomalies.integrationId, integrationIds))
          .orderBy(desc(anomalies.detectedAt))
          .limit(120)
      : [];

  const activeCount = allAnomalies.filter((a) => !a.resolvedAt).length;
  const resolvedCount = allAnomalies.filter((a) => a.resolvedAt).length;
  let totalRevenueAtRisk = 0;
  let diagnosedCount = 0;
  for (const a of allAnomalies) {
    const d = parseDiagnosis(a.diagnosis);
    if (d.evidence.length > 0) diagnosedCount++;
    if (!a.resolvedAt && d.severityAssessment.revenueAtRisk) {
      totalRevenueAtRisk += d.severityAssessment.revenueAtRisk;
    }
  }

  return (
    <>
      <DashTopbar
        title="Anomalies"
        subtitle="AI-detected incidents across every integration"
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
              <Dot tone={activeCount > 0 ? "red" : "green"} quiet={activeCount === 0} />
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
              >
                {activeCount} open · {resolvedCount} resolved
              </span>
            </div>
            <button type="button" className="hw-btn hw-btn-ghost">
              <Icon name="filter" size={13} /> Last 30d
            </button>
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
        {/* Summary strip */}
        <section
          className="hw-fade-up grid"
          style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
        >
          <StatCell
            label="Active"
            value={activeCount.toString()}
            tone={activeCount > 0 ? "red" : "indigo"}
            icon="alert"
          />
          <StatCell
            label="Resolved · 120"
            value={resolvedCount.toString()}
            tone="green"
            icon="shield"
          />
          <StatCell
            label="Revenue at risk"
            value={
              totalRevenueAtRisk > 0
                ? `$${(totalRevenueAtRisk / 100).toFixed(0)}`
                : "$0"
            }
            tone={totalRevenueAtRisk > 0 ? "amber" : "indigo"}
            icon="dollar"
          />
          <StatCell
            label="AI diagnosed"
            value={diagnosedCount.toString()}
            tone="indigo"
            icon="brain"
          />
        </section>

        {/* Timeline list */}
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
              <span className="hw-label">INCIDENT TIMELINE · {allAnomalies.length}</span>
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
              >
                newest first
              </span>
            </div>

            {allAnomalies.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center"
                style={{ padding: "56px 24px", gap: 10, textAlign: "center" }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "var(--hw-panel)",
                    border: "1px solid var(--hw-line)",
                  }}
                >
                  <Icon name="shield" size={18} color="var(--hw-ink-4)" />
                </div>
                <div style={{ fontSize: 14, color: "var(--hw-ink-2)" }}>
                  No anomalies detected
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--hw-ink-4)",
                    maxWidth: 360,
                  }}
                >
                  Anomalies appear here once your integrations have enough data
                  for AI pattern learning (200+ events).
                </div>
              </div>
            ) : (
              <div>
                {allAnomalies.map((a, i) => {
                  const integ = integrationMap.get(a.integrationId);
                  const d = parseDiagnosis(a.diagnosis);
                  const tone = a.resolvedAt
                    ? "green"
                    : severityTone(a.severity as Severity);
                  const revenue = d.severityAssessment.revenueAtRisk;
                  return (
                    <Link
                      key={a.id}
                      href={`/anomalies/${a.id}`}
                      className="grid items-start"
                      style={{
                        gridTemplateColumns: "20px 1fr auto",
                        gap: 16,
                        padding: "16px 20px",
                        borderTop: i ? "1px solid var(--hw-line)" : "none",
                      }}
                    >
                      <div style={{ paddingTop: 6 }}>
                        <Dot tone={tone} quiet={!!a.resolvedAt} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="flex items-center flex-wrap"
                          style={{ gap: 8, marginBottom: 6 }}
                        >
                          <Chip tone={tone === "green" ? "green" : tone}>
                            {a.severity}
                          </Chip>
                          <span
                            className="hw-mono"
                            style={{ fontSize: 11.5, color: "var(--hw-ink-2)" }}
                          >
                            {a.type}
                          </span>
                          {integ && (
                            <span
                              className="hw-mono"
                              style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                            >
                              · {integ.name}
                            </span>
                          )}
                          {a.resolvedAt && <Chip tone="green">resolved</Chip>}
                          {d.evidence.length > 0 && (
                            <Chip tone="indigo">
                              <Icon name="brain" size={10} /> {d.evidence.length} steps
                            </Chip>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--hw-ink)",
                            lineHeight: 1.5,
                          }}
                        >
                          {d.what}
                        </div>
                        {d.recommendation && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--hw-ink-3)",
                              marginTop: 4,
                              lineHeight: 1.5,
                            }}
                          >
                            {d.recommendation}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex flex-col items-end"
                        style={{ gap: 6 }}
                      >
                        <span
                          className="hw-mono hw-num"
                          style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                        >
                          {formatTime(a.detectedAt)}
                        </span>
                        {revenue !== null && revenue > 0 && (
                          <Chip tone="amber">
                            ${(revenue / 100).toFixed(2)}
                          </Chip>
                        )}
                        {d.evidence.length > 0 && (
                          <span
                            className="hw-mono hw-num"
                            style={{
                              fontSize: 11,
                              color: "var(--hw-indigo-ink)",
                            }}
                          >
                            {((d.confidence ?? 0) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </Link>
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

function StatCell({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "red" | "green" | "amber" | "indigo";
  icon: "alert" | "shield" | "dollar" | "brain";
}) {
  const color =
    tone === "red"
      ? "var(--hw-red)"
      : tone === "green"
        ? "var(--hw-green)"
        : tone === "amber"
          ? "var(--hw-amber)"
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
            style={{
              fontSize: 28,
              fontWeight: 500,
              marginTop: 6,
              color,
            }}
          >
            {value}
          </div>
        </div>
        <Icon name={icon} size={16} color={color} />
      </div>
    </div>
  );
}

function formatTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
