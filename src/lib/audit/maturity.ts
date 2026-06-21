// Maturity windows — the core false-positive defense for Gap Reports.
//
// Providers deliver late, not just never: Shopify has documented orders/paid delays of
// 20+ minutes. A provider event is only eligible to be called a gap once it is older
// than the provider's maturity window; younger events are invisible to the differ.
// False positives in a Gap Report are fatal to credibility — when uncertain we label
// "unconfirmed", never "lost".

import type { Provider } from "@/types";

const HOUR_MS = 60 * 60 * 1000;

// Per-provider plugin surface: poller + diff key + maturity window + honest villain.
export const MATURITY_WINDOW_MS: Record<Provider, number> = {
  // Shopify: 20+ min orders/paid delays documented (Apr 2026 investigation) — wait a full hour.
  shopify: 1 * HOUR_MS,
};

// Past this age an undelivered, re-checked event is safe to call a confirmed gap.
// Between maturity and confirmation we keep saying "unconfirmed".
export const CONFIRMATION_AGE_MS: Record<Provider, number> = {
  shopify: 2 * HOUR_MS,
};

export function maturityWindowMs(provider: Provider): number {
  return MATURITY_WINDOW_MS[provider] ?? HOUR_MS;
}

/** Events that occurred after this instant are too young to evaluate at all. */
export function maturityCutoff(provider: Provider, now: Date = new Date()): Date {
  return new Date(now.getTime() - maturityWindowMs(provider));
}

export function isMature(
  provider: Provider,
  occurredAt: Date,
  now: Date = new Date()
): boolean {
  return occurredAt.getTime() <= maturityCutoff(provider, now).getTime();
}
