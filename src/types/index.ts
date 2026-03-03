export type Provider = "stripe" | "shopify" | "github";

export type IntegrationStatus = "active" | "paused" | "error";

export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead_letter";

export type CircuitState = "closed" | "half_open" | "open";

export type ErrorType = "timeout" | "server_error" | "rate_limit" | "ssl" | "connection_refused" | "unknown";

export type ReplayStatus = "pending" | "delivering" | "delivered" | "failed" | "skipped";

export type EventSource = "webhook" | "reconciliation" | "enrichment";

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

export type SecurityScanType = "signature" | "timestamp" | "replay" | "injection" | "full";

export type VulnerabilityType =
  | "invalid_signature_accepted"
  | "expired_timestamp_accepted"
  | "replay_accepted"
  | "injection_vulnerable"
  | "missing_signature_check"
  | "missing_timestamp_check";

export type AuditAction =
  | "event.received"
  | "event.delivered"
  | "event.failed"
  | "event.replayed"
  | "circuit.opened"
  | "circuit.closed"
  | "circuit.half_open"
  | "integration.created"
  | "integration.updated"
  | "integration.deleted"
  | "scan.completed"
  | "export.created";

export type ComplianceFormat = "json" | "csv";
