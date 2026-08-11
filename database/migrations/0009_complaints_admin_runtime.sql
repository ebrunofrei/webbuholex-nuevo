DO $$ BEGIN
  CREATE ROLE complaints_admin_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE complaints_admin_login LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT complaints_admin_runtime TO complaints_admin_login WITH ADMIN FALSE, INHERIT FALSE, SET TRUE;

GRANT USAGE ON SCHEMA complaints_private TO complaints_admin_runtime;

GRANT SELECT (id, status) ON complaints_private.complaints TO complaints_admin_runtime;
GRANT UPDATE (status, updated_at) ON complaints_private.complaints TO complaints_admin_runtime;

GRANT SELECT (id, complaint_id, version) ON complaints_private.complaint_provider_responses TO complaints_admin_runtime;
GRANT INSERT (
  complaint_id,
  version,
  response_text,
  actions_taken,
  responded_at,
  response_channel,
  responder_name,
  responder_role
) ON complaints_private.complaint_provider_responses TO complaints_admin_runtime;

GRANT INSERT (
  complaint_id,
  from_status,
  to_status,
  changed_by
) ON complaints_private.complaint_status_history TO complaints_admin_runtime;

GRANT INSERT (
  complaint_id,
  event_type,
  metadata,
  created_by
) ON complaints_private.complaint_audit_events TO complaints_admin_runtime;

GRANT INSERT (
  complaint_id,
  event_type,
  payload
) ON complaints_private.complaint_outbox TO complaints_admin_runtime;
