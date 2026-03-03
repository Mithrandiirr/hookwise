import { db } from "@/lib/db";
import { auditLog, complianceExports } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import type { ComplianceFormat } from "@/types";

const PCI_DSS_MAPPING: Record<string, { requirements: string[]; description: string }> = {
  "event.received": {
    requirements: ["10.2.1"],
    description: "Audit trail for individual user access to cardholder data",
  },
  "event.delivered": {
    requirements: ["10.2.1", "10.3.1"],
    description: "Successful delivery with user identification and event type",
  },
  "event.failed": {
    requirements: ["10.2.4", "10.3.1"],
    description: "Invalid logical access attempts logged with details",
  },
  "event.replayed": {
    requirements: ["10.2.1", "10.2.6"],
    description: "Initialization of audit logs and re-delivery of events",
  },
  "circuit.opened": {
    requirements: ["10.2.4", "10.2.6"],
    description: "System-level alert: endpoint circuit breaker triggered",
  },
  "circuit.closed": {
    requirements: ["10.2.6"],
    description: "System-level event: endpoint recovered",
  },
  "circuit.half_open": {
    requirements: ["10.2.6"],
    description: "System-level event: endpoint recovery probe",
  },
  "integration.created": {
    requirements: ["10.2.7", "10.5.1"],
    description: "Creation of system-level object with audit trail integrity",
  },
  "integration.updated": {
    requirements: ["10.2.7"],
    description: "Modification of system-level object",
  },
  "integration.deleted": {
    requirements: ["10.2.7"],
    description: "Deletion of system-level object",
  },
  "scan.completed": {
    requirements: ["11.2.1", "6.1"],
    description: "Security vulnerability scan completed per quarterly requirement",
  },
  "export.created": {
    requirements: ["10.7"],
    description: "Audit trail retained and available for analysis per retention policy",
  },
};

interface GenerateExportParams {
  userId: string;
  format: ComplianceFormat;
  periodStart: Date;
  periodEnd: Date;
}

interface ExportResult {
  exportId: string;
  data: string;
  format: ComplianceFormat;
  entryCount: number;
}

export async function generateComplianceExport(
  params: GenerateExportParams
): Promise<ExportResult> {
  const entries = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, params.userId),
        gte(auditLog.createdAt, params.periodStart),
        lte(auditLog.createdAt, params.periodEnd)
      )
    )
    .orderBy(auditLog.createdAt);

  let data: string;

  if (params.format === "csv") {
    const header =
      "id,user_id,integration_id,event_id,action,details,integrity_hash,created_at,pci_dss_requirements,pci_dss_description";
    const rows = entries.map((e) => {
      const mapping = PCI_DSS_MAPPING[e.action];
      return [
        e.id,
        e.userId,
        e.integrationId ?? "",
        e.eventId ?? "",
        e.action,
        JSON.stringify(e.details).replace(/"/g, '""'),
        e.integrityHash,
        e.createdAt.toISOString(),
        mapping ? mapping.requirements.join("; ") : "",
        mapping ? mapping.description : "",
      ]
        .map((v) => `"${v}"`)
        .join(",");
    });
    data = [header, ...rows].join("\n");
  } else {
    const enrichedEntries = entries.map((e) => {
      const mapping = PCI_DSS_MAPPING[e.action];
      return {
        ...e,
        pciDss: mapping
          ? { requirements: mapping.requirements, description: mapping.description }
          : null,
      };
    });

    data = JSON.stringify(
      {
        exportMetadata: {
          framework: "PCI DSS v3.2.1",
          retentionPolicy: "1 year minimum (Req 10.7)",
          entryCount: entries.length,
          periodStart: params.periodStart.toISOString(),
          periodEnd: params.periodEnd.toISOString(),
          generatedAt: new Date().toISOString(),
        },
        entries: enrichedEntries,
      },
      null,
      2
    );
  }

  const [exportRecord] = await db
    .insert(complianceExports)
    .values({
      userId: params.userId,
      format: params.format,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      status: "completed",
    })
    .returning();

  return {
    exportId: exportRecord.id,
    data,
    format: params.format,
    entryCount: entries.length,
  };
}
