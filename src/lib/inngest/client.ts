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
    skipSequencer?: boolean;
  };
};

export type WebhookSequenceHoldEvent = {
  name: "webhook/sequence-hold";
  data: {
    eventId: string;
    integrationId: string;
    destinationUrl: string;
    holdUntil: string; // ISO timestamp for timeout
  };
};

export type EndpointCircuitOpenedEvent = {
  name: "endpoint/circuit-opened";
  data: {
    endpointId: string;
    integrationId: string;
  };
};

export type EndpointReplayStartedEvent = {
  name: "endpoint/replay-started";
  data: {
    endpointId: string;
    integrationId: string;
  };
};

export type WebhookRetryEvent = {
  name: "webhook/retry";
  data: {
    eventId: string;
    integrationId: string;
    destinationUrl: string;
    attemptNumber: number;
    timeoutMs: number;
  };
};

export type AnomalyDetectedEvent = {
  name: "anomaly/detected";
  data: {
    anomalyId: string;
    integrationId: string;
    type: string;
    severity: string;
  };
};

export type ReconciliationRunEvent = {
  name: "reconciliation/run";
  data: {
    integrationId: string;
  };
};

export type FlowStepCompletedEvent = {
  name: "flow/step-completed";
  data: {
    eventId: string;
    integrationId: string;
    eventType: string;
    correlationKey: string | null;
  };
};

export type SecurityScanRequestedEvent = {
  name: "security/scan-requested";
  data: {
    endpointId: string;
  };
};

export type SecurityScanCompletedEvent = {
  name: "security/scan-completed";
  data: {
    scanId: string;
    endpointId: string;
    score: number;
    findingsCount: number;
  };
};

export type Events = {
  "webhook/received": WebhookReceivedEvent;
  "webhook/sequence-hold": WebhookSequenceHoldEvent;
  "endpoint/circuit-opened": EndpointCircuitOpenedEvent;
  "endpoint/replay-started": EndpointReplayStartedEvent;
  "webhook/retry": WebhookRetryEvent;
  "anomaly/detected": AnomalyDetectedEvent;
  "reconciliation/run": ReconciliationRunEvent;
  "flow/step-completed": FlowStepCompletedEvent;
  "security/scan-requested": SecurityScanRequestedEvent;
  "security/scan-completed": SecurityScanCompletedEvent;
};
