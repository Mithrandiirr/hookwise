export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import {
  db,
  integrations,
  reconciliationRuns,
} from "@/lib/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { RefreshCw, Inbox, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";

export default async function ReconciliationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select({ id: integrations.id, name: integrations.name, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, user!.id));

  const integrationIds = userIntegrations.map((i) => i.id);
  const integrationMap = Object.fromEntries(
    userIntegrations.map((i) => [i.id, i])
  );

  if (integrationIds.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState />
      </div>
    );
  }

  // Fetch all reconciliation runs
  const runs = await db
    .select()
    .from(reconciliationRuns)
    .where(inArray(reconciliationRuns.integrationId, integrationIds))
    .orderBy(desc(reconciliationRuns.ranAt))
    .limit(100);

  // Aggregate stats
  let totalRuns = runs.length;
  let totalGapsDetected = 0;
  let totalGapsResolved = 0;

  for (const run of runs) {
    totalGapsDetected += run.gapsDetected;
    totalGapsResolved += run.gapsResolved;
  }

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={["reconciliation_runs"]} />
      <Header />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up">
        <StatCard
          label="Total Runs"
          value={totalRuns}
          icon={<RefreshCw className="h-4 w-4" />}
          color="text-indigo-400"
        />
        <StatCard
          label="Gaps Detected"
          value={totalGapsDetected}
          icon={<Search className="h-4 w-4" />}
          color="text-amber-400"
        />
        <StatCard
          label="Gaps Resolved"
          value={totalGapsResolved}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-emerald-400"
        />
      </div>

      {/* Run history */}
      <div className="fade-up">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
            Run History
          </h2>
          <span className="text-[11px] text-[var(--text-faint)] ml-auto">
            {runs.length} runs
          </span>
        </div>

        {runs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const integration = integrationMap[run.integrationId];
              return (
                <div
                  key={run.id}
                  className="glass rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]">
                    {run.gapsDetected > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--text-secondary)] font-medium">
                        {integration?.name ?? "Unknown"}
                      </span>
                      <span className="text-[11px] text-[var(--text-ghost)] capitalize bg-[var(--bg-surface)] px-1.5 py-0.5 rounded">
                        {integration?.provider}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[11px] text-[var(--text-faint)]">
                        {run.providerEventsFound} provider events
                      </span>
                      <span className="text-[11px] text-[var(--text-faint)]">
                        {run.hookwiseEventsFound} HookWise events
                      </span>
                      {run.gapsDetected > 0 && (
                        <span className="text-[11px] text-amber-400 font-medium">
                          {run.gapsDetected} gaps found
                        </span>
                      )}
                      {run.gapsResolved > 0 && (
                        <span className="text-[11px] text-emerald-400 font-medium">
                          {run.gapsResolved} resolved
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--text-ghost)] shrink-0 tabular-nums">
                    {new Date(run.ranAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 fade-up">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <RefreshCw className="h-4.5 w-4.5 text-emerald-400" />
      </div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
          Reconciliation
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          Polls provider APIs to detect and recover webhook events that were never delivered.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-1.5 mb-3">
        <span className={color}>{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-xl p-16 text-center">
      <Inbox className="mx-auto h-8 w-8 text-[var(--text-ghost)] mb-3" />
      <p className="text-[var(--text-tertiary)] text-sm">
        No reconciliation runs yet. Runs happen automatically every 5 minutes for integrations with API keys configured.
      </p>
    </div>
  );
}
