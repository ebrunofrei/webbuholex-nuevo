import { describe, expect, it } from "vitest";
import {
  paymentOrderSchema,
  paymentOrderStatusSchema,
  paymentMethodSchema,
  paymentProviderSchema,
} from "@/lib/schemas/payments";
import {
  canTransitionPaymentOrder,
  transitionPaymentOrder,
} from "@/lib/payments/payment-order";

describe("Payment Domain - PAY-1", () => {
  const baseValidOrder = {
    id: "a314eb44-4b5c-4f1e-8a2f-12c8a14b0b1c",
    serviceId: "SRV-LEGAL-001",
    subOfferId: null,
    customerReference: "user@example.com",
    quoteReference: null,
    amountMinor: 10000,
    currency: "PEN",
    provider: null,
    providerOrderId: null,
    providerPaymentId: null,
    paymentMethod: null,
    status: "draft",
    idempotencyKey: "idem-12345",
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,
    expiresAt: null,
    expiredAt: null,
  };

  describe("Schema Validation", () => {
    it("accepts a valid draft order", () => {
      expect(paymentOrderSchema.parse(baseValidOrder)).toBeDefined();
    });

    it("rejects zero amountMinor", () => {
      const order = { ...baseValidOrder, amountMinor: 0 };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("rejects negative amountMinor", () => {
      const order = { ...baseValidOrder, amountMinor: -100 };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("rejects decimal amountMinor", () => {
      const order = { ...baseValidOrder, amountMinor: 100.5 };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("accepts PEN currency", () => {
      const order = { ...baseValidOrder, currency: "PEN" };
      expect(paymentOrderSchema.parse(order)).toBeDefined();
    });

    it("rejects invalid currency", () => {
      const order = { ...baseValidOrder, currency: "USD" };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("rejects invalid status", () => {
      const order = { ...baseValidOrder, status: "unknown" };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("accepts culqi provider if present", () => {
      const order = { ...baseValidOrder, provider: "culqi" };
      expect(paymentOrderSchema.parse(order)).toBeDefined();
    });

    it("rejects invalid provider", () => {
      const order = { ...baseValidOrder, provider: "stripe" };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("rejects paymentMethod non-null in draft", () => {
      const order = { ...baseValidOrder, paymentMethod: "card" };
      expect(() => paymentOrderSchema.parse(order)).toThrow("Payment method must be null");
    });

    it("accepts card and yape payment methods in awaiting_payment", () => {
      const order1 = { ...baseValidOrder, status: "awaiting_payment", paymentMethod: "card" };
      const order2 = { ...baseValidOrder, status: "awaiting_payment", paymentMethod: "yape" };
      expect(paymentOrderSchema.parse(order1)).toBeDefined();
      expect(paymentOrderSchema.parse(order2)).toBeDefined();
    });

    it("rejects invalid payment method", () => {
      const order = { ...baseValidOrder, status: "awaiting_payment", paymentMethod: "cash" };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("rejects empty idempotencyKey", () => {
      const order = { ...baseValidOrder, idempotencyKey: "" };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });

    it("rejects empty serviceId", () => {
      const order = { ...baseValidOrder, serviceId: "" };
      expect(() => paymentOrderSchema.parse(order)).toThrow();
    });
  });

  describe("Timestamp Invariants", () => {
    it("paid status requires paidAt", () => {
      const order = { ...baseValidOrder, status: "paid", paidAt: null };
      expect(() => paymentOrderSchema.parse(order)).toThrow("paidAt MUST NOT be null");
    });

    it("refunded status requires paidAt and refundedAt", () => {
      const order = { ...baseValidOrder, status: "refunded", paidAt: new Date(), refundedAt: null };
      expect(() => paymentOrderSchema.parse(order)).toThrow("refundedAt MUST NOT be null");
    });

    it("failed status requires failedAt", () => {
      const order = { ...baseValidOrder, status: "failed", failedAt: null };
      expect(() => paymentOrderSchema.parse(order)).toThrow("failedAt MUST NOT be null");
    });

    it("cancelled status requires cancelledAt", () => {
      const order = { ...baseValidOrder, status: "cancelled", cancelledAt: null };
      expect(() => paymentOrderSchema.parse(order)).toThrow("cancelledAt MUST NOT be null");
    });

    it("rejects paidAt if status is not paid or refunded", () => {
      const order = { ...baseValidOrder, status: "draft", paidAt: new Date() };
      expect(() => paymentOrderSchema.parse(order)).toThrow("paidAt MUST be null");
    });

    it("expired status requires expiredAt", () => {
      const order = { ...baseValidOrder, status: "expired", expiredAt: null };
      expect(() => paymentOrderSchema.parse(order)).toThrow("expiredAt MUST NOT be null");
    });

    it("rejects expiredAt if status is not expired", () => {
      const order = { ...baseValidOrder, status: "draft", expiredAt: new Date() };
      expect(() => paymentOrderSchema.parse(order)).toThrow("expiredAt MUST be null");
    });
  });

  describe("State Transitions", () => {
    it("allows valid transitions", () => {
      expect(canTransitionPaymentOrder("draft", "awaiting_payment")).toBe(true);
      expect(canTransitionPaymentOrder("draft", "cancelled")).toBe(true);
      expect(canTransitionPaymentOrder("awaiting_payment", "processing")).toBe(true);
      expect(canTransitionPaymentOrder("awaiting_payment", "cancelled")).toBe(true);
      expect(canTransitionPaymentOrder("awaiting_payment", "expired")).toBe(true);
      expect(canTransitionPaymentOrder("processing", "paid")).toBe(true);
      expect(canTransitionPaymentOrder("processing", "failed")).toBe(true);
      expect(canTransitionPaymentOrder("paid", "refunded")).toBe(true);
    });

    it("rejects illegal transitions", () => {
      expect(canTransitionPaymentOrder("draft", "paid")).toBe(false);
      expect(canTransitionPaymentOrder("paid", "processing")).toBe(false);
    });

    it("prevents reopening terminal states", () => {
      expect(canTransitionPaymentOrder("failed", "draft")).toBe(false);
      expect(canTransitionPaymentOrder("cancelled", "draft")).toBe(false);
      expect(canTransitionPaymentOrder("refunded", "paid")).toBe(false);
    });

    it("applies transition logic and updates timestamps", () => {
      const order = { ...baseValidOrder } as any;
      const t1 = transitionPaymentOrder(order, "awaiting_payment");
      expect(t1.status).toBe("awaiting_payment");

      const t2 = transitionPaymentOrder(t1, "processing");
      expect(t2.status).toBe("processing");

      const t3 = transitionPaymentOrder(t2, "paid");
      expect(t3.status).toBe("paid");
      expect(t3.paidAt).not.toBeNull();

      const t4 = transitionPaymentOrder(t3, "refunded");
      expect(t4.status).toBe("refunded");
      expect(t4.refundedAt).not.toBeNull();
      expect(t4.paidAt).toBe(t3.paidAt); // retains previous timestamps
    });

    it("assigns expiredAt but preserves expiresAt on expired transition", () => {
      const mockExpiresAt = new Date("2026-12-31T23:59:59Z");
      const order = { ...baseValidOrder, status: "awaiting_payment", expiresAt: mockExpiresAt } as any;
      const t1 = transitionPaymentOrder(order, "expired");

      expect(t1.status).toBe("expired");
      expect(t1.expiredAt).not.toBeNull();
      expect(t1.expiresAt).toEqual(mockExpiresAt); // Preserves original deadline
      expect(t1.expiredAt).not.toEqual(t1.expiresAt); // They are distinct fields
    });

    it("allows draft to cancelled transition", () => {
      const order = { ...baseValidOrder } as any;
      const t1 = transitionPaymentOrder(order, "cancelled");
      expect(t1.status).toBe("cancelled");
      expect(t1.cancelledAt).not.toBeNull();
    });
  });
});
