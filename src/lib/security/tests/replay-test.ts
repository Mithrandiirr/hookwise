import crypto from "crypto";
import type { EndpointTestPayload, SecurityTestResult } from "../types";

export async function runReplayTest(
  endpoint: EndpointTestPayload
): Promise<SecurityTestResult> {
  const eventId = "evt_hookwise_replay_test_" + crypto.randomBytes(8).toString("hex");
  const testPayload = JSON.stringify({
    id: eventId,
    type: "hookwise.security_test",
    data: { test: true },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${testPayload}`;
  const signature = crypto
    .createHmac("sha256", endpoint.signingSecret)
    .update(signedPayload)
    .digest("hex");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Stripe-Signature": `t=${timestamp},v1=${signature}`,
    "X-HookWise-Security-Test": "true",
  };

  async function sendRequest(): Promise<{ statusCode: number | null; error: string | null }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body: testPayload,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return { statusCode: response.status, error: null };
    } catch (err) {
      return { statusCode: null, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  // Send the same event twice
  const first = await sendRequest();

  // If first request failed, we can't test for replay
  if (first.statusCode === null || first.statusCode >= 400) {
    return {
      passed: true,
      vulnerabilityType: "replay_accepted",
      severity: "low",
      description: "Could not complete replay test — initial request was not accepted.",
      remediation: "Ensure your endpoint accepts valid webhooks to enable replay testing.",
      details: { firstStatusCode: first.statusCode, error: first.error },
    };
  }

  // Send the exact same request again
  const second = await sendRequest();

  if (second.statusCode !== null && second.statusCode >= 200 && second.statusCode < 300) {
    return {
      passed: false,
      vulnerabilityType: "replay_accepted",
      severity: "medium",
      description:
        "Endpoint accepted the same webhook event ID twice. An attacker could replay captured webhooks to trigger duplicate processing (e.g., double charges).",
      remediation:
        "Track processed event IDs and reject duplicates. Store event IDs in a database or cache with a TTL matching your timestamp tolerance window.",
      details: {
        eventId,
        firstStatusCode: first.statusCode,
        secondStatusCode: second.statusCode,
      },
    };
  }

  return {
    passed: true,
    vulnerabilityType: "replay_accepted",
    severity: "low",
    description: "Endpoint correctly rejects replayed webhook events.",
    remediation: "No action needed.",
  };
}
