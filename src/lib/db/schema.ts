import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["stripe", "shopify", "github"]);
export const integrationStatusEnum = pgEnum("integration_status", ["active", "paused", "error"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "delivered", "failed", "dead_letter"]);
export const circuitStateEnum = pgEnum("circuit_state", ["closed", "half_open", "open"]);
export const errorTypeEnum = pgEnum("error_type", ["timeout", "server_error", "rate_limit", "ssl", "connection_refused", "unknown"]);
export const replayStatusEnum = pgEnum("replay_status", ["pending", "delivering", "delivered", "failed", "skipped"]);
export const eventSourceEnum = pgEnum("event_source", ["webhook", "reconciliation"]);
export const anomalyTypeEnum = pgEnum("anomaly_type", [
  "response_time_spike",
  "failure_surge",
  "source_silence",
  "volume_spike",
  "volume_drop",
  "new_event_type",
  "payload_anomaly",
]);
export const anomalySeverityEnum = pgEnum("anomaly_severity", ["low", "medium", "high", "critical"]);
export const flowInstanceStatusEnum = pgEnum("flow_instance_status", ["running", "completed", "failed", "timed_out"]);
export const alertChannelEnum = pgEnum("alert_channel", ["email", "slack"]);

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  provider: providerEnum("provider").notNull(),
  signingSecret: text("signing_secret").notNull(),
  destinationUrl: text("destination_url").notNull(),
  status: integrationStatusEnum("status").notNull().default("active"),
  apiKeyEncrypted: text("api_key_encrypted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const endpoints = pgTable("endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .unique()
    .references(() => integrations.id),
  url: text("url").notNull(),
  circuitState: circuitStateEnum("circuit_state").notNull().default("closed"),
  successRate: real("success_rate").notNull().default(100),
  avgResponseMs: real("avg_response_ms").notNull().default(0),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  consecutiveHealthChecks: integer("consecutive_health_checks").notNull().default(0),
  consecutiveSuccesses: integer("consecutive_successes").notNull().default(0),
  lastHealthCheck: timestamp("last_health_check"),
  stateChangedAt: timestamp("state_changed_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  headers: jsonb("headers").notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  signatureValid: boolean("signature_valid").notNull(),
  providerEventId: text("provider_event_id"),
  source: eventSourceEnum("source").notNull().default("webhook"),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  endpointId: uuid("endpoint_id").references(() => endpoints.id),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  responseBody: text("response_body"),
  errorType: errorTypeEnum("error_type"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  nextRetryAt: timestamp("next_retry_at"),
});

export const replayQueue = pgTable("replay_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id")
    .notNull()
    .references(() => endpoints.id),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  position: integer("position").notNull(),
  correlationKey: text("correlation_key"),
  status: replayStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

export const reconciliationRuns = pgTable("reconciliation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  providerEventsFound: integer("provider_events_found").notNull().default(0),
  hookwiseEventsFound: integer("hookwise_events_found").notNull().default(0),
  gapsDetected: integer("gaps_detected").notNull().default(0),
  gapsResolved: integer("gaps_resolved").notNull().default(0),
  ranAt: timestamp("ran_at").notNull().defaultNow(),
});

export const transformations = pgTable("transformations", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  eventType: text("event_type").notNull(),
  rules: jsonb("rules").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const patterns = pgTable("patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  metricName: text("metric_name").notNull(),
  rollingAvg: real("rolling_avg").notNull(),
  rollingStddev: real("rolling_stddev").notNull(),
  sampleCount: integer("sample_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const anomalies = pgTable("anomalies", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  type: anomalyTypeEnum("type").notNull(),
  severity: anomalySeverityEnum("severity").notNull(),
  diagnosis: text("diagnosis"),
  context: jsonb("context"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const flows = pgTable("flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  steps: jsonb("steps").notNull(),
  timeoutMinutes: integer("timeout_minutes").notNull().default(60),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flowInstances = pgTable("flow_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowId: uuid("flow_id")
    .notNull()
    .references(() => flows.id),
  correlationKey: text("correlation_key").notNull(),
  status: flowInstanceStatusEnum("status").notNull().default("running"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const payloadSchemas = pgTable("payload_schemas", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  eventType: text("event_type").notNull(),
  jsonSchema: jsonb("json_schema").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const alertConfigs = pgTable("alert_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => integrations.id),
  channel: alertChannelEnum("channel").notNull(),
  destination: text("destination").notNull(),
  threshold: real("threshold"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const intelligenceReports = pgTable("intelligence_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  report: jsonb("report").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;
export type ReplayQueueItem = typeof replayQueue.$inferSelect;
export type NewReplayQueueItem = typeof replayQueue.$inferInsert;
export type ReconciliationRun = typeof reconciliationRuns.$inferSelect;
export type Transformation = typeof transformations.$inferSelect;
export type Anomaly = typeof anomalies.$inferSelect;
export type Pattern = typeof patterns.$inferSelect;
export type AlertConfig = typeof alertConfigs.$inferSelect;
