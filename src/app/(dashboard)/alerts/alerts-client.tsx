"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, Trash2 } from "lucide-react";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";

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

  // Form state
  const [integrationId, setIntegrationId] = useState(integrations[0]?.id ?? "");
  const [channel, setChannel] = useState<"email" | "slack">("email");
  const [destination, setDestination] = useState("");
  const [threshold, setThreshold] = useState<number>(3);

  const integrationMap = Object.fromEntries(integrations.map((i) => [i.id, i]));

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
      setConfigs((prev) => [...prev, { ...created, createdAt: created.createdAt ?? new Date().toISOString() }]);
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
        prev.map((c) => (c.id === id ? { ...c, enabled: !enabled } : c))
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/alert-configs?id=${id}`, { method: "DELETE" });

    if (res.ok) {
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={["alert_configs"]} />

      <div className="flex items-center justify-between fade-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Bell className="h-4.5 w-4.5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
              Alerts
            </h1>
            <p className="text-[13px] text-[var(--text-tertiary)]">
              Configure notifications for anomalies and failures.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New alert
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass rounded-xl p-5 space-y-4 fade-up"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                Integration
              </label>
              <select
                value={integrationId}
                onChange={(e) => setIntegrationId(e.target.value)}
                className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none"
              >
                {integrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as "email" | "slack")}
                className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none"
              >
                <option value="email">Email</option>
                <option value="slack">Slack</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                Destination
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={channel === "email" ? "team@company.com" : "https://hooks.slack.com/..."}
                className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                Severity threshold (1-4)
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create alert"}
            </button>
          </div>
        </form>
      )}

      {/* Config list */}
      {configs.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center fade-up">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-surface)] mb-4">
            <Bell className="h-6 w-6 text-[var(--text-faint)]" />
          </div>
          <p className="text-[var(--text-secondary)] font-medium text-[15px]">
            No alert configs yet
          </p>
          <p className="text-[var(--text-faint)] text-sm mt-1">
            Create an alert to get notified about anomalies and failures.
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden fade-up">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Integration
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Channel
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Destination
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Threshold
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Status
                </th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const integration = integrationMap[config.integrationId];
                return (
                  <tr
                    key={config.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 table-row-hover"
                  >
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {integration?.name ?? config.integrationId.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded capitalize">
                        {config.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] font-mono text-[12px] truncate max-w-[200px]">
                      {config.destination}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-tertiary)] tabular-nums">
                      {config.threshold ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(config.id, config.enabled)}
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          config.enabled
                            ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                            : "text-[var(--text-muted)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]"
                        }`}
                      >
                        {config.enabled ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-[var(--text-ghost)] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
