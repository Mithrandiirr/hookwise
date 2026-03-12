import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { anomalies } from "../src/lib/db/schema.ts";
import { desc } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const rows = await db
    .select()
    .from(anomalies)
    .orderBy(desc(anomalies.detectedAt))
    .limit(10);

  for (const r of rows) {
    const diag = r.diagnosis as Record<string, unknown> | null;
    console.log(`--- ${r.type} (${r.severity}) ---`);
    console.log(`  Detected: ${r.detectedAt}`);
    console.log(`  Resolved: ${r.resolvedAt ?? "no"}`);
    console.log(`  What: ${diag?.what ?? "(no diagnosis)"}`);
    console.log(`  Confidence: ${diag?.confidence ?? 0}`);
    console.log();
  }

  await client.end();
}

main();
