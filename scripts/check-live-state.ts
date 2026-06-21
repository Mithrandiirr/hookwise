import { config } from "dotenv";
config({ path: ".env.local" });

const INTEGRATION_ID = "7f0a840e-59de-4c03-93b6-f1f5edfcc53a";

async function main() {
  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { eq, desc, sql } = await import("drizzle-orm");

  const evs = await db
    .select({ type: schema.events.eventType, source: schema.events.source, sig: schema.events.signatureValid, count: sql<number>`count(*)::int` })
    .from(schema.events)
    .where(eq(schema.events.integrationId, INTEGRATION_ID))
    .groupBy(schema.events.eventType, schema.events.source, schema.events.signatureValid)
    .orderBy(desc(sql`count(*)`));
  console.log("=== EVENTS ===");
  for (const e of evs) console.log(`  ${e.count}x ${e.type} [${e.source}] sigValid=${e.sig}`);
  if (evs.length === 0) console.log("  (none yet)");

  const runs = await db
    .select()
    .from(schema.backfillRuns)
    .where(eq(schema.backfillRuns.integrationId, INTEGRATION_ID))
    .orderBy(desc(schema.backfillRuns.id))
    .limit(2);
  console.log("=== BACKFILL RUNS ===");
  for (const r of runs) console.log(`  status=${r.status} scanned=${r.scanned} err=${r.error ?? "-"}`, r.summary ? `summary=${JSON.stringify(r.summary)}` : "");

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
