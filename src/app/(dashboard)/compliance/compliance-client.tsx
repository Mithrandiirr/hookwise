"use client";

import { useState } from "react";
import {
  FileCheck,
  Download,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import type { AuditAction, ComplianceFormat } from "@/types";

interface AuditEntry {
  id: string;
  userId: string;
  integrationId: string | null;
  eventId: string | null;
  action: string;
  details: unknown;
  integrityHash: string;
  createdAt: Date | string;
}

interface ExportEntry {
  id: string;
  format: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  status: string;
  createdAt: Date | string;
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  "event.received": { bg: "bg-indigo-500/10", text: "text-indigo-400" },
  "event.delivered": { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "event.failed": { bg: "bg-red-500/10", text: "text-red-400" },
  "event.replayed": { bg: "bg-amber-500/10", text: "text-amber-400" },
  "circuit.opened": { bg: "bg-red-500/10", text: "text-red-400" },
  "circuit.closed": { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "circuit.half_open": { bg: "bg-amber-500/10", text: "text-amber-400" },
  "integration.created": { bg: "bg-indigo-500/10", text: "text-indigo-400" },
  "integration.updated": { bg: "bg-indigo-500/10", text: "text-indigo-400" },
  "integration.deleted": { bg: "bg-red-500/10", text: "text-red-400" },
  "scan.completed": { bg: "bg-indigo-500/10", text: "text-indigo-400" },
  "export.created": { bg: "bg-indigo-500/10", text: "text-indigo-400" },
};

const ALL_ACTIONS: AuditAction[] = [
  "event.received",
  "event.delivered",
  "event.failed",
  "event.replayed",
  "circuit.opened",
  "circuit.closed",
  "circuit.half_open",
  "integration.created",
  "integration.updated",
  "integration.deleted",
  "scan.completed",
  "export.created",
];

interface ComplianceStatus {
  auditLogEnabled: boolean;
  integrityHashingEnabled: boolean;
  exportCapability: boolean;
  dataRetentionConfigured: boolean;
  securityScanningEnabled: boolean;
}

function complianceScore(status: ComplianceStatus): number {
  const checks = [
    status.auditLogEnabled,
    status.integrityHashingEnabled,
    status.exportCapability,
    status.dataRetentionConfigured,
    status.securityScanningEnabled,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function ComplianceCheck({
  label,
  requirement,
  passed,
}: {
  label: string;
  requirement: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
      )}
      <div className="min-w-0">
        <p className={`text-[13px] font-medium ${passed ? "text-[var(--text-secondary)]" : "text-red-400/80"}`}>
          {label}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">{requirement}</p>
      </div>
    </div>
  );
}

export function ComplianceClient({
  auditEntries,
  exports: exportEntries,
  integrationMap,
  complianceStatus,
}: {
  auditEntries: AuditEntry[];
  exports: ExportEntry[];
  integrationMap: Record<string, string>;
  complianceStatus: ComplianceStatus;
}) {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<ComplianceFormat>("json");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    checked: number;
    firstBrokenId?: string;
  } | null>(null);

  const filteredEntries =
    filterAction === "all"
      ? auditEntries
      : auditEntries.filter((e) => e.action === filterAction);

  async function handleExport() {
    if (!exportStart || !exportEnd) return;
    setExporting(true);
    try {
      const res = await fetch("/api/compliance/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          periodStart: new Date(exportStart).toISOString(),
          periodEnd: new Date(exportEnd).toISOString(),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        // Download the data
        const blob = new Blob([result.data], {
          type: exportFormat === "csv" ? "text/csv" : "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hookwise-audit-${exportStart}-${exportEnd}.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/compliance/verify", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setVerifyResult(result);
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">
          Compliance
        </h1>
        <p className="text-[var(--text-tertiary)] mt-1 text-[15px]">
          Immutable audit trail with integrity verification
        </p>
      </div>

      {/* Export + Verify Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-1">
        {/* Export Panel */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-4 w-4 text-indigo-400" />
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Export Audit Trail
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500/30"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as ComplianceFormat)
                }
                className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500/30"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={handleExport}
                disabled={exporting || !exportStart || !exportEnd}
                className="flex-1 px-4 py-2 text-[12px] font-medium bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {exporting ? "Generating..." : "Generate Export"}
              </button>
            </div>
          </div>
        </div>

        {/* Verify Panel */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Integrity Verification
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
            Verify the cryptographic chain of your audit trail to detect any
            tampering or missing entries.
          </p>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full px-4 py-2.5 text-[12px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded-lg transition-all disabled:opacity-40"
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              "Verify Integrity"
            )}
          </button>
          {verifyResult && (
            <div
              className={`mt-4 p-3 rounded-lg border ${
                verifyResult.valid
                  ? "bg-emerald-500/5 border-emerald-500/10"
                  : "bg-red-500/5 border-red-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {verifyResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span
                  className={`text-[13px] font-medium ${
                    verifyResult.valid ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {verifyResult.valid
                    ? "Chain verified"
                    : "Chain integrity broken"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                {verifyResult.checked} entries checked
                {verifyResult.firstBrokenId &&
                  ` — first broken at ${verifyResult.firstBrokenId.slice(0, 8)}...`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PCI DSS Readiness */}
      <div className="fade-up fade-up-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
            PCI DSS Readiness
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 lg:col-span-2">
            <ComplianceCheck
              label="Audit Trail Active"
              requirement="Req 10.2 — Implement automated audit trails"
              passed={complianceStatus.auditLogEnabled}
            />
            <ComplianceCheck
              label="Integrity Hashing"
              requirement="Req 10.5 — Secure audit trails so they cannot be altered"
              passed={complianceStatus.integrityHashingEnabled}
            />
            <ComplianceCheck
              label="Export Capability"
              requirement="Req 10.7 — Retain audit trail history for at least one year"
              passed={complianceStatus.exportCapability}
            />
            <ComplianceCheck
              label="Data Retention Configured"
              requirement="Req 3.1 — Keep cardholder data storage to a minimum"
              passed={complianceStatus.dataRetentionConfigured}
            />
            <ComplianceCheck
              label="Security Scanning"
              requirement="Req 11.2 — Run vulnerability scans at least quarterly"
              passed={complianceStatus.securityScanningEnabled}
            />
          </div>
          <div className="glass rounded-xl p-5 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold tabular-nums text-[var(--text-primary)] mb-2">
              {complianceScore(complianceStatus)}
              <span className="text-2xl text-[var(--text-tertiary)]">%</span>
            </div>
            <p className="text-[12px] text-[var(--text-tertiary)] text-center">
              Compliance Score
            </p>
            <div className="w-full mt-4 bg-[var(--bg-surface-hover)] rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  complianceScore(complianceStatus) === 100
                    ? "bg-emerald-400"
                    : complianceScore(complianceStatus) >= 60
                      ? "bg-amber-400"
                      : "bg-red-400"
                }`}
                style={{ width: `${complianceScore(complianceStatus)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="fade-up fade-up-3">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-indigo-500" />
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
              Audit Timeline
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[var(--text-faint)]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[11px] text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500/30"
            >
              <option value="all">All actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-surface)] mb-4">
              <FileCheck className="h-6 w-6 text-[var(--text-faint)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-[15px]">
              No audit entries yet
            </p>
            <p className="text-[var(--text-faint)] text-sm mt-1 max-w-sm mx-auto">
              Audit entries will appear here as events flow through your
              integrations.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const colors = ACTION_COLORS[entry.action] ?? {
                bg: "bg-[var(--bg-surface)]",
                text: "text-[var(--text-tertiary)]",
              };

              return (
                <div
                  key={entry.id}
                  className="glass rounded-xl p-4 flex items-center gap-4"
                >
                  {/* Action badge */}
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text} shrink-0`}
                  >
                    {entry.action}
                  </span>

                  {/* Integration name */}
                  {entry.integrationId && (
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {integrationMap[entry.integrationId] ?? "Unknown"}
                    </span>
                  )}

                  {/* Details summary */}
                  <span className="text-[12px] text-[var(--text-tertiary)] truncate flex-1 min-w-0">
                    {summarizeDetails(entry.details)}
                  </span>

                  {/* Hash preview */}
                  <span className="text-[10px] text-[var(--text-ghost)] font-mono shrink-0">
                    {entry.integrityHash.slice(0, 12)}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[11px] text-[var(--text-faint)] tabular-nums shrink-0">
                    {new Date(entry.createdAt).toLocaleString("en-US", {
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

      {/* Previous Exports */}
      {exportEntries.length > 0 && (
        <div className="fade-up fade-up-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 rounded-full bg-indigo-500" />
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
              Previous Exports
            </h2>
          </div>
          <div className="space-y-2">
            {exportEntries.map((exp) => (
              <div
                key={exp.id}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <Clock className="h-4 w-4 text-[var(--text-faint)] shrink-0" />
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {exp.format.toUpperCase()} export
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {new Date(exp.periodStart).toLocaleDateString()} —{" "}
                  {new Date(exp.periodEnd).toLocaleDateString()}
                </span>
                <span
                  className={`ml-auto text-[11px] px-2 py-0.5 rounded ${
                    exp.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {exp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function summarizeDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");
}
