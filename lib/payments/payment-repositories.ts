import { PaymentQuote } from "../schemas/payment-quotes";
import { PaymentOrder, PaymentCheckoutSession } from "../schemas/payments";

export interface PaymentQuoteRepository {
  findById(id: string): Promise<PaymentQuote | null>;
  save(quote: PaymentQuote): Promise<void>;
}

export interface PaymentOrderRepository {
  findById(id: string): Promise<PaymentOrder | null>;
  findByIdForUpdate(id: string): Promise<PaymentOrder | null>;
  findByQuoteReference(quoteReference: string): Promise<PaymentOrder | null>;
  findByIdempotencyKey(key: string): Promise<PaymentOrder | null>;
  insertIdempotent(order: PaymentOrder): Promise<"inserted" | "already_exists">;
}

export interface PaymentCheckoutSessionRepository {
  findActiveByPaymentOrderIdForUpdate(paymentOrderId: string): Promise<PaymentCheckoutSession | null>;
  findByTokenHash(tokenHash: string): Promise<PaymentCheckoutSession | null>;
  insert(session: PaymentCheckoutSession): Promise<void>;
  revoke(id: string, now: Date): Promise<void>;
  markExpired(id: string, now: Date): Promise<void>;
}

export interface PaymentContext {
  quotes: PaymentQuoteRepository;
  orders: PaymentOrderRepository;
  checkoutSessions: PaymentCheckoutSessionRepository;
}

export interface UnitOfWork {
  execute<T>(work: (context: PaymentContext) => Promise<T>): Promise<T>;
}
