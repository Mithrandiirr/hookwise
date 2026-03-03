import { inngest } from "../client";
import { db } from "@/lib/db";
import { providerHealth, benchmarks } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const PROVIDERS = ["stripe", "shopify", "github"] as const;

export const providerHealthAggregator = inngest.createFunction(
  {
    id: "provider-health-aggregator",
    name: "Provider Health Aggregator",
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    for (const provider of PROVIDERS) {
      await step.run(`aggregate-${provider}`, async () => {
        // Compute metrics from deliveries joined with events+integrations
        // for the last 5 minutes, cross-customer
        const metrics = await db.execute(sql`
          WITH recent_deliveries AS (
            SELECT
              d.status_code,
              d.response_time_ms,
              d.status,
              e.event_type
            FROM deliveries d
            JOIN events e ON e.id = d.event_id
            JOIN integrations i ON i.id = e.integration_id
            WHERE i.provider = ${provider}
              AND d.attempted_at >= NOW() - INTERVAL '5 minutes'
          )
          SELECT
            COUNT(*)::int AS total_count,
            COUNT(*) FILTER (WHERE status = 'failed' OR status = 'dead_letter')::int AS failure_count,
            COALESCE(AVG(response_time_ms), 0)::real AS avg_latency,
            COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms), 0)::real AS p50_latency,
            COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms), 0)::real AS p95_latency
          FROM recent_deliveries
        `);

        const row = metrics[0] as unknown as {
          total_count: number;
          failure_count: number;
          avg_latency: number;
          p50_latency: number;
          p95_latency: number;
        };

        const totalCount = row.total_count ?? 0;
        const failureRate = totalCount > 0 ? (row.failure_count / totalCount) * 100 : 0;

        const now = new Date();

        // Insert provider health metrics
        await db.insert(providerHealth).values([
          { provider, metricName: "avg_latency", value: row.avg_latency, sampleSize: totalCount, measuredAt: now },
          { provider, metricName: "p50_latency", value: row.p50_latency, sampleSize: totalCount, measuredAt: now },
          { provider, metricName: "p95_latency", value: row.p95_latency, sampleSize: totalCount, measuredAt: now },
          { provider, metricName: "failure_rate", value: failureRate, sampleSize: totalCount, measuredAt: now },
          { provider, metricName: "event_volume", value: totalCount, sampleSize: totalCount, measuredAt: now },
        ]);

        // Insert benchmarks grouped by event type
        const eventTypeMetrics = await db.execute(sql`
          SELECT
            e.event_type,
            COUNT(*)::int AS sample_size,
            COUNT(*) FILTER (WHERE d.status = 'failed' OR d.status = 'dead_letter')::int AS failure_count,
            COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY d.response_time_ms), 0)::real AS p50_latency,
            COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.response_time_ms), 0)::real AS p95_latency
          FROM deliveries d
          JOIN events e ON e.id = d.event_id
          JOIN integrations i ON i.id = e.integration_id
          WHERE i.provider = ${provider}
            AND d.attempted_at >= NOW() - INTERVAL '5 minutes'
          GROUP BY e.event_type
        `);

        for (const etRow of eventTypeMetrics as unknown as Array<{
          event_type: string;
          sample_size: number;
          failure_count: number;
          p50_latency: number;
          p95_latency: number;
        }>) {
          const etFailureRate = etRow.sample_size > 0
            ? (etRow.failure_count / etRow.sample_size) * 100
            : 0;

          await db.insert(benchmarks).values({
            provider,
            eventType: etRow.event_type,
            p50Latency: etRow.p50_latency,
            p95Latency: etRow.p95_latency,
            failureRate: etFailureRate,
            sampleSize: etRow.sample_size,
            period: "5m",
            measuredAt: now,
          });
        }
      });
    }

    // Cleanup old data
    await step.run("cleanup", async () => {
      await db.execute(sql`
        DELETE FROM provider_health WHERE measured_at < NOW() - INTERVAL '7 days'
      `);
      await db.execute(sql`
        DELETE FROM benchmarks WHERE measured_at < NOW() - INTERVAL '30 days'
      `);
    });

    return { aggregated: PROVIDERS.length };
  }
);
