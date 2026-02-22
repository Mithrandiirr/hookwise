import { createHmac, timingSafeEqual } from "crypto";

export function verifyGitHubSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  try {
    if (!header.startsWith("sha256=")) return false;
    const sig = header.slice(7);
    const expected = createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);

    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function extractGitHubEventType(headers: Record<string, string>): string {
  return headers["x-github-event"] ?? "unknown";
}

export function extractGitHubEventId(headers: Record<string, string>): string | null {
  return headers["x-github-delivery"] ?? null;
}
