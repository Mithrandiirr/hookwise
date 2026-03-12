import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("GROQ_API_KEY not set");
    return;
  }
  console.log("Testing Groq API...");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 256,
      messages: [
        { role: "system", content: "You are a webhook operations expert. Respond with valid JSON only." },
        { role: "user", content: 'Diagnose: 75% failure rate, all 503s, response time 5000ms vs 145ms baseline. Respond with JSON: {"what":"...","why":"...","recommendation":"..."}' },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Groq error ${res.status}:`, text);
    return;
  }

  const body = await res.json() as { choices: Array<{ message: { content: string } }> };
  console.log("Groq response:");
  console.log(body.choices[0]?.message?.content);
}

main();
