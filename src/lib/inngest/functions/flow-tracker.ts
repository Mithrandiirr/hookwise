import { inngest } from "../client";
import { processFlowStep } from "@/lib/ai/flow-tracker";

export const flowTracker = inngest.createFunction(
  {
    id: "flow-tracker",
    name: "Flow Step Tracker",
    retries: 2,
  },
  { event: "flow/step-completed" },
  async ({ event, step }) => {
    const { eventId, integrationId, eventType, correlationKey } = event.data;

    await step.run("process-flow-step", async () => {
      await processFlowStep(eventId, integrationId, eventType, correlationKey);
    });

    return { processed: true };
  }
);
