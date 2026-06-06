export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, events } from "@/lib/db";
import { eq, inArray, and, gte, count } from "drizzle-orm";
import { DashTopbar, PageHead, Panel } from "@/components/hw";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [usageRow] =
    integrationIds.length > 0
      ? await db
          .select({ c: count() })
          .from(events)
          .where(
            and(
              inArray(events.integrationId, integrationIds),
              gte(events.receivedAt, monthStart),
            ),
          )
      : [{ c: 0 }];

  const used = Number(usageRow?.c ?? 0);
  const cap = 5_000_000; // Pro tier cap; reads real plan once billing schema lands
  const pct = Math.min(100, (used / cap) * 100);

  return (
    <>
      <DashTopbar
        title="Project settings"
        subtitle="Configuration scoped to this project"
        right={
          <button type="button" className="hf-btn pill small">
            Save changes
          </button>
        }
      />

      <div style={{ padding: "24px 32px 40px", overflow: "auto", flex: 1 }}>
        <PageHead
          crumb="Settings · Project"
          title={
            <>
              Project{" "}
              <span className="hf-serif" style={{ color: "var(--hf-accent)" }}>
                settings
              </span>
              .
            </>
          }
          sub="Configuration that applies to every endpoint, every event, every integration in this project."
          actions={
            <button type="button" className="hf-btn pill small">
              Save changes
            </button>
          }
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
          {/* General */}
          <Panel title="General">
            <Field label="Project name" hint="Shown in the dashboard switcher.">
              <Input value="acme-production" />
            </Field>
            <Field
              label="Environment"
              hint="Affects log retention and alert routing."
            >
              <div style={{ display: "flex", gap: 6 }}>
                {(["production", "staging", "dev"] as const).map((e) => {
                  const active = e === "production";
                  return (
                    <button
                      key={e}
                      type="button"
                      style={{
                        cursor: "pointer",
                        padding: "6px 14px",
                        fontSize: 12,
                        borderRadius: 999,
                        background: active ? "var(--hf-bg-4)" : "transparent",
                        color: active ? "var(--hf-ink)" : "var(--hf-ink-3)",
                        border: `1px solid ${active ? "var(--hf-line-2)" : "var(--hf-line)"}`,
                      }}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field
              label="Region"
              hint="Where ingest, replay buffer, and reconciler run."
            >
              <Input value="us-east-1 · Virginia" />
            </Field>
            <Field
              label="User ID"
              hint="Used in API requests and webhook URLs."
            >
              <Input value={user?.id ?? ""} mono />
            </Field>

            <div style={{ padding: "22px 0 4px" }}>
              <div
                style={{
                  fontSize: 13,
                  color: "#f29a9a",
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                Danger zone
              </div>
              <div
                style={{ fontSize: 12, color: "var(--hf-ink-3)", marginBottom: 14 }}
              >
                Destructive actions. Cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="hf-btn outline small">
                  Transfer ownership
                </button>
                <button
                  type="button"
                  className="hf-btn outline small"
                  style={{
                    color: "#f29a9a",
                    borderColor: "rgba(242,154,154,0.3)",
                  }}
                >
                  Delete project
                </button>
              </div>
            </div>
          </Panel>

          {/* Plan & usage + Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Panel title="Plan & usage">
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 500,
                  color: "var(--hf-ink)",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                Free
              </div>
              <div
                className="hf-mono"
                style={{
                  fontSize: 11,
                  color: "var(--hf-ink-3)",
                  marginBottom: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                10K events / mo · $0
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: pct > 90 ? "#fbbf24" : "var(--hf-accent)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--hf-ink-3)",
                }}
              >
                <span>
                  <span className="hf-num" style={{ color: "var(--hf-ink)" }}>
                    {used.toLocaleString()}
                  </span>{" "}
                  used
                </span>
                <span>{cap.toLocaleString()} cap</span>
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                <a href="/billing" className="hf-btn outline small">
                  View invoice
                </a>
                <a href="/billing" className="hf-btn pill small">
                  Upgrade
                </a>
              </div>
            </Panel>

            <Panel title="Features">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(
                  [
                    ["Smart Retry", "8 attempts · exponential backoff", true],
                    ["Reconciler", "every 5 minutes", true],
                    ["AI Investigation", "auto-diagnose anomalies", true],
                    ["Sequencer", "ordering for related events", false],
                    ["Security scanner", "weekly · Business tier", false],
                  ] as const
                ).map(([n, sub, on]) => (
                  <div
                    key={n}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--hf-ink)",
                          fontWeight: 500,
                        }}
                      >
                        {n}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--hf-ink-3)",
                          marginTop: 2,
                        }}
                      >
                        {sub}
                      </div>
                    </div>
                    <Toggle on={on} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: 32,
        padding: "22px 0",
        borderBottom: "1px solid var(--hf-line)",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13.5,
            color: "var(--hf-ink)",
            fontWeight: 500,
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 12,
              color: "var(--hf-ink-3)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Input({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--hf-bg)",
        border: "1px solid var(--hf-line)",
        borderRadius: 8,
        padding: "8px 12px",
        maxWidth: 460,
        fontFamily: mono
          ? "var(--font-jetbrains-mono), monospace"
          : "inherit",
        fontSize: 13,
        color: "var(--hf-ink)",
      }}
    >
      <span
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 30,
        height: 18,
        borderRadius: 999,
        background: on ? "var(--hf-accent)" : "rgba(255,255,255,0.10)",
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: on ? "#0a0a0a" : "#fff",
        }}
      />
    </span>
  );
}
