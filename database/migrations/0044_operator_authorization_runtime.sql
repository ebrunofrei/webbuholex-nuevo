-- Migration 0044: Provider-neutral least-privilege generic operator authorization runtime role
DO $$ BEGIN
  CREATE ROLE operator_authorization_runtime NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
GRANT operator_authorization_runtime TO complaints_authorization_login;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "authorization" TO operator_authorization_runtime;
--> statement-breakpoint
GRANT SELECT ON "authorization"."operators" TO operator_authorization_runtime;
--> statement-breakpoint
GRANT SELECT ON "authorization"."external_identity_bindings" TO operator_authorization_runtime;
