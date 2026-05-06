"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Icon, DashTopbar, SectionHeader } from "@/components/hw";

interface AnalyticsStats {
  eventVolume: number;
  deliverySuccessRate: number;
  avgResponseMs: number;
  failedDeliveries: number;
  anomaliesDetected: number;
  eventsReconciled: number;
  deduplicated: number;
}

interface TopEventType {
  eventType: string;
  count: number;
}

interface HourlyVolume {
  hour: string;
  count: number;
}

const PERIODS: { value: string; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export function AnalyticsClient({
  period,
  stats,
  topEventTypes,
  hourlyVolume,
}: {
  period: string;
  stats: AnalyticsStats;
  topEventTypes: TopEventType[];
  hourlyVolume: HourlyVolume[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(p: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`/analytics?${params.toString()}`);
  }

  const maxVolume = Math.max(...hourlyVolume.map((h) => h.count), 1);
  const maxEventTypeCount = Math.max(...topEventTypes.map((t) => t.count), 1);

  return (
    <>
      <DashTopbar
        title="Analytics"
        subtitle="webhook performance metrics and trends"
        right={
          <div
            className="flex items-center"
            style={{
              gap: 2,
              padding: 4,
              borderRadius: 8,
              border: "1px solid var(--hw-line-2)",
              background: "var(--hw-panel)",
            }}
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className="hw-mono"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  color:
                    period === p.value
                      ? "var(--hw-indigo-ink)"
                      : "var(--hw-ink-3)",
                  background:
                    period === p.value
                      ? "rgba(129,140,248,0.12)"
                      : "transparent",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
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
          style={{
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 12,
          }}
        >
          <Metric
            label="Events"
            value={stats.eventVolume.toLocaleString()}
            icon="activity"
          />
          <Metric
            label="Success"
            value={`${stats.deliverySuccessRate}%`}
            icon="check"
            tone={stats.deliverySuccessRate < 95 ? "red" : "green"}
          />
          <Metric
            label="Latency"
            value={`${stats.avgResponseMs}ms`}
            icon="stopwatch"
          />
          <Metric
            label="Failed"
            value={stats.failedDeliveries.toLocaleString()}
            icon="x"
            tone={stats.failedDeliveries > 0 ? "red" : undefined}
          />
          <Metric
            label="Anomalies"
            value={stats.anomaliesDetected.toLocaleString()}
            icon="alert"
            tone={stats.anomaliesDetected > 0 ? "amber" : undefined}
          />
          <Metric
            label="Reconciled"
            value={stats.eventsReconciled.toLocaleString()}
            icon="refresh"
            tone="green"
          />
          <Metric
            label="Deduped"
            value={stats.deduplicated.toLocaleString()}
            icon="shield"
          />
        </section>

        {/* Hourly volume */}
        <section className="hw-fade-up hw-fade-up-1">
          <div
            className="hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <SectionHeader title="Event volume" />
            <div style={{ marginTop: 16 }}>
              {hourlyVolume.length === 0 ? (
                <div
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    fontSize: 12.5,
                    color: "var(--hw-ink-4)",
                  }}
                >
                  No events in this period.
                </div>
              ) : (
                <>
                  <div
                    className="flex items-end"
                    style={{ gap: 2, height: 160 }}
                  >
                    {hourlyVolume.map((h, i) => {
                      const height = Math.max((h.count / maxVolume) * 100, 2);
                      const date = new Date(h.hour);
                      return (
                        <div
                          key={i}
                          className="relative group"
                          style={{ flex: 1 }}
                          title={`${date.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}: ${h.count} events`}
                        >
                          <div
                            style={{
                              width: "100%",
                              background: "rgba(129,140,248,0.3)",
                              borderRadius: 2,
                              height: `${height}%`,
                              transition: "background 150ms",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="flex justify-between hw-mono"
                    style={{ marginTop: 8, fontSize: 10, color: "var(--hw-ink-5)" }}
                  >
                    <span>
                      {new Date(hourlyVolume[0].hour).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        hour12: false,
                      })}
                    </span>
                    <span>
                      {new Date(
                        hourlyVolume[hourlyVolume.length - 1].hour,
                      ).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Top event types */}
        <section className="hw-fade-up hw-fade-up-2">
          <div
            className="hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <SectionHeader title="Top event types" />
            <div className="flex flex-col" style={{ gap: 10, marginTop: 16 }}>
              {topEventTypes.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    fontSize: 12.5,
                    color: "var(--hw-ink-4)",
                  }}
                >
                  No events in this period.
                </div>
              ) : (
                topEventTypes.map((t, i) => {
                  const width = (t.count / maxEventTypeCount) * 100;
                  return (
                    <div
                      key={t.eventType}
                      className="flex items-center"
                      style={{ gap: 12 }}
                    >
                      <span
                        className="hw-mono hw-num"
                        style={{
                          width: 20,
                          textAlign: "right",
                          fontSize: 11,
                          color: "var(--hw-ink-4)",
                        }}
                      >
                        {i + 1}.
                      </span>
                      <span
                        className="hw-mono"
                        style={{
                          width: 240,
                          flexShrink: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 12,
                          color: "var(--hw-indigo-ink)",
                        }}
                      >
                        {t.eventType}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          background: "var(--hw-ink-6)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${width}%`,
                            height: "100%",
                            background: "rgba(129,140,248,0.5)",
                          }}
                        />
                      </div>
                      <span
                        className="hw-mono hw-num"
                        style={{
                          width: 68,
                          textAlign: "right",
                          fontSize: 12,
                          color: "var(--hw-ink-2)",
                        }}
                      >
                        {t.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon:
    | "activity"
    | "check"
    | "stopwatch"
    | "x"
    | "alert"
    | "refresh"
    | "shield";
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "var(--hw-green)"
      : tone === "amber"
        ? "var(--hw-amber)"
        : tone === "red"
          ? "var(--hw-red)"
          : "var(--hw-ink)";
  const iconColor =
    tone === "green"
      ? "var(--hw-green)"
      : tone === "amber"
        ? "var(--hw-amber)"
        : tone === "red"
          ? "var(--hw-red)"
          : "var(--hw-indigo-ink)";
  return (
    <div
      className="hw-panel"
      style={{ padding: "14px 16px", background: "var(--hw-bg-2)" }}
    >
      <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
        <Icon name={icon} size={12} color={iconColor} />
        <span className="hw-label" style={{ fontSize: 9 }}>
          {label}
        </span>
      </div>
      <div
        className="hw-mono hw-num"
        style={{ fontSize: 20, fontWeight: 500, color }}
      >
        {value}
      </div>
    </div>
  );
}
