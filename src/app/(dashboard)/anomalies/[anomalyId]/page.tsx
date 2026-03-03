export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Brain, Target, Zap, Lightbulb, Link2 } from "lucide-react";
import { SeverityBadge } from "@/components/dashboard/severity-badge";
import type { AnomalySeverity } from "@/types";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";
import { ResolveButton } from "./resolve-button";

export default async function AnomalyDetailPage({
  params,
}: {
  params: Promise<{ anomalyId: string }>;
}) {
  const { anomalyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [anomaly] = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.id, anomalyId))
    .limit(1);

  if (!anomaly) notFound();

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, anomaly.integrationId),
        eq(integrations.userId, user.id)
      )
    )
    .limit(1);

  if (!integration) notFound();

  const diagnosis = parseDiagnosis(anomaly.diagnosis);

  const context = anomaly.context as {
    baseline?: {
      eventCount?: number;
      avgResponseMs?: number;
      failureRate?: number;
      sampleCount?: number;
    };
    current?: {
      eventCount?: number;
      avgResponseMs?: number;
      failureRate?: number;
    };
  } | null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 fade-up">
        <Link
          href="/anomalies"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
              {anomaly.type.replace(/_/g, " ")}
            </h1>
            <SeverityBadge severity={anomaly.severity as AnomalySeverity} />
            {anomaly.resolvedAt && (
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Resolved
              </span>
            )}
          </div>
          <p className="text-[var(--text-tertiary)] text-[13px] mt-0.5">
            {integration.name} ({integration.provider}) &middot;{" "}
            {new Date(anomaly.detectedAt).toLocaleString()}
          </p>
        </div>
        {!anomaly.resolvedAt && <ResolveButton anomalyId={anomaly.id} />}
      </div>

      {/* AI Diagnosis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-1">
        <DiagnosisCard
          icon={<Target className="h-4 w-4 text-red-400" />}
          title="What happened"
          content={diagnosis.what ?? "No diagnosis available"}
          accentColor="red"
        />
        <DiagnosisCard
          icon={<Brain className="h-4 w-4 text-indigo-400" />}
          title="Root cause"
          content={diagnosis.why ?? "Unable to determine"}
          accentColor="indigo"
        />
        <DiagnosisCard
          icon={<Zap className="h-4 w-4 text-amber-400" />}
          title="Impact"
          content={diagnosis.impact ?? "Unknown"}
          accentColor="amber"
        />
        <DiagnosisCard
          icon={<Lightbulb className="h-4 w-4 text-emerald-400" />}
          title="Recommendation"
          content={diagnosis.recommendation ?? "Investigate manually"}
          accentColor="emerald"
        />
      </div>

      {/* Cross-correlation */}
      {diagnosis.crossCorrelation && (
        <div className="glass rounded-xl p-5 fade-up fade-up-2">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-indigo-400" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
              Cross-integration correlation
            </h3>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">{diagnosis.crossCorrelation}</p>
        </div>
      )}

      {/* Confidence + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-3">
        {/* Confidence */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
            AI Confidence
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-[var(--bg-surface)]">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${(diagnosis.confidence ?? 0) * 100}%` }}
              />
            </div>
            <span className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums">
              {((diagnosis.confidence ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
          {context?.baseline?.sampleCount && (
            <p className="text-[11px] text-[var(--text-faint)] mt-2">
              Based on {context.baseline.sampleCount} data points
            </p>
          )}
        </div>

        {/* Baseline vs Current */}
        {context?.baseline && context?.current && (
          <div className="glass rounded-xl p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
              Baseline vs Current
            </h3>
            <div className="space-y-3">
              <MetricCompare
                label="Events (5min)"
                baseline={context.baseline.eventCount ?? 0}
                current={context.current.eventCount ?? 0}
              />
              <MetricCompare
                label="Avg Response"
                baseline={context.baseline.avgResponseMs ?? 0}
                current={context.current.avgResponseMs ?? 0}
                suffix="ms"
              />
              <MetricCompare
                label="Failure Rate"
                baseline={(context.baseline.failureRate ?? 0) * 100}
                current={(context.current.failureRate ?? 0) * 100}
                suffix="%"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosisCard({
  icon,
  title,
  content,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  accentColor: string;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{content}</p>
    </div>
  );
}

function MetricCompare({
  label,
  baseline,
  current,
  suffix = "",
}: {
  label: string;
  baseline: number;
  current: number;
  suffix?: string;
}) {
  const diff = current - baseline;
  const pctChange = baseline > 0 ? ((diff / baseline) * 100).toFixed(0) : "N/A";
  const isUp = diff > 0;

  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[var(--text-tertiary)]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--text-faint)] tabular-nums">
          {baseline.toFixed(1)}{suffix}
        </span>
        <span className="text-[10px] text-[var(--text-ghost)]">&rarr;</span>
        <span className="text-[12px] text-[var(--text-secondary)] tabular-nums font-medium">
          {current.toFixed(1)}{suffix}
        </span>
        <span
          className={`text-[11px] tabular-nums ${
            isUp ? "text-red-400/60" : "text-emerald-400/60"
          }`}
        >
          {pctChange !== "N/A" ? `${isUp ? "+" : ""}${pctChange}%` : "--"}
        </span>
      </div>
    </div>
  );
}
