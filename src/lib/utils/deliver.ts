export interface DeliveryResult {
  statusCode: number | null;
  responseBody: string | null;
  responseTimeMs: number;
  success: boolean;
  error: string | null;
  retryAfterHeader: string | null;
}

export async function deliverPayload(
  url: string,
  payload: unknown,
  headers: Record<string, string>,
  timeoutMs: number = 5_000
): Promise<DeliveryResult> {
  const start = Date.now();
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;
  let retryAfterHeader: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = response.status;
    retryAfterHeader = response.headers.get("retry-after");
    const text = await response.text();
    responseBody = text.slice(0, 1024);

    return {
      statusCode,
      responseBody,
      responseTimeMs: Date.now() - start,
      success: response.ok,
      error: null,
      retryAfterHeader,
    };
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
    return {
      statusCode,
      responseBody: null,
      responseTimeMs: Date.now() - start,
      success: false,
      error,
      retryAfterHeader: null,
    };
  }
}
