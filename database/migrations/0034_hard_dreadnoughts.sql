CREATE TABLE "payments_private"."payment_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" varchar NOT NULL,
	"sub_offer_id" varchar,
	"customer_reference" varchar NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	CONSTRAINT "payment_quotes_amount_minor_check" CHECK ("payments_private"."payment_quotes"."amount_minor" > 0),
	CONSTRAINT "payment_quotes_service_id_check" CHECK (length(trim("payments_private"."payment_quotes"."service_id")) > 0),
	CONSTRAINT "payment_quotes_customer_reference_check" CHECK (length(trim("payments_private"."payment_quotes"."customer_reference")) > 0),
	CONSTRAINT "payment_quotes_currency_check" CHECK ("payments_private"."payment_quotes"."currency" IN ('PEN')),
	CONSTRAINT "payment_quotes_status_check" CHECK ("payments_private"."payment_quotes"."status" IN ('draft', 'approved', 'rejected', 'cancelled', 'expired')),
	CONSTRAINT "payment_quotes_approved_at_check" CHECK (("payments_private"."payment_quotes"."status" = 'approved') = ("payments_private"."payment_quotes"."approved_at" IS NOT NULL)),
	CONSTRAINT "payment_quotes_rejected_at_check" CHECK (("payments_private"."payment_quotes"."status" = 'rejected') = ("payments_private"."payment_quotes"."rejected_at" IS NOT NULL)),
	CONSTRAINT "payment_quotes_cancelled_at_check" CHECK (("payments_private"."payment_quotes"."status" = 'cancelled') = ("payments_private"."payment_quotes"."cancelled_at" IS NOT NULL)),
	CONSTRAINT "payment_quotes_expired_at_check" CHECK (("payments_private"."payment_quotes"."status" = 'expired') = ("payments_private"."payment_quotes"."expired_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "payments_private"."payment_orders" ALTER COLUMN "quote_reference" SET DATA TYPE uuid;--> statement-breakpoint
CREATE INDEX "payment_quotes_status_idx" ON "payments_private"."payment_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_quotes_service_id_idx" ON "payments_private"."payment_quotes" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "payment_quotes_customer_reference_idx" ON "payments_private"."payment_quotes" USING btree ("customer_reference");--> statement-breakpoint
CREATE INDEX "payment_quotes_created_at_idx" ON "payments_private"."payment_quotes" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "payments_private"."payment_orders" ADD CONSTRAINT "payment_orders_quote_reference_payment_quotes_id_fk" FOREIGN KEY ("quote_reference") REFERENCES "payments_private"."payment_quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_quote_reference_idx" ON "payments_private"."payment_orders" USING btree ("quote_reference") WHERE "payments_private"."payment_orders"."quote_reference" IS NOT NULL;