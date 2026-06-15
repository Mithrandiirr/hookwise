export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { db, integrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Pill, Toggle } from "@/components/hw";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [firstIntegration] = await db
    .select({ name: integrations.name, providerDomain: integrations.providerDomain })
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .limit(1);

  const store = firstIntegration?.providerDomain ?? "your store";
  const workspace = firstIntegration?.name ?? "Workspace";

  return (
    <div style={{ padding: "28px 32px 40px", overflow: "auto", flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={hTitle}>Settings</h1>
        <div style={hSub}>How the engine runs for {store}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 10, alignItems: "start" }}>
        {/* left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* reconciliation engine */}
          <Card>
            <CardTitle sub="Tuned conservatively — we'd rather say “unconfirmed” than cry wolf">
              Reconciliation engine
            </CardTitle>
            <Row
              title="Poll cadence"
              hint="How often we poll the Admin API for ground truth"
              divider
            >
              <Select value="Every 5 minutes" />
            </Row>
            <Row
              title="Maturity window"
              hint="Grace period before an unmatched event counts as a gap"
              divider
            >
              <Select value="60 minutes" />
            </Row>
            <Row
              title="Auto-recover gaps"
              hint="Re-deliver confirmed gaps without manual approval"
            >
              <Toggle on />
            </Row>
          </Card>

          {/* api keys */}
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)" }}>API keys</div>
              <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-accent)", cursor: "pointer" }}>
                + Create key
              </span>
            </div>
            <KeyRow value="hw_live_••••••••••••8a21" created="created Jun 16" divider />
            <KeyRow value="hw_live_••••••••••••5f07" created="created May 2" />
          </Card>

          {/* danger zone */}
          <div
            style={{
              background: "#fffafa",
              border: "1px solid #f3cccc",
              borderRadius: 12,
              padding: "22px 24px",
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#b3261e", marginBottom: 16 }}>
              Danger zone
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 14,
                borderBottom: "1px solid #f3dcdc",
              }}
            >
              <div>
                <div style={rowTitle}>Pause monitoring</div>
                <div style={rowHint}>Stop reconciling — gaps during a pause are not recoverable later</div>
              </div>
              <button
                type="button"
                className="hf-btn xs"
                style={{ color: "#b3261e", border: "1px solid #e6b8b8", background: "#ffffff" }}
              >
                Pause
              </button>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 14,
              }}
            >
              <div>
                <div style={rowTitle}>Remove store &amp; subscriptions</div>
                <div style={rowHint}>Deletes our additional subscriptions and all audit data. Irreversible.</div>
              </div>
              <button
                type="button"
                className="hf-btn xs"
                style={{ background: "#b3261e", color: "#ffffff" }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card pad="18px 20px">
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)", marginBottom: 14 }}>
              Workspace
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Labeled label="Workspace name">{workspace}</Labeled>
              <Labeled label="Time zone" caret>
                America/New_York
              </Labeled>
            </div>
          </Card>

          <Card pad="18px 20px">
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)", marginBottom: 14 }}>
              Data retention
            </div>
            <RetentionRow label="Event history" value="13 months" divider />
            <RetentionRow label="Payload bodies" value="30 days" />
          </Card>

          <div
            style={{
              background: "var(--hf-accent-tint)",
              border: "1px solid var(--hf-accent-border)",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              className="hf-mono"
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--hf-accent)",
                marginBottom: 6,
              }}
            >
              Read-only, always
            </div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: "var(--hf-ink-2)" }}>
              HookWise only ever holds a read-only Admin key and our own additional subscriptions. We can&apos;t
              modify orders, and we&apos;re never in your critical path.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── building blocks ───────── */

const hTitle = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "var(--hf-ink)",
} as const;
const hSub = { fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 } as const;
const rowTitle = { fontSize: 13, fontWeight: 550, color: "var(--hf-ink)" } as const;
const rowHint = { fontSize: 11.5, color: "var(--hf-ink-4)", marginTop: 2, lineHeight: 1.5 } as const;
const monoLabel = {
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
  color: "var(--hf-ink-4)",
  marginBottom: 6,
};

function Card({ children, pad = "22px 24px" }: { children: ReactNode; pad?: string }) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 12,
        padding: pad,
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: sub ? 18 : 16 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)" }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--hf-ink-4)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Row({
  title,
  hint,
  children,
  divider,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: divider ? "1px solid var(--hf-line)" : "none",
      }}
    >
      <div>
        <div style={rowTitle}>{title}</div>
        <div style={rowHint}>{hint}</div>
      </div>
      {children}
    </div>
  );
}

function Select({ value }: { value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid var(--hf-line)",
        borderRadius: 8,
        padding: "8px 13px",
        fontSize: 13,
        color: "var(--hf-ink)",
        whiteSpace: "nowrap",
      }}
    >
      {value} <span style={{ color: "var(--hf-ink-4)" }}>▾</span>
    </div>
  );
}

function KeyRow({ value, created, divider }: { value: string; created: string; divider?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
        borderBottom: divider ? "1px solid var(--hf-line)" : "none",
      }}
    >
      <span className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink-2)", flex: 1 }}>
        {value}
      </span>
      <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)" }}>
        {created}
      </span>
      <Pill tone="green" dot={false}>
        read-only
      </Pill>
    </div>
  );
}

function Labeled({ label, children, caret }: { label: string; children: ReactNode; caret?: boolean }) {
  return (
    <div>
      <div className="hf-mono" style={monoLabel}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12.5,
          color: "var(--hf-ink-2)",
          border: "1px solid var(--hf-line)",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        {children}
        {caret && <span style={{ color: "var(--hf-ink-4)" }}>▾</span>}
      </div>
    </div>
  );
}

function RetentionRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: divider ? "0 0 12px" : "12px 0 0",
        borderBottom: divider ? "1px solid var(--hf-line)" : "none",
      }}
    >
      <div style={{ fontSize: 12.5, color: "var(--hf-ink-2)" }}>{label}</div>
      <div className="hf-mono" style={{ fontSize: 12, color: "var(--hf-ink)" }}>
        {value}
      </div>
    </div>
  );
}
