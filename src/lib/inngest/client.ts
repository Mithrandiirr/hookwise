import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "hookwise",
  name: "HookWise",
});

export type WebhookReceivedEvent = {
  name: "webhook/received";
  data: {
    eventId: string;
    integrationId: string;
    destinationUrl: string;
  };
};

export type Events = {
  "webhook/received": WebhookReceivedEvent;
};
