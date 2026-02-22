import { createHmac, timingSafeEqual } from "crypto";

export function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  try {
    const parts = header.split(",").reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split("=");
      acc[key] = value;
      return acc;
    }, {});

    const timestamp = parts["t"];
    const signatures = header
      .split(",")
      .filter((p) => p.startsWith("v1="))
      .map((p) => p.slice(3));

    if (!timestamp || signatures.length === 0) return false;

    // Reject webhooks older than 5 minutes
    const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (age > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    return signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function extractStripeEventType(payload: string): string {
  try {
    const body = JSON.parse(payload) as { type?: string };
    return body.type ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function extractStripeEventId(payload: string): string | null {
  try {
    const body = JSON.parse(payload) as { id?: string };
    return body.id ?? null;
  } catch {
    return null;
  }
}
