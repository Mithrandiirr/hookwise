import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { integrations } from "../src/lib/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const result = await db
    .update(integrations)
    .set({
      apiKeyEncrypted: process.env.SHOPIFY_ACCESS_TOKEN!,
    })
    .where(eq(integrations.id, "7f0a840e-59de-4c03-93b6-f1f5edfcc53a"))
    .returning({ id: integrations.id, name: integrations.name, apiKey: integrations.apiKeyEncrypted });

  console.log("Updated:", result);

  await client.end();
}

main();
