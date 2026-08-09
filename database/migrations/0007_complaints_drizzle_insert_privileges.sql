-- Migration 0007: Drizzle explicit DEFAULT columns INSERT privileges
GRANT INSERT (
  reason,
  metadata
)
ON complaints_private.complaint_status_history
TO complaints_api_runtime;

GRANT INSERT (
  last_error_code,
  processed_at,
  processing_started_at
)
ON complaints_private.complaint_outbox
TO complaints_api_runtime;
