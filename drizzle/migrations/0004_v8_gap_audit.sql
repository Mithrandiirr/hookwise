CREATE TYPE "public"."audit_status" AS ENUM('running', 'complete');--> statement-breakpoint
CREATE TYPE "public"."integration_mode" AS ENUM('audit', 'monitor');--> statement-breakpoint
CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"status" "audit_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp NOT NULL,
	"share_token" text NOT NULL,
	"brand_name" text,
	"desired_provider" text,
	"report" jsonb,
	"report_generated_at" timestamp,
	CONSTRAINT "audits_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "mode" "integration_mode" DEFAULT 'monitor' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "desired_provider" text;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;