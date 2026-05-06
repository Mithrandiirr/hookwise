export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db, events, deliveries, integrations, replayQueue } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  Chip,
  Dot,
  Icon,
  ProviderMark,
  DashTopbar,
  SectionHeader,
} from "@/components/hw";
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
        eq(integrations.userId, user!.id),
      ),
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

  const replayItem = replayItems[0] ?? null;
  const lastDelivery = eventDeliveries[0] ?? null;
  const hasSuccessfulDelivery = eventDeliveries.some(
    (d) => d.status === "delivered",
  );

  type Tone = "green" | "amber" | "red" | "indigo";
  let bannerTone: Tone = "indigo";
  let bannerLabel = "Pending delivery";
  if (hasSuccessfulDelivery) {
    bannerTone = "green";
    bannerLabel = "Delivered successfully";
  } else if (replayItem) {
    bannerTone = "amber";
    bannerLabel = `Queued for replay (${replayItem.status})`;
  } else if (lastDelivery) {
    bannerTone = "red";
    bannerLabel = `Delivery failed${lastDelivery.errorType ? ` · ${lastDelivery.errorType}` : ""}`;
  }

  return (
    <>
      <DashTopbar
        title={
          <span className="flex items-center" style={{ gap: 10 }}>
            <Link
              href="/events"
              style={{
                color: "var(--hw-ink-4)",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Events /
            </Link>
            <span className="hw-mono">{event.eventType}</span>
          </span>
        }
        subtitle={
          <span className="flex items-center" style={{ gap: 8 }}>
            <ProviderMark provider={integration.provider} size={14} />
            <Link
              href={`/integrations/${integration.id}`}
              style={{
                color: "var(--hw-ink-3)",
                fontSize: 12,
              }}
            >
              {integration.name}
            </Link>
            <span style={{ color: "var(--hw-ink-5)" }}>·</span>
            <span
              className="hw-mono"
              style={{ fontSize: 12, color: "var(--hw-ink-3)" }}
            >
              {new Date(event.receivedAt).toLocaleString()}
            </span>
          </span>
        }
        right={!hasSuccessfulDelivery && <ReplayButton eventId={eventId} />}
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        {/* Status banner */}
        <section className="hw-fade-up">
          <div
            className="hw-panel flex items-center"
            style={{
              padding: "14px 20px",
              gap: 12,
              borderColor:
                bannerTone === "green"
                  ? "rgba(74,222,128,0.22)"
                  : bannerTone === "red"
                    ? "rgba(248,113,113,0.22)"
                    : bannerTone === "amber"
                      ? "rgba(251,191,36,0.22)"
                      : "var(--hw-line)",
              background:
                bannerTone === "green"
                  ? "rgba(74,222,128,0.05)"
                  : bannerTone === "red"
                    ? "rgba(248,113,113,0.05)"
                    : bannerTone === "amber"
                      ? "rgba(251,191,36,0.05)"
                      : "var(--hw-bg-2)",
            }}
          >
            <Dot tone={bannerTone} />
            <span
              className="hw-mono"
              style={{
                fontSize: 12,
                color:
                  bannerTone === "indigo"
                    ? "var(--hw-indigo-ink)"
                    : `var(--hw-${bannerTone})`,
                letterSpacing: "0.04em",
              }}
            >
              {bannerLabel}
            </span>
          </div>
        </section>

        <section
          className="hw-fade-up hw-fade-up-1 grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {/* Left column */}
          <div className="flex flex-col" style={{ gap: 16 }}>
            <div
              className="hw-panel"
              style={{ padding: 22, background: "var(--hw-bg-2)" }}
            >
              <SectionHeader title="Event details" />
              <div
                className="grid"
                style={{
                  marginTop: 16,
                  gridTemplateColumns: "140px 1fr",
                  gap: "10px 16px",
                  alignItems: "baseline",
                }}
              >
                <Detail label="ID" value={event.id} mono />
                <Detail
                  label="Provider event ID"
                  value={event.providerEventId ?? "—"}
                  mono
                />
                <Detail label="Source" value={event.source} />
                <Detail
                  label="Attempts"
                  value={String(eventDeliveries.length)}
                />
                <div className="hw-label">Signature</div>
                <div>
                  {event.signatureValid ? (
                    <Chip tone="green">
                      <Icon name="check" size={10} /> valid
                    </Chip>
                  ) : (
                    <Chip tone="red">
                      <Icon name="x" size={10} /> invalid
                    </Chip>
                  )}
                </div>
              </div>
            </div>

            <div
              className="hw-panel overflow-hidden"
              style={{ background: "var(--hw-bg-2)" }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--hw-line)",
                }}
              >
                <SectionHeader title="Payload" />
              </div>
              <pre
                className="hw-mono hw-scroll"
                style={{
                  margin: 0,
                  padding: 18,
                  background: "var(--hw-bg-3)",
                  fontSize: 11.5,
                  lineHeight: 1.65,
                  color: "var(--hw-ink-3)",
                  overflow: "auto",
                  maxHeight: 460,
                }}
              >
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Right column: timeline */}
          <div
            className="hw-panel"
            style={{ padding: 22, background: "var(--hw-bg-2)" }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 18 }}
            >
              <SectionHeader title="Delivery timeline" />
              {eventDeliveries.length > 0 && (
                <span
                  className="hw-mono"
                  style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                >
                  {eventDeliveries.length} attempt
                  {eventDeliveries.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {eventDeliveries.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--hw-ink-4)",
                  fontSize: 12.5,
                }}
              >
                No delivery attempts yet.
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 0 }}>
                {eventDeliveries.map((delivery, i) => {
                  const isSuccess = delivery.status === "delivered";
                  const isFailed = delivery.status === "failed";
                  const tone: Tone = isSuccess
                    ? "green"
                    : isFailed
                      ? "red"
                      : "amber";
                  return (
                    <div
                      key={delivery.id}
                      className="flex"
                      style={{ gap: 14 }}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: `var(--hw-${tone})`,
                            boxShadow: `0 0 8px var(--hw-${tone})`,
                            marginTop: 6,
                          }}
                        />
                        {i < eventDeliveries.length - 1 && (
                          <div
                            style={{
                              width: 1,
                              flex: 1,
                              background: "var(--hw-line-2)",
                              margin: "4px 0",
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          paddingBottom: 18,
                        }}
                      >
                        <div
                          className="flex items-center flex-wrap"
                          style={{ gap: 8 }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: `var(--hw-${tone})`,
                            }}
                          >
                            Attempt #{delivery.attemptNumber}
                          </span>
                          {delivery.statusCode && (
                            <Chip>
                              {String(delivery.statusCode)}
                            </Chip>
                          )}
                          {delivery.errorType && (
                            <Chip tone="red">{delivery.errorType}</Chip>
                          )}
                        </div>
                        <div
                          className="flex items-center"
                          style={{ gap: 12, marginTop: 4 }}
                        >
                          <span
                            className="hw-mono"
                            style={{ fontSize: 11, color: "var(--hw-ink-4)" }}
                          >
                            {new Date(delivery.attemptedAt).toLocaleString()}
                          </span>
                          {delivery.responseTimeMs !== null && (
                            <span
                              className="hw-mono hw-num"
                              style={{
                                fontSize: 11,
                                color: "var(--hw-ink-4)",
                              }}
                            >
                              {delivery.responseTimeMs}ms
                            </span>
                          )}
                        </div>
                        {delivery.responseBody && (
                          <pre
                            className="hw-mono"
                            style={{
                              marginTop: 8,
                              padding: 10,
                              background: "var(--hw-bg-3)",
                              border: "1px solid var(--hw-line)",
                              borderRadius: 6,
                              fontSize: 11,
                              color: "var(--hw-ink-3)",
                              maxHeight: 80,
                              overflow: "auto",
                            }}
                          >
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
        </section>
      </div>
    </>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <div className="hw-label">{label}</div>
      <div
        className={mono ? "hw-mono" : ""}
        style={{
          fontSize: 12.5,
          color: "var(--hw-ink-2)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </>
  );
}
