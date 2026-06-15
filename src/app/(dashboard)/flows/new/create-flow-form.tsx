"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, SectionHeader } from "@/components/hw";

interface Integration {
  id: string;
  name: string;
  provider: string;
}

interface FlowStep {
  integrationId: string;
  eventType: string;
  correlationField: string;
}

export function CreateFlowForm({
  integrations,
}: {
  integrations: Integration[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timeoutMinutes, setTimeoutMinutes] = useState(60);
  const [steps, setSteps] = useState<FlowStep[]>([
    { integrationId: "", eventType: "", correlationField: "" },
    { integrationId: "", eventType: "", correlationField: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps([
      ...steps,
      { integrationId: "", eventType: "", correlationField: "" },
    ]);
  }
  function removeStep(index: number) {
    if (steps.length <= 2) return;
    setSteps(steps.filter((_, i) => i !== index));
  }
  function updateStep(index: number, field: keyof FlowStep, value: string) {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, steps, timeoutMinutes }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create flow");
        return;
      }
      const flow = await res.json();
      router.push(`/flows/${flow.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 16 }}>
      {/* Name */}
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <SectionHeader title="Flow name" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Order Fulfillment"
          required
          className="hw-input"
          style={{ marginTop: 12 }}
        />
      </div>

      {/* Steps */}
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <SectionHeader title="Steps" />
        <div className="flex flex-col" style={{ gap: 14, marginTop: 14 }}>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start" style={{ gap: 10 }}>
              <div
                className="flex flex-col items-center"
                style={{ paddingTop: 10 }}
              >
                <div
                  className="grid place-items-center hw-mono"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: "var(--hw-bg-3)",
                    border: "1px solid var(--hw-line-2)",
                    fontSize: 11,
                    color: "var(--hw-ink-3)",
                  }}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "var(--hw-line-2)",
                      marginTop: 4,
                    }}
                  />
                )}
              </div>
              <div
                className="grid"
                style={{
                  flex: 1,
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 8,
                }}
              >
                <select
                  value={step.integrationId}
                  onChange={(e) => updateStep(i, "integrationId", e.target.value)}
                  required
                  className="hw-input"
                >
                  <option value="">Integration</option>
                  {integrations.map((int) => (
                    <option key={int.id} value={int.id}>
                      {int.name} ({int.provider})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={step.eventType}
                  onChange={(e) => updateStep(i, "eventType", e.target.value)}
                  placeholder="event type"
                  required
                  className="hw-input hw-mono"
                />
                <input
                  type="text"
                  value={step.correlationField}
                  onChange={(e) =>
                    updateStep(i, "correlationField", e.target.value)
                  }
                  placeholder="correlation field"
                  required
                  className="hw-input hw-mono"
                />
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 2}
                  aria-label="Remove step"
                  className="grid place-items-center"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid var(--hw-line-2)",
                    background: "var(--hw-bg-3)",
                    color:
                      steps.length > 2 ? "var(--hw-ink-3)" : "var(--hw-ink-5)",
                    cursor: steps.length > 2 ? "pointer" : "not-allowed",
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="hw-mono"
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "var(--hw-indigo-ink)",
          }}
        >
          + Add step
        </button>
      </div>

      {/* Timeout */}
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <SectionHeader title="Timeout" />
        <div
          className="flex items-center"
          style={{ marginTop: 12, gap: 10 }}
        >
          <input
            type="number"
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
            min={1}
            max={10080}
            className="hw-input hw-mono"
            style={{ width: 120 }}
          />
          <span className="hw-mono" style={{ fontSize: 11, color: "var(--hw-ink-4)" }}>
            minutes
          </span>
        </div>
        <div
          className="hw-mono"
          style={{ marginTop: 8, fontSize: 11, color: "var(--hw-ink-4)" }}
        >
          Instances are marked timed_out if they don&apos;t complete within this duration.
        </div>
      </div>

      {error && (
        <div
          className="hw-mono"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fdeaea",
            border: "1px solid #f4c4c4",
            color: "var(--hw-red)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="hw-btn hw-btn-primary"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <Icon name="check" size={13} /> {loading ? "Creating…" : "Create flow"}
        </button>
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
    </form>
  );
}
