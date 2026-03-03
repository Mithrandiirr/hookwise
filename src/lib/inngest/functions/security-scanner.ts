import { inngest } from "../client";
import { runSecurityScan } from "@/lib/security/scanner";

export const securityScanner = inngest.createFunction(
  {
    id: "security-scanner",
    name: "Security Scanner",
    retries: 1,
  },
  { event: "security/scan-requested" },
  async ({ event, step }) => {
    const { endpointId } = event.data;

    const result = await step.run("run-scan", async () => {
      return runSecurityScan(endpointId);
    });

    await step.run("emit-completed", async () => {
      await inngest.send({
        name: "security/scan-completed",
        data: {
          scanId: result.scanId,
          endpointId,
          score: result.score,
          findingsCount: result.findings.length,
        },
      });
    });

    return result;
  }
);
