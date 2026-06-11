import type { GapClassification } from "@/lib/audit/classify";
import type { Provider } from "@/types";

export interface GapRow {
  providerEventId: string;
  eventType: string;
  /** When the resource was created at the provider (ground truth). */
  occurredAt: string;
  /** When our poller recovered it. */
  recoveredAt: string;
  amountCents: number;
  classification: GapClassification;
}

export type FindingSeverity = "info" | "warning" | "critical";

export interface Finding {
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface GapReportData {
  version: 1;
  generatedAt: string;
  provider: Provider;
  store: { name: string; domain: string | null };
  window: { start: string; end: string; days: number };
  auditStatus: "running" | "complete";
  /** White-label: agencies render the report under their own brand. */
  brandName: string | null;
  totals: {
    /** Ground truth — what the provider's API says happened. */
    providerEvents: number;
    /** What actually arrived as webhooks. */
    webhooksDelivered: number;
    gapsConfirmed: number;
    gapsUnconfirmed: number;
    lateDeliveries: number;
    /** Orange in the rendered report — confirmed lost dollars only. */
    confirmedAmountCents: number;
    unconfirmedAmountCents: number;
    pollsRun: number;
  };
  /** Individual gaps, most valuable first, capped for render size. */
  gaps: GapRow[];
  /** Subscription-health and configuration findings. */
  findings: Finding[];
}
