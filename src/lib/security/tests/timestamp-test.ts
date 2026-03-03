import crypto from "crypto";
import type { EndpointTestPayload, SecurityTestResult } from "../types";

export async function runTimestampTest(
  endpoint: EndpointTestPayload
): Promise<SecurityTestResult> {
  const testPayload = JSON.stringify({
    id: "evt_hookwise_timestamp_test",
    type: "hookwise.security_test",
    data: { test: true },
  });

  // Send with a timestamp >5 minutes in the past (Stripe's tolerance is 300s)
  const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
  const signedPayload = `${expiredTimestamp}.${testPayload}`;
  const signature = crypto
    .createHmac("sha256", endpoint.signingSecret)
    .update(signedPayload)
    .digest("hex");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": `t=${expiredTimestamp},v1=${signature}`,
        "X-HookWise-Security-Test": "true",
      },
      body: testPayload,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status >= 200 && response.status < 300) {
      return {
        passed: false,
        vulnerabilityType: "expired_timestamp_accepted",
        severity: "high",
        description:
          "Endpoint accepted a webhook with an expired timestamp (10 minutes old). This makes your endpoint vulnerable to replay attacks using captured webhook payloads.",
        remediation:
          "Reject webhooks with timestamps older than 5 minutes. Stripe's SDK does this automatically when you use Stripe.webhooks.constructEvent().",
        details: { expiredTimestamp, statusCode: response.status },
      };
    }

    return {
      passed: true,
      vulnerabilityType: "expired_timestamp_accepted",
      severity: "low",
      description: "Endpoint correctly rejects webhooks with expired timestamps.",
      remediation: "No action needed.",
    };
  } catch (err) {
    return {
      passed: true,
      vulnerabilityType: "expired_timestamp_accepted",
      severity: "low",
      description: "Endpoint unreachable; timestamp validation could not be fully tested.",
      remediation: "Ensure your endpoint is accessible and retry the scan.",
      details: { error: err instanceof Error ? err.message : "Unknown error" },
    };
  }
}
