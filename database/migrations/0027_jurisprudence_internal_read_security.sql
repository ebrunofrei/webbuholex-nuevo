-- Migration 0027: Jurisprudence Internal Read Security
-- Implements the read-only boundary for the Publication Command

-- 1. Create the runtime role
CREATE ROLE jurisprudence_internal_read_runtime WITH NOLOGIN;

-- 2. Create the physical login role
CREATE ROLE jurisprudence_internal_read_login WITH LOGIN NOINHERIT;

-- 3. Grant membership
GRANT jurisprudence_internal_read_runtime TO jurisprudence_internal_read_login;

-- 4. Grant schema usage
GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_internal_read_runtime;

-- 5. Grant SELECT strictly on the immutable ledger
GRANT SELECT ON jurisprudence_internal.jurisprudence_record_versions TO jurisprudence_internal_read_runtime;

-- Note: jurisprudence_internal_read_runtime intentionally does NOT receive SELECT on jurisprudence_records
-- to enforce that the publication pipeline operates purely on immutable snapshots and prevents TOCTOU drift.
