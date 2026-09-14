import { pgSchema, uuid, varchar, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const paymentsPrivate = pgSchema("payments_private");

export const paymentQuotes = paymentsPrivate.table(
  "payment_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: varchar("service_id").notNull(),
    subOfferId: varchar("sub_offer_id"),
    customerReference: varchar("customer_reference").notNull(),
    customerEmail: varchar("customer_email", { length: 254 }),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: "date" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    expiredAt: timestamp("expired_at", { withTimezone: true, mode: "date" }),
  },
  (table) => {
    return {
      statusIdx: index("payment_quotes_status_idx").on(table.status),
      serviceIdIdx: index("payment_quotes_service_id_idx").on(table.serviceId),
      customerReferenceIdx: index("payment_quotes_customer_reference_idx").on(table.customerReference),
      createdAtIdx: index("payment_quotes_created_at_idx").on(table.createdAt),
      amountMinorCheck: check("payment_quotes_amount_minor_check", sql`${table.amountMinor} > 0`),
      serviceIdCheck: check("payment_quotes_service_id_check", sql`length(trim(${table.serviceId})) > 0`),
      customerReferenceCheck: check("payment_quotes_customer_reference_check", sql`length(trim(${table.customerReference})) > 0`),
      currencyCheck: check("payment_quotes_currency_check", sql`${table.currency} IN ('PEN')`),
      statusCheck: check("payment_quotes_status_check", sql`${table.status} IN ('draft', 'approved', 'rejected', 'cancelled', 'expired')`),
      approvedAtCheck: check("payment_quotes_approved_at_check", sql`(${table.status} = 'approved') = (${table.approvedAt} IS NOT NULL)`),
      rejectedAtCheck: check("payment_quotes_rejected_at_check", sql`(${table.status} = 'rejected') = (${table.rejectedAt} IS NOT NULL)`),
      cancelledAtCheck: check("payment_quotes_cancelled_at_check", sql`(${table.status} = 'cancelled') = (${table.cancelledAt} IS NOT NULL)`),
      expiredAtCheck: check("payment_quotes_expired_at_check", sql`(${table.status} = 'expired') = (${table.expiredAt} IS NOT NULL)`),
    };
  }
);
