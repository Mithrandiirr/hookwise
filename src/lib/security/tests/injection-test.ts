import crypto from "crypto";
import type { EndpointTestPayload, SecurityTestResult } from "../types";

const INJECTION_PAYLOADS = [
  {
    label: "SQL Injection",
    payload: {
      id: "evt_hookwise_injection_test",
      type: "hookwise.security_test",
      data: {
        name: "'; DROP TABLE users; --",
        email: "test@test.com' OR '1'='1",
        amount: "1 UNION SELECT * FROM credentials--",
      },
    },
  },
  {
    label: "XSS",
    payload: {
      id: "evt_hookwise_injection_test",
      type: "hookwise.security_test",
      data: {
        name: '<script>alert("xss")</script>',
        description: '<img src=x onerror=alert(1)>',
        url: 'javascript:alert(document.cookie)',
      },
    },
  },
];

export async function runInjectionTest(
  endpoint: EndpointTestPayload
): Promise<SecurityTestResult> {
  let acceptedCount = 0;
  const acceptedLabels: string[] = [];

  for (const { label, payload } of INJECTION_PAYLOADS) {
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${body}`;
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
          "Stripe-Signature": `t=${timestamp},v1=${signature}`,
          "X-HookWise-Security-Test": "true",
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // If the endpoint accepts injection payloads with 2xx, flag it
      if (response.status >= 200 && response.status < 300) {
        acceptedCount++;
        acceptedLabels.push(label);
      }
    } catch {
      // Network errors mean we can't test — skip
    }
  }

  if (acceptedCount > 0) {
    return {
      passed: false,
      vulnerabilityType: "injection_vulnerable",
      severity: "high",
      description: `Endpoint accepted ${acceptedCount} injection payload(s) without error (${acceptedLabels.join(", ")}). Malicious webhook payloads could exploit input handling vulnerabilities.`,
      remediation:
        "Sanitize and validate all webhook payload fields before using them in database queries, HTML output, or system commands. Use parameterized queries and escape HTML output.",
      details: { acceptedLabels, acceptedCount },
    };
  }

  return {
    passed: true,
    vulnerabilityType: "injection_vulnerable",
    severity: "low",
    description: "Endpoint properly handles or rejects injection payloads.",
    remediation: "No action needed.",
  };
}
