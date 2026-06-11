import type { Provider } from "@/types";
import { CONFIRMATION_AGE_MS, isMature } from "./maturity";

// "confirmed"   — matured past the confirmation age, webhook never arrived. Safe to report as lost.
// "unconfirmed" — matured past the maturity window but still inside the confirmation age,
//                 or any other residual doubt (e.g. API-version mismatch in the window).
//                 Reported, but never counted as lost dollars.
// "late"        — a webhook for the same provider_event_id eventually arrived after we
//                 flagged the gap. Not a loss; reported as a latency finding.
export type GapClassification = "confirmed" | "unconfirmed" | "late";

export interface GapInput {
  provider: Provider;
  /** When the resource was created/updated at the provider (ground truth). */
  occurredAt: Date;
  /** A source:'webhook' event with the same provider_event_id exists. */
  webhookArrivedLate: boolean;
  /** Residual doubt independent of age, e.g. X-Shopify-Api-Version fall-forward seen. */
  uncertain?: boolean;
  now?: Date;
}

export function classifyGap(input: GapInput): GapClassification {
  const now = input.now ?? new Date();

  if (input.webhookArrivedLate) return "late";
  if (input.uncertain) return "unconfirmed";

  // Should not happen — immature events are never flagged — but if one slips through,
  // it is by definition unconfirmed.
  if (!isMature(input.provider, input.occurredAt, now)) return "unconfirmed";

  const age = now.getTime() - input.occurredAt.getTime();
  const confirmAge = CONFIRMATION_AGE_MS[input.provider] ?? CONFIRMATION_AGE_MS.shopify;
  return age >= confirmAge ? "confirmed" : "unconfirmed";
}
