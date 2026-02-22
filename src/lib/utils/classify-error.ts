import type { ErrorType } from "@/types";

export interface ErrorClassification {
  errorType: ErrorType;
  shouldRetry: boolean;
  retryDelayMs: number | null;
  shouldOpenCircuit: boolean;
}

export function classifyDeliveryError(
  statusCode: number | null,
  error: string | null,
  retryAfterHeader: string | null
): ErrorClassification {
  if (error) {
    const msg = error.toLowerCase();

    if (msg.includes("abort") || msg.includes("timeout")) {
      return {
        errorType: "timeout",
        shouldRetry: true,
        retryDelayMs: null,
        shouldOpenCircuit: false,
      };
    }

    if (msg.includes("ssl") || msg.includes("tls") || msg.includes("certificate")) {
      return {
        errorType: "ssl",
        shouldRetry: false,
        retryDelayMs: null,
        shouldOpenCircuit: true,
      };
    }

    if (msg.includes("econnrefused") || msg.includes("connection refused") || msg.includes("enotfound")) {
      return {
        errorType: "connection_refused",
        shouldRetry: false,
        retryDelayMs: null,
        shouldOpenCircuit: true,
      };
    }
  }

  if (statusCode === 429) {
    let delay = 60_000;
    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) {
        delay = seconds * 1000;
      }
    }
    return {
      errorType: "rate_limit",
      shouldRetry: true,
      retryDelayMs: delay,
      shouldOpenCircuit: false,
    };
  }

  if (statusCode === 503) {
    return {
      errorType: "server_error",
      shouldRetry: true,
      retryDelayMs: 30_000,
      shouldOpenCircuit: false,
    };
  }

  if (statusCode !== null && statusCode >= 500) {
    return {
      errorType: "server_error",
      shouldRetry: true,
      retryDelayMs: null,
      shouldOpenCircuit: false,
    };
  }

  return {
    errorType: "unknown",
    shouldRetry: true,
    retryDelayMs: null,
    shouldOpenCircuit: false,
  };
}
