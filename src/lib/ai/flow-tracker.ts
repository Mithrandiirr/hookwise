import { db } from "@/lib/db";
import { flows, flowInstances, integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface FlowStep {
  integrationId: string;
  eventType: string;
  correlationField: string;
}

export async function processFlowStep(
  eventId: string,
  integrationId: string,
  eventType: string,
  correlationKey: string | null
): Promise<void> {
  if (!correlationKey) return;

  // Find the integration's user to scope flow queries
  const [integration] = await db
    .select({ userId: integrations.userId })
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration) return;

  // Find all flows owned by this user
  const userFlows = await db
    .select()
    .from(flows)
    .where(eq(flows.userId, integration.userId));

  for (const flow of userFlows) {
    const steps = flow.steps as FlowStep[];
    if (!Array.isArray(steps) || steps.length === 0) continue;

    // Check if this event matches any step in the flow
    const stepIndex = steps.findIndex(
      (s) => s.integrationId === integrationId && s.eventType === eventType
    );

    if (stepIndex === -1) continue;

    if (stepIndex === 0) {
      // First step — create a new flow instance
      const [existing] = await db
        .select({ id: flowInstances.id })
        .from(flowInstances)
        .where(
          and(
            eq(flowInstances.flowId, flow.id),
            eq(flowInstances.correlationKey, correlationKey),
            eq(flowInstances.status, "running")
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(flowInstances).values({
          flowId: flow.id,
          correlationKey,
          status: "running",
          startedAt: new Date(),
        });
      }
    } else {
      // Subsequent step — advance existing flow instances
      const instances = await db
        .select()
        .from(flowInstances)
        .where(
          and(
            eq(flowInstances.flowId, flow.id),
            eq(flowInstances.correlationKey, correlationKey),
            eq(flowInstances.status, "running")
          )
        );

      for (const instance of instances) {
        // Check if this is the last step
        if (stepIndex === steps.length - 1) {
          await db
            .update(flowInstances)
            .set({
              status: "completed",
              completedAt: new Date(),
            })
            .where(eq(flowInstances.id, instance.id));
        }
        // For intermediate steps, the instance stays "running" —
        // the flow tracks progress by which events have been received
      }
    }
  }
}
