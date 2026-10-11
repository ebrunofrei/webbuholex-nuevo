CREATE TABLE IF NOT EXISTS "jurisprudence_public"."jurisprudence_rate_limits" (
	"scope" varchar(32) NOT NULL,
	"subject_hash" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "jurisprudence_rate_limits_pk" PRIMARY KEY("scope","subject_hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudence_rate_limits_expires_idx" ON "jurisprudence_public"."jurisprudence_rate_limits" USING btree ("expires_at");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "jurisprudence_public"."jurisprudence_rate_limits" TO "jurisprudence_public_write_runtime";
