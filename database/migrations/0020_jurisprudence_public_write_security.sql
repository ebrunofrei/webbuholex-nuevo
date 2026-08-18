-- 1. Create logical role (no login)
CREATE ROLE jurisprudence_public_write_runtime NOLOGIN;
--> statement-breakpoint

-- 2. Create physical login role (Runtime Identity)
CREATE ROLE jurisprudence_public_write_login WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
--> statement-breakpoint

-- 3. Grant runtime logical role to physical login
GRANT jurisprudence_public_write_runtime TO jurisprudence_public_write_login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;
--> statement-breakpoint

-- 4. Grant minimal privileges to runtime role
GRANT USAGE ON SCHEMA jurisprudence_public TO jurisprudence_public_write_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON jurisprudence_public.published_records TO jurisprudence_public_write_runtime;
