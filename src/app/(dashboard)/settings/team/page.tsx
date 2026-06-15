// Members surface — matches .design layout.
// Production is single-user pre-multi-org migration; renders the calling user as
// owner and the design's roles-and-permissions reference card.

import { createClient } from "@/lib/supabase/server";
import { DashTopbar, PageHead, StatTile, Panel, Pill } from "@/components/hw";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "owner@hookwise.local";
  const name = email.split("@")[0] ?? "Owner";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <>
      <DashTopbar
        title="Members"
        subtitle="Team access · roles · audit"
        right={
          <button type="button" className="hf-btn pill small">
            + Invite
          </button>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Settings · Members"
          title={
            <>
              One teammate.{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                Invite the rest
              </span>
              .
            </>
          }
          sub="Roles map to a least-privilege model: viewers can read, members can replay, admins can rotate keys, owners can transfer. Every action is in the audit log."
          actions={
            <>
              <a href="/activity" className="hf-btn outline small">
                Audit log
              </a>
              <button type="button" className="hf-btn pill small">
                + Invite
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
          <StatTile label="MEMBERS" value="1" sub="1 owner" />
          <StatTile
            label="PENDING"
            value="0"
            sub="invites awaiting accept"
          />
          <StatTile
            label="SSO"
            value="—"
            sub="multi-org migration pending"
          />
          <StatTile
            label="MFA"
            value="—"
            sub="config via Supabase"
            color="var(--hf-accent)"
            accent="var(--hf-accent)"
          />
        </div>

        <Panel padded={false}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 120px 110px 80px",
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
            <span>Member</span>
            <span>Email</span>
            <span>Role</span>
            <span style={{ textAlign: "right" }}>Joined</span>
            <span />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 120px 110px 80px",
              gap: 14,
              padding: "14px 24px",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: "var(--hf-accent-soft)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--hf-accent)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  color: "var(--hf-ink)",
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
              >
                {name}
              </span>
            </div>
            <span
              className="hf-mono"
              style={{ fontSize: 12, color: "var(--hf-ink-2)" }}
            >
              {email}
            </span>
            <Pill tone="ember" dot={false}>
              owner
            </Pill>
            <span
              className="hf-mono"
              style={{
                fontSize: 11.5,
                color: "var(--hf-ink-3)",
                textAlign: "right",
              }}
            >
              —
            </span>
            <button
              type="button"
              className="hf-btn ghost small"
              style={{ padding: "3px 10px", justifySelf: "end" }}
            >
              ⋯
            </button>
          </div>
        </Panel>

        <div
          style={{
            marginTop: 22,
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div className="hf-section-intro" style={{ marginBottom: 14 }}>
            <h2
              style={{
                fontSize: 15.5,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              Roles &amp; permissions
            </h2>
            <a className="hf-link-accent" style={{ fontSize: 13 }}>
              Customize →
            </a>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            {(
              [
                ["Owner", "ember", ["Full access", "Billing", "Transfer & delete"]],
                ["Admin", "amber", ["Manage members", "Rotate API keys", "Configure alerts"]],
                ["Member", "violet", ["Replay events", "Open investigations", "Read all data"]],
                ["Viewer", "ink", ["Read-only access", "Subscribe to alerts", "Export reports"]],
              ] as const
            ).map(([n, t, perms]) => (
              <div
                key={n}
                style={{
                  border: "1px solid var(--hf-line)",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <Pill tone={t} dot={false}>
                  {n}
                </Pill>
                <ul
                  style={{
                    margin: "12px 0 0",
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {perms.map((p) => (
                    <li
                      key={p}
                      style={{
                        fontSize: 12,
                        color: "var(--hf-ink-2)",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#16a34a", fontSize: 10 }}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
