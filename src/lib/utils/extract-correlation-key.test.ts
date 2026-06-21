import { extractCorrelationKey } from "./extract-correlation-key";

describe("extractCorrelationKey", () => {
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
});
