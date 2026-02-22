import { createHmac, timingSafeEqual } from "crypto";

export function verifyShopifySignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("base64");

    const expectedBuf = Buffer.from(expected);
    const headerBuf = Buffer.from(header);

    if (expectedBuf.length !== headerBuf.length) return false;
    return timingSafeEqual(expectedBuf, headerBuf);
  } catch {
    return false;
  }
}

export function extractShopifyEventType(headers: Record<string, string>): string {
  return headers["x-shopify-topic"] ?? "unknown";
}

export function extractShopifyEventId(headers: Record<string, string>): string | null {
  return headers["x-shopify-webhook-id"] ?? null;
}
