import type { QueueConfig, QueueDeliveryResult } from "./types";

export async function deliverToQueue(
  config: QueueConfig,
  payload: unknown,
  headers: Record<string, string>
): Promise<QueueDeliveryResult> {
  switch (config.destinationType) {
    case "sqs": {
      const { deliverToSqs } = await import("./sqs");
      return deliverToSqs(config.destinationUrl, payload, headers);
    }
    case "kafka": {
      const { deliverToKafka } = await import("./kafka");
      return deliverToKafka(config.destinationUrl, payload, headers);
    }
    case "pubsub": {
      const { deliverToPubSub } = await import("./pubsub");
      return deliverToPubSub(config.destinationUrl, payload, headers);
    }
    default:
      return {
        success: false,
        messageId: null,
        error: `Unsupported destination type: ${config.destinationType}`,
        responseTimeMs: 0,
      };
  }
}
