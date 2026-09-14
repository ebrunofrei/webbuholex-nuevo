CREATE TABLE "payments_private"."payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"operation_key" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"payment_method" varchar NOT NULL,
	"provider_payment_id" varchar,
	"status" varchar NOT NULL,
	"failure_category" varchar,
	"failure_code" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"indeterminate_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_operation_key_unique" UNIQUE("operation_key"),
	CONSTRAINT "payment_attempts_operation_key_check" CHECK (length(trim("payments_private"."payment_attempts"."operation_key")) > 0),
	CONSTRAINT "payment_attempts_failure_code_check" CHECK ("payments_private"."payment_attempts"."failure_code" IS NULL OR length(trim("payments_private"."payment_attempts"."failure_code")) > 0),
	CONSTRAINT "payment_attempts_provider_check" CHECK ("payments_private"."payment_attempts"."provider" IN ('culqi')),
	CONSTRAINT "payment_attempts_payment_method_check" CHECK ("payments_private"."payment_attempts"."payment_method" IN ('card', 'yape')),
	CONSTRAINT "payment_attempts_attempt_number_check" CHECK ("payments_private"."payment_attempts"."attempt_number" > 0),
	CONSTRAINT "payment_attempts_status_check" CHECK ("payments_private"."payment_attempts"."status" IN ('created', 'processing', 'succeeded', 'failed', 'cancelled', 'indeterminate')),
	CONSTRAINT "payment_attempts_failure_category_check" CHECK ("payments_private"."payment_attempts"."failure_category" IS NULL OR "payments_private"."payment_attempts"."failure_category" IN ('customer_decline', 'validation', 'provider_rejection', 'provider_unavailable', 'network', 'timeout', 'internal', 'unknown')),
	CONSTRAINT "payment_attempts_started_at_check" CHECK (("payments_private"."payment_attempts"."status" IN ('processing', 'succeeded', 'failed', 'indeterminate') AND "payments_private"."payment_attempts"."started_at" IS NOT NULL) OR ("payments_private"."payment_attempts"."status" IN ('created', 'cancelled') AND "payments_private"."payment_attempts"."started_at" IS NULL)),
	CONSTRAINT "payment_attempts_succeeded_at_check" CHECK (("payments_private"."payment_attempts"."status" = 'succeeded') = ("payments_private"."payment_attempts"."succeeded_at" IS NOT NULL)),
	CONSTRAINT "payment_attempts_failed_at_check" CHECK (("payments_private"."payment_attempts"."status" = 'failed') = ("payments_private"."payment_attempts"."failed_at" IS NOT NULL)),
	CONSTRAINT "payment_attempts_cancelled_at_check" CHECK (("payments_private"."payment_attempts"."status" = 'cancelled') = ("payments_private"."payment_attempts"."cancelled_at" IS NOT NULL)),
	CONSTRAINT "payment_attempts_indeterminate_at_check" CHECK (("payments_private"."payment_attempts"."status" = 'indeterminate') = ("payments_private"."payment_attempts"."indeterminate_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "payments_private"."payment_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar NOT NULL,
	"provider_event_id" varchar,
	"deduplication_key" varchar NOT NULL,
	"provider_object_id" varchar,
	"payment_order_id" uuid,
	"payment_attempt_id" uuid,
	"event_type" varchar NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"status" varchar NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_code" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_provider_events_deduplication_key_unique" UNIQUE("deduplication_key"),
	CONSTRAINT "payment_provider_events_status_check" CHECK ("payments_private"."payment_provider_events"."status" IN ('received', 'processing', 'processed', 'failed')),
	CONSTRAINT "payment_provider_events_payload_hash_check" CHECK ("payments_private"."payment_provider_events"."payload_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payment_provider_events_provider_check" CHECK ("payments_private"."payment_provider_events"."provider" IN ('culqi')),
	CONSTRAINT "payment_provider_events_deduplication_key_check" CHECK (length(trim("payments_private"."payment_provider_events"."deduplication_key")) > 0),
	CONSTRAINT "payment_provider_events_event_type_check" CHECK (length(trim("payments_private"."payment_provider_events"."event_type")) > 0),
	CONSTRAINT "payment_provider_events_provider_event_id_check" CHECK ("payments_private"."payment_provider_events"."provider_event_id" IS NULL OR length(trim("payments_private"."payment_provider_events"."provider_event_id")) > 0),
	CONSTRAINT "payment_provider_events_provider_object_id_check" CHECK ("payments_private"."payment_provider_events"."provider_object_id" IS NULL OR length(trim("payments_private"."payment_provider_events"."provider_object_id")) > 0),
	CONSTRAINT "payment_provider_events_failure_code_check" CHECK ("payments_private"."payment_provider_events"."failure_code" IS NULL OR length(trim("payments_private"."payment_provider_events"."failure_code")) > 0),
	CONSTRAINT "payment_provider_events_received_check" CHECK ("payments_private"."payment_provider_events"."status" <> 'received' OR ("payments_private"."payment_provider_events"."processing_started_at" IS NULL AND "payments_private"."payment_provider_events"."processed_at" IS NULL AND "payments_private"."payment_provider_events"."failed_at" IS NULL)),
	CONSTRAINT "payment_provider_events_processing_check" CHECK ("payments_private"."payment_provider_events"."status" <> 'processing' OR "payments_private"."payment_provider_events"."processing_started_at" IS NOT NULL),
	CONSTRAINT "payment_provider_events_processed_check" CHECK ("payments_private"."payment_provider_events"."status" <> 'processed' OR ("payments_private"."payment_provider_events"."processing_started_at" IS NOT NULL AND "payments_private"."payment_provider_events"."processed_at" IS NOT NULL)),
	CONSTRAINT "payment_provider_events_failed_check" CHECK ("payments_private"."payment_provider_events"."status" <> 'failed' OR ("payments_private"."payment_provider_events"."processing_started_at" IS NOT NULL AND "payments_private"."payment_provider_events"."failed_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "payments_private"."payment_attempts" ADD CONSTRAINT "payment_attempts_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "payments_private"."payment_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_private"."payment_provider_events" ADD CONSTRAINT "payment_provider_events_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "payments_private"."payment_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_private"."payment_provider_events" ADD CONSTRAINT "payment_provider_events_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "payments_private"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_payment_order_id_attempt_number_idx" ON "payments_private"."payment_attempts" USING btree ("payment_order_id","attempt_number");--> statement-breakpoint
CREATE INDEX "payment_attempts_payment_order_id_idx" ON "payments_private"."payment_attempts" USING btree ("payment_order_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_status_idx" ON "payments_private"."payment_attempts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_events_provider_event_id_idx" ON "payments_private"."payment_provider_events" USING btree ("provider","provider_event_id") WHERE "payments_private"."payment_provider_events"."provider_event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_provider_events_payment_order_id_idx" ON "payments_private"."payment_provider_events" USING btree ("payment_order_id");--> statement-breakpoint
CREATE INDEX "payment_provider_events_payment_attempt_id_idx" ON "payments_private"."payment_provider_events" USING btree ("payment_attempt_id");--> statement-breakpoint
CREATE INDEX "payment_provider_events_status_idx" ON "payments_private"."payment_provider_events" USING btree ("status");