"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Scan, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SeverityBadge } from "@/components/dashboard/severity-badge";
import type { AnomalySeverity } from "@/types";

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

export function SecurityClient({ endpoints }: { endpoints: EndpointWithScan[] }) {
  const [scanning, setScanning] = useState<Record<string, boolean>>({});
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);

  const totalEndpoints = endpoints.length;
  const scannedEndpoints = endpoints.filter((e) => e.latestScan).length;
  const avgScore =
    scannedEndpoints > 0
      ? Math.round(
          endpoints.reduce((sum, e) => sum + (e.latestScan?.score ?? 0), 0) /
            scannedEndpoints
        )
      : 0;
  const totalVulnerabilities = endpoints.reduce(
    (sum, e) => sum + (e.latestScan?.findings as Array<unknown> ?? []).length,
    0
  );

  async function handleScan(endpointId: string) {
    setScanning((prev) => ({ ...prev, [endpointId]: true }));
    try {
      await fetch("/api/security/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointId }),
      });

      // Poll for results
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

  function scoreColor(score: number): string {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  }

  function scoreGlow(score: number): string {
    if (score >= 80) return "shadow-[0_0_20px_rgba(52,211,153,0.2)]";
    if (score >= 50) return "shadow-[0_0_20px_rgba(251,191,36,0.2)]";
    return "shadow-[0_0_20px_rgba(248,113,113,0.2)]";
  }

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">
          Security Scanner
        </h1>
        <p className="text-[var(--text-tertiary)] mt-1 text-[15px]">
          Automated security audit of your webhook endpoints
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up fade-up-1">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Endpoints
            </span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)] stat-value">
            {totalEndpoints}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Scan className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Avg Score
            </span>
          </div>
          <p className={`text-3xl font-bold tabular-nums stat-value ${scannedEndpoints > 0 ? scoreColor(avgScore) : "text-[var(--text-tertiary)]"}`}>
            {scannedEndpoints > 0 ? avgScore : "—"}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Vulnerabilities
            </span>
          </div>
          <p className={`text-3xl font-bold tabular-nums stat-value ${totalVulnerabilities > 0 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
            {totalVulnerabilities}
          </p>
        </div>
      </div>

      {/* Endpoint List */}
      <div className="fade-up fade-up-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
            Endpoints
          </h2>
        </div>

        {endpoints.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-surface)] mb-4">
              <ShieldCheck className="h-6 w-6 text-[var(--text-faint)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-[15px]">
              No endpoints to scan
            </p>
            <p className="text-[var(--text-faint)] text-sm mt-1 max-w-sm mx-auto">
              Add an integration to start scanning your webhook endpoints for
              security vulnerabilities.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => {
              const scan = ep.latestScan;
              const findings = (scan?.findings ?? []) as Array<{
                vulnerabilityType: string;
                severity: string;
                description: string;
              }>;

              return (
                <div
                  key={ep.id}
                  className="glass rounded-xl p-5 transition-all duration-200 hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {ep.url}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded shrink-0">
                          {ep.integrationName}
                        </span>
                      </div>
                      {scan ? (
                        <div className="flex items-center gap-3 mt-2">
                          <span
                            className={`text-[22px] font-bold tabular-nums ${scoreColor(scan.score)}`}
                          >
                            {scan.score}
                          </span>
                          <span className="text-[11px] text-[var(--text-faint)]">
                            / 100
                          </span>
                          {findings.length > 0 && (
                            <span className="text-[11px] text-red-400/70">
                              {findings.length} finding{findings.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {findings.length === 0 && (
                            <span className="text-[11px] text-emerald-400/70 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              All checks passed
                            </span>
                          )}
                          <span className="text-[11px] text-[var(--text-ghost)] ml-auto">
                            {new Date(scan.scannedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[12px] text-[var(--text-faint)] mt-1">
                          Not scanned yet
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {scan && (
                        <button
                          onClick={() => handleViewScan(scan.id)}
                          className="px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] rounded-lg transition-all"
                        >
                          Details
                        </button>
                      )}
                      <button
                        onClick={() => handleScan(ep.id)}
                        disabled={scanning[ep.id]}
                        className={`px-4 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
                          scanning[ep.id]
                            ? "bg-indigo-500/10 text-indigo-400/50 cursor-wait"
                            : "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
                        }`}
                      >
                        {scanning[ep.id] ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                            Scanning
                          </span>
                        ) : (
                          "Run Scan"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inline findings preview */}
                  {findings.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-2">
                      {findings.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 text-[12px]"
                        >
                          <SeverityBadge
                            severity={f.severity as AnomalySeverity}
                          />
                          <span className="text-[var(--text-tertiary)] line-clamp-1">
                            {f.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scan Detail Modal */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                    selectedScan.score >= 80
                      ? "bg-emerald-500/10"
                      : selectedScan.score >= 50
                        ? "bg-amber-500/10"
                        : "bg-red-500/10"
                  } ${scoreGlow(selectedScan.score)}`}
                >
                  {selectedScan.score >= 80 ? (
                    <ShieldCheck className={`h-6 w-6 ${scoreColor(selectedScan.score)}`} />
                  ) : (
                    <ShieldAlert className={`h-6 w-6 ${scoreColor(selectedScan.score)}`} />
                  )}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${scoreColor(selectedScan.score)}`}>
                    {selectedScan.score} / 100
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Scanned{" "}
                    {new Date(selectedScan.scannedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xl transition-colors"
              >
                &times;
              </button>
            </div>

            {(() => {
              const detailFindings = (selectedScan.findings_detail ?? selectedScan.findings ?? []) as ScanFinding[];
              return detailFindings.length > 0 ? (
              <div className="space-y-4">
                {detailFindings.map((f, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <SeverityBadge severity={f.severity as AnomalySeverity} />
                      <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded">
                        {f.vulnerabilityType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                      {f.description}
                    </p>
                    {f.remediation && (
                    <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                      <p className="text-[11px] font-medium text-emerald-400/80 mb-1">
                        Remediation
                      </p>
                      <p className="text-[12px] text-[var(--text-tertiary)]">
                        {f.remediation}
                      </p>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-[var(--text-secondary)] font-medium">
                  All security checks passed
                </p>
                <p className="text-[var(--text-faint)] text-sm mt-1">
                  No vulnerabilities detected in this scan.
                </p>
              </div>
            );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
