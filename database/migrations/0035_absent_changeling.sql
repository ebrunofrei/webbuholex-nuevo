CREATE TABLE "payments_private"."payment_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" varchar NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	CONSTRAINT "payment_checkout_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "payment_checkout_sessions_status_check" CHECK ("payments_private"."payment_checkout_sessions"."status" IN ('active', 'revoked', 'expired')),
	CONSTRAINT "payment_checkout_sessions_revoked_at_check" CHECK (("payments_private"."payment_checkout_sessions"."status" = 'revoked') = ("payments_private"."payment_checkout_sessions"."revoked_at" IS NOT NULL)),
	CONSTRAINT "payment_checkout_sessions_expired_at_check" CHECK (("payments_private"."payment_checkout_sessions"."status" = 'expired') = ("payments_private"."payment_checkout_sessions"."expired_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "payments_private"."payment_checkout_sessions" ADD CONSTRAINT "payment_checkout_sessions_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "payments_private"."payment_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_checkout_sessions_active_idx" ON "payments_private"."payment_checkout_sessions" USING btree ("payment_order_id") WHERE "payments_private"."payment_checkout_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "payment_checkout_sessions_payment_order_id_idx" ON "payments_private"."payment_checkout_sessions" USING btree ("payment_order_id");--> statement-breakpoint
CREATE INDEX "payment_checkout_sessions_status_idx" ON "payments_private"."payment_checkout_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_checkout_sessions_expires_at_idx" ON "payments_private"."payment_checkout_sessions" USING btree ("expires_at");