"use client";

interface FlowStep {
  integrationId: string;
  eventType: string;
  correlationField: string;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  integrationNames: Record<string, string>;
  completedSteps?: number;
  status?: "running" | "completed" | "failed" | "timed_out";
}

const statusColors: Record<string, { node: string; connector: string; text: string }> = {
  completed: {
    node: "border-emerald-500/40 bg-emerald-500/10",
    connector: "bg-emerald-500/40",
    text: "text-emerald-400",
  },
  running: {
    node: "border-indigo-500/40 bg-indigo-500/10",
    connector: "bg-indigo-500/40",
    text: "text-indigo-400",
  },
  failed: {
    node: "border-red-500/40 bg-red-500/10",
    connector: "bg-red-500/20",
    text: "text-red-400",
  },
  timed_out: {
    node: "border-amber-500/40 bg-amber-500/10",
    connector: "bg-amber-500/20",
    text: "text-amber-400",
  },
  pending: {
    node: "border-white/[0.08] bg-white/[0.02]",
    connector: "bg-white/[0.06]",
    text: "text-white/25",
  },
};

export function FlowDiagram({
  steps,
  integrationNames,
  completedSteps = 0,
  status = "running",
}: FlowDiagramProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-4 px-2">
      {steps.map((step, i) => {
        const isCompleted = i < completedSteps;
        const isCurrent = i === completedSteps && status === "running";
        const stepStatus = isCompleted
          ? "completed"
          : isCurrent
            ? "running"
            : status === "failed" && i === completedSteps
              ? "failed"
              : status === "timed_out" && i === completedSteps
                ? "timed_out"
                : "pending";
        const colors = statusColors[stepStatus];

        return (
          <div key={i} className="flex items-center shrink-0">
            {/* Node */}
            <div
              className={`flex flex-col items-center justify-center rounded-xl border px-4 py-3 min-w-[140px] ${colors.node}`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
                {integrationNames[step.integrationId] ?? "Unknown"}
              </span>
              <span className="text-[12px] font-mono text-white/60 mt-1">
                {step.eventType}
              </span>
              <span className="text-[10px] text-white/15 mt-0.5">
                {step.correlationField}
              </span>
            </div>

            {/* Connector arrow */}
            {i < steps.length - 1 && (
              <div className="flex items-center mx-1">
                <div className={`h-[2px] w-8 ${colors.connector}`} />
                <div
                  className={`w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent ${
                    isCompleted
                      ? "border-l-emerald-500/40"
                      : isCurrent
                        ? "border-l-indigo-500/40"
                        : "border-l-white/[0.08]"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
