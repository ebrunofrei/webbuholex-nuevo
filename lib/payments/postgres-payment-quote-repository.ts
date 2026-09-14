import { eq } from "drizzle-orm";
import { PaymentQuote } from "../schemas/payment-quotes";
import { paymentQuotes } from "../../database/schema/payment-quotes";
import { PaymentQuoteRepository } from "./payment-repositories";
import { PaymentDbExecutor } from "./postgres-db-executor";

export class PostgresPaymentQuoteRepository implements PaymentQuoteRepository {
  constructor(private tx: PaymentDbExecutor) {}

  async findById(id: string): Promise<PaymentQuote | null> {
    const result = await this.tx
      .select()
      .from(paymentQuotes)
      .where(eq(paymentQuotes.id, id))
      .limit(1);

    if (result.length === 0) return null;

    return {
      id: result[0]!.id,
      serviceId: result[0]!.serviceId,
      subOfferId: result[0]!.subOfferId,
      customerReference: result[0]!.customerReference,
      customerEmail: result[0]!.customerEmail,
      amountMinor: result[0]!.amountMinor,
      currency: result[0]!.currency as "PEN",
      status: result[0]!.status as "draft" | "approved" | "rejected" | "cancelled" | "expired",
      createdAt: result[0]!.createdAt,
      updatedAt: result[0]!.updatedAt,
      approvedAt: result[0]!.approvedAt,
      rejectedAt: result[0]!.rejectedAt,
      cancelledAt: result[0]!.cancelledAt,
      expiresAt: result[0]!.expiresAt,
      expiredAt: result[0]!.expiredAt,
    };
  }

  async save(quote: PaymentQuote): Promise<void> {
    // Basic upsert, though not the primary focus of PAY-2.1
    await this.tx
      .insert(paymentQuotes)
      .values(quote)
      .onConflictDoUpdate({
        target: paymentQuotes.id,
        set: {
          status: quote.status,
          customerEmail: quote.customerEmail,
          updatedAt: quote.updatedAt,
          approvedAt: quote.approvedAt,
          rejectedAt: quote.rejectedAt,
          cancelledAt: quote.cancelledAt,
          expiresAt: quote.expiresAt,
          expiredAt: quote.expiredAt,
        },
      });
  }
}
