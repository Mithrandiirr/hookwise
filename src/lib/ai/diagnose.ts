import { agenticCompletion, chatCompletion } from "./client";
import {
  INVESTIGATION_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  buildInvestigationPrompt,
  buildDiagnosisPrompt,
} from "./prompts";
import { INVESTIGATION_TOOLS, executeInvestigationTool } from "./tools";
import { getCachedDiagnosis, cacheDiagnosis } from "./cache";
import { findSimilarIncidents } from "./incident-memory";
import type {
  AnomalyContext,
  AIDiagnosis,
  InvestigationStep,
  RemediationAction,
  IncidentReference,
} from "./types";

const EMPTY_DIAGNOSIS: AIDiagnosis = {
  what: "An anomaly was detected but AI diagnosis is unavailable.",
  why: "Unable to determine root cause — diagnosis service returned an unparseable response.",
  impact: "Unknown — manual investigation required.",
  recommendation: "Check the anomaly context and recent deliveries manually.",
  confidence: 0,
  crossCorrelation: null,
  evidence: [],
  remediationActions: [],
  similarIncidents: [],
  predictedResolution: null,
  severityAssessment: {
    revenueAtRisk: null,
    eventsAffected: 0,
    estimatedRecoveryMinutes: null,
  },
};

/**
 * Primary diagnosis function — uses agentic investigation with tool use.
 * Falls back to simple one-shot diagnosis if agentic fails.
 */
export async function diagnoseAnomaly(
  context: AnomalyContext
): Promise<AIDiagnosis> {
  // Check cache first
  const cached = getCachedDiagnosis(
    context.integrationId,
    context.anomalyType
  );
  if (cached) return cached;

  // Fetch similar past incidents for context
  const similarIncidents = await findSimilarIncidents(
    context.integrationId,
    context.anomalyType
  );

  try {
    const diagnosis = await agenticDiagnosis(context, similarIncidents);
    cacheDiagnosis(context.integrationId, context.anomalyType, diagnosis);
    return diagnosis;
  } catch (error) {
    console.error("[HookWise AI] Agentic diagnosis failed, falling back:", error);

    try {
      const fallback = await fallbackDiagnosis(context, similarIncidents);
      cacheDiagnosis(context.integrationId, context.anomalyType, fallback);
      return fallback;
    } catch (fallbackError) {
      console.error("[HookWise AI] Fallback diagnosis also failed:", fallbackError);
      return EMPTY_DIAGNOSIS;
    }
  }
}

/**
 * Agentic diagnosis — Claude investigates using tools before diagnosing.
 */
async function agenticDiagnosis(
  context: AnomalyContext,
  similarIncidents: IncidentReference[]
): Promise<AIDiagnosis> {
  let prompt = buildInvestigationPrompt(context);

  // Inject incident memory if available
  if (similarIncidents.length > 0) {
    prompt += `\n\nINCIDENT MEMORY — Similar past incidents for this integration:\n`;
    for (const incident of similarIncidents) {
      prompt += `- [${incident.detectedAt.toISOString()}] ${incident.type} (${incident.resolvedAt ? "resolved" : "unresolved"}): ${incident.diagnosisSummary}`;
      if (incident.resolution) {
        prompt += ` → Resolution: ${incident.resolution}`;
      }
      prompt += "\n";
    }
    prompt += `\nConsider whether this is a recurring pattern.\n`;
  }

  const { text, steps } = await agenticCompletion(
    INVESTIGATION_SYSTEM_PROMPT,
    prompt,
    INVESTIGATION_TOOLS,
    executeInvestigationTool
  );

  if (!text) {
    throw new Error("Agentic diagnosis returned empty response");
  }

  return parseEnhancedDiagnosis(text, steps, similarIncidents);
}

/**
 * Simple fallback — one-shot prompt without tools.
 */
async function fallbackDiagnosis(
  context: AnomalyContext,
  similarIncidents: IncidentReference[]
): Promise<AIDiagnosis> {
  const prompt = buildDiagnosisPrompt(context);
  const text = await chatCompletion(SYSTEM_PROMPT, prompt);

  if (!text) {
    return EMPTY_DIAGNOSIS;
  }

  return parseLegacyDiagnosis(text, similarIncidents);
}

/**
 * Parse the enhanced JSON diagnosis from the agentic investigation.
 */
function parseEnhancedDiagnosis(
  raw: string,
  steps: InvestigationStep[],
  similarIncidents: IncidentReference[]
): AIDiagnosis {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFromText(raw, steps, similarIncidents);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      what: String(parsed.what ?? ""),
      why: String(parsed.why ?? ""),
      impact: String(parsed.impact ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
      crossCorrelation: parsed.crossCorrelation
        ? String(parsed.crossCorrelation)
        : null,
      evidence: steps,
      remediationActions: parseRemediationActions(parsed.remediationActions),
      similarIncidents,
      predictedResolution: parsed.predictedResolution
        ? String(parsed.predictedResolution)
        : null,
      severityAssessment: {
        revenueAtRisk:
          typeof parsed.severityAssessment?.revenueAtRisk === "number"
            ? parsed.severityAssessment.revenueAtRisk
            : null,
        eventsAffected:
          typeof parsed.severityAssessment?.eventsAffected === "number"
            ? parsed.severityAssessment.eventsAffected
            : 0,
        estimatedRecoveryMinutes:
          typeof parsed.severityAssessment?.estimatedRecoveryMinutes === "number"
            ? parsed.severityAssessment.estimatedRecoveryMinutes
            : null,
      },
    };
  } catch {
    return buildFromText(raw, steps, similarIncidents);
  }
}

/**
 * Parse legacy one-shot diagnosis format.
 */
function parseLegacyDiagnosis(
  raw: string,
  similarIncidents: IncidentReference[]
): AIDiagnosis {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFromText(raw, [], similarIncidents);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      what: String(parsed.what ?? ""),
      why: String(parsed.why ?? ""),
      impact: String(parsed.impact ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
      crossCorrelation: parsed.crossCorrelation
        ? String(parsed.crossCorrelation)
        : null,
      evidence: [],
      remediationActions: [],
      similarIncidents,
      predictedResolution: null,
      severityAssessment: {
        revenueAtRisk: null,
        eventsAffected: 0,
        estimatedRecoveryMinutes: null,
      },
    };
  } catch {
    return buildFromText(raw, [], similarIncidents);
  }
}

function parseRemediationActions(
  raw: unknown
): RemediationAction[] {
  if (!Array.isArray(raw)) return [];

  const validTypes = new Set([
    "open_circuit_breaker",
    "enable_rate_limiting",
    "adjust_retry_strategy",
    "pause_integration",
    "trigger_reconciliation",
    "enable_idempotency",
    "notify_provider_outage",
  ]);

  return raw
    .filter(
      (action: unknown): action is Record<string, unknown> =>
        typeof action === "object" &&
        action !== null &&
        typeof (action as Record<string, unknown>).type === "string" &&
        validTypes.has((action as Record<string, unknown>).type as string)
    )
    .map((action) => action as unknown as RemediationAction);
}

function buildFromText(
  raw: string,
  steps: InvestigationStep[],
  similarIncidents: IncidentReference[]
): AIDiagnosis {
  const lines = raw.split("\n").filter((l) => l.trim());
  return {
    what: lines[0] ?? "Anomaly detected.",
    why: lines[1] ?? "See raw context for details.",
    impact: lines[2] ?? "Unknown.",
    recommendation: lines[3] ?? "Investigate manually.",
    confidence: steps.length > 0 ? 0.4 : 0.2,
    crossCorrelation: null,
    evidence: steps,
    remediationActions: [],
    similarIncidents,
    predictedResolution: null,
    severityAssessment: {
      revenueAtRisk: null,
      eventsAffected: 0,
      estimatedRecoveryMinutes: null,
    },
  };
}
