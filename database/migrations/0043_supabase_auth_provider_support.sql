-- Migration 0043: Add Supabase as an accepted identity provider in authorization and hermes_control
-- Preserves existing 'auth0' provider while enabling 'supabase' for staging

-- 1. hermes_control.subject_identities
ALTER TABLE "hermes_control"."subject_identities" DROP CONSTRAINT IF EXISTS "subject_identities_provider_check";
ALTER TABLE "hermes_control"."subject_identities" ADD CONSTRAINT "subject_identities_provider_check" CHECK ("provider" IN ('auth0', 'supabase'));

-- 2. authorization.external_identity_bindings
ALTER TABLE "authorization"."external_identity_bindings" DROP CONSTRAINT IF EXISTS "external_identity_bindings_provider_check";
ALTER TABLE "authorization"."external_identity_bindings" ADD CONSTRAINT "external_identity_bindings_provider_check" CHECK ("provider" IN ('auth0', 'supabase'));
