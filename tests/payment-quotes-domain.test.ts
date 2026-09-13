import { describe, it, expect } from "vitest";
import { paymentQuoteSchema } from "../lib/schemas/payment-quotes";
import {
  canTransitionPaymentQuote,
  transitionPaymentQuote,
  InvalidPaymentQuoteStateTransitionError,
} from "../lib/payments/payment-quote";
import { v4 as uuidv4 } from "uuid";

describe("Payment Quote Domain", () => {
  const baseQuote = {
    id: uuidv4(),
    serviceId: "srv_test",
    subOfferId: null,
    customerReference: "test_customer",
    amountMinor: 1000,
    currency: "PEN" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    expiresAt: null,
    expiredAt: null,
  };

  it("should validate a valid draft quote", () => {
    const quote = { ...baseQuote, status: "draft" };
    expect(paymentQuoteSchema.parse(quote)).toEqual(quote);
  });

  it("should reject amountMinor 0 or negative", () => {
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", amountMinor: 0 })
    ).toThrow();
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", amountMinor: -100 })
    ).toThrow();
  });

  it("should reject decimal amountMinor", () => {
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", amountMinor: 10.5 })
    ).toThrow();
  });

  it("should reject non-PEN currency", () => {
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", currency: "USD" })
    ).toThrow();
  });

  it("should reject empty serviceId or customerReference", () => {
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", serviceId: "" })
    ).toThrow();
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", customerReference: "" })
    ).toThrow();
  });

  it("draft -> approved requires approvedAt", () => {
    const draftQuote = { ...baseQuote, status: "draft" as const };
    const date = new Date();
    const approvedQuote = transitionPaymentQuote(draftQuote, "approved", date);

    expect(approvedQuote.status).toBe("approved");
    expect(approvedQuote.approvedAt).toBe(date);
    expect(paymentQuoteSchema.parse(approvedQuote)).toEqual(approvedQuote);
  });

  it("approved -> expired assigns expiredAt", () => {
    const draftQuote = { ...baseQuote, status: "draft" as const };
    const date1 = new Date("2026-09-01T10:00:00Z");
    const date2 = new Date("2026-09-02T10:00:00Z");

    const approvedQuote = transitionPaymentQuote(draftQuote, "approved", date1);
    const expiredQuote = transitionPaymentQuote(approvedQuote, "expired", date2);

    expect(expiredQuote.status).toBe("expired");
    expect(expiredQuote.expiredAt).toBe(date2);
    expect(expiredQuote.approvedAt).toBe(date1); // Retains earlier timestamps
    expect(paymentQuoteSchema.parse(expiredQuote)).toEqual(expiredQuote);
  });

  it("expiredAt incompatible with other states is rejected", () => {
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "draft", expiredAt: new Date() })
    ).toThrow();
    expect(() =>
      paymentQuoteSchema.parse({ ...baseQuote, status: "approved", approvedAt: new Date(), expiredAt: new Date() })
    ).toThrow();
  });

  it("terminal states cannot be reopened", () => {
    const draftQuote = { ...baseQuote, status: "draft" as const };
    const cancelledQuote = transitionPaymentQuote(draftQuote, "cancelled", new Date());

    expect(canTransitionPaymentQuote(cancelledQuote, "draft")).toBe(false);
    expect(canTransitionPaymentQuote(cancelledQuote, "approved")).toBe(false);
    expect(() => transitionPaymentQuote(cancelledQuote, "approved", new Date())).toThrow(
      InvalidPaymentQuoteStateTransitionError
    );
  });

  it("idempotent transitions return same quote", () => {
    const draftQuote = { ...baseQuote, status: "draft" as const };
    const result = transitionPaymentQuote(draftQuote, "draft", new Date());
    expect(result).toBe(draftQuote);
  });
});
