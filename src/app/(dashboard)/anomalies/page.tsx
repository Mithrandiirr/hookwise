export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, desc, inArray, isNull, isNotNull } from "drizzle-orm";
import { AlertTriangle, Shield, ArrowUpRight } from "lucide-react";
import { SeverityBadge } from "@/components/dashboard/severity-badge";
import Link from "next/link";
import type { AnomalySeverity } from "@/types";

export default async function AnomaliesPage() {
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

  const allAnomalies =
    integrationIds.length > 0
      ? await db
          .select()
          .from(anomalies)
          .where(inArray(anomalies.integrationId, integrationIds))
          .orderBy(desc(anomalies.detectedAt))
          .limit(100)
      : [];

  const activeCount = allAnomalies.filter((a) => !a.resolvedAt).length;
  const resolvedCount = allAnomalies.filter((a) => a.resolvedAt).length;

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-white">
          Anomalies
        </h1>
        <p className="text-white/40 mt-1 text-[15px]">
          AI-detected anomalies across your integrations
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up fade-up-1">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
              Active
            </span>
          </div>
          <p className={`text-3xl font-bold tabular-nums stat-value ${activeCount > 0 ? "text-red-400" : "text-white"}`}>
            {activeCount}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
              Resolved
            </span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-white stat-value">
            {resolvedCount}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-indigo-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
              Total
            </span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-white stat-value">
            {allAnomalies.length}
          </p>
        </div>
      </div>

      {/* Anomaly Timeline */}
      <div className="fade-up fade-up-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-semibold text-white tracking-tight">
            Timeline
          </h2>
        </div>

        {allAnomalies.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] mb-4">
              <Shield className="h-6 w-6 text-white/20" />
            </div>
            <p className="text-white/50 font-medium text-[15px]">
              No anomalies detected
            </p>
            <p className="text-white/20 text-sm mt-1 max-w-sm mx-auto">
              Anomalies will appear here once your integrations have enough data
              for AI pattern learning (200+ events).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allAnomalies.map((anomaly) => {
              const integration = integrationMap[anomaly.integrationId];
              let diagnosis: { what?: string; recommendation?: string } = {};
              try {
                diagnosis = JSON.parse(anomaly.diagnosis ?? "{}");
              } catch { /* noop */ }

              return (
                <Link
                  key={anomaly.id}
                  href={`/anomalies/${anomaly.id}`}
                  className="group glass rounded-xl p-5 flex items-start gap-4 transition-all duration-200 hover:border-white/[0.12] block"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0 pt-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        anomaly.resolvedAt
                          ? "bg-white/10"
                          : anomaly.severity === "critical"
                            ? "bg-red-400 glow-red animate-pulse-glow"
                            : anomaly.severity === "high"
                              ? "bg-red-400 glow-red"
                              : anomaly.severity === "medium"
                                ? "bg-amber-400 glow-amber"
                                : "bg-white/20"
                      }`}
                    />
                    <div className="w-[1px] h-8 bg-white/[0.06] mt-1" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <SeverityBadge severity={anomaly.severity as AnomalySeverity} />
                      <span className="text-[11px] text-white/25 bg-white/[0.03] px-2 py-0.5 rounded">
                        {anomaly.type.replace(/_/g, " ")}
                      </span>
                      {integration && (
                        <span className="text-[11px] text-white/30">
                          {integration.name}
                        </span>
                      )}
                      {anomaly.resolvedAt && (
                        <span className="text-[11px] text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-white/60 line-clamp-2">
                      {diagnosis.what ?? "Anomaly detected"}
                    </p>
                    {diagnosis.recommendation && (
                      <p className="text-[12px] text-white/25 mt-1 line-clamp-1">
                        Recommendation: {diagnosis.recommendation}
                      </p>
                    )}
                  </div>

                  {/* Timestamp + arrow */}
                  <div className="flex flex-col items-end shrink-0 gap-2">
                    <span className="text-[11px] text-white/20 tabular-nums">
                      {formatTime(anomaly.detectedAt)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
