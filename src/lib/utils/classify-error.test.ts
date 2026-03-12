import { classifyDeliveryError } from "./classify-error";

describe("classifyDeliveryError", () => {
  it("classifies timeout error string", () => {
    const result = classifyDeliveryError(null, "Request timeout after 30s", null);
    expect(result).toEqual({
      errorType: "timeout",
      shouldRetry: true,
      retryDelayMs: null,
      shouldOpenCircuit: false,
    });
  });

  it("classifies abort error string as timeout", () => {
    const result = classifyDeliveryError(null, "The operation was aborted", null);
    expect(result).toEqual({
      errorType: "timeout",
      shouldRetry: true,
      retryDelayMs: null,
      shouldOpenCircuit: false,
    });
  });

  it("classifies SSL error string", () => {
    const result = classifyDeliveryError(null, "SSL certificate problem", null);
    expect(result).toEqual({
      errorType: "ssl",
      shouldRetry: false,
      retryDelayMs: null,
      shouldOpenCircuit: true,
    });
  });

  it("classifies TLS error string as SSL", () => {
    const result = classifyDeliveryError(null, "TLS handshake failed", null);
    expect(result).toEqual({
      errorType: "ssl",
      shouldRetry: false,
      retryDelayMs: null,
      shouldOpenCircuit: true,
    });
  });

  it("classifies certificate error string as SSL", () => {
    const result = classifyDeliveryError(null, "self-signed certificate", null);
    expect(result).toEqual({
      errorType: "ssl",
      shouldRetry: false,
      retryDelayMs: null,
      shouldOpenCircuit: true,
    });
  });

  it("classifies connection refused error", () => {
    const result = classifyDeliveryError(null, "ECONNREFUSED", null);
    expect(result).toEqual({
      errorType: "connection_refused",
      shouldRetry: false,
      retryDelayMs: null,
      shouldOpenCircuit: true,
    });
  });

  it("classifies ENOTFOUND as connection_refused", () => {
    const result = classifyDeliveryError(null, "ENOTFOUND", null);
    expect(result).toEqual({
      errorType: "connection_refused",
      shouldRetry: false,
      retryDelayMs: null,
      shouldOpenCircuit: true,
    });
  });

  it("classifies 429 without Retry-After as rate_limit with 60s delay", () => {
    const result = classifyDeliveryError(429, null, null);
    expect(result).toEqual({
      errorType: "rate_limit",
      shouldRetry: true,
      retryDelayMs: 60_000,
      shouldOpenCircuit: false,
    });
  });

  it("classifies 429 with Retry-After header", () => {
    const result = classifyDeliveryError(429, null, "30");
    expect(result).toEqual({
      errorType: "rate_limit",
      shouldRetry: true,
      retryDelayMs: 30_000,
      shouldOpenCircuit: false,
    });
  });

  it("classifies 503 as server_error with 30s delay", () => {
    const result = classifyDeliveryError(503, null, null);
    expect(result).toEqual({
      errorType: "server_error",
      shouldRetry: true,
      retryDelayMs: 30_000,
      shouldOpenCircuit: false,
    });
  });

  it("classifies 500 as server_error with no delay", () => {
    const result = classifyDeliveryError(500, null, null);
    expect(result).toEqual({
      errorType: "server_error",
      shouldRetry: true,
      retryDelayMs: null,
      shouldOpenCircuit: false,
    });
  });

  it("classifies 502 as server_error", () => {
    const result = classifyDeliveryError(502, null, null);
    expect(result).toEqual({
      errorType: "server_error",
      shouldRetry: true,
      retryDelayMs: null,
      shouldOpenCircuit: false,
    });
  });

  it("classifies null status + null error as unknown", () => {
    const result = classifyDeliveryError(null, null, null);
    expect(result).toEqual({
      errorType: "unknown",
      shouldRetry: true,
      retryDelayMs: null,
      shouldOpenCircuit: false,
    });
  });

  it("prioritizes error string over status code", () => {
    // Error string is checked first in the implementation
    const result = classifyDeliveryError(503, "Connection refused", null);
    expect(result.errorType).toBe("connection_refused");
  });
});
