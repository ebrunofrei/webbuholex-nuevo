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
  markProcessingFromAwaitingPayment(orderId: string, now: Date): Promise<boolean>;
  finalizePaidFromAwaitingPayment(
    orderId: string,
    details: {
      provider: string;
      paymentMethod: string;
      providerPaymentId: string;
      paidAt: Date;
    }
  ): Promise<boolean>;
}

export interface PaymentCheckoutSessionRepository {
  findActiveByPaymentOrderIdForUpdate(paymentOrderId: string): Promise<PaymentCheckoutSession | null>;
  findByTokenHash(tokenHash: string): Promise<PaymentCheckoutSession | null>;
  insert(session: PaymentCheckoutSession): Promise<void>;
  revoke(id: string, now: Date): Promise<void>;
  markExpired(id: string, now: Date): Promise<void>;
}

import {
  PaymentAttempt,
  PaymentProviderEvent,
  PaymentAttemptStatus,
  PaymentAttemptFailureCategory,
  PaymentProviderEventStatus,
} from "../schemas/payments";

export interface PaymentAttemptRepository {
  findById(id: string): Promise<PaymentAttempt | null>;
  findByOperationKey(operationKey: string): Promise<PaymentAttempt | null>;
  listByPaymentOrderId(orderId: string): Promise<PaymentAttempt[]>;
  findLatestByPaymentOrderId(orderId: string): Promise<PaymentAttempt | null>;
  insert(attempt: PaymentAttempt): Promise<void>;
  assignProviderPaymentId(
    id: string,
    providerPaymentId: string,
    timestamp: Date
  ): Promise<void>;
  transitionStatus(
    id: string,
    newStatus: PaymentAttemptStatus,
    timestamp: Date,
    details?: {
      failureCategory?: PaymentAttemptFailureCategory | null;
      failureCode?: string | null;
    }
  ): Promise<void>;
  transitionStatusFromProcessing(
    id: string,
    newStatus: PaymentAttemptStatus,
    timestamp: Date,
    details?: {
      failureCategory?: PaymentAttemptFailureCategory | null;
      failureCode?: string | null;
    }
  ): Promise<boolean>;
  claimAttempt(id: string, now: Date): Promise<boolean>;
}

export interface PaymentProviderEventRepository {
  findById(id: string): Promise<PaymentProviderEvent | null>;
  findByProviderEventId(
    provider: string,
    providerEventId: string
  ): Promise<PaymentProviderEvent | null>;
  findByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PaymentProviderEvent | null>;
  insertIdempotent(
    event: PaymentProviderEvent
  ): Promise<"inserted" | "already_exists">;
  markProcessing(id: string, now: Date): Promise<void>;
  markProcessed(id: string, now: Date): Promise<void>;
  markFailed(id: string, failureCode: string | null, now: Date): Promise<void>;
}

export interface PaymentContext {
  quotes: PaymentQuoteRepository;
  orders: PaymentOrderRepository;
  checkoutSessions: PaymentCheckoutSessionRepository;
  attempts: PaymentAttemptRepository;
  providerEvents: PaymentProviderEventRepository;
}

export interface UnitOfWork {
  execute<T>(work: (context: PaymentContext) => Promise<T>): Promise<T>;
}
