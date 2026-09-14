import { eq } from "drizzle-orm";
import { PaymentOrder } from "../schemas/payments";
import { paymentOrders } from "../../database/schema/payments";
import { PaymentOrderRepository } from "./payment-repositories";

export class PostgresPaymentOrderRepository implements PaymentOrderRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private tx: any) {}

  async findById(id: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.id, id))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]);
  }

  async findByIdForUpdate(id: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.id, id))
      .for("update")
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]);
  }


  async findByQuoteReference(quoteReference: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.quoteReference, quoteReference))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]);
  }

  async findByIdempotencyKey(key: string): Promise<PaymentOrder | null> {
    const result = await this.tx
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.idempotencyKey, key))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]);
  }

  async insertIdempotent(order: PaymentOrder): Promise<"inserted" | "already_exists"> {
    // ON CONFLICT DO NOTHING relies on the unique constraint of idempotencyKey.
    // This is robust because idempotencyKey is deterministic and uniquely identifies
    // the command intent (quote_generation_<quoteId>), avoiding partial unique index
    // complications from quoteReference.
    const result = await this.tx
      .insert(paymentOrders)
      .values(order)
      .onConflictDoNothing({ target: paymentOrders.idempotencyKey });

    // In Drizzle/Postgres, result contains the rowCount.
    // If rowCount is 0, it means the ON CONFLICT DO NOTHING triggered.
    if (result.rowCount === 0) {
      return "already_exists";
    }

    return "inserted";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDomain(row: any): PaymentOrder {
    return {
      id: row.id,
      serviceId: row.serviceId,
      subOfferId: row.subOfferId,
      customerReference: row.customerReference,
      quoteReference: row.quoteReference,
      amountMinor: row.amountMinor,
      currency: row.currency as "PEN",
      provider: row.provider,
      providerOrderId: row.providerOrderId,
      providerPaymentId: row.providerPaymentId,
      paymentMethod: row.paymentMethod,
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
