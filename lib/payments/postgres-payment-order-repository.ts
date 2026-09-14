import { eq, and } from "drizzle-orm";
import { PaymentOrder } from "../schemas/payments";
import { paymentOrders } from "../../database/schema/payments";
import { PaymentOrderRepository } from "./payment-repositories";
import { PaymentDbExecutor } from "./postgres-db-executor";

export class PostgresPaymentOrderRepository implements PaymentOrderRepository {
  constructor(private tx: PaymentDbExecutor) {}

  async findById(id: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.id, id))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]!);
  }

  async findByIdForUpdate(id: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.id, id))
      .for("update")
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]!);
  }


  async findByQuoteReference(quoteReference: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.quoteReference, quoteReference))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]!);
  }

  async findByIdempotencyKey(key: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.idempotencyKey, key))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]!);
  }

  async insertIdempotent(order: PaymentOrder): Promise<"inserted" | "already_exists"> {
    // ON CONFLICT DO NOTHING relies on the unique constraint of idempotencyKey.
    // This is robust because idempotencyKey is deterministic and uniquely identifies
    // the command intent (quote_generation_<quoteId>), avoiding partial unique index
    // complications from quoteReference.
    const result = await this.tx
      .insert(paymentOrders)
      .values(order)
      .onConflictDoNothing({ target: paymentOrders.idempotencyKey })
      .returning({ id: paymentOrders.id });

    if (result.length === 0) {
      return "already_exists";
    }

    return "inserted";
  }

  async markProcessingFromAwaitingPayment(orderId: string, now: Date): Promise<boolean> {
    const result = await this.tx
      .update(paymentOrders)
      .set({
        status: "processing",
        updatedAt: now,
      })
      .where(and(eq(paymentOrders.id, orderId), eq(paymentOrders.status, "awaiting_payment")))
      .returning({ id: paymentOrders.id });

    return result.length > 0;
  }

  async finalizePaidFromAwaitingPayment(
    orderId: string,
    details: {
      provider: string;
      paymentMethod: string;
      providerPaymentId: string;
      paidAt: Date;
    }
  ): Promise<boolean> {
    const result = await this.tx
      .update(paymentOrders)
      .set({
        status: "paid",
        provider: details.provider,
        paymentMethod: details.paymentMethod,
        providerPaymentId: details.providerPaymentId,
        paidAt: details.paidAt,
        updatedAt: details.paidAt,
      })
      .where(and(eq(paymentOrders.id, orderId), eq(paymentOrders.status, "awaiting_payment")))
      .returning({ id: paymentOrders.id });

    return result.length > 0;
  }

  private mapToDomain(row: typeof paymentOrders.$inferSelect): PaymentOrder {
    return {
      id: row.id,
      serviceId: row.serviceId,
      subOfferId: row.subOfferId,
      customerReference: row.customerReference,
      customerEmail: row.customerEmail,
      quoteReference: row.quoteReference,
      amountMinor: row.amountMinor,
      currency: row.currency as "PEN",
      provider: row.provider as "culqi" | null,
      providerOrderId: row.providerOrderId,
      providerPaymentId: row.providerPaymentId,
      paymentMethod: row.paymentMethod as "card" | "yape" | null,
      status: row.status as PaymentOrder["status"],
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      paidAt: row.paidAt,
      failedAt: row.failedAt,
      cancelledAt: row.cancelledAt,
      refundedAt: row.refundedAt,
      expiresAt: row.expiresAt,
      expiredAt: row.expiredAt,
    };
  }
}
