export type Provider = "stripe" | "shopify" | "github";

export type IntegrationStatus = "active" | "paused" | "error";

export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead_letter";

export type AnomalyType =
  | "response_time_spike"
  | "failure_surge"
  | "source_silence"
  | "volume_spike"
  | "volume_drop"
  | "new_event_type"
  | "payload_anomaly";

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export type FlowInstanceStatus = "running" | "completed" | "failed" | "timed_out";
