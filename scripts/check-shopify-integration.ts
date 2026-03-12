import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { integrations } from "../src/lib/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const rows = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      providerDomain: integrations.providerDomain,
      apiKey: integrations.apiKeyEncrypted,
      destinationUrl: integrations.destinationUrl,
    })
    .from(integrations)
    .where(eq(integrations.provider, "shopify"));

  for (const r of rows) {
    console.log(`ID: ${r.id}`);
    console.log(`Name: ${r.name}`);
    console.log(`Provider Domain: ${r.providerDomain ?? "(not set)"}`);
    console.log(`API Key: ${r.apiKey ? r.apiKey.slice(0, 10) + "..." : "(not set)"}`);
    console.log(`Destination: ${r.destinationUrl}`);
    console.log("---");
  }

  if (rows.length === 0) {
    console.log("No Shopify integrations found.");
  }

  await client.end();
}

main();
