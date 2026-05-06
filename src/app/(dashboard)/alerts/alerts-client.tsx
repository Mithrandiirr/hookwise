"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chip, Icon, DashTopbar, ProviderMark } from "@/components/hw";

type AlertConfig = {
  id: string;
  integrationId: string;
  channel: string;
  destination: string;
  threshold: number | null;
  enabled: boolean;
  createdAt: string;
};

type Integration = {
  id: string;
  name: string;
  provider: string;
};

export function AlertsClient({
  integrations,
  configs: initialConfigs,
}: {
  integrations: Integration[];
  configs: AlertConfig[];
}) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [integrationId, setIntegrationId] = useState(integrations[0]?.id ?? "");
  const [channel, setChannel] = useState<"email" | "slack">("email");
  const [destination, setDestination] = useState("");
  const [threshold, setThreshold] = useState<number>(3);

  const integrationMap = new Map(integrations.map((i) => [i.id, i] as const));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/alert-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrationId, channel, destination, threshold }),
    });
    if (res.ok) {
      const created = await res.json();
      setConfigs((prev) => [
        ...prev,
        { ...created, createdAt: created.createdAt ?? new Date().toISOString() },
      ]);
      setShowForm(false);
      setDestination("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await fetch(`/api/alert-configs?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) {
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, enabled: !enabled } : c)),
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/alert-configs?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setConfigs((prev) => prev.filter((c) => c.id !== id));
  }

  const activeCount = configs.filter((c) => c.enabled).length;

  return (
    <>
      <DashTopbar
        title="Alerts"
        subtitle="tell us where to find you when things break"
        right={
          <>
            <div
              className="flex items-center"
              style={{
                gap: 8,
                padding: "6px 10px",
                border: "1px solid var(--hw-line-2)",
                borderRadius: 7,
              }}
            >
              <span
                className="hw-mono"
                style={{ fontSize: 11, color: "var(--hw-ink-2)" }}
              >
                {activeCount} active · {configs.length - activeCount} paused
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="hw-btn hw-btn-indigo"
            >
              <Icon name="bell" size={13} /> New alert
            </button>
          </>
        }
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="hw-fade-up hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <div
              className="grid"
              style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}
            >
              <Field label="Integration">
                <select
                  value={integrationId}
                  onChange={(e) => setIntegrationId(e.target.value)}
                  className="hw-input"
                >
                  {integrations.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.provider})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Channel">
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as "email" | "slack")
                  }
                  className="hw-input"
                >
                  <option value="email">Email</option>
                  <option value="slack">Slack</option>
                </select>
              </Field>
              <Field label="Destination">
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={
                    channel === "email"
                      ? "team@company.com"
                      : "https://hooks.slack.com/..."
                  }
                  className="hw-input hw-mono"
                />
              </Field>
              <Field label="Severity threshold (1–4)">
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="hw-input hw-mono"
                />
              </Field>
            </div>
            <div
              className="flex items-center justify-end"
              style={{ gap: 10, marginTop: 16 }}
            >
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="hw-btn hw-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="hw-btn hw-btn-primary"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "Creating…" : "Create alert"}
              </button>
            </div>
          </form>
        )}

        {configs.length === 0 ? (
          <section className="hw-fade-up">
            <div
              className="hw-panel flex flex-col items-center justify-center"
              style={{
                padding: "72px 24px",
                background: "var(--hw-bg-2)",
                textAlign: "center",
                gap: 12,
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "var(--hw-panel)",
                  border: "1px solid var(--hw-line)",
                }}
              >
                <Icon name="bell" size={22} color="var(--hw-ink-4)" />
              </div>
              <div style={{ fontSize: 15, color: "var(--hw-ink)" }}>
                No alerts configured
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--hw-ink-4)",
                  maxWidth: 360,
                }}
              >
                Create an alert to get notified the moment HookWise detects an
                anomaly or delivery failure.
              </div>
            </div>
          </section>
        ) : (
          <section className="hw-fade-up">
            <div
              className="hw-panel overflow-hidden"
              style={{ background: "var(--hw-bg-2)" }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <span className="hw-label">
                  {configs.length} ALERT{configs.length === 1 ? "" : "S"}
                </span>
              </div>
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Integration</th>
                    <th>Channel</th>
                    <th>Destination</th>
                    <th style={{ textAlign: "right" }}>Threshold</th>
                    <th>Status</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => {
                    const integ = integrationMap.get(c.integrationId);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center" style={{ gap: 8 }}>
                            {integ && (
                              <ProviderMark
                                provider={integ.provider}
                                size={14}
                              />
                            )}
                            <span
                              style={{ fontSize: 13, color: "var(--hw-ink)" }}
                            >
                              {integ?.name ?? c.integrationId.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Chip>{c.channel}</Chip>
                        </td>
                        <td
                          className="hw-mono"
                          style={{
                            fontSize: 11.5,
                            color: "var(--hw-ink-3)",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.destination}
                        </td>
                        <td
                          className="hw-mono hw-num"
                          style={{
                            textAlign: "right",
                            color: "var(--hw-ink-2)",
                          }}
                        >
                          sev ≥ {c.threshold ?? "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggle(c.id, c.enabled)}
                            className="hw-btn hw-btn-ghost"
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: c.enabled
                                  ? "var(--hw-green)"
                                  : "var(--hw-ink-5)",
                                display: "inline-block",
                              }}
                            />
                            {c.enabled ? "active" : "paused"}
                          </button>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            aria-label="Delete alert"
                            className="grid place-items-center"
                            style={{
                              width: 26,
                              height: 26,
                              color: "var(--hw-ink-4)",
                              margin: "0 0 0 auto",
                            }}
                          >
                            <Icon name="x" size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <style jsx>{`
        :global(.hw-input) {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--hw-bg-3);
          border: 1px solid var(--hw-line-2);
          color: var(--hw-ink);
          font-size: 13px;
          transition: all 150ms;
        }
        :global(.hw-input:focus) {
          outline: none;
          border-color: rgba(129, 140, 248, 0.4);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
        }
        :global(.hw-input::placeholder) {
          color: var(--hw-ink-5);
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
