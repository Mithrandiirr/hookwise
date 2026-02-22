import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { deliverWebhook } from "@/lib/inngest/functions/deliver-webhook";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [deliverWebhook],
});
