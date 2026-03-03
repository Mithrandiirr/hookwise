export type DestinationType = "http" | "sqs" | "kafka" | "pubsub";

export interface QueueDeliveryResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
  responseTimeMs: number;
}

export interface QueueConfig {
  destinationType: DestinationType;
  destinationUrl: string;
}
