-- 1. Recreate admin_complaint_detail_safe with corrected nested JSON paths
CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS
SELECT
  id,
  schema_version,
  sheet_number,
  status,
  submitted_at,
  deadline_at,
  closed_at,
  payload_snapshot->'consumer'->>'consumerType' AS consumer_type,
  payload_snapshot->'consumer'->>'firstNames' AS consumer_first_names,
  payload_snapshot->'consumer'->>'lastNames' AS consumer_last_names,
  payload_snapshot->'consumer'->>'legalName' AS consumer_legal_name,
  COALESCE(
    payload_snapshot->'consumer'->'representative'->>'firstNames',
    payload_snapshot->'consumer'->>'representativeFirstNames'
  ) AS consumer_representative_first_names,
  COALESCE(
    payload_snapshot->'consumer'->'representative'->>'lastNames',
    payload_snapshot->'consumer'->>'representativeLastNames'
  ) AS consumer_representative_last_names,
  payload_snapshot->'consumer'->>'representativeRole' AS consumer_representative_role,
  payload_snapshot->'consumer'->'representative'->>'relationship' AS consumer_representative_relationship,
  payload_snapshot->'subject'->>'kind' AS subject_kind,
  payload_snapshot->'subject'->>'description' AS subject_description,
  payload_snapshot->'subject'->>'amountApplicability' AS subject_amount_applicability,
  payload_snapshot->'subject'->>'amount' AS subject_amount,
  payload_snapshot->'subject'->>'currency' AS subject_currency,
  payload_snapshot->'subject'->>'transactionDate' AS subject_transaction_date,
  payload_snapshot->'subject'->>'referenceNumber' AS subject_reference_number,
  payload_snapshot->'subject'->>'channel' AS subject_channel,
  payload_snapshot->'complaint'->>'kind' AS complaint_kind,
  payload_snapshot->'complaint'->>'facts' AS complaint_facts,
  payload_snapshot->'complaint'->>'requestedResolution' AS complaint_requested_resolution
FROM complaints_private.complaints;

--> statement-breakpoint
-- 2. Re-grant privileges and re-revoke from public
GRANT SELECT ON complaints_private.admin_complaint_detail_safe TO complaints_admin_detail_read_runtime;
--> statement-breakpoint
REVOKE ALL ON complaints_private.admin_complaint_detail_safe FROM PUBLIC;
