import { extractCorrelationKey } from "./extract-correlation-key";

describe("extractCorrelationKey", () => {
  describe("stripe", () => {
    it("extracts customer id", () => {
      const payload = { data: { object: { customer: "cus_abc123" } } };
      expect(extractCorrelationKey("stripe", payload)).toBe("stripe:customer:cus_abc123");
    });

    it("falls back to object id when no customer", () => {
      const payload = { data: { object: { id: "pi_xyz789" } } };
      expect(extractCorrelationKey("stripe", payload)).toBe("stripe:object:pi_xyz789");
    });

    it("prefers customer over object id", () => {
      const payload = { data: { object: { id: "pi_xyz789", customer: "cus_abc123" } } };
      expect(extractCorrelationKey("stripe", payload)).toBe("stripe:customer:cus_abc123");
    });

    it("returns null for empty data", () => {
      expect(extractCorrelationKey("stripe", {})).toBeNull();
    });

    it("returns null when data.object is missing", () => {
      expect(extractCorrelationKey("stripe", { data: {} })).toBeNull();
    });
  });

  describe("shopify", () => {
    it("extracts order_id (number)", () => {
      const payload = { order_id: 12345 };
      expect(extractCorrelationKey("shopify", payload)).toBe("shopify:order:12345");
    });

    it("extracts order_id (string)", () => {
      const payload = { order_id: "12345" };
      expect(extractCorrelationKey("shopify", payload)).toBe("shopify:order:12345");
    });

    it("falls back to resource id", () => {
      const payload = { id: 67890 };
      expect(extractCorrelationKey("shopify", payload)).toBe("shopify:resource:67890");
    });

    it("prefers order_id over id", () => {
      const payload = { id: 67890, order_id: 12345 };
      expect(extractCorrelationKey("shopify", payload)).toBe("shopify:order:12345");
    });

    it("returns null for empty payload", () => {
      expect(extractCorrelationKey("shopify", {})).toBeNull();
    });
  });

  describe("github", () => {
    it("extracts repository full_name", () => {
      const payload = { repository: { full_name: "octocat/hello-world" } };
      expect(extractCorrelationKey("github", payload)).toBe("github:repo:octocat/hello-world");
    });

    it("returns null without repository", () => {
      expect(extractCorrelationKey("github", {})).toBeNull();
    });

    it("returns null when repository lacks full_name", () => {
      expect(extractCorrelationKey("github", { repository: {} })).toBeNull();
    });
  });
});
