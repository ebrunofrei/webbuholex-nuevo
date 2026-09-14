import {
  pgSchema,
  uuid,
  varchar,
  integer,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { paymentQuotes } from "./payment-quotes";

export const paymentsPrivateSchema = pgSchema("payments_private");

export const paymentOrders = paymentsPrivateSchema.table(
  "payment_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: varchar("service_id").notNull(),
    subOfferId: varchar("sub_offer_id"),
    customerReference: varchar("customer_reference").notNull(),
    customerEmail: varchar("customer_email", { length: 254 }),
    quoteReference: uuid("quote_reference").references(() => paymentQuotes.id, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    provider: varchar("provider"),
    providerOrderId: varchar("provider_order_id"),
    providerPaymentId: varchar("provider_payment_id"),
    paymentMethod: varchar("payment_method"),
    status: varchar("status", {
      enum: [
        "draft",
        "awaiting_payment",
        "processing",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ],
    }).notNull(),
    idempotencyKey: varchar("idempotency_key").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payment_orders_provider_order_id_idx")
      .on(table.providerOrderId)
      .where(sql`${table.providerOrderId} IS NOT NULL`),
    uniqueIndex("payment_orders_provider_payment_id_idx")
      .on(table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
    uniqueIndex("payment_orders_quote_reference_idx")
      .on(table.quoteReference)
      .where(sql`${table.quoteReference} IS NOT NULL`),
    index("payment_orders_status_idx").on(table.status),
    index("payment_orders_created_at_idx").on(table.createdAt),
    index("payment_orders_service_id_idx").on(table.serviceId),
    check("payment_orders_amount_minor_check", sql`${table.amountMinor} > 0`),
    check("payment_orders_service_id_check", sql`length(trim(${table.serviceId})) > 0`),
    check("payment_orders_customer_reference_check", sql`length(trim(${table.customerReference})) > 0`),
    check("payment_orders_idempotency_key_check", sql`length(trim(${table.idempotencyKey})) > 0`),
    check("payment_orders_currency_check", sql`${table.currency} IN ('PEN')`),
    check("payment_orders_provider_check", sql`${table.provider} IS NULL OR ${table.provider} IN ('culqi')`),
    check("payment_orders_payment_method_check", sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('card', 'yape')`),
    check(
      "payment_orders_status_check",
      sql`${table.status} IN ('draft', 'awaiting_payment', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded')`
    ),
    check("payment_orders_draft_payment_method_check", sql`${table.status} <> 'draft' OR ${table.paymentMethod} IS NULL`),
    check("payment_orders_paid_at_check", sql`(${table.status} IN ('paid', 'refunded')) = (${table.paidAt} IS NOT NULL)`),
    check("payment_orders_failed_at_check", sql`(${table.status} = 'failed') = (${table.failedAt} IS NOT NULL)`),
    check("payment_orders_cancelled_at_check", sql`(${table.status} = 'cancelled') = (${table.cancelledAt} IS NOT NULL)`),
    check("payment_orders_expired_at_check", sql`(${table.status} = 'expired') = (${table.expiredAt} IS NOT NULL)`),
    check("payment_orders_refunded_at_check", sql`(${table.status} = 'refunded') = (${table.refundedAt} IS NOT NULL)`),
  ]
);

export const paymentCheckoutSessions = paymentsPrivateSchema.table(
  "payment_checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentOrderId: uuid("payment_order_id")
      .notNull()
      .references(() => paymentOrders.id, { onDelete: "restrict" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    status: varchar("status", { enum: ["active", "revoked", "expired"] }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payment_checkout_sessions_active_idx")
      .on(table.paymentOrderId)
      .where(sql`${table.status} = 'active'`),
    index("payment_checkout_sessions_payment_order_id_idx").on(table.paymentOrderId),
    index("payment_checkout_sessions_status_idx").on(table.status),
    index("payment_checkout_sessions_expires_at_idx").on(table.expiresAt),
    check(
      "payment_checkout_sessions_status_check",
      sql`${table.status} IN ('active', 'revoked', 'expired')`
    ),
    check(
      "payment_checkout_sessions_revoked_at_check",
      sql`(${table.status} = 'revoked') = (${table.revokedAt} IS NOT NULL)`
    ),
    check(
      "payment_checkout_sessions_expired_at_check",
      sql`(${table.status} = 'expired') = (${table.expiredAt} IS NOT NULL)`
    ),
  ]
);

export const paymentAttempts = paymentsPrivateSchema.table(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentOrderId: uuid("payment_order_id")
      .notNull()
      .references(() => paymentOrders.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    operationKey: varchar("operation_key").notNull().unique(),
    provider: varchar("provider", { enum: ["culqi"] }).notNull(),
    paymentMethod: varchar("payment_method", { enum: ["card", "yape"] }).notNull(),
    providerPaymentId: varchar("provider_payment_id"),
    status: varchar("status", {
      enum: [
        "created",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "indeterminate",
      ],
    }).notNull(),
    failureCategory: varchar("failure_category", {
      enum: [
        "customer_decline",
        "validation",
        "provider_rejection",
        "provider_unavailable",
        "network",
        "timeout",
        "internal",
        "unknown",
      ],
    }),
    failureCode: varchar("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    indeterminateAt: timestamp("indeterminate_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_attempts_payment_order_id_attempt_number_idx").on(
      table.paymentOrderId,
      table.attemptNumber
    ),
    index("payment_attempts_payment_order_id_idx").on(table.paymentOrderId),
    index("payment_attempts_status_idx").on(table.status),
    check("payment_attempts_operation_key_check", sql`length(trim(${table.operationKey})) > 0`),
    check("payment_attempts_failure_code_check", sql`${table.failureCode} IS NULL OR length(trim(${table.failureCode})) > 0`),
    check("payment_attempts_provider_check", sql`${table.provider} IN ('culqi')`),
    check("payment_attempts_payment_method_check", sql`${table.paymentMethod} IN ('card', 'yape')`),
    check(
      "payment_attempts_attempt_number_check",
      sql`${table.attemptNumber} > 0`
    ),
    check(
      "payment_attempts_status_check",
      sql`${table.status} IN ('created', 'processing', 'succeeded', 'failed', 'cancelled', 'indeterminate')`
    ),
    check(
      "payment_attempts_failure_category_check",
      sql`${table.failureCategory} IS NULL OR ${table.failureCategory} IN ('customer_decline', 'validation', 'provider_rejection', 'provider_unavailable', 'network', 'timeout', 'internal', 'unknown')`
    ),
    check(
      "payment_attempts_started_at_check",
      sql`(${table.status} IN ('processing', 'succeeded', 'failed', 'indeterminate') AND ${table.startedAt} IS NOT NULL) OR (${table.status} IN ('created', 'cancelled') AND ${table.startedAt} IS NULL)`
    ),
    check(
      "payment_attempts_succeeded_at_check",
      sql`(${table.status} = 'succeeded') = (${table.succeededAt} IS NOT NULL)`
    ),
    check(
      "payment_attempts_failed_at_check",
      sql`(${table.status} = 'failed') = (${table.failedAt} IS NOT NULL)`
    ),
    check(
      "payment_attempts_cancelled_at_check",
      sql`(${table.status} = 'cancelled') = (${table.cancelledAt} IS NOT NULL)`
    ),
    check(
      "payment_attempts_indeterminate_at_check",
      sql`(${table.status} = 'indeterminate') = (${table.indeterminateAt} IS NOT NULL)`
    ),
  ]
);

export const paymentProviderEvents = paymentsPrivateSchema.table(
  "payment_provider_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { enum: ["culqi"] }).notNull(),
    providerEventId: varchar("provider_event_id"),
    deduplicationKey: varchar("deduplication_key").notNull().unique(),
    providerObjectId: varchar("provider_object_id"),
    paymentOrderId: uuid("payment_order_id").references(() => paymentOrders.id, {
      onDelete: "restrict",
    }),
    paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, {
      onDelete: "restrict",
    }),
    eventType: varchar("event_type").notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    status: varchar("status", {
      enum: ["received", "processing", "processed", "failed"],
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureCode: varchar("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_provider_events_provider_event_id_idx")
      .on(table.provider, table.providerEventId)
      .where(sql`${table.providerEventId} IS NOT NULL`),
    index("payment_provider_events_payment_order_id_idx").on(table.paymentOrderId),
    index("payment_provider_events_payment_attempt_id_idx").on(table.paymentAttemptId),
    index("payment_provider_events_status_idx").on(table.status),
    check(
      "payment_provider_events_status_check",
      sql`${table.status} IN ('received', 'processing', 'processed', 'failed')`
    ),
    check(
      "payment_provider_events_payload_hash_check",
      sql`${table.payloadHash} ~ '^[0-9a-f]{64}$'`
    ),
    check(
      "payment_provider_events_provider_check",
      sql`${table.provider} IN ('culqi')`
    ),
    check(
      "payment_provider_events_deduplication_key_check",
      sql`length(trim(${table.deduplicationKey})) > 0`
    ),
    check(
      "payment_provider_events_event_type_check",
      sql`length(trim(${table.eventType})) > 0`
    ),
    check(
      "payment_provider_events_provider_event_id_check",
      sql`${table.providerEventId} IS NULL OR length(trim(${table.providerEventId})) > 0`
    ),
    check(
      "payment_provider_events_provider_object_id_check",
      sql`${table.providerObjectId} IS NULL OR length(trim(${table.providerObjectId})) > 0`
    ),
    check(
      "payment_provider_events_failure_code_check",
      sql`${table.failureCode} IS NULL OR length(trim(${table.failureCode})) > 0`
    ),
    check(
      "payment_provider_events_received_check",
      sql`${table.status} <> 'received' OR (${table.processingStartedAt} IS NULL AND ${table.processedAt} IS NULL AND ${table.failedAt} IS NULL)`
    ),
    check(
      "payment_provider_events_processing_check",
      sql`${table.status} <> 'processing' OR ${table.processingStartedAt} IS NOT NULL`
    ),
    check(
      "payment_provider_events_processed_check",
      sql`${table.status} <> 'processed' OR (${table.processingStartedAt} IS NOT NULL AND ${table.processedAt} IS NOT NULL)`
    ),
    check(
      "payment_provider_events_failed_check",
      sql`${table.status} <> 'failed' OR (${table.processingStartedAt} IS NOT NULL AND ${table.failedAt} IS NOT NULL)`
    ),
  ]
);
