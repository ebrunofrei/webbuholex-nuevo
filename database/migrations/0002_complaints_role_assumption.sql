-- 1. Grant explicit SET capabilities to postgres for runtime assumption
-- We grant SET TRUE to allow assumption without granting implicit privileges (INHERIT FALSE)
-- and without granting the ability to grant the role to others (ADMIN FALSE)
GRANT complaints_api_runtime TO postgres WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;
--> statement-breakpoint
GRANT complaints_outbox_worker TO postgres WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;
