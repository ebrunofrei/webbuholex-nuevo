-- 1. Create logical role (no login)
CREATE ROLE jurisprudence_public_read_runtime NOLOGIN;
--> statement-breakpoint

-- 2. Create physical login role (Runtime Identity)
CREATE ROLE jurisprudence_public_read_login WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
--> statement-breakpoint

-- 3. Grant runtime logical role to physical login
GRANT jurisprudence_public_read_runtime TO jurisprudence_public_read_login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;
--> statement-breakpoint

-- 4. Create public schema
CREATE SCHEMA IF NOT EXISTS "jurisprudence_public";
--> statement-breakpoint

-- 5. Create materialized public projection table
CREATE TABLE IF NOT EXISTS "jurisprudence_public"."published_records" (
	"id" varchar PRIMARY KEY NOT NULL,
	"record_version" integer NOT NULL,
	"slug" varchar,
	"title" varchar NOT NULL,
	"case_title" varchar NOT NULL,
	"case_number" varchar NOT NULL,
	"resolution_number" varchar NOT NULL,
	"resolution_type" varchar NOT NULL,
	"institution_name" varchar NOT NULL,
	"issuing_body" varchar NOT NULL,
	"matter" varchar NOT NULL,
	"issued_at" date NOT NULL,
	"summary" varchar,
	"source_name" varchar NOT NULL,
	"normalized_search_text" varchar NOT NULL,
	"search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('spanish', normalized_search_text)) STORED,
	CONSTRAINT "published_records_slug_unique" UNIQUE("slug"),
	CONSTRAINT "published_record_version_positive" CHECK ("record_version" > 0)
);
--> statement-breakpoint

-- 6. Create indexes for public search and exact lookup
CREATE INDEX IF NOT EXISTS "published_records_case_idx" ON "jurisprudence_public"."published_records" USING btree ("case_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "published_records_resolution_idx" ON "jurisprudence_public"."published_records" USING btree ("resolution_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "published_records_issued_at_idx" ON "jurisprudence_public"."published_records" USING btree ("issued_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "published_records_fts_gin_idx" ON "jurisprudence_public"."published_records" USING gin ("search_vector");
--> statement-breakpoint

-- 7. Revoke public access to internal schema
REVOKE ALL ON SCHEMA jurisprudence_internal FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA jurisprudence_internal FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA jurisprudence_internal FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA jurisprudence_internal FROM PUBLIC;
--> statement-breakpoint

-- 8. Hardening default privileges for internal schema
ALTER DEFAULT PRIVILEGES IN SCHEMA jurisprudence_internal REVOKE ALL ON TABLES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA jurisprudence_internal REVOKE ALL ON SEQUENCES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA jurisprudence_internal REVOKE ALL ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint

-- 9. Grant minimal privileges to runtime role
GRANT USAGE ON SCHEMA jurisprudence_public TO jurisprudence_public_read_runtime;
--> statement-breakpoint
GRANT SELECT ON jurisprudence_public.published_records TO jurisprudence_public_read_runtime;
