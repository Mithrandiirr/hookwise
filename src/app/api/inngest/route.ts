import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { deliverWebhook, retryWebhook } from "@/lib/inngest/functions/deliver-webhook";
import { healthCheck } from "@/lib/inngest/functions/health-check";
import { replayEngine } from "@/lib/inngest/functions/replay-engine";
import { patternLearning } from "@/lib/inngest/functions/pattern-learning";
import { anomalyDetector } from "@/lib/inngest/functions/anomaly-detector";
import { alertDispatcher } from "@/lib/inngest/functions/alert-dispatcher";
import { reconciliation } from "@/lib/inngest/functions/reconciliation";
import { flowTracker } from "@/lib/inngest/functions/flow-tracker";
import { flowTimeoutChecker } from "@/lib/inngest/functions/flow-timeout-checker";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    deliverWebhook,
    retryWebhook,
    healthCheck,
    replayEngine,
    patternLearning,
    anomalyDetector,
    alertDispatcher,
    reconciliation,
    flowTracker,
    flowTimeoutChecker,
  ],
});
