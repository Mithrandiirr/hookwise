// v7.1 — TierAwareTile.
// Renders revenue (orange) when revenueTrackingEnabled, else reliability framing (sky blue / neutral).
// Caller already resolved the tier via resolveOrgTier(); we just switch the visual.

type Common = {
  label: string;
  sub?: string;
};

type RevenueProps = Common & {
  variant: "revenue";
  amountCents: number;
  fallbackCount?: number;
};

type ReliabilityProps = Common & {
  variant: "reliability";
  count: number;
  unit?: string;
};

type TierAwareTileProps = {
  revenueTrackingEnabled: boolean;
  revenue: { label: string; sub?: string; amountCents: number };
  reliability: { label: string; sub?: string; count: number; unit?: string };
};

function fmtMoney(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Tile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        padding: "20px 22px",
      }}
    >
      <div
        className="hf-mono"
        style={{
          fontSize: 11,
          color: "var(--hf-ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: color || "var(--hf-ink)",
          marginTop: 8,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function TierAwareTile({
  revenueTrackingEnabled,
  revenue,
  reliability,
}: TierAwareTileProps) {
  if (revenueTrackingEnabled) {
    return (
      <Tile
        label={revenue.label}
        value={fmtMoney(revenue.amountCents)}
        sub={revenue.sub}
        color="var(--hf-accent-warm)"
      />
    );
  }
  return (
    <Tile
      label={reliability.label}
      value={`${fmtCount(reliability.count)}${reliability.unit ? ` ${reliability.unit}` : ""}`}
      sub={reliability.sub}
      color="var(--hf-accent)"
    />
  );
}

export type { TierAwareTileProps, RevenueProps, ReliabilityProps };
