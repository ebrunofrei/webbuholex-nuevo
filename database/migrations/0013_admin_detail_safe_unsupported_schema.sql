-- 1. Recreate admin_complaint_detail_safe to remove schema_version filter
CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS
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
FROM complaints_private.complaints;

--> statement-breakpoint
-- 2. Re-grant privileges and re-revoke from public, just in case (though CREATE OR REPLACE preserves them if owner is the same)
GRANT SELECT ON complaints_private.admin_complaint_detail_safe TO complaints_admin_detail_read_runtime;
--> statement-breakpoint
REVOKE ALL ON complaints_private.admin_complaint_detail_safe FROM PUBLIC;
