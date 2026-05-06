"use client";

import { useState } from "react";
import { Chip, Dot, Icon, DashTopbar, SectionHeader } from "@/components/hw";

interface ScanData {
  id: string;
  endpointId: string;
  scanType: string;
  findings: unknown;
  score: number;
  scannedAt: Date | string;
}

interface EndpointWithScan {
  id: string;
  url: string;
  integrationId: string;
  integrationName: string;
  provider: string;
  latestScan: ScanData | null;
}

interface ScanFinding {
  vulnerabilityType: string;
  severity: string;
  description: string;
  remediation?: string;
}

interface ScanDetail {
  id: string;
  endpointId: string;
  scanType: string;
  findings: unknown;
  score: number;
  scannedAt: string;
  findings_detail?: ScanFinding[];
}

function scoreTone(score: number): "green" | "amber" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function severityChipTone(s: string): "red" | "amber" | "indigo" {
  if (s === "critical" || s === "high") return "red";
  if (s === "medium") return "amber";
  return "indigo";
}

export function SecurityClient({
  endpoints,
}: {
  endpoints: EndpointWithScan[];
}) {
  const [scanning, setScanning] = useState<Record<string, boolean>>({});
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);

  const totalEndpoints = endpoints.length;
  const scannedEndpoints = endpoints.filter((e) => e.latestScan).length;
  const avgScore =
    scannedEndpoints > 0
      ? Math.round(
          endpoints.reduce((sum, e) => sum + (e.latestScan?.score ?? 0), 0) /
            scannedEndpoints,
        )
      : 0;
  const totalVulnerabilities = endpoints.reduce(
    (sum, e) => sum + ((e.latestScan?.findings as Array<unknown>) ?? []).length,
    0,
  );

  async function handleScan(endpointId: string) {
    setScanning((prev) => ({ ...prev, [endpointId]: true }));
    try {
      await fetch("/api/security/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointId }),
      });
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(poll);
          setScanning((prev) => ({ ...prev, [endpointId]: false }));
          return;
        }
        const res = await fetch("/api/security/scans");
        const scans: ScanData[] = await res.json();
        const latest = scans.find((s) => s.endpointId === endpointId);
        if (latest) {
          clearInterval(poll);
          setScanning((prev) => ({ ...prev, [endpointId]: false }));
          window.location.reload();
        }
      }, 2000);
    } catch {
      setScanning((prev) => ({ ...prev, [endpointId]: false }));
    }
  }

  async function handleViewScan(scanId: string) {
    const res = await fetch(`/api/security/scans/${scanId}`);
    if (res.ok) {
      const data: ScanDetail = await res.json();
      setSelectedScan(data);
    }
  }

  return (
    <>
      <DashTopbar
        title="Security scanner"
        subtitle="audit your webhook endpoints for invalid signatures, replay risk, injection"
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
            <Dot tone={totalVulnerabilities > 0 ? "red" : "green"} />
            <span
              className="hw-mono"
              style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
            >
              {scannedEndpoints} / {totalEndpoints} scanned · {totalVulnerabilities} findings
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
            label="Endpoints"
            value={totalEndpoints.toString()}
            icon="shield"
          />
          <Stat
            label="Avg score"
            value={scannedEndpoints > 0 ? avgScore.toString() : "—"}
            icon="chart"
            tone={scannedEndpoints > 0 ? scoreTone(avgScore) : undefined}
          />
          <Stat
            label="Vulnerabilities"
            value={totalVulnerabilities.toString()}
            icon="alert"
            tone={totalVulnerabilities > 0 ? "red" : undefined}
          />
        </section>

        <section className="hw-fade-up hw-fade-up-1">
          <div
            className="hw-panel overflow-hidden"
            style={{ background: "var(--hw-bg-2)" }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hw-line)",
              }}
            >
              <SectionHeader title="Endpoints" />
            </div>
            {endpoints.length === 0 ? (
              <div
                style={{
                  padding: "56px 24px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--hw-ink-4)",
                }}
              >
                No endpoints to scan. Add an integration to get started.
              </div>
            ) : (
              <div>
                {endpoints.map((ep, i) => {
                  const scan = ep.latestScan;
                  const findings = (scan?.findings ?? []) as Array<{
                    vulnerabilityType: string;
                    severity: string;
                    description: string;
                  }>;
                  const tone = scan ? scoreTone(scan.score) : undefined;
                  return (
                    <div
                      key={ep.id}
                      style={{
                        padding: "16px 20px",
                        borderTop: i ? "1px solid var(--hw-line)" : "none",
                      }}
                    >
                      <div
                        className="flex items-center"
                        style={{ gap: 14 }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            className="flex items-center"
                            style={{ gap: 10, marginBottom: 6 }}
                          >
                            <span
                              className="hw-mono"
                              style={{
                                fontSize: 12.5,
                                color: "var(--hw-ink)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 320,
                              }}
                            >
                              {ep.url}
                            </span>
                            <Chip>{ep.integrationName}</Chip>
                          </div>
                          {scan ? (
                            <div
                              className="flex items-center flex-wrap"
                              style={{ gap: 12 }}
                            >
                              <span
                                className="hw-mono hw-num"
                                style={{
                                  fontSize: 22,
                                  fontWeight: 500,
                                  color: `var(--hw-${tone})`,
                                }}
                              >
                                {scan.score}
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--hw-ink-4)",
                                    marginLeft: 4,
                                  }}
                                >
                                  / 100
                                </span>
                              </span>
                              {findings.length > 0 ? (
                                <Chip tone="red">
                                  {findings.length} finding
                                  {findings.length !== 1 ? "s" : ""}
                                </Chip>
                              ) : (
                                <Chip tone="green">
                                  <Icon name="check" size={10} /> all checks passed
                                </Chip>
                              )}
                              <span
                                className="hw-mono hw-num"
                                style={{
                                  fontSize: 11,
                                  color: "var(--hw-ink-4)",
                                  marginLeft: "auto",
                                }}
                              >
                                {new Date(scan.scannedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="hw-mono"
                              style={{
                                fontSize: 11,
                                color: "var(--hw-ink-4)",
                              }}
                            >
                              not scanned yet
                            </div>
                          )}
                        </div>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          {scan && (
                            <button
                              type="button"
                              onClick={() => handleViewScan(scan.id)}
                              className="hw-btn hw-btn-ghost"
                            >
                              Details
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleScan(ep.id)}
                            disabled={scanning[ep.id]}
                            className="hw-btn hw-btn-indigo"
                            style={{ opacity: scanning[ep.id] ? 0.6 : 1 }}
                          >
                            {scanning[ep.id] ? (
                              <>
                                <Dot tone="indigo" /> Scanning…
                              </>
                            ) : (
                              <>
                                <Icon name="search" size={13} /> Run scan
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {findings.length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid var(--hw-line)",
                          }}
                        >
                          <div className="flex flex-col" style={{ gap: 6 }}>
                            {findings.map((f, idx) => (
                              <div
                                key={idx}
                                className="flex items-center"
                                style={{ gap: 10 }}
                              >
                                <Chip tone={severityChipTone(f.severity)}>
                                  {f.severity}
                                </Chip>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--hw-ink-3)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {f.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedScan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="hw-panel hw-scroll"
            style={{
              padding: 28,
              maxWidth: 680,
              width: "calc(100% - 32px)",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "var(--hw-bg-2)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 20 }}
            >
              <div className="flex items-center" style={{ gap: 14 }}>
                <div
                  className="grid place-items-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `rgba(${
                      scoreTone(selectedScan.score) === "green"
                        ? "74,222,128"
                        : scoreTone(selectedScan.score) === "amber"
                          ? "251,191,36"
                          : "248,113,113"
                    },0.1)`,
                    border: `1px solid var(--hw-${scoreTone(selectedScan.score)})`,
                  }}
                >
                  <Icon
                    name="shield"
                    size={22}
                    color={`var(--hw-${scoreTone(selectedScan.score)})`}
                  />
                </div>
                <div>
                  <div
                    className="hw-mono hw-num"
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: `var(--hw-${scoreTone(selectedScan.score)})`,
                    }}
                  >
                    {selectedScan.score} / 100
                  </div>
                  <div
                    className="hw-mono"
                    style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                  >
                    scanned{" "}
                    {new Date(selectedScan.scannedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                aria-label="Close"
                className="grid place-items-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: "1px solid var(--hw-line-2)",
                  background: "var(--hw-bg-3)",
                  color: "var(--hw-ink-3)",
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            {(() => {
              const detailFindings = (selectedScan.findings_detail ??
                selectedScan.findings ??
                []) as ScanFinding[];
              return detailFindings.length > 0 ? (
                <div className="flex flex-col" style={{ gap: 14 }}>
                  {detailFindings.map((f, idx) => (
                    <div
                      key={idx}
                      className="hw-panel"
                      style={{
                        padding: 18,
                        background: "var(--hw-bg-3)",
                      }}
                    >
                      <div
                        className="flex items-center"
                        style={{ gap: 10, marginBottom: 10 }}
                      >
                        <Chip tone={severityChipTone(f.severity)}>
                          {f.severity}
                        </Chip>
                        <Chip>{f.vulnerabilityType.replace(/_/g, " ")}</Chip>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--hw-ink-2)",
                          marginBottom: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        {f.description}
                      </div>
                      {f.remediation && (
                        <div
                          className="hw-mono"
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "rgba(74,222,128,0.06)",
                            border: "1px solid rgba(74,222,128,0.22)",
                            fontSize: 11.5,
                            color: "var(--hw-ink-3)",
                          }}
                        >
                          <span
                            style={{ color: "var(--hw-green)", fontWeight: 500 }}
                          >
                            remediate ·
                          </span>{" "}
                          {f.remediation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                  }}
                >
                  <Icon
                    name="check"
                    size={28}
                    color="var(--hw-green)"
                    style={{ display: "inline-block" }}
                  />
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--hw-ink-2)",
                      marginTop: 12,
                      fontWeight: 500,
                    }}
                  >
                    All security checks passed
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--hw-ink-4)",
                      marginTop: 4,
                    }}
                  >
                    No vulnerabilities detected in this scan.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: "shield" | "chart" | "alert";
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
  const iconColor = tone ? `var(--hw-${tone})` : "var(--hw-indigo-ink)";
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
        <Icon name={icon} size={16} color={iconColor} />
      </div>
    </div>
  );
}
