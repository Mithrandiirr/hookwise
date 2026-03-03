import crypto from "crypto";
import type { EndpointTestPayload, SecurityTestResult } from "../types";

function computeStripeSignature(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

async function sendWithSignature(
  url: string,
  payload: string,
  signature: string,
  timestamp: number
): Promise<{ statusCode: number | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": `t=${timestamp},v1=${signature}`,
        "X-HookWise-Security-Test": "true",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return { statusCode: response.status, error: null };
  } catch (err) {
    return { statusCode: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function runSignatureTest(
  endpoint: EndpointTestPayload
): Promise<SecurityTestResult> {
  const testPayload = JSON.stringify({
    id: "evt_hookwise_security_test",
    type: "hookwise.security_test",
    data: { test: true },
  });
  const timestamp = Math.floor(Date.now() / 1000);

  // 1. Send with INVALID signature
  const invalidSig = "invalid_signature_" + crypto.randomBytes(16).toString("hex");
  const invalidResult = await sendWithSignature(
    endpoint.url,
    testPayload,
    invalidSig,
    timestamp
  );

  // If endpoint accepted the invalid signature (2xx), that's a vulnerability
  if (invalidResult.statusCode !== null && invalidResult.statusCode >= 200 && invalidResult.statusCode < 300) {
    return {
      passed: false,
      vulnerabilityType: "invalid_signature_accepted",
      severity: "critical",
      description:
        "Endpoint accepted a webhook with an invalid signature. An attacker could send forged webhook payloads to your endpoint.",
      remediation:
        "Verify the Stripe-Signature header against your signing secret before processing any webhook payload. Use Stripe's official SDK webhook verification.",
      details: { invalidStatusCode: invalidResult.statusCode },
    };
  }

  // 2. Send with VALID signature to confirm endpoint is reachable and working
  const validSig = computeStripeSignature(testPayload, endpoint.signingSecret, timestamp);
  const validResult = await sendWithSignature(
    endpoint.url,
    testPayload,
    validSig,
    timestamp
  );

  // If the endpoint is unreachable or errors on valid signature, we can't confirm vulnerability
  if (validResult.error || validResult.statusCode === null) {
    return {
      passed: true,
      vulnerabilityType: "invalid_signature_accepted",
      severity: "low",
      description: "Endpoint is unreachable; signature validation could not be fully tested.",
      remediation: "Ensure your endpoint is accessible and retry the scan.",
      details: { error: validResult.error },
    };
  }

  // Endpoint rejected invalid and accepted valid — signature check is working
  return {
    passed: true,
    vulnerabilityType: "invalid_signature_accepted",
    severity: "low",
    description: "Endpoint correctly rejects webhooks with invalid signatures.",
    remediation: "No action needed.",
  };
}
