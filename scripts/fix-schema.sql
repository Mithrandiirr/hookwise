-- Fix missing columns across all tables
-- Safe to run multiple times (uses IF NOT EXISTS / exception handling)

-- Create missing enums (if not exists)
DO $$ BEGIN CREATE TYPE "public"."audit_action" AS ENUM('event.received', 'event.delivered', 'event.failed', 'event.replayed', 'circuit.opened', 'circuit.closed', 'circuit.half_open', 'integration.created', 'integration.updated', 'integration.deleted', 'scan.completed', 'export.created'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."compliance_format" AS ENUM('json', 'csv'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."security_scan_type" AS ENUM('signature', 'timestamp', 'replay', 'injection', 'full'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."vulnerability_type" AS ENUM('invalid_signature_accepted', 'expired_timestamp_accepted', 'replay_accepted', 'injection_vulnerable', 'missing_signature_check', 'missing_timestamp_check'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."alert_channel" AS ENUM('email', 'slack'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."flow_instance_status" AS ENUM('running', 'completed', 'failed', 'timed_out'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- integrations: add columns from later sprints
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "api_key_encrypted" text;
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "destination_type" text NOT NULL DEFAULT 'http';
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "idempotency_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "sequencer_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "enrichment_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

-- endpoints: add columns from later sprints
ALTER TABLE "endpoints" ADD COLUMN IF NOT EXISTS "consecutive_health_checks" integer NOT NULL DEFAULT 0;
ALTER TABLE "endpoints" ADD COLUMN IF NOT EXISTS "consecutive_successes" integer NOT NULL DEFAULT 0;
ALTER TABLE "endpoints" ADD COLUMN IF NOT EXISTS "state_changed_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "endpoints" ADD COLUMN IF NOT EXISTS "health_score" real NOT NULL DEFAULT 100;

-- events: add columns from later sprints
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source" "event_source" NOT NULL DEFAULT 'webhook';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "amount_cents" integer;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "enriched_payload" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "sequence_position" integer;

-- deliveries: add columns from later sprints
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "error_type" "error_type";
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "attempt_number" integer NOT NULL DEFAULT 1;
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "next_retry_at" timestamp;
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "delivery_type" text NOT NULL DEFAULT 'initial';

-- Create tables that may not exist yet

-- audit_log
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "integration_id" uuid,
  "event_id" uuid,
  "action" "audit_action" NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "integrity_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- compliance_exports
CREATE TABLE IF NOT EXISTS "compliance_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "format" "compliance_format" NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "file_url" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- security_scans
CREATE TABLE IF NOT EXISTS "security_scans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "endpoint_id" uuid NOT NULL REFERENCES "endpoints"("id"),
  "scan_type" "security_scan_type" NOT NULL,
  "findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "score" real DEFAULT 100 NOT NULL,
  "scanned_at" timestamp DEFAULT now() NOT NULL
);

-- security_findings
CREATE TABLE IF NOT EXISTS "security_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scan_id" uuid NOT NULL REFERENCES "security_scans"("id"),
  "vulnerability_type" "vulnerability_type" NOT NULL,
  "severity" "anomaly_severity" NOT NULL,
  "description" text NOT NULL,
  "remediation" text NOT NULL
);

-- alert_configs
CREATE TABLE IF NOT EXISTS "alert_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id"),
  "channel" "alert_channel" NOT NULL,
  "destination" text NOT NULL,
  "threshold" real,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- intelligence_reports
CREATE TABLE IF NOT EXISTS "intelligence_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "report" jsonb NOT NULL,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- idempotency_log
CREATE TABLE IF NOT EXISTS "idempotency_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id"),
  "provider_event_id" text NOT NULL,
  "first_seen_at" timestamp DEFAULT now() NOT NULL,
  "delivery_count" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'delivered' NOT NULL
);

-- sequencer_rules
CREATE TABLE IF NOT EXISTS "sequencer_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id"),
  "event_order" jsonb NOT NULL,
  "hold_timeout_ms" integer DEFAULT 30000 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL
);

-- flows
CREATE TABLE IF NOT EXISTS "flows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "steps" jsonb NOT NULL,
  "timeout_minutes" integer DEFAULT 60 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- flow_instances
CREATE TABLE IF NOT EXISTS "flow_instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "flow_id" uuid NOT NULL REFERENCES "flows"("id"),
  "correlation_key" text NOT NULL,
  "status" "flow_instance_status" DEFAULT 'running' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);

-- payload_schemas
CREATE TABLE IF NOT EXISTS "payload_schemas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id"),
  "event_type" text NOT NULL,
  "json_schema" jsonb NOT NULL,
  "last_updated" timestamp DEFAULT now() NOT NULL
);

-- provider_health (Sprint 6)
CREATE TABLE IF NOT EXISTS "provider_health" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "provider" NOT NULL,
  "metric_name" text NOT NULL,
  "value" real NOT NULL,
  "sample_size" integer DEFAULT 0 NOT NULL,
  "measured_at" timestamp DEFAULT now() NOT NULL
);

-- benchmarks (Sprint 6)
CREATE TABLE IF NOT EXISTS "benchmarks" (
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
