"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chip, Icon, SectionHeader } from "@/components/hw";

interface SequencerRule {
  id: string;
  eventOrder: string[];
  holdTimeoutMs: number;
  enabled: boolean;
}

export function SequencerPanel({
  integrationId,
  rules: initialRules,
  sequencerEnabled,
}: {
  integrationId: string;
  rules: SequencerRule[];
  sequencerEnabled: boolean;
}) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [eventOrder, setEventOrder] = useState<string[]>(["", ""]);
  const [holdTimeoutMs, setHoldTimeoutMs] = useState(30000);

  function addStep() {
    setEventOrder((prev) => [...prev, ""]);
  }
  function updateStep(index: number, value: string) {
    setEventOrder((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function removeStep(index: number) {
    setEventOrder((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const filtered = eventOrder.filter((s) => s.trim());
    if (filtered.length < 2) return;
    setLoading(true);
    const res = await fetch(
      `/api/integrations/${integrationId}/sequencer-rules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventOrder: filtered, holdTimeoutMs }),
      },
    );
    if (res.ok) {
      const created: SequencerRule = await res.json();
      setRules((prev) => [...prev, created]);
      setShowForm(false);
      setEventOrder(["", ""]);
      setHoldTimeoutMs(30000);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await fetch(
      `/api/integrations/${integrationId}/sequencer-rules?id=${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      },
    );
    if (res.ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)),
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(
      `/api/integrations/${integrationId}/sequencer-rules?id=${id}`,
      { method: "DELETE" },
    );
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (!sequencerEnabled) {
    return (
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <SectionHeader title="Event sequencer" />
        <div
          style={{
            marginTop: 12,
            padding: "24px 16px",
            textAlign: "center",
            fontSize: 12.5,
            color: "var(--hw-ink-4)",
          }}
        >
          Enable the Event Sequencer in Settings to configure ordering rules.
        </div>
      </div>
    );
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
        <SectionHeader title="Event sequencer rules" />
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="hw-btn hw-btn-ghost"
        >
          <Icon name="zap" size={12} /> Add rule
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
            <label
              className="hw-label"
              style={{ display: "block", marginBottom: 10 }}
            >
              Event order (events must arrive in this sequence)
            </label>
            <div className="flex flex-col" style={{ gap: 6 }}>
              {eventOrder.map((step, i) => (
                <div key={i} className="flex items-center" style={{ gap: 8 }}>
                  <span
                    className="hw-mono hw-num"
                    style={{
                      width: 24,
                      textAlign: "right",
                      fontSize: 11,
                      color: "var(--hw-ink-4)",
                    }}
                  >
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    required
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder="e.g. order.created"
                    className="hw-input hw-mono"
                    style={{ flex: 1 }}
                  />
                  {eventOrder.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
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
              onClick={addStep}
              className="hw-mono"
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--hw-indigo-ink)",
              }}
            >
              + Add step
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              className="hw-label"
              style={{ display: "block", marginBottom: 8 }}
            >
              Hold timeout (ms)
            </label>
            <input
              type="number"
              value={holdTimeoutMs}
              onChange={(e) => setHoldTimeoutMs(Number(e.target.value))}
              min={1000}
              max={300000}
              className="hw-input hw-mono"
              style={{ width: 200 }}
            />
            <div
              className="hw-mono"
              style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 6 }}
            >
              Events held longer than this release regardless of order.
            </div>
          </div>

          <div
            className="flex items-center justify-end"
            style={{ gap: 10 }}
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
              {loading ? "Creating…" : "Create rule"}
            </button>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--hw-ink-4)",
            fontSize: 12.5,
          }}
        >
          No sequencer rules yet. Define event ordering to prevent race conditions.
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="hw-panel flex items-center"
              style={{
                padding: "12px 14px",
                background: "var(--hw-bg-3)",
                gap: 14,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="flex items-center flex-wrap"
                  style={{ gap: 6 }}
                >
                  {rule.eventOrder.map((evt, i) => (
                    <div
                      key={i}
                      className="flex items-center"
                      style={{ gap: 6 }}
                    >
                      <Chip>{evt}</Chip>
                      {i < rule.eventOrder.length - 1 && (
                        <Icon name="chevron-right" size={11} color="var(--hw-ink-5)" />
                      )}
                    </div>
                  ))}
                </div>
                <div
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-4)", marginTop: 6 }}
                >
                  hold timeout · {rule.holdTimeoutMs}ms
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 10 }}>
                <Chip tone={rule.enabled ? "green" : undefined}>
                  {rule.enabled ? "enabled" : "off"}
                </Chip>
                <button
                  type="button"
                  onClick={() => handleToggle(rule.id, rule.enabled)}
                  className="hw-btn hw-btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
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
