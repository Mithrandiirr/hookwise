export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "you@store.com";
  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    email.split("@")[0] ??
    "Operator";
  const initials =
    name
      .split(/[\s.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "OP";

  return (
    <div style={{ padding: "28px 32px 40px", overflow: "auto", flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={hTitle}>Account</h1>
        <div style={hSub}>Plan, billing, and the people who can see your gaps</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 10, alignItems: "start" }}>
        {/* left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* plan banner */}
          <div
            style={{
              background: "#0e1116",
              borderRadius: 12,
              padding: "24px 26px",
              color: "#f4f4f5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <div
                className="hf-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#7dd3fc",
                  marginBottom: 8,
                }}
              >
                Current plan
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
                Revenue Assurance
              </div>
              <div style={{ fontSize: 13, color: "#9aa3af", marginTop: 4 }}>
                $29 / store / month · billed monthly · 1 active store
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className="hf-btn small"
                style={{ border: "1px solid rgba(255,255,255,0.18)", color: "#f4f4f5", background: "transparent" }}
              >
                Add store
              </button>
              <button
                type="button"
                className="hf-btn small"
                style={{ background: "#ffffff", color: "#0e1116" }}
              >
                Manage plan
              </button>
            </div>
          </div>

          {/* billing tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              style={{
                background: "var(--hf-bg-3)",
                border: "1px solid var(--hf-line)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div className="hf-mono" style={tileLabel}>
                Next invoice
              </div>
              <div className="hf-num" style={{ fontSize: 22, fontWeight: 600, marginTop: 8, color: "var(--hf-ink)" }}>
                $29.00
              </div>
              <div style={{ fontSize: 11.5, color: "var(--hf-ink-4)", marginTop: 3 }}>
                Jul 1, 2026 · Visa ·· 4242
              </div>
            </div>
            <div
              style={{
                background: "#fff8f3",
                border: "1px solid #f4c9ad",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div className="hf-mono" style={{ ...tileLabel, color: "#b35418" }}>
                Assured · lifetime
              </div>
              <div className="hf-num" style={{ fontSize: 22, fontWeight: 650, marginTop: 8, color: "#dd5008" }}>
                $23,847
              </div>
              <div style={{ fontSize: 11.5, color: "#b35418", marginTop: 3 }}>recovered since Jun 16</div>
            </div>
          </div>

          {/* invoices */}
          <div
            style={{
              background: "var(--hf-bg-3)",
              border: "1px solid var(--hf-line)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid var(--hf-line)",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)" }}>Invoices</div>
              <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-accent)", cursor: "pointer" }}>
                Billing portal →
              </span>
            </div>
            <div
              className="hf-mono"
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 100px 90px",
                gap: 12,
                padding: "8px 20px",
                borderBottom: "1px solid var(--hf-line)",
                background: "var(--hf-bg-2)",
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--hf-ink-4)",
              }}
            >
              <div>Date</div>
              <div>Description</div>
              <div style={{ textAlign: "right" }}>Amount</div>
              <div style={{ textAlign: "right" }}>Status</div>
            </div>
            {[
              ["Jun 1, 2026"],
              ["May 1, 2026"],
              ["Apr 1, 2026"],
            ].map(([date], i, a) => (
              <div
                key={date}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 100px 90px",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 20px",
                  borderBottom: i < a.length - 1 ? "1px solid var(--hf-line)" : "none",
                  fontSize: 12.5,
                }}
              >
                <div className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
                  {date}
                </div>
                <div style={{ color: "var(--hf-ink-2)" }}>Revenue Assurance · monthly</div>
                <div className="hf-mono" style={{ textAlign: "right", fontSize: 11.5, color: "var(--hf-ink)" }}>
                  $29.00
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    className="hf-mono"
                    style={{
                      fontSize: 10,
                      color: "#16a34a",
                      background: "#e8f7ee",
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    paid
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* team */}
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)" }}>Team</div>
              <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-accent)", cursor: "pointer" }}>
                + Invite
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Member initials={initials} name={name} email={email} role="owner" you />
              <Member initials="RT" name="Ray Tan" email="ray@store.com" role="admin" />
              <Member initials="FJ" name="Fern Ji" email="fern@store.com" role="viewer" />
            </div>
          </Card>

          {/* profile */}
          <Card>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)", marginBottom: 14 }}>
              Your profile
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Labeled label="Name">{name}</Labeled>
              <Labeled label="Email">{email}</Labeled>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button type="button" className="hf-btn pill small">
                  Save
                </button>
                <button type="button" className="hf-btn outline small">
                  Change password
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const hTitle = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "var(--hf-ink)",
} as const;
const hSub = { fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 } as const;
const tileLabel = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--hf-ink-4)",
};

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      {children}
    </div>
  );
}

function Member({
  initials,
  name,
  email,
  role,
  you,
}: {
  initials: string;
  name: string;
  email: string;
  role: string;
  you?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: you ? "var(--hf-accent-tint)" : "var(--hf-bg-4)",
          color: you ? "var(--hf-accent)" : "var(--hf-ink-2)",
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 550, color: "var(--hf-ink)" }}>{name}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--hf-ink-4)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email}
        </div>
      </div>
      <span
        className="hf-mono"
        style={{ fontSize: 10, color: "var(--hf-ink-3)", background: "#f1f2f5", borderRadius: 999, padding: "2px 8px" }}
      >
        {role}
      </span>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        className="hf-mono"
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--hf-ink-4)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--hf-ink-2)",
          border: "1px solid var(--hf-line)",
          borderRadius: 8,
          padding: "8px 12px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}
