export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, integrations, endpoints } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { Plug, Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user!.id))
    .orderBy(desc(integrations.createdAt));

  const integrationIds = userIntegrations.map((i) => i.id);
  const userEndpoints =
    integrationIds.length > 0
      ? await db
          .select()
          .from(endpoints)
          .where(inArray(endpoints.integrationId, integrationIds))
      : [];
  const endpointMap = Object.fromEntries(
    userEndpoints.map((e) => [e.integrationId, e])
  );

  const providerColors: Record<string, string> = {
    stripe: "text-violet-400 bg-violet-500/10",
    shopify: "text-green-400 bg-green-500/10",
    github: "text-white/50 bg-white/5",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between fade-up">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white">
            Integrations
          </h1>
          <p className="text-white/40 mt-1 text-[15px]">
            Manage your webhook integrations
          </p>
        </div>
        <Link
          href="/integrations/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New integration
        </Link>
      </div>

      {userIntegrations.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center fade-up fade-up-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] mb-4">
            <Plug className="h-6 w-6 text-white/20" />
          </div>
          <p className="text-white/50 font-medium text-[15px]">
            No integrations yet
          </p>
          <p className="text-white/20 text-sm mt-1 max-w-sm mx-auto">
            Connect Stripe, Shopify, GitHub, or any webhook provider.
          </p>
          <Link
            href="/integrations/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add integration
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 fade-up fade-up-1">
          {userIntegrations.map((integration) => {
            const endpoint = endpointMap[integration.id];
            return (
              <Link
                key={integration.id}
                href={`/integrations/${integration.id}`}
                className="group glass rounded-xl p-5 flex items-center gap-5 transition-all duration-200 hover:border-white/[0.12]"
              >
                {/* Provider badge */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg text-[13px] font-bold shrink-0 ${
                    providerColors[integration.provider] ?? providerColors.github
                  }`}
                >
                  {integration.provider === "stripe"
                    ? "S"
                    : integration.provider === "shopify"
                    ? "Sh"
                    : "GH"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-semibold text-white text-[15px]">
                      {integration.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                        integration.status === "active"
                          ? "text-emerald-400"
                          : integration.status === "paused"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          integration.status === "active"
                            ? "bg-emerald-400"
                            : integration.status === "paused"
                            ? "bg-amber-400"
                            : "bg-red-400"
                        }`}
                      />
                      {integration.status}
                    </span>
                    {endpoint && <HealthDot state={endpoint.circuitState} />}
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-white/20">
                    <span className="font-mono">
                      /api/ingest/{integration.id}
                    </span>
                  </div>
                  <div className="text-[12px] text-white/15 mt-0.5 truncate">
                    {integration.destinationUrl}
                  </div>
                </div>

                {/* Health stats */}
                {endpoint && (
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-white/20 uppercase tracking-wider">
                        Success
                      </p>
                      <p className="text-[15px] font-semibold text-white tabular-nums">
                        {endpoint.successRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/20 uppercase tracking-wider">
                        Latency
                      </p>
                      <p className="text-[15px] font-semibold text-white tabular-nums">
                        {endpoint.avgResponseMs.toFixed(0)}ms
                      </p>
                    </div>
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

function HealthDot({ state }: { state: string }) {
  const config: Record<string, { label: string; dot: string; text: string }> = {
    closed: {
      label: "Healthy",
      dot: "bg-emerald-400 glow-green",
      text: "text-emerald-400",
    },
    half_open: {
      label: "Degraded",
      dot: "bg-amber-400 glow-amber",
      text: "text-amber-400",
    },
    open: {
      label: "Down",
      dot: "bg-red-400 glow-red animate-pulse-glow",
      text: "text-red-400",
    },
  };
  const { label, dot, text } = config[state] ?? config.closed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
