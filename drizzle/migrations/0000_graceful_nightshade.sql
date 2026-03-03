CREATE TYPE "public"."alert_channel" AS ENUM('email', 'slack');--> statement-breakpoint
CREATE TYPE "public"."anomaly_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."anomaly_type" AS ENUM('response_time_spike', 'failure_surge', 'source_silence', 'volume_spike', 'volume_drop', 'new_event_type', 'payload_anomaly');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('event.received', 'event.delivered', 'event.failed', 'event.replayed', 'circuit.opened', 'circuit.closed', 'circuit.half_open', 'integration.created', 'integration.updated', 'integration.deleted', 'scan.completed', 'export.created');--> statement-breakpoint
CREATE TYPE "public"."circuit_state" AS ENUM('closed', 'half_open', 'open');--> statement-breakpoint
CREATE TYPE "public"."compliance_format" AS ENUM('json', 'csv');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'delivered', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."error_type" AS ENUM('timeout', 'server_error', 'rate_limit', 'ssl', 'connection_refused', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('webhook', 'reconciliation', 'enrichment');--> statement-breakpoint
CREATE TYPE "public"."flow_instance_status" AS ENUM('running', 'completed', 'failed', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('stripe', 'shopify', 'github');--> statement-breakpoint
CREATE TYPE "public"."replay_status" AS ENUM('pending', 'delivering', 'delivered', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."security_scan_type" AS ENUM('signature', 'timestamp', 'replay', 'injection', 'full');--> statement-breakpoint
CREATE TYPE "public"."vulnerability_type" AS ENUM('invalid_signature_accepted', 'expired_timestamp_accepted', 'replay_accepted', 'injection_vulnerable', 'missing_signature_check', 'missing_timestamp_check');--> statement-breakpoint
CREATE TABLE "alert_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"channel" "alert_channel" NOT NULL,
	"destination" text NOT NULL,
	"threshold" real,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"type" "anomaly_type" NOT NULL,
	"severity" "anomaly_severity" NOT NULL,
	"diagnosis" jsonb,
	"context" jsonb,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"integration_id" uuid,
	"event_id" uuid,
	"action" "audit_action" NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"integrity_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "provider" NOT NULL,
	"event_type" text NOT NULL,
	"p50_latency" real NOT NULL,
	"p95_latency" real NOT NULL,
	"failure_rate" real NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"period" text DEFAULT '5m' NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"format" "compliance_format" NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"file_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"endpoint_id" uuid,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response_time_ms" integer,
	"response_body" text,
	"error_type" "error_type",
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"next_retry_at" timestamp,
	"idempotency_key" text,
	"delivery_type" text DEFAULT 'initial' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"url" text NOT NULL,
	"circuit_state" "circuit_state" DEFAULT 'closed' NOT NULL,
	"success_rate" real DEFAULT 100 NOT NULL,
	"avg_response_ms" real DEFAULT 0 NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"consecutive_health_checks" integer DEFAULT 0 NOT NULL,
	"consecutive_successes" integer DEFAULT 0 NOT NULL,
	"last_health_check" timestamp,
	"state_changed_at" timestamp DEFAULT now() NOT NULL,
	"health_score" real DEFAULT 100 NOT NULL,
	CONSTRAINT "endpoints_integration_id_unique" UNIQUE("integration_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"headers" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"signature_valid" boolean NOT NULL,
	"provider_event_id" text,
	"source" "event_source" DEFAULT 'webhook' NOT NULL,
	"amount_cents" integer,
	"enriched_payload" jsonb,
	"sequence_position" integer
);
--> statement-breakpoint
CREATE TABLE "flow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"correlation_key" text NOT NULL,
	"status" "flow_instance_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"steps" jsonb NOT NULL,
	"timeout_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"delivery_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'delivered' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider" "provider" NOT NULL,
	"signing_secret" text NOT NULL,
	"destination_url" text NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"api_key_encrypted" text,
	"destination_type" text DEFAULT 'http' NOT NULL,
	"idempotency_enabled" boolean DEFAULT false NOT NULL,
	"sequencer_enabled" boolean DEFAULT false NOT NULL,
	"enrichment_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"report" jsonb NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"metric_name" text NOT NULL,
	"rolling_avg" real NOT NULL,
	"rolling_stddev" real NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payload_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"json_schema" jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "provider" NOT NULL,
	"metric_name" text NOT NULL,
	"value" real NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"provider_events_found" integer DEFAULT 0 NOT NULL,
	"hookwise_events_found" integer DEFAULT 0 NOT NULL,
	"gaps_detected" integer DEFAULT 0 NOT NULL,
	"gaps_resolved" integer DEFAULT 0 NOT NULL,
	"ran_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"correlation_key" text,
	"status" "replay_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "security_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"vulnerability_type" "vulnerability_type" NOT NULL,
	"severity" "anomaly_severity" NOT NULL,
	"description" text NOT NULL,
	"remediation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"scan_type" "security_scan_type" NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" real DEFAULT 100 NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequencer_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"event_order" jsonb NOT NULL,
	"hold_timeout_ms" integer DEFAULT 30000 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transformations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"rules" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_instances" ADD CONSTRAINT "flow_instances_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_log" ADD CONSTRAINT "idempotency_log_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payload_schemas" ADD CONSTRAINT "payload_schemas_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_queue" ADD CONSTRAINT "replay_queue_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_queue" ADD CONSTRAINT "replay_queue_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_scan_id_security_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."security_scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_scans" ADD CONSTRAINT "security_scans_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequencer_rules" ADD CONSTRAINT "sequencer_rules_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transformations" ADD CONSTRAINT "transformations_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;