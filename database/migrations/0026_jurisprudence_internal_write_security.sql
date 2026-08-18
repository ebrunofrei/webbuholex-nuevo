-- database/migrations/0026_jurisprudence_internal_write_security.sql

-- 1. Create Internal Write Runtime Role
CREATE ROLE jurisprudence_internal_write_runtime NOLOGIN;

-- 2. Create Internal Write Login Role
CREATE ROLE jurisprudence_internal_write_login LOGIN NOINHERIT;

-- 3. Grant Membership (Allows login to SET LOCAL ROLE to runtime)
GRANT jurisprudence_internal_write_runtime TO jurisprudence_internal_write_login;

-- 4. Grant Usage on Schema
GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_internal_write_runtime;

-- 5. Grant Permissions on jurisprudence_records
GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_records TO jurisprudence_internal_write_runtime;

-- 6. Grant Permissions on jurisprudence_record_versions
-- Append-only semantic. Update is explicitly not granted.
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_record_versions TO jurisprudence_internal_write_runtime;

-- 7. Grant Permissions on jurisprudence_idempotency
-- Create requires selecting to check, then inserting. Update is not required.
GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_idempotency TO jurisprudence_internal_write_runtime;
