// v7.1 — /mcp dashboard surface.
// Token gen + scope picker + copy-paste config + sample tools playground (UI scaffold).

"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip, DashTopbar, Icon } from "@/components/hw";

type Scope = {
  key: string;
  name: string;
  desc: string;
  write?: boolean;
  defaultOn: boolean;
  tier?: "A" | "A/B";
};

const SCOPES: Scope[] = [
  { key: "query_events", name: "query_events", desc: "Search the org's webhook history.", defaultOn: true },
  { key: "get_event", name: "get_event", desc: "Full payload + delivery history.", defaultOn: true },
  { key: "get_delivery_status", name: "get_delivery_status", desc: "Current state, retries, next attempt.", defaultOn: true },
  { key: "get_endpoint_health", name: "get_endpoint_health", desc: "Circuit state, p50/p95, parity.", defaultOn: true },
  { key: "list_anomalies", name: "list_anomalies", desc: "Recent anomalies with diagnoses.", defaultOn: true },
  { key: "list_failed_critical_events", name: "list_failed_critical_events", desc: "Universal version of revenue-at-risk.", defaultOn: true },
  { key: "list_incidents_prevented", name: "list_incidents_prevented", desc: "Counts of retries that succeeded + reconciliation hits.", defaultOn: true },
  { key: "diagnose_failure", name: "diagnose_failure", desc: "Run Claude RCA on demand. Counts against AI quota.", defaultOn: true },
  { key: "list_revenue_at_risk", name: "list_revenue_at_risk", desc: "Tier A only — revenue-bearing events not yet confirmed delivered.", defaultOn: false, tier: "A" },
  { key: "replay_event", name: "replay_event", desc: "Re-deliver an event. Write tool — confirm before adding.", defaultOn: false, write: true },
  { key: "reconcile_provider", name: "reconcile_provider", desc: "Trigger out-of-band reconciliation. Tier A/B only. Write tool.", defaultOn: false, write: true, tier: "A/B" },
];

export default function McpPage() {
  const [scopes, setScopes] = useState<Record<string, boolean>>(
    Object.fromEntries(SCOPES.map((s) => [s.key, s.defaultOn]))
  );
  const [tokenName, setTokenName] = useState("cursor-local");
  const [generated, setGenerated] = useState<string | null>(null);

  function toggle(k: string) {
    setScopes((p) => ({ ...p, [k]: !p[k] }));
  }

  function generate() {
    // UI-only scaffold — replace with /api/mcp/tokens POST when backend ships.
    const token = `hw_mcp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    setGenerated(token);
  }

  const claudeConfig = generated
    ? `{
  "mcpServers": {
    "hookwise": {
      "url": "https://mcp.hookwise.com",
      "transport": "http+sse",
      "headers": { "Authorization": "Bearer ${generated}" }
    }
  }
}`
    : "";

  const writeScopesOn = SCOPES.filter((s) => s.write && scopes[s.key]).length;

  return (
    <>
      <DashTopbar
        title="MCP server"
        subtitle="Hosted at mcp.hookwise.com · per-tool RBAC · append-only audit log"
        right={
          <>
            <Chip tone="violet">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#7c5cd6" }} />
              HTTP + SSE
            </Chip>
            <Link href="/docs/mcp" className="hf-btn outline small">
              <Icon name="terminal" size={13} /> MCP docs
            </Link>
          </>
        }
      />

      <div
        style={{
          padding: "24px 32px 40px",
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Hero */}
        <div className="hf-landscape" style={{ padding: "26px 32px" }}>
          <div className="hf-eyebrow" style={{ color: "#7c5cd6" }}>
            Pillar 3 · Operational
          </div>
          <h1 className="hf-display" style={{ fontSize: 24, margin: "8px 0 0" }}>
            Your event history as MCP tools.
          </h1>
          <p style={{ color: "var(--hf-ink-3)", marginTop: 8, fontSize: 13.5, maxWidth: 720 }}>
            Generate a scoped token, paste the config block into Claude Desktop or Cursor, and your agent
            can query, diagnose, and replay webhooks against this org. Read-only by default — write
            scopes (replay, reconcile) require explicit opt-in.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 22 }}>
            <Stat label="Active tokens" value="0" sub="generate one to start" />
            <Stat label="Tool invocations · 24h" value="0" />
            <Stat
              label="Default rate limit"
              value="60/min"
              sub="per token · configurable"
            />
            <Stat label="Audit retention" value="∞" sub="append-only" />
          </div>
        </div>

        {/* Token generator */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 16,
          }}
        >
          {/* Left — scopes */}
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              padding: "22px 24px",
            }}
          >
            <div className="hf-section-intro" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
                Token scopes
              </h2>
              <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
                {Object.values(scopes).filter(Boolean).length} / {SCOPES.length} on
              </span>
            </div>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 16,
              }}
            >
              <span
                className="hf-mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--hf-ink-4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Token name
              </span>
              <input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="hf-mono"
                style={{
                  background: "var(--hf-bg)",
                  border: "1px solid var(--hf-line)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "var(--hf-ink)",
                  outline: "none",
                }}
              />
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SCOPES.map((s) => {
                const on = scopes[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggle(s.key)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "16px 1fr auto",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid " + (on ? "#ddd0f5" : "var(--hf-line)"),
                      background: on ? "#efeafb" : "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "var(--hf-ink)",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: "1px solid " + (on ? "#7c5cd6" : "var(--hf-line-2)"),
                        background: on ? "#7c5cd6" : "transparent",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        color: "var(--hf-bg)",
                        marginTop: 2,
                      }}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span>
                      <span
                        className="hf-mono"
                        style={{ fontSize: 12.5, color: "var(--hf-ink)" }}
                      >
                        {s.name}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          color: "var(--hf-ink-3)",
                          marginTop: 2,
                          lineHeight: 1.45,
                        }}
                      >
                        {s.desc}
                      </span>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      {s.write && (
                        <span
                          className="hf-mono"
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "#fdeada",
                            color: "#d97706",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          write
                        </span>
                      )}
                      {s.tier && (
                        <span
                          className="hf-mono"
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "rgba(255,107,44,0.1)",
                            color: "var(--hf-accent-warm)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          tier {s.tier}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {writeScopesOn > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  border: "1px solid #f4c9ad",
                  borderRadius: 8,
                  background: "#fdeada",
                  fontSize: 12,
                  color: "var(--hf-ink-2)",
                }}
              >
                <span className="hf-mono" style={{ color: "#d97706" }}>⚠</span>{" "}
                {writeScopesOn} write {writeScopesOn === 1 ? "scope" : "scopes"} enabled. Agents using this
                token can re-deliver events or trigger reconciliation runs. Audit log captures every call.
              </div>
            )}

            <button
              type="button"
              onClick={generate}
              className="hf-btn pill"
              style={{ marginTop: 18, width: "100%", justifyContent: "center" }}
            >
              {generated ? "Regenerate token" : "Generate token"} →
            </button>
          </div>

          {/* Right — config block */}
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 14,
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="hf-section-intro" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
                Claude Desktop / Cursor config
              </h2>
              {generated && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(claudeConfig)}
                  className="hf-btn outline small"
                >
                  <Icon name="copy" size={13} /> Copy
                </button>
              )}
            </div>

            {!generated ? (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed var(--hf-line-2)",
                  borderRadius: 10,
                  padding: 32,
                  color: "var(--hf-ink-4)",
                  fontSize: 13,
                  textAlign: "center",
                  minHeight: 220,
                }}
              >
                Generate a token to see the config block.
                <br />
                Token is shown once — copy it now.
              </div>
            ) : (
              <>
                <div
                  className="hf-mono"
                  style={{
                    background: "var(--hf-code-bg)",
                    border: "1px solid var(--hf-line)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    fontSize: 11.5,
                    color: "var(--hf-ink-2)",
                    whiteSpace: "pre",
                    overflow: "auto",
                  }}
                >
                  {claudeConfig}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    border: "1px solid #c4ebd2",
                    borderRadius: 8,
                    background: "#e8f7ee",
                    fontSize: 12,
                    color: "var(--hf-ink-2)",
                  }}
                >
                  <span style={{ color: "#16a34a" }}>✓</span> Token <span className="hf-mono">{tokenName}</span>{" "}
                  created. This is the only time we&apos;ll show the secret.
                </div>
              </>
            )}

            <div style={{ flex: 1 }} />

            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid var(--hf-line)",
                fontSize: 12,
                color: "var(--hf-ink-3)",
                lineHeight: 1.55,
              }}
            >
              <p style={{ margin: 0 }}>
                Drop the JSON into <span className="hf-mono">~/.cursor/mcp.json</span> (Cursor) or
                <span className="hf-mono"> ~/Library/Application Support/Claude/claude_desktop_config.json</span>{" "}
                (Claude Desktop). Restart the client and Trueline tools appear in the agent&apos;s tool palette.
              </p>
            </div>
          </div>
        </div>

        {/* Recent invocations */}
        <div
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div className="hf-section-intro" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
              Recent invocations
            </h2>
            <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
              audit log · last 24h
            </span>
          </div>
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--hf-ink-4)",
            }}
          >
            No invocations yet. Connect an agent to see calls flow in.
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--hf-bg)",
        border: "1px solid var(--hf-line)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        className="hf-mono"
        style={{
          fontSize: 10.5,
          color: "var(--hf-ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="hf-num"
        style={{
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: "var(--hf-ink)",
          marginTop: 6,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--hf-ink-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
