-- 0016_complaints_admin_closed_at_privilege.sql
GRANT UPDATE (closed_at) ON complaints_private.complaints TO complaints_admin_runtime;
