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
import { securityScanner } from "@/lib/inngest/functions/security-scanner";
import { drainRedisBuffer } from "@/lib/inngest/functions/drain-redis-buffer";
import { sequenceHoldChecker } from "@/lib/inngest/functions/deliver-webhook";
import { weeklyReport } from "@/lib/inngest/functions/weekly-report";
import { providerHealthAggregator } from "@/lib/inngest/functions/provider-health-aggregator";

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
    securityScanner,
    drainRedisBuffer,
    sequenceHoldChecker,
    weeklyReport,
    providerHealthAggregator,
  ],
});
