import type { Provider } from "@/types";

export interface ScanRequest {
  provider: Provider;
  apiKey: string;
  /** Required for Shopify */
  shopDomain?: string;
  /** Optional: compare against an existing HookWise integration */
  integrationId?: string;
}

export interface EventTypeBreakdown {
  eventType: string;
  totalCount: number;
  gapCount: number;
  dollarImpactCents: number;
}

export interface ScanEventSummary {
  providerEventId: string;
  eventType: string;
  createdAt: Date;
  amountCents: number;
  isGap: boolean;
}

export interface ScanReport {
  provider: Provider;
  scannedAt: Date;
  periodDays: number;
  totalProviderEvents: number;
  totalHookwiseEvents: number;
  gapsFound: number;
  dollarAtRiskCents: number;
  healthScore: number;
  breakdown: EventTypeBreakdown[];
  topGaps: ScanEventSummary[];
  truncated: boolean;
  integrationId?: string;
}
