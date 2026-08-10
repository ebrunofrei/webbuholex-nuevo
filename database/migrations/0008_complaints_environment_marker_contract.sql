ALTER TABLE complaints_private.environment_marker DROP CONSTRAINT IF EXISTS env_marker_env_check;
--> statement-breakpoint
ALTER TABLE complaints_private.environment_marker ADD CONSTRAINT env_marker_env_check CHECK (environment IN ('staging', 'production'));
