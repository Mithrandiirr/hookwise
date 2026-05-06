"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chip, Icon, SectionHeader } from "@/components/hw";

interface Transformation {
  id: string;
  eventType: string;
  rules: TransformationRule[];
  enabled: boolean;
}

interface TransformationRule {
  action: "rename_field" | "remove_field" | "add_field" | "map_value";
  field: string;
  value?: unknown;
  mapping?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  rename_field: "rename",
  remove_field: "remove",
  add_field: "add",
  map_value: "map",
};

export function TransformationsPanel({
  integrationId,
  transformations: initialTransformations,
}: {
  integrationId: string;
  transformations: Transformation[];
}) {
  const router = useRouter();
  const [transformations, setTransformations] = useState(initialTransformations);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [eventType, setEventType] = useState("");
  const [rules, setRules] = useState<TransformationRule[]>([
    { action: "rename_field", field: "" },
  ]);

  function addRule() {
    setRules((prev) => [...prev, { action: "rename_field", field: "" }]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRule(index: number, updates: Partial<TransformationRule>) {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!eventType || rules.length === 0) return;
    setLoading(true);

    const res = await fetch(
      `/api/integrations/${integrationId}/transformations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, rules }),
      },
    );

    if (res.ok) {
      const created: Transformation = await res.json();
      setTransformations((prev) => [...prev, created]);
      setShowForm(false);
      setEventType("");
      setRules([{ action: "rename_field", field: "" }]);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await fetch(
      `/api/integrations/${integrationId}/transformations?id=${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      },
    );
    if (res.ok) {
      setTransformations((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled: !enabled } : t)),
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(
      `/api/integrations/${integrationId}/transformations?id=${id}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setTransformations((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div
      className="hw-panel"
      style={{ padding: 22, background: "var(--hw-bg-2)" }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 14 }}
      >
        <SectionHeader title="Transformations" />
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="hw-btn hw-btn-ghost"
        >
          <Icon name="plug" size={12} /> Add rule
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="hw-panel"
          style={{
            padding: 18,
            background: "var(--hw-bg-3)",
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
              Event type
            </label>
            <input
              type="text"
              required
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. payment_intent.succeeded"
              className="hw-input hw-mono"
            />
          </div>

          <div>
            <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
              Rules
            </label>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center" style={{ gap: 8 }}>
                  <select
                    value={rule.action}
                    onChange={(e) =>
                      updateRule(i, {
                        action: e.target.value as TransformationRule["action"],
                      })
                    }
                    className="hw-input"
                    style={{ width: 110 }}
                  >
                    <option value="rename_field">Rename</option>
                    <option value="remove_field">Remove</option>
                    <option value="add_field">Add</option>
                    <option value="map_value">Map</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={rule.field}
                    onChange={(e) => updateRule(i, { field: e.target.value })}
                    placeholder="field name"
                    className="hw-input hw-mono"
                    style={{ flex: 1 }}
                  />
                  {(rule.action === "rename_field" ||
                    rule.action === "add_field") && (
                    <input
                      type="text"
                      value={typeof rule.value === "string" ? rule.value : ""}
                      onChange={(e) => updateRule(i, { value: e.target.value })}
                      placeholder={
                        rule.action === "rename_field" ? "new name" : "value"
                      }
                      className="hw-input hw-mono"
                      style={{ flex: 1 }}
                    />
                  )}
                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRule(i)}
                      className="grid place-items-center"
                      style={{
                        width: 28,
                        height: 28,
                        color: "var(--hw-ink-4)",
                      }}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRule}
              className="hw-mono"
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--hw-indigo-ink)",
              }}
            >
              + Add another rule
            </button>
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
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {transformations.length === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--hw-ink-4)",
            fontSize: 12.5,
          }}
        >
          No transformations configured. Add rules to modify event payloads before delivery.
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {transformations.map((t) => (
            <div
              key={t.id}
              className="hw-panel flex items-start"
              style={{
                padding: "12px 14px",
                background: "var(--hw-bg-3)",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="flex items-center flex-wrap"
                  style={{ gap: 8, marginBottom: 6 }}
                >
                  <span
                    className="hw-mono"
                    style={{ fontSize: 12, color: "var(--hw-indigo-ink)" }}
                  >
                    {t.eventType}
                  </span>
                  <span
                    className="hw-mono"
                    style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                  >
                    {t.rules.length} rule{t.rules.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {t.rules.map((rule, i) => (
                    <Chip key={i}>
                      {ACTION_LABELS[rule.action]}: {rule.field}
                      {rule.value !== undefined
                        ? ` → ${String(rule.value)}`
                        : ""}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 10 }}>
                <Chip tone={t.enabled ? "green" : undefined}>
                  {t.enabled ? "enabled" : "off"}
                </Chip>
                <button
                  type="button"
                  onClick={() => handleToggle(t.id, t.enabled)}
                  className="hw-btn hw-btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  {t.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  aria-label="Delete"
                  className="grid place-items-center"
                  style={{
                    width: 26,
                    height: 26,
                    color: "var(--hw-ink-4)",
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        :global(.hw-input) {
          width: 100%;
          padding: 8px 10px;
          border-radius: 7px;
          background: var(--hw-bg-2);
          border: 1px solid var(--hw-line-2);
          color: var(--hw-ink);
          font-size: 12.5px;
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
    </div>
  );
}
