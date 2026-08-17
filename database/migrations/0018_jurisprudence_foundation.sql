CREATE SCHEMA IF NOT EXISTS "jurisprudence_internal";

CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_records" (
	"id" varchar PRIMARY KEY NOT NULL,
	"slug" varchar,
	"record_version" integer NOT NULL,
	"deduplication_key" varchar NOT NULL,
	"source_type" varchar NOT NULL,
	"source_document_id" varchar,
	"normalized_case_number" varchar NOT NULL,
	"normalized_resolution_number" varchar NOT NULL,
	"institution_id" varchar NOT NULL,
	"normalized_matter" varchar NOT NULL,
	"normalized_search_text" varchar NOT NULL,
	"search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('spanish', normalized_search_text)) STORED,
	"issued_at" date NOT NULL,
	"editorial_status" varchar NOT NULL,
	"publication_status" varchar NOT NULL,
	"verification_status" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_json" jsonb NOT NULL,
	CONSTRAINT "jurisprudence_records_slug_unique" UNIQUE("slug"),
	CONSTRAINT "jurisprudence_records_deduplication_key_unique" UNIQUE("deduplication_key"),
	CONSTRAINT "record_version_positive" CHECK ("record_version" > 0)
);

CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_record_versions" (
	"record_id" varchar NOT NULL,
	"version" integer NOT NULL,
	"change_kind" varchar NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	CONSTRAINT "jurisprudence_record_versions_pk" UNIQUE("record_id","version"),
	CONSTRAINT "version_positive" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_idempotency" (
	"idempotency_key" varchar PRIMARY KEY NOT NULL,
	"input_json" jsonb NOT NULL,
	"record_id" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_record_versions" ADD CONSTRAINT "jurisprudence_record_versions_record_id_jurisprudence_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "jurisprudence_internal"."jurisprudence_records"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_idempotency" ADD CONSTRAINT "jurisprudence_idempotency_record_id_jurisprudence_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "jurisprudence_internal"."jurisprudence_records"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "jurisprudence_records_source_document_idx" ON "jurisprudence_internal"."jurisprudence_records" USING btree ("source_type","source_document_id");
CREATE INDEX IF NOT EXISTS "jurisprudence_records_case_idx" ON "jurisprudence_internal"."jurisprudence_records" USING btree ("normalized_case_number");
CREATE INDEX IF NOT EXISTS "jurisprudence_records_resolution_idx" ON "jurisprudence_internal"."jurisprudence_records" USING btree ("normalized_resolution_number");
CREATE INDEX IF NOT EXISTS "jurisprudence_records_institution_matter_date_idx" ON "jurisprudence_internal"."jurisprudence_records" USING btree ("institution_id","normalized_matter","issued_at","id");
CREATE INDEX IF NOT EXISTS "jurisprudence_records_status_idx" ON "jurisprudence_internal"."jurisprudence_records" USING btree ("editorial_status","publication_status","verification_status","updated_at","id");
CREATE INDEX IF NOT EXISTS "jurisprudence_records_fts_gin_idx" ON "jurisprudence_internal"."jurisprudence_records" USING gin ("search_vector");
