-- 1. Create Detail Read Runtime Role (no login, no superuser, no createdb, no createrole, no replication, no bypassrls)
CREATE ROLE complaints_admin_detail_read_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

--> statement-breakpoint
-- 2. Create Safe Views

-- 2.1 admin_complaint_detail_safe
CREATE VIEW complaints_private.admin_complaint_detail_safe AS
SELECT
  id,
  schema_version,
  sheet_number,
  status,
  submitted_at,
  deadline_at,
  closed_at,
  payload_snapshot->>'consumer_type' AS consumer_type,
  payload_snapshot->>'consumer_first_names' AS consumer_first_names,
  payload_snapshot->>'consumer_last_names' AS consumer_last_names,
  payload_snapshot->>'consumer_legal_name' AS consumer_legal_name,
  payload_snapshot->>'consumer_representative_first_names' AS consumer_representative_first_names,
  payload_snapshot->>'consumer_representative_last_names' AS consumer_representative_last_names,
  payload_snapshot->>'consumer_representative_role' AS consumer_representative_role,
  payload_snapshot->>'consumer_representative_relationship' AS consumer_representative_relationship,
  payload_snapshot->>'subject_kind' AS subject_kind,
  payload_snapshot->>'subject_description' AS subject_description,
  payload_snapshot->>'subject_amount_applicability' AS subject_amount_applicability,
  payload_snapshot->>'subject_amount' AS subject_amount,
  payload_snapshot->>'subject_currency' AS subject_currency,
  payload_snapshot->>'subject_transaction_date' AS subject_transaction_date,
  payload_snapshot->>'subject_reference_number' AS subject_reference_number,
  payload_snapshot->>'subject_channel' AS subject_channel,
  payload_snapshot->>'complaint_kind' AS complaint_kind,
  payload_snapshot->>'complaint_facts' AS complaint_facts,
  payload_snapshot->>'complaint_requested_resolution' AS complaint_requested_resolution
FROM complaints_private.complaints
WHERE schema_version = '1.0';

--> statement-breakpoint
-- 2.2 admin_complaint_current_response_safe
CREATE VIEW complaints_private.admin_complaint_current_response_safe AS
SELECT DISTINCT ON (complaint_id)
  complaint_id,
  response_text,
  actions_taken,
  responded_at,
  response_channel
FROM complaints_private.complaint_provider_responses
ORDER BY complaint_id, version DESC;

--> statement-breakpoint
-- 2.3 admin_complaint_status_timeline_safe
CREATE VIEW complaints_private.admin_complaint_status_timeline_safe AS
SELECT
  complaint_id,
  to_status AS status,
  changed_at
FROM complaints_private.complaint_status_history;

--> statement-breakpoint
-- 3. Schema Usage Grant
GRANT USAGE ON SCHEMA complaints_private TO complaints_admin_detail_read_runtime;

--> statement-breakpoint
-- 4. View Select Grants
GRANT SELECT ON complaints_private.admin_complaint_detail_safe TO complaints_admin_detail_read_runtime;
--> statement-breakpoint
GRANT SELECT ON complaints_private.admin_complaint_current_response_safe TO complaints_admin_detail_read_runtime;
--> statement-breakpoint
GRANT SELECT ON complaints_private.admin_complaint_status_timeline_safe TO complaints_admin_detail_read_runtime;

--> statement-breakpoint
-- 5. Revoke Public Privileges on Views
REVOKE ALL ON complaints_private.admin_complaint_detail_safe FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON complaints_private.admin_complaint_current_response_safe FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON complaints_private.admin_complaint_status_timeline_safe FROM PUBLIC;
