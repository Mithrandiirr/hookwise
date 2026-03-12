import { createHmac } from "crypto";
import {
  verifyShopifySignature,
  extractShopifyEventType,
  extractShopifyEventId,
} from "./shopify";

function makeShopifySignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64");
}

describe("verifyShopifySignature", () => {
  const secret = "shopify_secret_key";
  const payload = '{"id":123,"order_id":456}';

  it("accepts a valid HMAC-SHA256 base64 signature", () => {
    const header = makeShopifySignature(payload, secret);
    expect(verifyShopifySignature(payload, header, secret)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const header = makeShopifySignature(payload, secret);
    expect(verifyShopifySignature(payload, header, "wrong_secret")).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const header = makeShopifySignature(payload, secret);
    expect(verifyShopifySignature('{"id":999}', header, secret)).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifyShopifySignature(payload, "", secret)).toBe(false);
  });
});

describe("extractShopifyEventType", () => {
  it("returns x-shopify-topic header value", () => {
    expect(extractShopifyEventType({ "x-shopify-topic": "orders/create" })).toBe(
      "orders/create"
    );
  });

  it("returns 'unknown' when header is missing", () => {
    expect(extractShopifyEventType({})).toBe("unknown");
  });
});

describe("extractShopifyEventId", () => {
  it("returns x-shopify-webhook-id header value", () => {
    expect(
      extractShopifyEventId({ "x-shopify-webhook-id": "wh_abc123" })
    ).toBe("wh_abc123");
  });

  it("returns null when header is missing", () => {
    expect(extractShopifyEventId({})).toBeNull();
  });
});
