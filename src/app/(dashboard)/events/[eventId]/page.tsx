export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db, events, deliveries, integrations, replayQueue } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Zap,
  Send,
} from "lucide-react";
import Link from "next/link";
import { ReplayButton } from "./replay-button";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) notFound();

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, event.integrationId),
        eq(integrations.userId, user!.id)
      )
    )
    .limit(1);

  if (!integration) notFound();

  const eventDeliveries = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.eventId, eventId))
    .orderBy(desc(deliveries.attemptedAt));

  const replayItems = await db
    .select()
    .from(replayQueue)
    .where(eq(replayQueue.eventId, eventId));

  const replayItem = replayItems.length > 0 ? replayItems[0] : null;
  const lastDelivery = eventDeliveries.length > 0 ? eventDeliveries[0] : null;
  const hasSuccessfulDelivery = eventDeliveries.some(
    (d) => d.status === "delivered"
  );

  const statusConfig = hasSuccessfulDelivery
    ? {
        icon: <CheckCircle className="h-4 w-4" />,
        label: "Delivered successfully",
        color: "text-emerald-400",
        bg: "bg-emerald-500/5 border-emerald-500/10",
        glow: "glow-green",
      }
    : replayItem
    ? {
        icon: <Clock className="h-4 w-4" />,
        label: `Queued for replay (${replayItem.status})`,
        color: "text-amber-400",
        bg: "bg-amber-500/5 border-amber-500/10",
        glow: "glow-amber",
      }
    : lastDelivery
    ? {
        icon: <XCircle className="h-4 w-4" />,
        label: `Delivery failed${lastDelivery.errorType ? ` - ${lastDelivery.errorType}` : ""}`,
        color: "text-red-400",
        bg: "bg-red-500/5 border-red-500/10",
        glow: "glow-red",
      }
    : {
        icon: <Clock className="h-4 w-4" />,
        label: "Pending delivery",
        color: "text-white/40",
        bg: "bg-white/[0.02] border-white/[0.06]",
        glow: "",
      };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 fade-up">
        <Link
          href="/events"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/[0.1] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white font-mono">
            {event.eventType}
          </h1>
          <p className="text-white/30 text-[13px] mt-0.5">
            <Link
              href={`/integrations/${integration.id}`}
              className="text-white/40 hover:text-white/60 transition-colors"
            >
              {integration.name}
            </Link>
            <span className="mx-2 text-white/15">|</span>
            <span className="capitalize">{integration.provider}</span>
            <span className="mx-2 text-white/15">|</span>
            {new Date(event.receivedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-xl border p-4 flex items-center gap-3 ${statusConfig.bg} fade-up fade-up-1`}
      >
        <div className={`${statusConfig.color} ${statusConfig.glow}`}>
          {statusConfig.icon}
        </div>
        <span className={`${statusConfig.color} font-medium text-[13px]`}>
          {statusConfig.label}
        </span>
        {!hasSuccessfulDelivery && (
          <div className="ml-auto">
            <ReplayButton eventId={eventId} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Event Details */}
          <div className="glass rounded-xl p-6 fade-up fade-up-2">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-indigo-400" />
              <h2 className="text-[15px] font-semibold text-white">
                Event Details
              </h2>
            </div>
            <dl className="space-y-3">
              <DetailRow label="ID" value={event.id} mono />
              <DetailRow
                label="Provider Event ID"
                value={event.providerEventId ?? "--"}
                mono
              />
              <DetailRow label="Source" value={event.source} />
              <DetailRow
                label="Attempts"
                value={String(eventDeliveries.length)}
              />
              <div className="flex items-center justify-between py-1">
                <dt className="text-white/30 text-[13px]">Signature</dt>
                <dd>
                  {event.signatureValid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-[12px]">
                      <CheckCircle className="h-3 w-3" />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400/70 text-[12px]">
                      <XCircle className="h-3 w-3" />
                      Invalid
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Payload */}
          <div className="glass rounded-xl p-6 fade-up fade-up-3">
            <h2 className="text-[15px] font-semibold text-white mb-4">
              Payload
            </h2>
            <pre className="json-viewer text-[12px] text-white/60 overflow-auto max-h-[420px] p-4 font-mono leading-relaxed">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Delivery Timeline */}
        <div className="glass rounded-xl p-6 fade-up fade-up-3">
          <div className="flex items-center gap-2 mb-5">
            <Send className="h-4 w-4 text-indigo-400" />
            <h2 className="text-[15px] font-semibold text-white">
              Delivery Timeline
            </h2>
            {eventDeliveries.length > 0 && (
              <span className="text-[11px] text-white/20 ml-auto tabular-nums">
                {eventDeliveries.length} attempt
                {eventDeliveries.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {eventDeliveries.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-white/10 mb-3" />
              <p className="text-white/25 text-sm">
                No delivery attempts yet.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {eventDeliveries.map((delivery, i) => {
                const isSuccess = delivery.status === "delivered";
                const isFailed = delivery.status === "failed";
                const dotColor = isSuccess
                  ? "bg-emerald-400 glow-green"
                  : isFailed
                  ? "bg-red-400 glow-red"
                  : "bg-amber-400 glow-amber";
                const textColor = isSuccess
                  ? "text-emerald-400"
                  : isFailed
                  ? "text-red-400"
                  : "text-amber-400";

                return (
                  <div key={delivery.id} className="relative flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 shrink-0 z-10`}
                      />
                      {i < eventDeliveries.length - 1 && (
                        <div className="w-px flex-1 bg-white/[0.06] my-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`${textColor} font-medium text-[13px]`}
                        >
                          Attempt #{delivery.attemptNumber}
                        </span>
                        {delivery.statusCode && (
                          <span className="font-mono text-[11px] text-white/25 bg-white/[0.03] px-1.5 py-0.5 rounded">
                            {delivery.statusCode}
                          </span>
                        )}
                        {delivery.errorType && (
                          <span className="text-[11px] text-white/25 bg-red-500/5 border border-red-500/10 px-1.5 py-0.5 rounded">
                            {delivery.errorType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-white/20">
                        <span>
                          {new Date(delivery.attemptedAt).toLocaleString()}
                        </span>
                        {delivery.responseTimeMs !== null && (
                          <span className="tabular-nums">
                            {delivery.responseTimeMs}ms
                          </span>
                        )}
                      </div>
                      {delivery.responseBody && (
                        <pre className="mt-2 json-viewer text-[11px] text-white/30 p-2.5 overflow-auto max-h-20 font-mono">
                          {delivery.responseBody}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <dt className="text-white/30 text-[13px]">{label}</dt>
      <dd
        className={`text-white/60 text-[12px] ${mono ? "font-mono" : ""} max-w-[60%] truncate`}
      >
        {value}
      </dd>
    </div>
  );
}
