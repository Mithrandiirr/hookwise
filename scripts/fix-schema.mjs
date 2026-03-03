import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "fs";

config({ path: ".env.local" });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sql = postgres(url, { max: 1, idle_timeout: 3, connect_timeout: 30 });

try {
  const migration = readFileSync("scripts/fix-schema.sql", "utf-8");

  // Split by semicolons but keep DO $$ blocks intact
  const statements = [];
  let current = "";
  let inDo = false;

  for (const line of migration.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") continue;

    current += line + "\n";

    if (trimmed.startsWith("DO $$")) inDo = true;
    if (inDo && trimmed.endsWith("$$;")) {
      statements.push(current.trim());
      current = "";
      inDo = false;
      continue;
    }

    if (!inDo && trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());

  console.log(`Running ${statements.length} statements...`);

  let ok = 0, skip = 0, fail = 0;
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      ok++;
      process.stdout.write(".");
    } catch (err) {
      if (err.code === "42710" || err.code === "42P07" || err.code === "42701") {
        skip++;
        process.stdout.write("s");
      } else {
        fail++;
        console.error("\nERR:", err.message, "\nSQL:", stmt.slice(0, 80));
      }
    }
  }

  console.log(`\nDone: ${ok} applied, ${skip} skipped, ${fail} failed`);
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await sql.end();
}
