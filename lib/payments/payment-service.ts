import { PaymentOrder } from "../schemas/payments";
import { PaymentOrderRepository, PaymentQuoteRepository, UnitOfWork } from "./payment-repositories";
import { v4 as uuidv4 } from "uuid";

export class PaymentQuoteNotApprovedError extends Error {
  constructor(quoteId: string) {
    super(`PaymentQuote ${quoteId} is not approved.`);
    this.name = "PaymentQuoteNotApprovedError";
  }
}

export class PaymentQuoteExpiredError extends Error {
  constructor(quoteId: string) {
    super(`PaymentQuote ${quoteId} has expired.`);
    this.name = "PaymentQuoteExpiredError";
  }
}

export class PaymentQuoteNotFoundError extends Error {
  constructor(quoteId: string) {
    super(`PaymentQuote ${quoteId} not found.`);
    this.name = "PaymentQuoteNotFoundError";
  }
}

export class PaymentOrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`PaymentOrder ${orderId} not found.`);
    this.name = "PaymentOrderNotFoundError";
  }
}

export class PaymentOrderReconciliationError extends Error {
  constructor() {
    super("Concurrency conflict occurred but canonical PaymentOrder could not be retrieved");
    this.name = "PaymentOrderReconciliationError";
  }
}

export class PaymentService {
  constructor(private uow: UnitOfWork) {}

  async createPaymentOrderFromApprovedQuote(
    quoteId: string,
    now: Date = new Date()
  ): Promise<PaymentOrder> {
    return this.uow.execute(async ({ quotes, orders }) => {
      const quote = await quotes.findById(quoteId);

      if (!quote) {
        throw new PaymentQuoteNotFoundError(quoteId);
      }

      if (quote.status !== "approved") {
        throw new PaymentQuoteNotApprovedError(quoteId);
      }

      if (quote.expiresAt !== null && quote.expiresAt <= now) {
        throw new PaymentQuoteExpiredError(quoteId);
      }

      // Strong idempotency key derived from the quote ID to prevent duplicate generation
      const idempotencyKey = `quote_generation_${quote.id}`;

      const paymentOrder: PaymentOrder = {
        id: uuidv4(),
        serviceId: quote.serviceId,
        subOfferId: quote.subOfferId,
        customerReference: quote.customerReference,
        quoteReference: quote.id,
        amountMinor: quote.amountMinor,
        currency: quote.currency,
        provider: null,
        providerOrderId: null,
        providerPaymentId: null,
        paymentMethod: null,
        status: "awaiting_payment",
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,
        expiresAt: quote.expiresAt,
        expiredAt: null,
      };

      const result = await orders.insertIdempotent(paymentOrder);

      if (result === "already_exists") {
        // If the insert collided, retrieve the canonical order that already exists
        const existingOrder = await orders.findByIdempotencyKey(idempotencyKey);
        if (!existingOrder) {
          throw new PaymentOrderReconciliationError();
        }
        return existingOrder;
      }

      return paymentOrder;
    });
  }

  async getPaymentOrderById(orderId: string): Promise<PaymentOrder> {
    return this.uow.execute(async ({ orders }) => {
      const order = await orders.findById(orderId);
      if (!order) {
        throw new PaymentOrderNotFoundError(orderId);
      }
      return order;
    });
  }
}
