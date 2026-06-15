// Scaffold for the Customers surface — cross-provider customer graph from .design.
// Production schema doesn't yet have a `customers` table; this renders an honest
// "coming soon" state with the design's exact layout so the surface ships visually.

import { DashTopbar, PageHead, StatTile, Panel, Pill } from "@/components/hw";

export default function CustomersPage() {
  return (
    <>
      <DashTopbar
        title="Customers"
        subtitle="Cross-provider customer graph · stitched identity"
        right={<Pill tone="violet">v0 · preview</Pill>}
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Data · Customers"
          title={
            <>
              Customers,{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                stitched
              </span>{" "}
              across providers.
            </>
          }
          sub="Trueline will resolve each customer's identity across Stripe, Shopify, Clerk, and Resend — even when IDs don't match — so you see one unified timeline per person. Shipping next sprint."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile label="CUSTOMERS" value="—" sub="active in last 30 days" />
          <StatTile
            label="STITCHED"
            value="—"
            sub="cross-provider matched"
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
          <StatTile
            label="LTV TRACKED"
            value="—"
            sub="across all integrations"
            color="#16a34a"
            accent="#16a34a"
          />
          <StatTile label="EVENTS / CUSTOMER" value="—" sub="median" />
        </div>

        <Panel>
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "var(--hf-ink-3)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 14, color: "var(--hf-ink-2)", marginBottom: 6 }}>
              Customer graph rolls out next sprint
            </div>
            <div style={{ fontSize: 12, color: "var(--hf-ink-4)", maxWidth: 460, margin: "0 auto" }}>
              We&apos;ll stitch identity across the providers you&apos;ve connected and
              surface a unified timeline per person. No setup required.
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
