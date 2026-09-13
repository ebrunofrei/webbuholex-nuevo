import { PaymentQuote } from "../schemas/payment-quotes";
import { PaymentOrder } from "../schemas/payments";

export interface PaymentQuoteRepository {
  findById(id: string): Promise<PaymentQuote | null>;
  save(quote: PaymentQuote): Promise<void>;
}

export interface PaymentOrderRepository {
  findByQuoteReference(quoteReference: string): Promise<PaymentOrder | null>;
  findByIdempotencyKey(key: string): Promise<PaymentOrder | null>;
  insertIdempotent(order: PaymentOrder): Promise<"inserted" | "already_exists">;
}

export interface PaymentContext {
  quotes: PaymentQuoteRepository;
  orders: PaymentOrderRepository;
}

export interface UnitOfWork {
  execute<T>(work: (context: PaymentContext) => Promise<T>): Promise<T>;
}
