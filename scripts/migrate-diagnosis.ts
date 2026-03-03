import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  console.log("Migrating anomalies.diagnosis from text → jsonb...");

  await sql`
    ALTER TABLE anomalies
      ALTER COLUMN diagnosis
      TYPE jsonb
      USING diagnosis::jsonb
  `;

  console.log("Done. Column is now jsonb.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
