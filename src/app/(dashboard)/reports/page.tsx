export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { intelligenceReports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Chip, Icon, DashTopbar, SectionHeader } from "@/components/hw";

interface ReportData {
  summary: string;
  highlights: string[];
  anomalySummary: string;
  recommendations: string[];
  providerInsights: Record<string, string>;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reports = await db
    .select()
    .from(intelligenceReports)
    .where(eq(intelligenceReports.userId, user!.id))
    .orderBy(desc(intelligenceReports.createdAt))
    .limit(20);

  return (
    <>
      <DashTopbar
        title="Intelligence reports"
        subtitle="AI-generated weekly insights across every integration"
      />
      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 16,
          overflow: "auto",
          flex: 1,
        }}
      >
        {reports.length === 0 ? (
          <section className="hw-fade-up">
            <div
              className="hw-panel flex flex-col items-center justify-center"
              style={{
                padding: "72px 24px",
                background: "var(--hw-bg-2)",
                textAlign: "center",
                gap: 12,
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
                <Icon name="brain" size={22} color="var(--hw-ink-4)" />
              </div>
              <div style={{ fontSize: 15, color: "var(--hw-ink)" }}>
                No reports yet
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                  maxWidth: 420,
                }}
              >
                Reports are generated weekly once your integrations have enough
                data for AI pattern analysis.
              </div>
            </div>
          </section>
        ) : (
          reports.map((report) => {
            const data = report.report as ReportData | null;
            const periodLabel = `${new Date(report.periodStart).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" },
            )} → ${new Date(report.periodEnd).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`;
            return (
              <section key={report.id} className="hw-fade-up">
                <div
                  className="hw-panel"
                  style={{ padding: 24, background: "var(--hw-bg-2)" }}
                >
                  <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: 16 }}
                  >
                    <div className="flex items-center" style={{ gap: 10 }}>
                      <Icon name="brain" size={14} color="var(--hw-indigo-ink)" />
                      <SectionHeader title="Weekly report" />
                      <Chip>{periodLabel}</Chip>
                    </div>
                    {report.sentAt && <Chip tone="green">sent</Chip>}
                  </div>

                  {data ? (
                    <div className="flex flex-col" style={{ gap: 16 }}>
                      {data.summary && (
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--hw-ink-2)",
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {data.summary}
                        </p>
                      )}
                      {data.highlights?.length > 0 && (
                        <div>
                          <div className="hw-label" style={{ marginBottom: 8 }}>
                            Key highlights
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              padding: 0,
                              listStyle: "none",
                            }}
                          >
                            {data.highlights.map((h, i) => (
                              <li
                                key={i}
                                className="flex items-start"
                                style={{
                                  gap: 8,
                                  fontSize: 12.5,
                                  color: "var(--hw-ink-3)",
                                  lineHeight: 1.55,
                                  padding: "3px 0",
                                }}
                              >
                                <span style={{ color: "var(--hw-indigo-ink)" }}>
                                  ●
                                </span>
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.anomalySummary && (
                        <div
                          className="hw-mono"
                          style={{
                            padding: "12px 14px",
                            background: "rgba(251,191,36,0.06)",
                            border: "1px solid rgba(251,191,36,0.22)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--hw-ink-3)",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--hw-amber)",
                              fontWeight: 500,
                            }}
                          >
                            anomaly summary ·
                          </span>{" "}
                          {data.anomalySummary}
                        </div>
                      )}
                      {data.recommendations?.length > 0 && (
                        <div>
                          <div className="hw-label" style={{ marginBottom: 8 }}>
                            Recommendations
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              padding: 0,
                              listStyle: "none",
                            }}
                          >
                            {data.recommendations.map((r, i) => (
                              <li
                                key={i}
                                className="flex items-start"
                                style={{
                                  gap: 8,
                                  fontSize: 12.5,
                                  color: "var(--hw-ink-3)",
                                  lineHeight: 1.55,
                                  padding: "3px 0",
                                }}
                              >
                                <span style={{ color: "var(--hw-green)" }}>→</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.providerInsights &&
                        Object.keys(data.providerInsights).length > 0 && (
                          <div
                            className="grid"
                            style={{
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 10,
                            }}
                          >
                            {Object.entries(data.providerInsights).map(
                              ([provider, insight]) => (
                                <div
                                  key={provider}
                                  className="hw-panel"
                                  style={{
                                    padding: 12,
                                    background: "var(--hw-bg-3)",
                                  }}
                                >
                                  <div
                                    className="hw-label"
                                    style={{
                                      marginBottom: 4,
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {provider}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11.5,
                                      color: "var(--hw-ink-3)",
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    {insight}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  ) : (
                    <div
                      className="hw-mono"
                      style={{ fontSize: 12, color: "var(--hw-ink-4)" }}
                    >
                      Report data unavailable.
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
