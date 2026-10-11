-- Migration 0040: Jurisprudence Interpretation Read Security
-- Implements dedicated least-privilege read boundary for jurisprudence interpretation runtime

-- 1. Create Interpretation Read Runtime Role
CREATE ROLE jurisprudence_interpretation_read_runtime NOLOGIN;

-- 2. Create Interpretation Read Login Role
CREATE ROLE jurisprudence_interpretation_read_login LOGIN NOINHERIT;

-- 3. Grant Membership (Allows login to SET LOCAL ROLE to runtime)
GRANT jurisprudence_interpretation_read_runtime TO jurisprudence_interpretation_read_login;

-- 4. Grant Usage on Schema
GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_interpretation_read_runtime;

-- 5. Grant Permissions on jurisprudence_records
-- Only SELECT is granted.
GRANT SELECT ON jurisprudence_internal.jurisprudence_records TO jurisprudence_interpretation_read_runtime;
