import { createHmac } from "crypto";
import {
  verifyStripeSignature,
  extractStripeEventType,
  extractStripeEventId,
} from "./stripe";

function makeStripeHeader(payload: string, secret: string, timestampOverride?: number): string {
  const timestamp = timestampOverride ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const sig = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_secret";
  const payload = '{"id":"evt_123","type":"payment_intent.succeeded"}';

  it("accepts a valid signature with correct secret", () => {
    const header = makeStripeHeader(payload, secret);
    expect(verifyStripeSignature(payload, header, secret)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const header = makeStripeHeader(payload, secret);
    expect(verifyStripeSignature(payload, header, "wrong_secret")).toBe(false);
  });

  it("rejects an expired timestamp (>5 min)", () => {
    const sixMinutesAgo = Math.floor(Date.now() / 1000) - 360;
    const header = makeStripeHeader(payload, secret, sixMinutesAgo);
    expect(verifyStripeSignature(payload, header, secret)).toBe(false);
  });

  it("rejects missing t= in header", () => {
    const sig = createHmac("sha256", secret).update(`12345.${payload}`, "utf8").digest("hex");
    const header = `v1=${sig}`;
    expect(verifyStripeSignature(payload, header, secret)).toBe(false);
  });

  it("rejects missing v1= in header", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp}`;
    expect(verifyStripeSignature(payload, header, secret)).toBe(false);
  });

  it("accepts when one of multiple v1 signatures is valid", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const validSig = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const header = `t=${timestamp},v1=invalidsig1234567890abcdef1234567890abcdef1234567890abcdef1234567890,v1=${validSig}`;
    expect(verifyStripeSignature(payload, header, secret)).toBe(true);
  });

  it("rejects a malformed header", () => {
    expect(verifyStripeSignature(payload, "garbage", secret)).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifyStripeSignature(payload, "", secret)).toBe(false);
  });
});

describe("extractStripeEventType", () => {
  it("extracts type from valid JSON", () => {
    expect(extractStripeEventType('{"type":"payment_intent.succeeded"}')).toBe(
      "payment_intent.succeeded"
    );
  });

  it("returns 'unknown' for invalid JSON", () => {
    expect(extractStripeEventType("not json")).toBe("unknown");
  });

  it("returns 'unknown' when type field is missing", () => {
    expect(extractStripeEventType('{"id":"evt_123"}')).toBe("unknown");
  });
});

describe("extractStripeEventId", () => {
  it("extracts id from valid JSON", () => {
    expect(extractStripeEventId('{"id":"evt_123","type":"test"}')).toBe("evt_123");
  });

  it("returns null for invalid JSON", () => {
    expect(extractStripeEventId("not json")).toBeNull();
  });

  it("returns null when id field is missing", () => {
    expect(extractStripeEventId('{"type":"test"}')).toBeNull();
  });
});
