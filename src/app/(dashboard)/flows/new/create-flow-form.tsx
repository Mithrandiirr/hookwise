"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-6 fade-up fade-up-1">
      {/* Flow Name */}
      <div className="glass rounded-xl p-5">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 mb-2">
          Flow Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Order Fulfillment"
          required
          className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/40 transition-colors"
        />
      </div>

      {/* Steps */}
      <div className="glass rounded-xl p-5">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 mb-4">
          Steps
        </label>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0 pt-3">
                <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[11px] text-white/30 font-mono">
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-[1px] h-4 bg-white/[0.06] mt-1" />
                )}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2">
                <select
                  value={step.integrationId}
                  onChange={(e) =>
                    updateStep(i, "integrationId", e.target.value)
                  }
                  required
                  className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-[13px] text-white focus:outline-none focus:border-indigo-500/40 transition-colors"
                >
                  <option value="" className="bg-[#0a0c12]">
                    Integration
                  </option>
                  {integrations.map((int) => (
                    <option
                      key={int.id}
                      value={int.id}
                      className="bg-[#0a0c12]"
                    >
                      {int.name} ({int.provider})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={step.eventType}
                  onChange={(e) =>
                    updateStep(i, "eventType", e.target.value)
                  }
                  placeholder="Event type"
                  required
                  className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/40 transition-colors font-mono"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={step.correlationField}
                    onChange={(e) =>
                      updateStep(i, "correlationField", e.target.value)
                    }
                    placeholder="Correlation field"
                    required
                    className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/40 transition-colors font-mono"
                  />
                  {steps.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-red-400 hover:border-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="mt-4 flex items-center gap-2 text-[13px] text-white/30 hover:text-white/50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add step
        </button>
      </div>

      {/* Timeout */}
      <div className="glass rounded-xl p-5">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 mb-2">
          Timeout (minutes)
        </label>
        <input
          type="number"
          value={timeoutMinutes}
          onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
          min={1}
          max={10080}
          className="w-32 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-[13px] text-white focus:outline-none focus:border-indigo-500/40 transition-colors tabular-nums"
        />
        <p className="text-[11px] text-white/15 mt-1">
          Flow instances will be marked as timed out if not completed within
          this duration.
        </p>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border-red-500/10 bg-red-500/[0.03]">
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-indigo-400 transition-colors disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create flow"}
      </button>
    </form>
  );
}
