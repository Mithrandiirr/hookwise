export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, flows, flowInstances, integrations } from "@/lib/db";
import { eq, desc, count, and } from "drizzle-orm";
import { GitBranch, Plus, ArrowUpRight, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function FlowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userFlows = await db
    .select()
    .from(flows)
    .where(eq(flows.userId, user!.id))
    .orderBy(desc(flows.createdAt));

  // Get instance counts per flow
  const flowStats = await Promise.all(
    userFlows.map(async (flow) => {
      const [running] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(
            eq(flowInstances.flowId, flow.id),
            eq(flowInstances.status, "running")
          )
        );
      const [completed] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(
            eq(flowInstances.flowId, flow.id),
            eq(flowInstances.status, "completed")
          )
        );
      const [failed] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(
            eq(flowInstances.flowId, flow.id),
            eq(flowInstances.status, "failed")
          )
        );
      const [timedOut] = await db
        .select({ count: count() })
        .from(flowInstances)
        .where(
          and(
            eq(flowInstances.flowId, flow.id),
            eq(flowInstances.status, "timed_out")
          )
        );

      return {
        flowId: flow.id,
        running: running?.count ?? 0,
        completed: completed?.count ?? 0,
        failed: failed?.count ?? 0,
        timedOut: timedOut?.count ?? 0,
      };
    })
  );

  const statsMap = Object.fromEntries(flowStats.map((s) => [s.flowId, s]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between fade-up">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white">
            Flows
          </h1>
          <p className="text-white/40 mt-1 text-[15px]">
            Track multi-step event chains across providers
          </p>
        </div>
        <Link
          href="/flows/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Create flow
        </Link>
      </div>

      {userFlows.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center fade-up fade-up-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] mb-4">
            <GitBranch className="h-6 w-6 text-white/20" />
          </div>
          <p className="text-white/50 font-medium text-[15px]">
            No flows defined
          </p>
          <p className="text-white/20 text-sm mt-1 max-w-sm mx-auto">
            Define event flows like: Shopify order &rarr; Stripe payment &rarr;
            SendGrid email.
          </p>
          <Link
            href="/flows/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create flow
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 fade-up fade-up-1">
          {userFlows.map((flow) => {
            const steps = flow.steps as Array<{ eventType: string }>;
            const stats = statsMap[flow.id];

            return (
              <Link
                key={flow.id}
                href={`/flows/${flow.id}`}
                className="group glass rounded-xl p-5 flex items-center gap-5 transition-all duration-200 hover:border-white/[0.12]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <GitBranch className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-[15px] mb-1">
                    {flow.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[12px] text-white/20">
                    <span>{steps.length} steps</span>
                    <span className="text-white/10">&middot;</span>
                    <span>Timeout: {flow.timeoutMinutes}min</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-white/30 bg-white/[0.03] px-1.5 py-0.5 rounded">
                          {step.eventType}
                        </span>
                        {i < steps.length - 1 && (
                          <span className="text-white/10 text-[10px]">&rarr;</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instance stats */}
                {stats && (
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <InstanceStat
                      icon={<Clock className="h-3 w-3 text-indigo-400" />}
                      count={stats.running}
                      label="Running"
                    />
                    <InstanceStat
                      icon={<CheckCircle className="h-3 w-3 text-emerald-400" />}
                      count={stats.completed}
                      label="Done"
                    />
                    <InstanceStat
                      icon={<XCircle className="h-3 w-3 text-red-400" />}
                      count={stats.failed + stats.timedOut}
                      label="Failed"
                    />
                  </div>
                )}

                <ArrowUpRight className="h-4 w-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InstanceStat({
  icon,
  count: c,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <span className="text-[15px] font-semibold text-white tabular-nums">
          {c}
        </span>
      </div>
      <span className="text-[10px] text-white/20 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
