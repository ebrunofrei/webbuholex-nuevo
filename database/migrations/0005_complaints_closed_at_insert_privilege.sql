-- 0005_complaints_closed_at_insert_privilege.sql
GRANT INSERT (closed_at) ON complaints_private.complaints TO complaints_api_runtime;
