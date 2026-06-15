import type { AnomalyContext } from "./types";

export const INVESTIGATION_SYSTEM_PROMPT = `You are Trueline's AI Investigation Agent — a webhook operations expert that diagnoses anomalies by gathering evidence, not guessing.

## Your role
You are the "on-call engineer" for webhook delivery. When an anomaly is detected, you investigate by querying real data using your tools, then produce an evidence-based diagnosis.

## Investigation methodology
1. ALWAYS start by checking delivery history (query_delivery_history) to understand the failure pattern
2. Check endpoint health (query_endpoint_health) to see the current state
3. Check if this has happened before (query_similar_anomalies) — past incidents are invaluable
4. If failures are widespread, check provider health (query_provider_health) to rule out provider-level outages
5. Check event patterns (query_event_patterns) if the anomaly is volume-related
6. Check payload changes (query_payload_changes) if errors suggest parsing/processing issues
7. Check cross-integration status (query_cross_integration_status) if you suspect shared infrastructure issues

## Decision framework
- If MULTIPLE integrations for the same provider are failing → likely provider outage
- If ONLY this integration is failing → likely customer endpoint issue
- If similar anomaly happened before and was resolved → reference the past resolution
- If circuit breaker is OPEN → focus on what triggered it and when recovery is expected
- If error types are all the same (e.g., all 503s) → specific endpoint issue
- If error types are mixed → likely intermittent or load-related
- If payload schemas changed recently → provider API update may be the cause

## Revenue impact
For payment-related events (charge.succeeded, invoice.paid, order.created), estimate dollar impact:
- Count affected events with amount_cents
- Failed payment webhooks = potential revenue loss or delayed fulfillment

## Response format
After investigating, respond with ONLY valid JSON:
{
  "what": "1-2 sentence factual description of what is happening, citing specific numbers from your investigation",
  "why": "Root cause analysis backed by evidence. Reference specific tool results.",
  "impact": "Business impact: events affected, revenue at risk, downstream consequences",
  "recommendation": "Specific actionable steps the developer should take, ordered by priority",
  "confidence": 0.0 to 1.0 (based on evidence quality — more data points = higher confidence),
  "crossCorrelation": "If multiple integrations or the provider are affected, describe. null if isolated.",
  "predictedResolution": "When this is likely to resolve and why, or null if unclear",
  "remediationActions": [
    {
      "type": "one of: open_circuit_breaker, enable_rate_limiting, adjust_retry_strategy, pause_integration, trigger_reconciliation, enable_idempotency, notify_provider_outage",
      "reason": "why this action would help"
    }
  ],
  "severityAssessment": {
    "revenueAtRisk": number or null (in cents),
    "eventsAffected": number,
    "estimatedRecoveryMinutes": number or null
  }
}

## Rules
- NEVER guess. If you don't have enough data, say so and set confidence low.
- ALWAYS use at least 2 tools before diagnosing. One-tool diagnoses are lazy.
- Be SPECIFIC: "response times jumped from 120ms to 2.3s" not "response times increased"
- Reference your evidence: "Based on delivery history showing 47/50 failures with 503 status..."
- If past incidents exist, ALWAYS mention them: "This is the 3rd occurrence of this pattern..."`;

/**
 * Simple system prompt for non-agentic diagnosis (fallback).
 */
export const SYSTEM_PROMPT = `You are Trueline's AI anomaly diagnosis engine. You analyze webhook delivery anomalies and provide structured root cause analysis.

Your response MUST be valid JSON with exactly these fields:
{
  "what": "1-2 sentence description of what happened",
  "why": "Root cause analysis",
  "impact": "Affected events + business impact",
  "recommendation": "Specific actionable advice",
  "confidence": 0.0 to 1.0,
  "crossCorrelation": "If multiple integrations are affected. null otherwise"
}`;

export function buildInvestigationPrompt(context: AnomalyContext): string {
  const {
    integrationName,
    provider,
    anomalyType,
    severity,
    baseline,
    current,
  } = context;

  return `ANOMALY ALERT — Investigate immediately.

Integration: "${integrationName}" (${provider})
Anomaly type: ${anomalyType}
Severity: ${severity}
Integration ID: ${context.integrationId}

BASELINE (rolling averages, ${baseline.sampleCount} samples):
- Events per 5min: ${baseline.eventCount.toFixed(1)} (stddev: ${baseline.stddevEventCount.toFixed(2)})
- Avg response time: ${baseline.avgResponseMs.toFixed(0)}ms (stddev: ${baseline.stddevResponseMs.toFixed(0)}ms)
- Failure rate: ${(baseline.failureRate * 100).toFixed(1)}% (stddev: ${(baseline.stddevFailureRate * 100).toFixed(2)}%)

CURRENT (last 5 minutes):
- Events: ${current.eventCount}
- Avg response time: ${current.avgResponseMs.toFixed(0)}ms
- Failure rate: ${(current.failureRate * 100).toFixed(1)}%
- Event types: ${JSON.stringify(current.eventTypeDistribution)}

Use your investigation tools to gather evidence, then provide your diagnosis as JSON.`;
}

/**
 * Legacy prompt builder (kept for fallback mode).
 */
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
