import { inngest } from "../client";
import { db } from "@/lib/db";
import { flowInstances, flows } from "@/lib/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";

export const flowTimeoutChecker = inngest.createFunction(
  {
    id: "flow-timeout-checker",
    name: "Flow Timeout Checker",
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const timedOut = await step.run("find-timed-out-instances", async () => {
      // Find running flow instances that have exceeded their flow's timeout
      const results = await db
        .select({
          instanceId: flowInstances.id,
          flowId: flowInstances.flowId,
          startedAt: flowInstances.startedAt,
          timeoutMinutes: flows.timeoutMinutes,
        })
        .from(flowInstances)
        .innerJoin(flows, eq(flowInstances.flowId, flows.id))
        .where(
          and(
            eq(flowInstances.status, "running"),
            lt(
              flowInstances.startedAt,
              sql`NOW() - (${flows.timeoutMinutes} || ' minutes')::interval`
            )
          )
        );

      return results;
    });

    if (timedOut.length === 0) {
      return { timedOut: 0 };
    }

    let count = 0;
    for (const instance of timedOut) {
      await step.run(`timeout-${instance.instanceId}`, async () => {
        await db
          .update(flowInstances)
          .set({
            status: "timed_out",
            completedAt: new Date(),
          })
          .where(eq(flowInstances.id, instance.instanceId));
      });
      count++;
    }

    return { timedOut: count };
  }
);
