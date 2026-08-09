-- 0006_complaints_history_audit_insert_privileges.sql
-- 1. Grant missing column privilege for complaint_status_history
GRANT INSERT (from_status) ON complaints_private.complaint_status_history TO complaints_api_runtime;

--> statement-breakpoint
-- 2. Grant missing column privilege for complaint_audit_events
GRANT INSERT (metadata) ON complaints_private.complaint_audit_events TO complaints_api_runtime;
