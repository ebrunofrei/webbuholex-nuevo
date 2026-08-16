DO $$ BEGIN
  CREATE ROLE complaints_admin_read_login LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE complaints_admin_detail_read_login LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT complaints_admin_read_runtime TO complaints_admin_read_login WITH ADMIN FALSE, INHERIT FALSE, SET TRUE;
GRANT complaints_admin_detail_read_runtime TO complaints_admin_detail_read_login WITH ADMIN FALSE, INHERIT FALSE, SET TRUE;
