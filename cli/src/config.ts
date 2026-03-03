import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface HookwiseConfig {
  apiKey: string;
  baseUrl: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".hookwise");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function loadConfig(): HookwiseConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as HookwiseConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: HookwiseConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function requireConfig(): HookwiseConfig {
  const config = loadConfig();
  if (!config) {
    console.error("Not logged in. Run `hookwise login` first.");
    process.exit(1);
  }
  return config;
}
