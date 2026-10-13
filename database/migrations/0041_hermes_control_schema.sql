-- Migration 0041: Hermes Control Foundation Schema & Security Grants
-- Creates hermes_control schema, 6 control tables, constraints, indexes, and least-privilege runtime role

CREATE SCHEMA IF NOT EXISTS "hermes_control";
--> statement-breakpoint

-- 1. Table: subject_identities
CREATE TABLE IF NOT EXISTS "hermes_control"."subject_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_subject_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_identities_provider_subject_uniq" UNIQUE("provider","provider_subject_id"),
	CONSTRAINT "subject_identities_provider_check" CHECK ("provider" IN ('auth0'))
);
--> statement-breakpoint

-- 2. Table: subject_entitlements
CREATE TABLE IF NOT EXISTS "hermes_control"."subject_entitlements" (
	"subject_id" uuid PRIMARY KEY NOT NULL,
	"plan_tier" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"monthly_quota" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_entitlements_monthly_quota_check" CHECK ("monthly_quota" >= 0),
	CONSTRAINT "subject_entitlements_period_check" CHECK ("period_end" > "period_start"),
	CONSTRAINT "subject_entitlements_status_check" CHECK ("status" IN ('active', 'suspended', 'expired'))
);
--> statement-breakpoint

-- 3. Table: subject_quota_usage
CREATE TABLE IF NOT EXISTS "hermes_control"."subject_quota_usage" (
	"subject_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"reserved_units" integer DEFAULT 0 NOT NULL,
	"committed_units" integer DEFAULT 0 NOT NULL,
	"pending_units" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_quota_usage_pk" PRIMARY KEY("subject_id","period_start","period_end"),
	CONSTRAINT "subject_quota_usage_non_negative" CHECK ("reserved_units" >= 0 AND "committed_units" >= 0 AND "pending_units" >= 0)
);
--> statement-breakpoint

-- 4. Table: analysis_operations
CREATE TABLE IF NOT EXISTS "hermes_control"."analysis_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"record_id" varchar(64) NOT NULL,
	"record_version" integer NOT NULL,
	"status" varchar(32) DEFAULT 'reserved' NOT NULL,
	"platform_cost_status" varchar(32) DEFAULT 'none' NOT NULL,
	"user_quota_status" varchar(32) DEFAULT 'reserved' NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reserved_expires_at" timestamp with time zone NOT NULL,
	"dispatch_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_operations_subject_idempotency_key_uniq" UNIQUE("subject_id","idempotency_key"),
	CONSTRAINT "analysis_operations_units_check" CHECK ("units" >= 1),
	CONSTRAINT "analysis_operations_record_version_check" CHECK ("record_version" > 0),
	CONSTRAINT "analysis_operations_status_check" CHECK ("status" IN ('reserved', 'released', 'expired_before_dispatch', 'provider_dispatch_started', 'completed_success', 'completed_validation_failure', 'completed_grounding_failure', 'outcome_unknown')),
	CONSTRAINT "analysis_operations_platform_cost_status_check" CHECK ("platform_cost_status" IN ('none', 'indeterminate', 'assumed_incurred')),
	CONSTRAINT "analysis_operations_user_quota_status_check" CHECK ("user_quota_status" IN ('unreserved', 'reserved', 'committed', 'policy_pending', 'released'))
);
--> statement-breakpoint

-- 5. Table: concurrency_leases
CREATE TABLE IF NOT EXISTS "hermes_control"."concurrency_leases" (
	"lease_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "concurrency_leases_subject_id_uniq" UNIQUE("subject_id"),
	CONSTRAINT "concurrency_leases_operation_id_uniq" UNIQUE("operation_id")
);
--> statement-breakpoint

-- 6. Table: provider_daily_usage
CREATE TABLE IF NOT EXISTS "hermes_control"."provider_daily_usage" (
	"day_utc" date NOT NULL,
	"feature" varchar(32) NOT NULL,
	"call_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_daily_usage_pk" PRIMARY KEY("day_utc","feature"),
	CONSTRAINT "provider_daily_usage_call_count_check" CHECK ("call_count" >= 0),
	CONSTRAINT "provider_daily_usage_feature_check" CHECK ("feature" IN ('jurisprudence_interpretation'))
);
--> statement-breakpoint

-- Foreign Keys (ON DELETE RESTRICT)
DO $$ BEGIN
 ALTER TABLE "hermes_control"."subject_entitlements" ADD CONSTRAINT "subject_entitlements_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "hermes_control"."subject_identities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hermes_control"."subject_quota_usage" ADD CONSTRAINT "subject_quota_usage_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "hermes_control"."subject_identities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hermes_control"."analysis_operations" ADD CONSTRAINT "analysis_operations_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "hermes_control"."subject_identities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hermes_control"."concurrency_leases" ADD CONSTRAINT "concurrency_leases_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "hermes_control"."analysis_operations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hermes_control"."concurrency_leases" ADD CONSTRAINT "concurrency_leases_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "hermes_control"."subject_identities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Partial Unique Index for Active Document Deduplication
CREATE UNIQUE INDEX IF NOT EXISTS "analysis_operations_active_doc_idx" ON "hermes_control"."analysis_operations" USING btree ("subject_id","record_id","record_version") WHERE "status" IN ('reserved', 'provider_dispatch_started');
--> statement-breakpoint

-- Concurrency Lease Expiration Index
CREATE INDEX IF NOT EXISTS "concurrency_leases_expires_at_idx" ON "hermes_control"."concurrency_leases" USING btree ("expires_at");
--> statement-breakpoint

-- Security Foundation: Runtime Role & Least-Privilege Grants
DO $$ BEGIN
  CREATE ROLE hermes_control_runtime NOLOGIN NOINHERIT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE ROLE hermes_control_login LOGIN NOINHERIT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

GRANT hermes_control_runtime TO hermes_control_login;
--> statement-breakpoint

GRANT USAGE ON SCHEMA hermes_control TO hermes_control_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT ON TABLE "hermes_control"."subject_identities" TO hermes_control_runtime;
--> statement-breakpoint

GRANT SELECT ON TABLE "hermes_control"."subject_entitlements" TO hermes_control_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."subject_quota_usage" TO hermes_control_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."analysis_operations" TO hermes_control_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, DELETE ON TABLE "hermes_control"."concurrency_leases" TO hermes_control_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."provider_daily_usage" TO hermes_control_runtime;
