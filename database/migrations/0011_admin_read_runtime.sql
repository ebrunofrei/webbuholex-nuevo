DO $$ BEGIN
  CREATE ROLE complaints_admin_read_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA complaints_private TO complaints_admin_read_runtime;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON complaints_private.complaints FROM complaints_admin_read_runtime;
--> statement-breakpoint
GRANT SELECT (
  id,
  sheet_number,
  status,
  submitted_at,
  deadline_at,
  updated_at
) ON complaints_private.complaints TO complaints_admin_read_runtime;