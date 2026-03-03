import { Kafka, type Producer } from "kafkajs";
import type { QueueDeliveryResult } from "./types";

let producer: Producer | null = null;
let connected = false;

function parseDestination(url: string): { broker: string; topic: string } {
  // Format: broker:port/topic
  const slashIdx = url.indexOf("/");
  if (slashIdx === -1) {
    return { broker: url, topic: "hookwise-events" };
  }
  return {
    broker: url.slice(0, slashIdx),
    topic: url.slice(slashIdx + 1),
  };
}

async function getProducer(broker: string): Promise<Producer> {
  if (!producer) {
    const sasl =
      process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
        ? {
            mechanism: "plain" as const,
            username: process.env.KAFKA_SASL_USERNAME,
            password: process.env.KAFKA_SASL_PASSWORD,
          }
        : undefined;

    const kafka = new Kafka({
      clientId: "hookwise",
      brokers: [broker],
      ...(sasl ? { sasl, ssl: true } : {}),
    });

    producer = kafka.producer();
  }

  if (!connected) {
    await producer.connect();
    connected = true;
  }

  return producer;
}

export async function deliverToKafka(
  destinationUrl: string,
  payload: unknown,
  headers: Record<string, string>
): Promise<QueueDeliveryResult> {
  const start = Date.now();

  try {
    const { broker, topic } = parseDestination(destinationUrl);
    const p = await getProducer(broker);

    const kafkaHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      kafkaHeaders[key] = value;
    }

    const result = await p.send({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
          headers: kafkaHeaders,
        },
      ],
    });

    const offset = result[0]?.baseOffset ?? null;

    return {
      success: true,
      messageId: offset,
      error: null,
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      messageId: null,
      error: err instanceof Error ? err.message : "Kafka delivery failed",
      responseTimeMs: Date.now() - start,
    };
  }
}
