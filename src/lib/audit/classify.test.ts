import { describe, it, expect } from "vitest";
import { classifyGap } from "./classify";
import { isMature, maturityCutoff } from "./maturity";

const now = new Date("2026-06-11T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

describe("maturity windows", () => {
  it("treats events younger than the window as immature", () => {
    expect(isMature("shopify", minutesAgo(30), now)).toBe(false);
    expect(isMature("shopify", minutesAgo(59), now)).toBe(false);
  });

  it("treats events older than the window as mature", () => {
    expect(isMature("shopify", minutesAgo(61), now)).toBe(true);
  });

  it("cutoff is exactly one window in the past", () => {
    expect(maturityCutoff("shopify", now).getTime()).toBe(minutesAgo(60).getTime());
  });
});

describe("classifyGap", () => {
  it("never confirms an immature event", () => {
    expect(
      classifyGap({ provider: "shopify", occurredAt: minutesAgo(30), webhookArrivedLate: false, now })
    ).toBe("unconfirmed");
  });

  it("labels mature-but-recent gaps unconfirmed", () => {
    expect(
      classifyGap({ provider: "shopify", occurredAt: minutesAgo(90), webhookArrivedLate: false, now })
    ).toBe("unconfirmed");
  });

  it("confirms gaps past the confirmation age", () => {
    expect(
      classifyGap({ provider: "shopify", occurredAt: minutesAgo(180), webhookArrivedLate: false, now })
    ).toBe("confirmed");
  });

  it("late webhook arrival downgrades the gap to a latency finding", () => {
    expect(
      classifyGap({ provider: "shopify", occurredAt: minutesAgo(180), webhookArrivedLate: true, now })
    ).toBe("late");
  });

  it("uncertainty (e.g. API-version mismatch) forces unconfirmed", () => {
    expect(
      classifyGap({
        provider: "shopify",
        occurredAt: minutesAgo(600),
        webhookArrivedLate: false,
        uncertain: true,
        now,
      })
    ).toBe("unconfirmed");
  });
});
