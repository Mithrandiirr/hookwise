import { createHmac } from "crypto";
import {
  verifyGitHubSignature,
  extractGitHubEventType,
  extractGitHubEventId,
} from "./github";

function makeGitHubSignature(payload: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return `sha256=${sig}`;
}

describe("verifyGitHubSignature", () => {
  const secret = "github_webhook_secret";
  const payload = '{"action":"opened","repository":{"full_name":"org/repo"}}';

  it("accepts a valid sha256= signature", () => {
    const header = makeGitHubSignature(payload, secret);
    expect(verifyGitHubSignature(payload, header, secret)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const header = makeGitHubSignature(payload, secret);
    expect(verifyGitHubSignature(payload, header, "wrong_secret")).toBe(false);
  });

  it("rejects missing sha256= prefix", () => {
    const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    expect(verifyGitHubSignature(payload, sig, secret)).toBe(false);
  });

  it("rejects wrong hex digest", () => {
    expect(
      verifyGitHubSignature(payload, "sha256=0000000000000000000000000000000000000000000000000000000000000000", secret)
    ).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifyGitHubSignature(payload, "", secret)).toBe(false);
  });
});

describe("extractGitHubEventType", () => {
  it("returns x-github-event header value", () => {
    expect(extractGitHubEventType({ "x-github-event": "push" })).toBe("push");
  });

  it("returns 'unknown' when header is missing", () => {
    expect(extractGitHubEventType({})).toBe("unknown");
  });
});

describe("extractGitHubEventId", () => {
  it("returns x-github-delivery header value", () => {
    expect(
      extractGitHubEventId({ "x-github-delivery": "72d3162e-cc78-11e3-81ab-4c9367dc0958" })
    ).toBe("72d3162e-cc78-11e3-81ab-4c9367dc0958");
  });

  it("returns null when header is missing", () => {
    expect(extractGitHubEventId({})).toBeNull();
  });
});
