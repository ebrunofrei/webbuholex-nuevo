-- 0004_complaints_runtime_column_privileges.sql
-- 1. Grant missing column privileges for reserveAnnualSequence
GRANT INSERT (created_at, updated_at) ON complaints_private.complaint_sequences TO complaints_api_runtime;

--> statement-breakpoint
-- 2. Revoke table-wide INSERT from complaints and replace with column-level
REVOKE INSERT ON complaints_private.complaints FROM complaints_api_runtime;

--> statement-breakpoint
GRANT INSERT (
  id,
  schema_version,
  sheet_year,
  sheet_sequence,
  sheet_number,
  private_token_hash,
  token_hash_key_version,
  idempotency_key_hash,
  idempotency_hash_key_version,
  payload_hash,
  status,
  submitted_at,
  deadline_at,
  version,
  payload_snapshot,
  created_at,
  updated_at
) ON complaints_private.complaints TO complaints_api_runtime;

--> statement-breakpoint
-- 3. Revoke table-wide INSERT from complaint_status_history and replace with column-level
REVOKE INSERT ON complaints_private.complaint_status_history FROM complaints_api_runtime;

--> statement-breakpoint
GRANT INSERT (
  id,
  complaint_id,
  to_status,
  changed_at,
  changed_by
) ON complaints_private.complaint_status_history TO complaints_api_runtime;

--> statement-breakpoint
-- 4. Revoke table-wide INSERT from complaint_audit_events and replace with column-level
REVOKE INSERT ON complaints_private.complaint_audit_events FROM complaints_api_runtime;

--> statement-breakpoint
GRANT INSERT (
  id,
  complaint_id,
  event_type,
  created_at,
  created_by
) ON complaints_private.complaint_audit_events TO complaints_api_runtime;

--> statement-breakpoint
-- 5. Revoke table-wide INSERT from complaint_outbox and replace with column-level
REVOKE INSERT ON complaints_private.complaint_outbox FROM complaints_api_runtime;

--> statement-breakpoint
GRANT INSERT (
  id,
  complaint_id,
  event_type,
  payload,
  status,
  attempts,
  available_at,
  created_at,
  updated_at
) ON complaints_private.complaint_outbox TO complaints_api_runtime;
