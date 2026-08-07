-- 1. Create logical roles (no login)
CREATE ROLE complaints_api_runtime NOLOGIN;
--> statement-breakpoint
CREATE ROLE complaints_outbox_worker NOLOGIN;

--> statement-breakpoint
-- 2. Schema privileges
REVOKE ALL ON SCHEMA complaints_private FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA complaints_private TO complaints_api_runtime;
--> statement-breakpoint
GRANT USAGE ON SCHEMA complaints_private TO complaints_outbox_worker;

--> statement-breakpoint
-- 3. API privileges on complaints
GRANT SELECT (
  id,
  sheet_number,
  status,
  submitted_at,
  deadline_at,
  idempotency_key_hash,
  idempotency_hash_key_version
) ON complaints_private.complaints TO complaints_api_runtime;
--> statement-breakpoint
GRANT INSERT ON complaints_private.complaints TO complaints_api_runtime;

--> statement-breakpoint
-- 4. API privileges on sequences
GRANT SELECT (year, last_value) ON complaints_private.complaint_sequences TO complaints_api_runtime;
--> statement-breakpoint
GRANT INSERT (year, last_value) ON complaints_private.complaint_sequences TO complaints_api_runtime;
--> statement-breakpoint
GRANT UPDATE (last_value, updated_at) ON complaints_private.complaint_sequences TO complaints_api_runtime;

--> statement-breakpoint
-- 5. Auxiliary INSERTS for API
GRANT INSERT ON complaints_private.complaint_status_history TO complaints_api_runtime;
--> statement-breakpoint
GRANT INSERT ON complaints_private.complaint_audit_events TO complaints_api_runtime;
--> statement-breakpoint
GRANT INSERT ON complaints_private.complaint_outbox TO complaints_api_runtime;

--> statement-breakpoint
-- 6. Worker privileges on outbox
GRANT SELECT ON complaints_private.complaint_outbox TO complaints_outbox_worker;
--> statement-breakpoint
GRANT UPDATE (
  status,
  attempts,
  available_at,
  processing_started_at,
  processed_at,
  last_error_code,
  updated_at
) ON complaints_private.complaint_outbox TO complaints_outbox_worker;

--> statement-breakpoint
-- 7. Trigger functions hardening
CREATE OR REPLACE FUNCTION complaints_private.prevent_update_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, complaints_private
AS $$
BEGIN
  RAISE EXCEPTION 'Table is append-only. Updates and deletes are not allowed.';
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION complaints_private.prevent_payload_snapshot_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, complaints_private
AS $$
BEGIN
  IF NEW.payload_snapshot <> OLD.payload_snapshot THEN
    RAISE EXCEPTION 'payload_snapshot is immutable.';
  END IF;
  RETURN NEW;
END;
$$;

--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION complaints_private.prevent_update_delete() FROM PUBLIC;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION complaints_private.prevent_payload_snapshot_update() FROM PUBLIC;

--> statement-breakpoint
-- 8. Default privileges hardening (and existing objects)
REVOKE ALL ON ALL TABLES IN SCHEMA complaints_private FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA complaints_private FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA complaints_private FROM PUBLIC;
--> statement-breakpoint

ALTER DEFAULT PRIVILEGES IN SCHEMA complaints_private REVOKE ALL ON TABLES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA complaints_private REVOKE ALL ON SEQUENCES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA complaints_private REVOKE ALL ON FUNCTIONS FROM PUBLIC;

--> statement-breakpoint
-- 9. Environment Marker
CREATE TABLE complaints_private.environment_marker (
    id integer NOT NULL,
    environment varchar NOT NULL,
    project_ref varchar NOT NULL,
    database_name varchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT environment_marker_pkey PRIMARY KEY (id),
    CONSTRAINT env_marker_id_check CHECK (id = 1),
    CONSTRAINT env_marker_env_check CHECK (environment = 'staging')
);
