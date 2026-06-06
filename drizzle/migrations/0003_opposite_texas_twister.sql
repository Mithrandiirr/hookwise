CREATE TYPE "public"."backfill_status" AS ENUM('pending', 'running', 'complete', 'failed');--> statement-breakpoint
ALTER TYPE "public"."event_source" ADD VALUE 'onboarding_backfill';--> statement-breakpoint
CREATE TABLE "backfill_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"status" "backfill_status" DEFAULT 'pending' NOT NULL,
	"scanned" integer DEFAULT 0 NOT NULL,
	"total_estimate" integer DEFAULT 0 NOT NULL,
	"window_days" integer NOT NULL,
	"max_events" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"summary" jsonb,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "backfill_runs" ADD CONSTRAINT "backfill_runs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;