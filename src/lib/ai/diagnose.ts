import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "./client";
import { SYSTEM_PROMPT, buildDiagnosisPrompt } from "./prompts";
import { getCachedDiagnosis, cacheDiagnosis } from "./cache";
import type { AnomalyContext, AIDiagnosis } from "./types";

const FALLBACK_DIAGNOSIS: AIDiagnosis = {
  what: "An anomaly was detected but AI diagnosis is unavailable.",
  why: "Unable to determine root cause — diagnosis service returned an unparseable response.",
  impact: "Unknown — manual investigation required.",
  recommendation: "Check the anomaly context and recent deliveries manually.",
  confidence: 0,
  crossCorrelation: null,
};

export async function diagnoseAnomaly(
  context: AnomalyContext
): Promise<AIDiagnosis> {
  // Check cache first
  const cached = getCachedDiagnosis(
    context.integrationId,
    context.anomalyType
  );
  if (cached) return cached;

  try {
    const client = getAnthropicClient();
    const prompt = buildDiagnosisPrompt(context);

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return FALLBACK_DIAGNOSIS;
    }

    const diagnosis = parseDiagnosis(textBlock.text);
    cacheDiagnosis(context.integrationId, context.anomalyType, diagnosis);
    return diagnosis;
  } catch (error) {
    console.error("[HookWise AI] Diagnosis failed:", error);
    return FALLBACK_DIAGNOSIS;
  }
}

function parseDiagnosis(raw: string): AIDiagnosis {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return extractFromText(raw);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      what: String(parsed.what ?? ""),
      why: String(parsed.why ?? ""),
      impact: String(parsed.impact ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
      confidence: typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
      crossCorrelation: parsed.crossCorrelation
        ? String(parsed.crossCorrelation)
        : null,
    };
  } catch {
    return extractFromText(raw);
  }
}

function extractFromText(raw: string): AIDiagnosis {
  // Fallback: try to extract meaningful fields from raw text
  const lines = raw.split("\n").filter((l) => l.trim());
  return {
    what: lines[0] ?? "Anomaly detected.",
    why: lines[1] ?? "See raw context for details.",
    impact: lines[2] ?? "Unknown.",
    recommendation: lines[3] ?? "Investigate manually.",
    confidence: 0.3,
    crossCorrelation: null,
  };
}
