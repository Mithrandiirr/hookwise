"use client";

import { useState } from "react";
import type { AuditAction, ComplianceFormat } from "@/types";
import { Chip, Dot, Icon, DashTopbar, SectionHeader } from "@/components/hw";

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

const ACTION_TONE: Record<string, "green" | "amber" | "red" | "indigo"> = {
  "event.received": "indigo",
  "event.delivered": "green",
  "event.failed": "red",
  "event.replayed": "amber",
  "circuit.opened": "red",
  "circuit.closed": "green",
  "circuit.half_open": "amber",
  "integration.created": "indigo",
  "integration.updated": "indigo",
  "integration.deleted": "red",
  "scan.completed": "indigo",
  "export.created": "indigo",
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

function complianceScore(s: ComplianceStatus): number {
  const checks = [
    s.auditLogEnabled,
    s.integrityHashingEnabled,
    s.exportCapability,
    s.dataRetentionConfigured,
    s.securityScanningEnabled,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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
  const score = complianceScore(complianceStatus);
  const scoreTone = score === 100 ? "green" : score >= 60 ? "amber" : "red";

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
      if (res.ok) setVerifyResult(await res.json());
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <DashTopbar
        title="Compliance"
        subtitle="immutable audit trail with cryptographic integrity"
        right={
          <Chip tone={scoreTone}>
            <Dot tone={scoreTone} quiet />
            {score}% compliance
          </Chip>
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
        {/* Export + verify */}
        <section
          className="hw-fade-up grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div
            className="hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center"
              style={{ gap: 10, marginBottom: 14 }}
            >
              <Icon name="copy" size={14} color="var(--hw-indigo-ink)" />
              <SectionHeader title="Export audit trail" />
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}
            >
              <Field label="From">
                <input
                  type="date"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  className="hw-input hw-mono"
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  className="hw-input hw-mono"
                />
              </Field>
            </div>
            <div className="flex items-center" style={{ gap: 10 }}>
              <select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as ComplianceFormat)
                }
                className="hw-input"
                style={{ width: 120 }}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || !exportStart || !exportEnd}
                className="hw-btn hw-btn-indigo"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  opacity:
                    exporting || !exportStart || !exportEnd ? 0.5 : 1,
                }}
              >
                {exporting ? "Generating…" : "Generate export"}
              </button>
            </div>
          </div>

          <div
            className="hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center"
              style={{ gap: 10, marginBottom: 14 }}
            >
              <Icon name="shield" size={14} color="var(--hw-green)" />
              <SectionHeader title="Integrity verification" />
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--hw-ink-3)",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Walk the cryptographic chain across every audit entry. A break detects
              tampering or a missing record.
            </div>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="hw-btn"
              style={{
                width: "100%",
                justifyContent: "center",
                background: "rgba(74,222,128,0.1)",
                color: "var(--hw-green)",
                border: "1px solid rgba(74,222,128,0.25)",
                opacity: verifying ? 0.6 : 1,
              }}
            >
              {verifying ? "Verifying…" : "Verify integrity"}
            </button>
            {verifyResult && (
              <div
                className="hw-mono"
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: verifyResult.valid
                    ? "rgba(74,222,128,0.06)"
                    : "rgba(248,113,113,0.06)",
                  border: verifyResult.valid
                    ? "1px solid rgba(74,222,128,0.22)"
                    : "1px solid rgba(248,113,113,0.22)",
                  fontSize: 12,
                  color: verifyResult.valid
                    ? "var(--hw-green)"
                    : "var(--hw-red)",
                }}
              >
                {verifyResult.valid ? "chain verified" : "chain broken"} ·{" "}
                <span style={{ color: "var(--hw-ink-3)" }}>
                  {verifyResult.checked} entries checked
                </span>
                {verifyResult.firstBrokenId && (
                  <span style={{ color: "var(--hw-ink-3)" }}>
                    {" "}
                    · first broken at {verifyResult.firstBrokenId.slice(0, 8)}…
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* PCI DSS */}
        <section className="hw-fade-up hw-fade-up-1">
          <div
            className="grid"
            style={{ gridTemplateColumns: "2fr 1fr", gap: 16 }}
          >
            <div
              className="hw-panel"
              style={{ padding: 22, background: "var(--hw-bg-2)" }}
            >
              <SectionHeader title="PCI DSS readiness" />
              <div
                className="flex flex-col"
                style={{ gap: 4, marginTop: 14 }}
              >
                <ComplianceCheck
                  label="Audit trail active"
                  requirement="Req 10.2 — automated audit trails"
                  passed={complianceStatus.auditLogEnabled}
                />
                <ComplianceCheck
                  label="Integrity hashing"
                  requirement="Req 10.5 — secure audit trails so they cannot be altered"
                  passed={complianceStatus.integrityHashingEnabled}
                />
                <ComplianceCheck
                  label="Export capability"
                  requirement="Req 10.7 — retain audit history ≥ 1 year"
                  passed={complianceStatus.exportCapability}
                />
                <ComplianceCheck
                  label="Data retention"
                  requirement="Req 3.1 — minimize cardholder data storage"
                  passed={complianceStatus.dataRetentionConfigured}
                />
                <ComplianceCheck
                  label="Security scanning"
                  requirement="Req 11.2 — vulnerability scans ≥ quarterly"
                  passed={complianceStatus.securityScanningEnabled}
                />
              </div>
            </div>

            <div
              className="hw-panel flex flex-col items-center justify-center"
              style={{
                padding: 28,
                background: "var(--hw-bg-2)",
                textAlign: "center",
              }}
            >
              <div
                className="hw-mono hw-num"
                style={{
                  fontSize: 56,
                  fontWeight: 500,
                  color: `var(--hw-${scoreTone})`,
                  letterSpacing: "-0.04em",
                }}
              >
                {score}
                <span style={{ fontSize: 22, color: "var(--hw-ink-4)" }}>%</span>
              </div>
              <div
                className="hw-label"
                style={{ marginTop: 4 }}
              >
                Compliance score
              </div>
              <div
                style={{
                  width: "100%",
                  height: 4,
                  background: "var(--hw-ink-6)",
                  borderRadius: 2,
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${score}%`,
                    height: "100%",
                    background: `var(--hw-${scoreTone})`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Audit timeline */}
        <section className="hw-fade-up hw-fade-up-2">
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
              <SectionHeader title="Audit timeline" />
              <div className="flex items-center" style={{ gap: 10 }}>
                <Icon name="filter" size={12} color="var(--hw-ink-4)" />
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="hw-input"
                  style={{
                    width: "auto",
                    padding: "6px 10px",
                    fontSize: 11,
                  }}
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
              <div
                style={{
                  padding: "56px 24px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                }}
              >
                No audit entries yet. They appear as events flow through your integrations.
              </div>
            ) : (
              <div>
                {filteredEntries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center"
                    style={{
                      padding: "12px 20px",
                      borderTop: i ? "1px solid var(--hw-line)" : "none",
                      gap: 14,
                    }}
                  >
                    <Chip tone={ACTION_TONE[entry.action] ?? undefined}>
                      {entry.action}
                    </Chip>
                    {entry.integrationId && (
                      <span
                        className="hw-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--hw-ink-4)",
                        }}
                      >
                        {integrationMap[entry.integrationId] ?? "—"}
                      </span>
                    )}
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        color: "var(--hw-ink-3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {summarizeDetails(entry.details)}
                    </span>
                    <span
                      className="hw-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--hw-ink-5)",
                      }}
                    >
                      {entry.integrityHash.slice(0, 12)}
                    </span>
                    <span
                      className="hw-mono hw-num"
                      style={{
                        fontSize: 11,
                        color: "var(--hw-ink-4)",
                      }}
                    >
                      {new Date(entry.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Previous exports */}
        {exportEntries.length > 0 && (
          <section className="hw-fade-up hw-fade-up-3">
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
                <SectionHeader title="Previous exports" />
              </div>
              {exportEntries.map((exp, i) => (
                <div
                  key={exp.id}
                  className="flex items-center"
                  style={{
                    padding: "12px 20px",
                    borderTop: i ? "1px solid var(--hw-line)" : "none",
                    gap: 14,
                  }}
                >
                  <Icon name="clock" size={13} color="var(--hw-ink-4)" />
                  <span
                    className="hw-mono"
                    style={{ fontSize: 12, color: "var(--hw-ink-2)" }}
                  >
                    {exp.format.toUpperCase()} export
                  </span>
                  <span
                    className="hw-mono"
                    style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                  >
                    {new Date(exp.periodStart).toLocaleDateString()} →{" "}
                    {new Date(exp.periodEnd).toLocaleDateString()}
                  </span>
                  <span style={{ marginLeft: "auto" }}>
                    <Chip tone={exp.status === "completed" ? "green" : "amber"}>
                      {exp.status}
                    </Chip>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <style jsx>{`
        :global(.hw-input) {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--hw-bg-3);
          border: 1px solid var(--hw-line-2);
          color: var(--hw-ink);
          font-size: 13px;
          transition: all 150ms;
        }
        :global(.hw-input:focus) {
          outline: none;
          border-color: rgba(129, 140, 248, 0.4);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
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
    <div
      className="flex items-start"
      style={{
        gap: 12,
        padding: "10px 0",
      }}
    >
      <Icon
        name={passed ? "check" : "x"}
        size={14}
        color={passed ? "var(--hw-green)" : "var(--hw-red)"}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: passed ? "var(--hw-ink)" : "var(--hw-red)",
          }}
        >
          {label}
        </div>
        <div
          className="hw-mono"
          style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 2 }}
        >
          {requirement}
        </div>
      </div>
    </div>
  );
}

function summarizeDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 3)
    .map(
      ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
    )
    .join(", ");
}
