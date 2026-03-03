import { PubSub } from "@google-cloud/pubsub";
import type { QueueDeliveryResult } from "./types";

let pubsub: PubSub | null = null;

function getClient(): PubSub {
  if (!pubsub) {
    pubsub = new PubSub({
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
  return pubsub;
}

export async function deliverToPubSub(
  topicName: string,
  payload: unknown,
  headers: Record<string, string>
): Promise<QueueDeliveryResult> {
  const start = Date.now();

  try {
    const client = getClient();
    const topic = client.topic(topicName);

    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify(payload)),
      attributes: headers,
    });

    return {
      success: true,
      messageId,
      error: null,
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      messageId: null,
      error: err instanceof Error ? err.message : "Pub/Sub delivery failed",
      responseTimeMs: Date.now() - start,
    };
  }
}
