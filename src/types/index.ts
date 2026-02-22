export type Provider = "stripe" | "shopify" | "github";

export type IntegrationStatus = "active" | "paused" | "error";

export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead_letter";

export type CircuitState = "closed" | "half_open" | "open";

export type ErrorType = "timeout" | "server_error" | "rate_limit" | "ssl" | "connection_refused" | "unknown";

export type ReplayStatus = "pending" | "delivering" | "delivered" | "failed" | "skipped";

export type EventSource = "webhook" | "reconciliation";

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
