import { inngest } from "../client";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getBufferLength, drainBuffer } from "@/lib/redis/fallback-buffer";

export const drainRedisBuffer = inngest.createFunction(
  {
    id: "drain-redis-buffer",
    name: "Drain Redis Buffer",
    retries: 3,
  },
  { cron: "*/1 * * * *" },
  async ({ step }) => {
    const length = await step.run("check-buffer", async () => {
      return getBufferLength();
    });

    if (length === 0) {
      return { drained: 0 };
    }

    const result = await step.run("drain-and-insert", async () => {
      const bufferedEvents = await drainBuffer(50);
      let inserted = 0;

      for (const buffered of bufferedEvents) {
        const [newEvent] = await db
          .insert(events)
          .values({
            integrationId: buffered.integrationId,
            eventType: buffered.eventType,
            payload: buffered.payload as Record<string, unknown>,
            headers: buffered.headers,
            signatureValid: buffered.signatureValid,
            providerEventId: buffered.providerEventId,
            receivedAt: new Date(buffered.receivedAt),
          })
          .returning({ id: events.id });

        await inngest.send({
          name: "webhook/received",
          data: {
            eventId: newEvent.id,
            integrationId: buffered.integrationId,
            destinationUrl: buffered.destinationUrl,
          },
        });

        inserted++;
      }

      return { inserted, remaining: bufferedEvents.length < 50 ? 0 : length - inserted };
    });

    return { drained: result.inserted, remaining: result.remaining };
  }
);
