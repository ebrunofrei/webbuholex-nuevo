CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_executions" (
	"execution_id" varchar PRIMARY KEY NOT NULL,
	"record_id" varchar NOT NULL,
	"record_version" integer NOT NULL,
	"editorial_case_id" varchar NOT NULL,
	"publication_dossier_id" varchar NOT NULL,
	"authorization_case_id" varchar NOT NULL,
	"projection_id" varchar NOT NULL,
	"status" varchar NOT NULL,
	"version" integer NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"executed_by_reference" varchar NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"withdrawal_reason" varchar,
	"superseded_at" timestamp with time zone,
	"superseded_by_record_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publication_executed" boolean NOT NULL,
	"deployed" boolean NOT NULL,
	CONSTRAINT "publication_execution_version_positive" CHECK ("version" > 0),
	CONSTRAINT "publication_execution_record_version_positive" CHECK ("record_version" > 0),
	CONSTRAINT "publication_execution_deployed_false" CHECK ("deployed" = false)
);

CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_execution_events" (
	"event_id" varchar PRIMARY KEY NOT NULL,
	"execution_id" varchar NOT NULL,
	"record_id" varchar NOT NULL,
	"record_version" integer NOT NULL,
	"execution_version" integer NOT NULL,
	"sequence" integer NOT NULL,
	"type" varchar NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payload_json" jsonb NOT NULL,
	CONSTRAINT "jurisprudence_pub_exec_events_seq_unique" UNIQUE("execution_id","sequence"),
	CONSTRAINT "pub_exec_event_record_version_positive" CHECK ("record_version" > 0),
	CONSTRAINT "pub_exec_event_exec_version_positive" CHECK ("execution_version" > 0),
	CONSTRAINT "pub_exec_event_sequence_positive" CHECK ("sequence" > 0)
);

CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_idempotency" (
	"idempotency_key" varchar PRIMARY KEY NOT NULL,
	"command_fingerprint" varchar NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_executions" ADD CONSTRAINT "jurisprudence_publication_executions_record_id_jurisprudence_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "jurisprudence_internal"."jurisprudence_records"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_execution_events" ADD CONSTRAINT "jurisprudence_publication_execution_events_execution_id_jurisprudence_publication_executions_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "jurisprudence_internal"."jurisprudence_publication_executions"("execution_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_execution_events" ADD CONSTRAINT "jurisprudence_publication_execution_events_record_id_jurisprudence_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "jurisprudence_internal"."jurisprudence_records"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "jurisprudence_pub_exec_record_version_idx" ON "jurisprudence_internal"."jurisprudence_publication_executions" USING btree ("record_id","record_version");
CREATE INDEX IF NOT EXISTS "jurisprudence_pub_exec_status_idx" ON "jurisprudence_internal"."jurisprudence_publication_executions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "jurisprudence_pub_exec_events_record_idx" ON "jurisprudence_internal"."jurisprudence_publication_execution_events" USING btree ("record_id");
