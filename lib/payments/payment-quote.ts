import { PaymentQuote, PaymentQuoteStatus } from "../schemas/payment-quotes";

export class InvalidPaymentQuoteStateTransitionError extends Error {
  constructor(public from: PaymentQuoteStatus, public to: PaymentQuoteStatus) {
    super(`Cannot transition payment quote from ${from} to ${to}`);
    this.name = "InvalidPaymentQuoteStateTransitionError";
  }
}

export function canTransitionPaymentQuote(
  quote: PaymentQuote,
  to: PaymentQuoteStatus
): boolean {
  if (quote.status === to) {
    return true; // Idempotent
  }

  const from = quote.status;

  if (from === "draft") {
    return to === "approved" || to === "rejected" || to === "cancelled";
  }

  if (from === "approved") {
    return to === "expired" || to === "cancelled";
  }

  // terminal states: rejected, cancelled, expired cannot be reopened
  return false;
}

export function transitionPaymentQuote(
  quote: PaymentQuote,
  to: PaymentQuoteStatus,
  timestamp: Date
): PaymentQuote {
  if (!canTransitionPaymentQuote(quote, to)) {
    throw new InvalidPaymentQuoteStateTransitionError(quote.status, to);
  }

  if (quote.status === to) {
    return quote;
  }

  const nextQuote = { ...quote, status: to, updatedAt: timestamp };

  if (to === "approved") {
    nextQuote.approvedAt = timestamp;
  } else if (to === "rejected") {
    nextQuote.rejectedAt = timestamp;
  } else if (to === "cancelled") {
    nextQuote.cancelledAt = timestamp;
  } else if (to === "expired") {
    nextQuote.expiredAt = timestamp;
  }

  return nextQuote;
}
