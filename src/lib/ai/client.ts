import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

export type AIProvider = "anthropic" | "groq";

export function getAIProvider(): AIProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  return "anthropic";
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

// Groq uses OpenAI-compatible API — no SDK needed
export async function chatCompletion(
  system: string,
  userMessage: string
): Promise<string> {
  const provider = getAIProvider();

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq API error ${res.status}: ${text}`);
    }

    const body = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return body.choices[0]?.message?.content ?? "";
  }

  // Default: Anthropic
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
