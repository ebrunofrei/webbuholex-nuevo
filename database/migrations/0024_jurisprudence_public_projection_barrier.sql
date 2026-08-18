CREATE TABLE IF NOT EXISTS "jurisprudence_public"."projection_barriers" (
	"record_id" varchar PRIMARY KEY NOT NULL,
	"record_version" integer NOT NULL,
	"execution_version" integer NOT NULL,
	"projection_state" varchar NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projection_barrier_record_version_positive" CHECK ("record_version" > 0),
	CONSTRAINT "projection_barrier_execution_version_positive" CHECK ("execution_version" > 0),
	CONSTRAINT "valid_projection_state" CHECK ("projection_state" IN ('published', 'withdrawn'))
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "jurisprudence_public"."projection_barriers" TO "jurisprudence_public_write_login";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "jurisprudence_public"."projection_barriers" TO "jurisprudence_public_write_runtime";
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "jurisprudence_public"."projection_barriers" FROM "jurisprudence_public_read_login";
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "jurisprudence_public"."projection_barriers" FROM "jurisprudence_public_read_runtime";
