// API keys surface — matches .design layout.
// Production doesn't yet have an api_keys table; this renders an honest empty state
// with the design's table shape so the surface ships visually.

import { DashTopbar, PageHead, StatTile, Panel, Pill } from "@/components/hw";

export default function ApiKeysPage() {
  return (
    <>
      <DashTopbar
        title="API keys"
        subtitle="Scoped tokens · environment-bound · audit-logged"
        right={
          <button type="button" className="hf-btn pill small">
            + Generate key
          </button>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Settings · API keys"
          title={
            <>
              Keys,{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                scoped
              </span>{" "}
              by intent.
            </>
          }
          sub="Every key is environment-bound, scope-limited, and audit-logged. Rolling a key never drops in-flight requests — old keys remain valid for 60 seconds while clients pick up the new one."
          actions={
            <>
              <a href="/activity" className="hf-btn outline small">
                Audit log
              </a>
              <button type="button" className="hf-btn pill small">
                + Generate key
              </button>
            </>
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatTile label="ACTIVE KEYS" value="0" sub="generate one to start" />
          <StatTile
            label="EXPIRING SOON"
            value="0"
            sub="auto-rotate on Pro"
          />
          <StatTile
            label="LAST ROTATED"
            value="—"
            sub="auto-rotate available"
          />
          <StatTile
            label="REQUESTS · 24H"
            value="0"
            sub="all keys"
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
        </div>

        <Panel padded={false}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 90px 110px 110px 100px",
              gap: 14,
              padding: "12px 24px",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10.5,
              color: "var(--hf-ink-4)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--hf-line)",
            }}
          >
            <span>Name · prefix</span>
            <span>Scope</span>
            <span>Env</span>
            <span style={{ textAlign: "right" }}>Created</span>
            <span style={{ textAlign: "right" }}>Last used</span>
            <span />
          </div>
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--hf-ink-4)",
            }}
          >
            No API keys generated yet. Generate one to start ingesting webhooks via the
            HookWise API.
          </div>
        </Panel>

        <div
          style={{
            marginTop: 18,
            background: "rgba(163,230,53,0.04)",
            border: "1px solid rgba(163,230,53,0.20)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{ color: "var(--hf-accent)", fontSize: 16, paddingTop: 1 }}
          >
            ✦
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                color: "var(--hf-ink)",
                fontWeight: 500,
                marginBottom: 3,
              }}
            >
              Auto-rotate available on Pro
            </div>
            <div style={{ fontSize: 12, color: "var(--hf-ink-3)" }}>
              Auto-rotates every 90 days with zero downtime — old keys stay valid for
              60 seconds while clients pick up the new one.
            </div>
          </div>
          <Pill tone="ember" dot={false}>
            Pro
          </Pill>
        </div>
      </div>
    </>
  );
}
