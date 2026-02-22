import type { AnomalyContext } from "./types";

export const SYSTEM_PROMPT = `You are HookWise's AI anomaly diagnosis engine. You analyze webhook delivery anomalies and provide structured root cause analysis.

You receive context about a detected anomaly including:
- Baseline metrics (rolling averages and standard deviations)
- Current metrics (the anomalous readings)
- Recent events and delivery attempts
- Status of other integrations for cross-correlation

Your response MUST be valid JSON with exactly these fields:
{
  "what": "1-2 sentence description of what happened",
  "why": "Root cause analysis - is it the endpoint, the provider, or a payload pattern?",
  "impact": "Affected events count + revenue/business impact if payment/order events",
  "recommendation": "Specific actionable advice for the developer",
  "confidence": 0.0 to 1.0,
  "crossCorrelation": "If multiple integrations are affected, describe the correlation. null otherwise"
}

Guidelines:
- Be specific and surgical. "Response times increased" is bad. "Response times jumped from 120ms baseline to 2.3s, indicating endpoint database contention" is good.
- If you see a pattern in error types (all 503s, all timeouts), call it out.
- If other integrations show similar issues, it's likely a shared infrastructure problem.
- For payment/order webhooks (Stripe charge, Shopify order), estimate revenue impact.
- Confidence should reflect data quality: high sample count + clear pattern = high confidence.`;

export function buildDiagnosisPrompt(context: AnomalyContext): string {
  const {
    integrationName,
    provider,
    anomalyType,
    severity,
    baseline,
    current,
    recentEvents,
    recentDeliveries,
    otherIntegrations,
  } = context;

  const deliveryErrors = recentDeliveries
    .filter((d) => d.errorType)
    .reduce<Record<string, number>>((acc, d) => {
      const key = d.errorType ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  return `Anomaly detected on integration "${integrationName}" (${provider}).

Type: ${anomalyType}
Severity: ${severity}
Sample count: ${baseline.sampleCount}

BASELINE METRICS (rolling averages):
- Events per 5min: ${baseline.eventCount.toFixed(1)} (stddev: ${baseline.stddevEventCount.toFixed(2)})
- Avg response time: ${baseline.avgResponseMs.toFixed(0)}ms (stddev: ${baseline.stddevResponseMs.toFixed(0)}ms)
- Failure rate: ${(baseline.failureRate * 100).toFixed(1)}% (stddev: ${(baseline.stddevFailureRate * 100).toFixed(2)}%)

CURRENT METRICS (last 5 minutes):
- Events: ${current.eventCount}
- Avg response time: ${current.avgResponseMs.toFixed(0)}ms
- Failure rate: ${(current.failureRate * 100).toFixed(1)}%
- Event types: ${JSON.stringify(current.eventTypeDistribution)}

RECENT DELIVERIES (last 20):
- Error breakdown: ${JSON.stringify(deliveryErrors)}
- Response times: ${recentDeliveries.map((d) => d.responseTimeMs ?? "null").join(", ")}ms

RECENT EVENTS (last 20):
- Types: ${recentEvents.map((e) => e.eventType).join(", ")}
- Sources: ${recentEvents.map((e) => e.source).join(", ")}

OTHER INTEGRATIONS STATUS:
${
  otherIntegrations.length > 0
    ? otherIntegrations
        .map(
          (i) =>
            `- ${i.name} (${i.provider}): ${(i.currentFailureRate * 100).toFixed(1)}% failure rate`
        )
        .join("\n")
    : "No other integrations to compare."
}

Respond with JSON only.`;
}
