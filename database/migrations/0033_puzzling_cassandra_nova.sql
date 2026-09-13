CREATE SCHEMA "payments_private";
--> statement-breakpoint
CREATE TABLE "payments_private"."payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" varchar NOT NULL,
	"sub_offer_id" varchar,
	"customer_reference" varchar NOT NULL,
	"quote_reference" varchar,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"provider" varchar,
	"provider_order_id" varchar,
	"provider_payment_id" varchar,
	"payment_method" varchar,
	"status" varchar NOT NULL,
	"idempotency_key" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	CONSTRAINT "payment_orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_orders_amount_minor_check" CHECK ("payments_private"."payment_orders"."amount_minor" > 0),
	CONSTRAINT "payment_orders_service_id_check" CHECK (length(trim("payments_private"."payment_orders"."service_id")) > 0),
	CONSTRAINT "payment_orders_customer_reference_check" CHECK (length(trim("payments_private"."payment_orders"."customer_reference")) > 0),
	CONSTRAINT "payment_orders_idempotency_key_check" CHECK (length(trim("payments_private"."payment_orders"."idempotency_key")) > 0),
	CONSTRAINT "payment_orders_currency_check" CHECK ("payments_private"."payment_orders"."currency" IN ('PEN')),
	CONSTRAINT "payment_orders_provider_check" CHECK ("payments_private"."payment_orders"."provider" IS NULL OR "payments_private"."payment_orders"."provider" IN ('culqi')),
	CONSTRAINT "payment_orders_payment_method_check" CHECK ("payments_private"."payment_orders"."payment_method" IS NULL OR "payments_private"."payment_orders"."payment_method" IN ('card', 'yape')),
	CONSTRAINT "payment_orders_status_check" CHECK ("payments_private"."payment_orders"."status" IN ('draft', 'awaiting_payment', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
	CONSTRAINT "payment_orders_draft_payment_method_check" CHECK ("payments_private"."payment_orders"."status" <> 'draft' OR "payments_private"."payment_orders"."payment_method" IS NULL),
	CONSTRAINT "payment_orders_paid_at_check" CHECK (("payments_private"."payment_orders"."status" IN ('paid', 'refunded')) = ("payments_private"."payment_orders"."paid_at" IS NOT NULL)),
	CONSTRAINT "payment_orders_failed_at_check" CHECK (("payments_private"."payment_orders"."status" = 'failed') = ("payments_private"."payment_orders"."failed_at" IS NOT NULL)),
	CONSTRAINT "payment_orders_cancelled_at_check" CHECK (("payments_private"."payment_orders"."status" = 'cancelled') = ("payments_private"."payment_orders"."cancelled_at" IS NOT NULL)),
	CONSTRAINT "payment_orders_expired_at_check" CHECK (("payments_private"."payment_orders"."status" = 'expired') = ("payments_private"."payment_orders"."expired_at" IS NOT NULL)),
	CONSTRAINT "payment_orders_refunded_at_check" CHECK (("payments_private"."payment_orders"."status" = 'refunded') = ("payments_private"."payment_orders"."refunded_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_order_id_idx" ON "payments_private"."payment_orders" USING btree ("provider_order_id") WHERE "payments_private"."payment_orders"."provider_order_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_payment_id_idx" ON "payments_private"."payment_orders" USING btree ("provider_payment_id") WHERE "payments_private"."payment_orders"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_orders_status_idx" ON "payments_private"."payment_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_orders_created_at_idx" ON "payments_private"."payment_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_service_id_idx" ON "payments_private"."payment_orders" USING btree ("service_id");