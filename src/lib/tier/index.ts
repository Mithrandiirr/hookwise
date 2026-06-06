// v7.1 — Provider Tier Resolution.
// CLAUDE.md: "never hardcode revenue checks. Always go through resolveOrgTier(...).revenueTrackingEnabled."

export type ProviderTier = "A" | "B" | "C";
export type DashboardMode = "revenue+reliability" | "reliability";

export const TIER_A_PROVIDERS = [
  "stripe",
  "shopify",
  "paddle",
  "chargebee",
  "lemonsqueezy",
] as const;

export const TIER_B_PROVIDERS = ["clerk", "resend"] as const;

type IntegrationLike = {
  provider: string;
  status?: string | null;
};

export function providerTier(provider: string): ProviderTier {
  const p = provider.toLowerCase();
  if ((TIER_A_PROVIDERS as readonly string[]).includes(p)) return "A";
  if ((TIER_B_PROVIDERS as readonly string[]).includes(p)) return "B";
  return "C";
}

export type OrgTierResolution = {
  tier: ProviderTier;
  dashboardMode: DashboardMode;
  revenueTrackingEnabled: boolean;
  reconciliationEnabled: boolean;
  connectedTiers: { A: number; B: number; C: number };
};

export function resolveOrgTier(integrations: IntegrationLike[]): OrgTierResolution {
  const counts = { A: 0, B: 0, C: 0 };
  for (const i of integrations) {
    if (i.status && i.status !== "active" && i.status !== "connected") continue;
    counts[providerTier(i.provider)] += 1;
  }

  const tier: ProviderTier = counts.A > 0 ? "A" : counts.B > 0 ? "B" : "C";
  const revenueTrackingEnabled = counts.A > 0;
  const reconciliationEnabled = counts.A > 0 || counts.B > 0;

  return {
    tier,
    dashboardMode: revenueTrackingEnabled ? "revenue+reliability" : "reliability",
    revenueTrackingEnabled,
    reconciliationEnabled,
    connectedTiers: counts,
  };
}
