import { Command } from "commander";
import * as readline from "readline";
import { saveConfig } from "../config";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export const loginCommand = new Command("login")
  .description("Save API credentials for HookWise")
  .option("--api-key <key>", "API key")
  .option("--base-url <url>", "Base URL", "http://localhost:3000")
  .action(async (opts: { apiKey?: string; baseUrl: string }) => {
    let apiKey = opts.apiKey;

    if (!apiKey) {
      apiKey = await prompt("Enter your HookWise API key: ");
    }

    if (!apiKey) {
      console.error("API key is required.");
      process.exit(1);
    }

    saveConfig({ apiKey, baseUrl: opts.baseUrl });
    console.log(`Logged in. Config saved to ~/.hookwise/config.json`);
  });
