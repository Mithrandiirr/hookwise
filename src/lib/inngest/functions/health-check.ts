import { inngest } from "../client";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { recordHealthCheckResult } from "@/lib/mitigation/circuit-breaker";

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export const healthCheck = inngest.createFunction(
  {
    id: "health-check",
    name: "Endpoint Health Check",
  },
  { cron: "* * * * *" }, // every minute
  async ({ step }) => {
    const openEndpoints = await step.run("fetch-open-endpoints", async () => {
      return db
        .select()
        .from(endpoints)
        .where(eq(endpoints.circuitState, "open"));
    });

    if (openEndpoints.length === 0) {
      return { checked: 0 };
    }

    const results: Array<{ endpointId: string; success: boolean; newState: string }> = [];

    for (const endpoint of openEndpoints) {
      const checkResult = await step.run(`health-check-${endpoint.id}`, async () => {
        let success = false;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

          // Try HEAD first, fall back to GET if HEAD fails
          let response = await fetch(endpoint.url, {
            method: "HEAD",
            signal: controller.signal,
          });

          if (!response.ok) {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), HEALTH_CHECK_TIMEOUT_MS);
            response = await fetch(endpoint.url, {
              method: "GET",
              signal: controller2.signal,
            });
            clearTimeout(timeout2);
          }

          clearTimeout(timeout);
          success = response.ok;
        } catch {
          success = false;
        }

        const transition = await recordHealthCheckResult(endpoint.id, success);
        return { endpointId: endpoint.id, success, newState: transition.newState };
      });

      results.push(checkResult);

      // If transitioned to half_open, emit replay event
      if (checkResult.newState === "half_open") {
        await step.run(`emit-replay-${endpoint.id}`, async () => {
          await inngest.send({
            name: "endpoint/replay-started",
            data: {
              endpointId: endpoint.id,
              integrationId: endpoint.integrationId,
            },
          });
        });
      }
    }

    return { checked: results.length, results };
  }
);
