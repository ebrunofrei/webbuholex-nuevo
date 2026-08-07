-- Remove exclusively the ADMIN OPTION from the historical membership granted by supabase_admin
-- We do not revoke the role itself, nor do we revoke the SET OPTION granted in 0002.
REVOKE ADMIN OPTION FOR complaints_api_runtime FROM postgres GRANTED BY supabase_admin;
--> statement-breakpoint
REVOKE ADMIN OPTION FOR complaints_outbox_worker FROM postgres GRANTED BY supabase_admin;
