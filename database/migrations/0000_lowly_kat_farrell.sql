CREATE SCHEMA "complaints_private";
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaint_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"event_type" varchar NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaint_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"body" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar NOT NULL,
	"supersedes_note_id" uuid,
	"correction_reason" varchar,
	CONSTRAINT "body_not_empty" CHECK (length(trim("complaints_private"."complaint_internal_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaint_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
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
	CONSTRAINT "attempts_positive" CHECK ("complaints_private"."complaint_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaint_provider_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"supersedes_response_id" uuid,
	"correction_reason" varchar,
	"response_text" varchar,
	"actions_taken" varchar,
	"responded_at" timestamp with time zone NOT NULL,
	"response_channel" varchar NOT NULL,
	"responder_name" varchar NOT NULL,
	"responder_role" varchar NOT NULL,
	"delivery_evidence_reference" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_provider_responses_comp_ver_idx" UNIQUE("complaint_id","version"),
	CONSTRAINT "version_positive" CHECK ("complaints_private"."complaint_provider_responses"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaint_sequences" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "year_range" CHECK ("complaints_private"."complaint_sequences"."year" >= 2000 AND "complaints_private"."complaint_sequences"."year" <= 2100),
	CONSTRAINT "last_value_positive" CHECK ("complaints_private"."complaint_sequences"."last_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaint_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"from_status" varchar,
	"to_status" varchar NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" varchar NOT NULL,
	"reason" varchar,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "complaints_private"."complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_version" varchar NOT NULL,
	"sheet_year" integer NOT NULL,
	"sheet_sequence" integer NOT NULL,
	"sheet_number" varchar NOT NULL,
	"private_token_hash" varchar NOT NULL,
	"token_hash_key_version" integer NOT NULL,
	"idempotency_key_hash" varchar NOT NULL,
	"idempotency_hash_key_version" integer NOT NULL,
	"payload_hash" varchar NOT NULL,
	"status" varchar NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"deadline_at" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"payload_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "complaints_sheet_number_unique" UNIQUE("sheet_number"),
	CONSTRAINT "complaints_idempotency_key_hash_unique" UNIQUE("idempotency_key_hash"),
	CONSTRAINT "complaints_year_seq_idx" UNIQUE("sheet_year","sheet_sequence"),
	CONSTRAINT "token_hash_key_version_positive" CHECK ("complaints_private"."complaints"."token_hash_key_version" > 0),
	CONSTRAINT "idempotency_hash_key_version_positive" CHECK ("complaints_private"."complaints"."idempotency_hash_key_version" > 0),
	CONSTRAINT "version_positive" CHECK ("complaints_private"."complaints"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_audit_events" ADD CONSTRAINT "complaint_audit_events_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "complaints_private"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_internal_notes" ADD CONSTRAINT "complaint_internal_notes_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "complaints_private"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_internal_notes" ADD CONSTRAINT "complaint_internal_notes_supersedes_note_id_complaint_internal_notes_id_fk" FOREIGN KEY ("supersedes_note_id") REFERENCES "complaints_private"."complaint_internal_notes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_outbox" ADD CONSTRAINT "complaint_outbox_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "complaints_private"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_provider_responses" ADD CONSTRAINT "complaint_provider_responses_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "complaints_private"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_provider_responses" ADD CONSTRAINT "complaint_provider_responses_supersedes_response_id_complaint_provider_responses_id_fk" FOREIGN KEY ("supersedes_response_id") REFERENCES "complaints_private"."complaint_provider_responses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "complaints_private"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_audit_events_comp_created_idx" ON "complaints_private"."complaint_audit_events" USING btree ("complaint_id","created_at");--> statement-breakpoint
CREATE INDEX "complaint_internal_notes_comp_created_idx" ON "complaints_private"."complaint_internal_notes" USING btree ("complaint_id","created_at");--> statement-breakpoint
CREATE INDEX "complaint_outbox_status_available_idx" ON "complaints_private"."complaint_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "complaint_provider_responses_comp_created_idx" ON "complaints_private"."complaint_provider_responses" USING btree ("complaint_id","created_at");--> statement-breakpoint
CREATE INDEX "complaint_status_history_comp_changed_idx" ON "complaints_private"."complaint_status_history" USING btree ("complaint_id","changed_at");
--> statement-breakpoint
-- Revocar acceso público al esquema
REVOKE ALL ON SCHEMA "complaints_private" FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "complaints_private" FROM PUBLIC;
--> statement-breakpoint
-- Triggers para append-only
CREATE OR REPLACE FUNCTION "complaints_private".prevent_update_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table is append-only. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER prevent_update_delete_audit_events
BEFORE UPDATE OR DELETE ON "complaints_private"."complaint_audit_events"
FOR EACH ROW EXECUTE FUNCTION "complaints_private".prevent_update_delete();
--> statement-breakpoint
CREATE TRIGGER prevent_update_delete_internal_notes
BEFORE UPDATE OR DELETE ON "complaints_private"."complaint_internal_notes"
FOR EACH ROW EXECUTE FUNCTION "complaints_private".prevent_update_delete();
--> statement-breakpoint
CREATE TRIGGER prevent_update_delete_provider_responses
BEFORE UPDATE OR DELETE ON "complaints_private"."complaint_provider_responses"
FOR EACH ROW EXECUTE FUNCTION "complaints_private".prevent_update_delete();
--> statement-breakpoint
CREATE TRIGGER prevent_update_delete_status_history
BEFORE UPDATE OR DELETE ON "complaints_private"."complaint_status_history"
FOR EACH ROW EXECUTE FUNCTION "complaints_private".prevent_update_delete();
--> statement-breakpoint
-- Trigger para inmutabilidad de payload_snapshot
CREATE OR REPLACE FUNCTION "complaints_private".prevent_payload_snapshot_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payload_snapshot <> OLD.payload_snapshot THEN
    RAISE EXCEPTION 'payload_snapshot is immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER prevent_payload_snapshot_update_complaints
BEFORE UPDATE ON "complaints_private"."complaints"
FOR EACH ROW EXECUTE FUNCTION "complaints_private".prevent_payload_snapshot_update();