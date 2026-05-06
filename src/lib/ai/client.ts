import Anthropic from "@anthropic-ai/sdk";
import type { InvestigationStep } from "./types";

let anthropicClient: Anthropic | null = null;

const MAX_TOOL_ROUNDS = 8;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * Simple single-turn chat completion (used for non-agentic tasks like reports).
 */
export async function chatCompletion(
  system: string,
  userMessage: string
): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return "";
  }
  return textBlock.text;
}

/**
 * Agentic chat completion with tool use.
 * Claude investigates by calling tools, then returns a final text response.
 * Returns both the final text and the investigation steps taken.
 */
export async function agenticCompletion(
  system: string,
  userMessage: string,
  tools: Anthropic.Messages.Tool[],
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>
): Promise<{ text: string; steps: InvestigationStep[] }> {
  const client = getAnthropicClient();
  const steps: InvestigationStep[] = [];

  let messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      tools,
      messages,
    });

    // Check if Claude wants to use tools
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      // Claude is done investigating — extract final text
      const textBlock = response.content.find(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      );
      return {
        text: textBlock?.text ?? "",
        steps,
      };
    }

    // Execute all tool calls and build the response
    const assistantContent = response.content;
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      let result: unknown;
      let finding: string;

      try {
        result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );
        finding = summarizeToolResult(toolUse.name, result);
      } catch (error) {
        result = { error: String(error) };
        finding = `Error: ${String(error)}`;
      }

      steps.push({
        tool: toolUse.name,
        query: toolUse.input as Record<string, unknown>,
        finding,
      });

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Append assistant message and tool results for next round
    messages = [
      ...messages,
      { role: "assistant", content: assistantContent },
      { role: "user", content: toolResults },
    ];
  }

  // Exhausted rounds — ask Claude for a final answer without tools
  messages.push({
    role: "user",
    content: "You've reached the investigation limit. Please provide your diagnosis now based on the evidence gathered so far.",
  });

  const finalResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages,
  });

  const finalText = finalResponse.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );

  return {
    text: finalText?.text ?? "",
    steps,
  };
}

/**
 * Create a short human-readable summary of a tool result for the evidence trail.
 */
function summarizeToolResult(toolName: string, result: unknown): string {
  const data = result as Record<string, unknown>;

  switch (toolName) {
    case "query_delivery_history": {
      const total = data.total as number;
      const failed = data.failed as number;
      const rate = ((data.failureRate as number) * 100).toFixed(1);
      return `${failed}/${total} deliveries failed (${rate}%). Top errors: ${JSON.stringify(data.errorBreakdown)}`;
    }
    case "query_endpoint_health": {
      const state = data.circuitState;
      const score = data.healthScore;
      const queue = data.replayQueueSize;
      return `Circuit: ${state}, health score: ${score}, replay queue: ${queue} events`;
    }
    case "query_similar_anomalies": {
      const items = data as unknown as Array<Record<string, unknown>>;
      if (!Array.isArray(items)) return "No similar anomalies found";
      return items.length > 0
        ? `Found ${items.length} similar past incidents. Last: ${items[0]?.diagnosisWhat ?? "no diagnosis"}`
        : "No similar anomalies found";
    }
    case "query_provider_health": {
      const status = data.status;
      const affected = data.affectedIntegrationCount;
      return `Provider status: ${status}, ${affected} integrations affected`;
    }
    case "query_event_patterns": {
      const types = data.eventTypeBreakdown as Record<string, number>;
      const typeCount = Object.keys(types ?? {}).length;
      return `${typeCount} event types observed. Signature valid rate: ${((data.signatureValidRate as number) * 100).toFixed(1)}%`;
    }
    case "query_payload_changes": {
      const changes = data as unknown as Array<Record<string, unknown>>;
      if (!Array.isArray(changes)) return "No payload schema data";
      const withNewFields = changes.filter(
        (c) => ((c.newFields as string[]) ?? []).length > 0
      );
      return withNewFields.length > 0
        ? `${withNewFields.length} event types have new payload fields`
        : "No payload schema changes detected";
    }
    case "query_cross_integration_status": {
      const integrations = data as unknown as Array<Record<string, unknown>>;
      if (!Array.isArray(integrations)) return "No cross-integration data";
      const failing = integrations.filter(
        (i) => (i.failureRate as number) > 0.1
      );
      return `${failing.length}/${integrations.length} integrations have >10% failure rate`;
    }
    default:
      return JSON.stringify(data).slice(0, 200);
  }
}
