CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" varchar NOT NULL,
	"record_version" integer NOT NULL,
	"execution_id" varchar NOT NULL,
	"execution_version" integer NOT NULL,
	"event_type" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error_code" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_positive" CHECK ("jurisprudence_internal"."jurisprudence_publication_outbox"."attempts" >= 0),
	CONSTRAINT "valid_event_type" CHECK ("jurisprudence_internal"."jurisprudence_publication_outbox"."event_type" IN ('publish_projection', 'withdraw_projection')),
	CONSTRAINT "valid_status" CHECK ("jurisprudence_internal"."jurisprudence_publication_outbox"."status" IN ('pending', 'processing', 'sent', 'failed', 'dead_letter'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_outbox" ADD CONSTRAINT "jurisprudence_publication_outbox_record_id_jurisprudence_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "jurisprudence_internal"."jurisprudence_records"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_outbox" ADD CONSTRAINT "jurisprudence_publication_outbox_execution_id_jurisprudence_publication_executions_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "jurisprudence_internal"."jurisprudence_publication_executions"("execution_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudence_publication_outbox_status_available_idx" ON "jurisprudence_internal"."jurisprudence_publication_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudence_publication_outbox_record_idx" ON "jurisprudence_internal"."jurisprudence_publication_outbox" USING btree ("record_id","record_version");

--> statement-breakpoint
-- CREATE RUNTIME AND LOGIN ROLE
DO $$ BEGIN
  CREATE ROLE jurisprudence_publication_outbox_runtime NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE jurisprudence_publication_outbox_login LOGIN NOINHERIT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT jurisprudence_publication_outbox_runtime TO jurisprudence_publication_outbox_login;

-- LEAST PRIVILEGE: SELECT and UPDATE to the outbox processor
GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_publication_outbox_runtime;
GRANT SELECT, UPDATE ON jurisprudence_internal.jurisprudence_publication_outbox TO jurisprudence_publication_outbox_runtime;

-- Note: The publisher command runtime will need INSERT privileges to the outbox. This will be granted later when the pipeline is integrated.
