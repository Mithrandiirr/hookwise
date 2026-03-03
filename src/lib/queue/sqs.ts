import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { QueueDeliveryResult } from "./types";

let client: SQSClient | null = null;

function getClient(): SQSClient {
  if (!client) {
    client = new SQSClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
          }
        : undefined,
    });
  }
  return client;
}

export async function deliverToSqs(
  queueUrl: string,
  payload: unknown,
  headers: Record<string, string>
): Promise<QueueDeliveryResult> {
  const start = Date.now();

  try {
    const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {};
    for (const [key, value] of Object.entries(headers)) {
      messageAttributes[key] = {
        DataType: "String",
        StringValue: value,
      };
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
      MessageAttributes: messageAttributes,
    });

    const result = await getClient().send(command);

    return {
      success: true,
      messageId: result.MessageId ?? null,
      error: null,
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      messageId: null,
      error: err instanceof Error ? err.message : "SQS delivery failed",
      responseTimeMs: Date.now() - start,
    };
  }
}
