// Multi-turn chat scoped to a single anomaly. Loads the incident's context once
// per request and replays it into Claude's system prompt so every turn stays grounded
// in the actual data, not invented details.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, anomalies, integrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAnthropicClient } from "@/lib/ai/client";
import { parseDiagnosis } from "@/lib/utils/parse-diagnosis";

const MAX_TURNS = 12;
const MAX_USER_MESSAGE_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 600;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_TURNS),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ anomalyId: string }> },
) {
  const { anomalyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { messages } = parsed.data;

  // Last turn must be a user message — otherwise there's nothing to respond to.
  if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  // Verify anomaly belongs to a user-owned integration before exposing any context.
  const [anomaly] = await db
    .select()
    .from(anomalies)
    .where(eq(anomalies.id, anomalyId))
    .limit(1);
  if (!anomaly) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, anomaly.integrationId),
        eq(integrations.userId, user.id),
      ),
    )
    .limit(1);
  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const diagnosis = parseDiagnosis(anomaly.diagnosis);
  const context = (anomaly.context ?? null) as {
    baseline?: { avgResponseMs?: number; failureRate?: number };
    current?: { avgResponseMs?: number; failureRate?: number };
  } | null;

  const systemPrompt = buildSystemPrompt({
    integrationName: integration.name,
    provider: integration.provider,
    anomalyType: anomaly.type,
    severity: anomaly.severity,
    detectedAt: anomaly.detectedAt,
    resolvedAt: anomaly.resolvedAt,
    diagnosis,
    context,
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is unavailable — ANTHROPIC_API_KEY not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Empty reply from model" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[anomaly-chat] anthropic error", err);
    return NextResponse.json(
      { error: "AI service error — try again in a moment." },
      { status: 502 },
    );
  }
}

function buildSystemPrompt(args: {
  integrationName: string;
  provider: string;
  anomalyType: string;
  severity: string;
  detectedAt: Date | string;
  resolvedAt: Date | string | null;
  diagnosis: ReturnType<typeof parseDiagnosis>;
  context: {
    baseline?: { avgResponseMs?: number; failureRate?: number };
    current?: { avgResponseMs?: number; failureRate?: number };
  } | null;
}): string {
  const {
    integrationName,
    provider,
    anomalyType,
    severity,
    detectedAt,
    resolvedAt,
    diagnosis,
    context,
  } = args;

  const fmt = (v: number | undefined | null, suffix: string) =>
    v == null ? "—" : `${typeof v === "number" ? v.toFixed(2) : v}${suffix}`;

  const ctxBlock = [
    `## Incident`,
    `- ID family: ${anomalyType}`,
    `- Integration: ${integrationName} (${provider})`,
    `- Severity: ${severity}`,
    `- Detected: ${new Date(detectedAt).toISOString()}`,
    resolvedAt
      ? `- Resolved: ${new Date(resolvedAt).toISOString()}`
      : `- Status: open`,
    ``,
    `## Diagnosis (already shown to the user)`,
    diagnosis.what ? `- What: ${diagnosis.what}` : null,
    diagnosis.why ? `- Why: ${diagnosis.why}` : null,
    diagnosis.impact ? `- Impact: ${diagnosis.impact}` : null,
    diagnosis.recommendation ? `- Suggested fix: ${diagnosis.recommendation}` : null,
    diagnosis.confidence != null
      ? `- Confidence: ${(diagnosis.confidence * 100).toFixed(0)}%`
      : null,
    ``,
    diagnosis.evidence.length > 0 ? `## Evidence captured during investigation` : null,
    ...diagnosis.evidence
      .slice(0, 8)
      .map((e, i) => `${i + 1}. ${e.tool}: ${e.finding}`),
    ``,
    `## Metrics`,
    `- Failure rate (baseline → current): ${fmt(context?.baseline?.failureRate, "%")} → ${fmt(
      context?.current?.failureRate,
      "%",
    )}`,
    `- p95 latency (baseline → current): ${fmt(context?.baseline?.avgResponseMs, "ms")} → ${fmt(
      context?.current?.avgResponseMs,
      "ms",
    )}`,
    `- Events affected: ${diagnosis.severityAssessment.eventsAffected}`,
    diagnosis.severityAssessment.revenueAtRisk != null
      ? `- Revenue at risk: $${(diagnosis.severityAssessment.revenueAtRisk / 100).toFixed(2)}`
      : null,
    ``,
    diagnosis.similarIncidents.length > 0
      ? `## Similar prior incidents (top ${Math.min(3, diagnosis.similarIncidents.length)})`
      : null,
    ...diagnosis.similarIncidents
      .slice(0, 3)
      .map(
        (s) =>
          `- ${s.type} on ${new Date(s.detectedAt).toLocaleDateString()} (${
            s.resolvedAt ? "resolved" : "open"
          })`,
      ),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `You are an SRE assistant helping the on-call engineer reason about a single, specific webhook incident in HookWise. Stay focused on this incident. Be concise: 3-6 sentences per reply unless a code snippet or list is genuinely useful. Never invent specific values (timestamps, IDs, dollar amounts, event counts) — if it isn't in the context below, say so plainly. Recommend concrete next actions when asked. Do not advise destructive operations without naming the trade-off. If the user asks something this incident's context can't answer, say so and suggest where in the dashboard they'd find it (events list, integrations page, reconciler, etc).

${ctxBlock}

Reply in clear prose. Use short paragraphs. Code or commands in fenced blocks only when concrete.`;
}
