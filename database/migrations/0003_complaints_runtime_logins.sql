-- Create physical login role for API (Runtime Identity)
CREATE ROLE complaints_api_login WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;

-- Create physical login role for Worker (Runtime Identity)
CREATE ROLE complaints_worker_login WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;

-- Grant API runtime logical role to API physical login
-- Note: A user with CREATEROLE (but not superuser) creating a new role may automatically
-- receive an administrative membership on the new role depending on PostgreSQL 17.
-- This is acceptable for the 'postgres' role, but the contractual grant for the login role remains strict:
GRANT complaints_api_runtime TO complaints_api_login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;

-- Grant Worker runtime logical role to Worker physical login
GRANT complaints_outbox_worker TO complaints_worker_login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;
