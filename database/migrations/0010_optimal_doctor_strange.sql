CREATE SCHEMA "authorization";
--> statement-breakpoint
CREATE TABLE "authorization"."external_identity_bindings" (
	"provider" varchar NOT NULL,
	"external_subject_id" varchar NOT NULL,
	"operator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_identity_bindings_prov_sub_idx" UNIQUE("provider","external_subject_id")
);
--> statement-breakpoint
CREATE TABLE "authorization"."operator_capabilities" (
	"operator_id" uuid NOT NULL,
	"capability" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operator_capabilities_operator_id_capability_pk" PRIMARY KEY("operator_id","capability")
);
--> statement-breakpoint
CREATE TABLE "authorization"."operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "authorization"."external_identity_bindings" ADD CONSTRAINT "external_identity_bindings_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "authorization"."operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization"."operator_capabilities" ADD CONSTRAINT "operator_capabilities_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "authorization"."operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE ROLE complaints_authorization_runtime NOLOGIN;
--> statement-breakpoint
CREATE ROLE complaints_authorization_login LOGIN NOINHERIT;
--> statement-breakpoint
GRANT complaints_authorization_runtime TO complaints_authorization_login;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "authorization" TO complaints_authorization_runtime;
--> statement-breakpoint
GRANT SELECT ON "authorization"."operators" TO complaints_authorization_runtime;
--> statement-breakpoint
GRANT SELECT ON "authorization"."external_identity_bindings" TO complaints_authorization_runtime;
--> statement-breakpoint
GRANT SELECT ON "authorization"."operator_capabilities" TO complaints_authorization_runtime;