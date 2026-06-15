export const dynamic = "force-dynamic";

import { AlertsClient } from "./alerts-client";

export default function AlertsPage() {
  return (
    <div style={{ padding: "28px 32px 40px", overflow: "auto", flex: 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--hf-ink)",
            }}
          >
            Alerts
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>
            We tell you before silence costs you — especially before Shopify removes a degraded
            subscription
          </div>
        </div>
        <button type="button" className="hf-btn pill small">
          + New rule
        </button>
      </div>

      <AlertsClient />
    </div>
  );
}
