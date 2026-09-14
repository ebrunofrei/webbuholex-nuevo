import { describe, it, expect } from "vitest";
import { paymentOrderSchema } from "../lib/schemas/payments";
import { paymentQuoteSchema } from "../lib/schemas/payment-quotes";

describe("Email Canonicalization", () => {
  it("trims customerEmail in PaymentOrder", () => {
    const data = {
      id: "00000000-0000-0000-0000-000000000000",
      serviceId: "srv_1",
      subOfferId: null,
      customerReference: "ref_1",
      customerEmail: "  user@example.com  ",
      quoteReference: null,
      amountMinor: 1000,
      currency: "PEN",
      provider: null,
      providerOrderId: null,
      providerPaymentId: null,
      paymentMethod: null,
      status: "draft",
      idempotencyKey: "idem_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      failedAt: null,
      cancelledAt: null,
      refundedAt: null,
      expiresAt: null,
      expiredAt: null,
    };

    const parsed = paymentOrderSchema.parse(data);
    expect(parsed.customerEmail).toBe("user@example.com");
  });

  it("trims customerEmail in PaymentQuote", () => {
    const data = {
      id: "00000000-0000-0000-0000-000000000000",
      serviceId: "srv_1",
      subOfferId: null,
      customerReference: "ref_1",
      customerEmail: "  user@example.com  ",
      amountMinor: 1000,
      currency: "PEN",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      cancelledAt: null,
      expiresAt: null,
      expiredAt: null,
    };

    const parsed = paymentQuoteSchema.parse(data);
    expect(parsed.customerEmail).toBe("user@example.com");
  });

  it("rejects invalid email formats", () => {
    const data = {
      id: "00000000-0000-0000-0000-000000000000",
      serviceId: "srv_1",
      subOfferId: null,
      customerReference: "ref_1",
      customerEmail: "  user_at_example.com  ",
      quoteReference: null,
      amountMinor: 1000,
      currency: "PEN",
      provider: null,
      providerOrderId: null,
      providerPaymentId: null,
      paymentMethod: null,
      status: "draft",
      idempotencyKey: "idem_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      failedAt: null,
      cancelledAt: null,
      refundedAt: null,
      expiresAt: null,
      expiredAt: null,
    };

    expect(() => paymentOrderSchema.parse(data)).toThrow();
  });
});
