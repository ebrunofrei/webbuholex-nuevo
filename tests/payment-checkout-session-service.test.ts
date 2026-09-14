import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PaymentCheckoutSessionService,
  PaymentOrderNotEligibleForCheckoutError,
  CheckoutSessionNotFoundError,
  CheckoutSessionExpiredError,
  CheckoutSessionRevokedError,
  InvalidCheckoutTokenFormatError,
} from "@/lib/payments/payment-checkout-session-service";
import { UnitOfWork, PaymentContext, PaymentOrderRepository, PaymentCheckoutSessionRepository, PaymentQuoteRepository } from "@/lib/payments/payment-repositories";
import { PaymentOrder, PaymentCheckoutSession } from "@/lib/schemas/payments";
import { hashCheckoutToken } from "@/lib/payments/payment-checkout-session";
import { PaymentOrderNotFoundError } from "@/lib/payments/payment-service";

class MockUnitOfWork implements UnitOfWork {
  constructor(public context: PaymentContext) {}
  async execute<T>(work: (context: PaymentContext) => Promise<T>): Promise<T> {
    return work(this.context);
  }
}

describe("PaymentCheckoutSessionService", () => {
  let uow: MockUnitOfWork;
  let service: PaymentCheckoutSessionService;
  let ordersMock: Record<string, PaymentOrder>;
  let sessionsMock: Record<string, PaymentCheckoutSession>;

  beforeEach(() => {
    ordersMock = {};
    sessionsMock = {};

    const ordersRepo: PaymentOrderRepository = {
      findById: vi.fn(async (id) => ordersMock[id] || null),
      findByIdForUpdate: vi.fn(async (id) => ordersMock[id] || null),
      findByQuoteReference: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      insertIdempotent: vi.fn(),
    };

    const sessionsRepo: PaymentCheckoutSessionRepository = {
      findActiveByPaymentOrderIdForUpdate: vi.fn(async (id) => Object.values(sessionsMock).find(s => s.paymentOrderId === id && s.status === 'active') || null),
      findByTokenHash: vi.fn(async (hash) => Object.values(sessionsMock).find(s => s.tokenHash === hash) || null),
      insert: vi.fn(async (s) => { sessionsMock[s.id] = s; }),
      revoke: vi.fn(async (id) => { if (sessionsMock[id]) sessionsMock[id].status = 'revoked'; }),
      markExpired: vi.fn(async (id) => { if (sessionsMock[id]) sessionsMock[id].status = 'expired'; }),
    };

    uow = new MockUnitOfWork({ orders: ordersRepo, checkoutSessions: sessionsRepo, quotes: {} as PaymentQuoteRepository });
    service = new PaymentCheckoutSessionService(uow);
  });

  const baseOrder: PaymentOrder = {
    id: "order-1",
    serviceId: "srv-1",
    subOfferId: null,
    customerReference: "ref",
    quoteReference: null,
    amountMinor: 1000,
    currency: "PEN",
    provider: null,
    providerOrderId: null,
    providerPaymentId: null,
    paymentMethod: null,
    status: "awaiting_payment",
    idempotencyKey: "idem-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,
    expiresAt: null,
    expiredAt: null,
  };

  describe("createCheckoutSessionForPaymentOrder", () => {
    it("creates session for awaiting_payment order and returns plaintext token", async () => {
      ordersMock["order-1"] = { ...baseOrder };
      const res = await service.createCheckoutSessionForPaymentOrder("order-1");
      expect(res.token).toBeDefined();
      expect(res.sessionId).toBeDefined();
      expect(sessionsMock[res.sessionId]).toBeDefined();
      expect(sessionsMock[res.sessionId]!.tokenHash).toBe(hashCheckoutToken(res.token));
      expect(Object.values(sessionsMock).find(s => s.tokenHash === res.token)).toBeUndefined();
    });

    it("rejects non-awaiting_payment statuses", async () => {
      const statuses: PaymentOrder["status"][] = ["draft", "processing", "paid", "failed", "cancelled", "expired", "refunded"];
      for (const status of statuses) {
        ordersMock["order-1"] = { ...baseOrder, status };
        await expect(service.createCheckoutSessionForPaymentOrder("order-1")).rejects.toThrow(PaymentOrderNotEligibleForCheckoutError);
      }
    });

    it("sets TTL to exactly 30 minutes if order has no deadline", async () => {
      vi.useFakeTimers();
      const now = new Date("2026-09-13T12:00:00Z");
      vi.setSystemTime(now);
      ordersMock["order-1"] = { ...baseOrder, expiresAt: null };

      const res = await service.createCheckoutSessionForPaymentOrder("order-1");
      const expectedExpiry = new Date(now.getTime() + 30 * 60 * 1000);
      expect(res.expiresAt).toEqual(expectedExpiry);
      expect(sessionsMock[res.sessionId]!.expiresAt).toEqual(expectedExpiry);

      vi.useRealTimers();
    });

    it("sets TTL to order.expiresAt if order deadline is earlier than 30 minutes", async () => {
      vi.useFakeTimers();
      const now = new Date("2026-09-13T12:00:00Z");
      vi.setSystemTime(now);
      const earlierExpiry = new Date(now.getTime() + 15 * 60 * 1000);
      ordersMock["order-1"] = { ...baseOrder, expiresAt: earlierExpiry };

      const res = await service.createCheckoutSessionForPaymentOrder("order-1");
      expect(res.expiresAt).toEqual(earlierExpiry);
      expect(sessionsMock[res.sessionId]!.expiresAt).toEqual(earlierExpiry);

      vi.useRealTimers();
    });

    it("rejects order if its deadline is in the past", async () => {
      vi.useFakeTimers();
      const now = new Date("2026-09-13T12:00:00Z");
      vi.setSystemTime(now);
      const pastExpiry = new Date(now.getTime() - 1000);
      ordersMock["order-1"] = { ...baseOrder, expiresAt: pastExpiry };

      await expect(service.createCheckoutSessionForPaymentOrder("order-1")).rejects.toThrow(PaymentOrderNotEligibleForCheckoutError);

      vi.useRealTimers();
    });

    it("maintains rotation invariants", async () => {
      ordersMock["order-1"] = { ...baseOrder };

      const res1 = await service.createCheckoutSessionForPaymentOrder("order-1");
      expect(sessionsMock[res1.sessionId]!.status).toBe("active");

      const res2 = await service.createCheckoutSessionForPaymentOrder("order-1");
      expect(sessionsMock[res1.sessionId]!.status).toBe("revoked");
      expect(sessionsMock[res2.sessionId]!.status).toBe("active");

      // Old token no longer resolves (since the mock repo checks for active status)
      await expect(service.resolveCheckoutSession(res1.token)).rejects.toThrow(CheckoutSessionRevokedError);

      // New token resolves
      const resolved = await service.resolveCheckoutSession(res2.token);
      expect(resolved).toBeDefined();

      // Exactly one active session exists
      const activeSessions = Object.values(sessionsMock).filter(s => s.status === "active");
      expect(activeSessions).toHaveLength(1);
    });

    it("rejects non-existent order", async () => {
      await expect(service.createCheckoutSessionForPaymentOrder("not-found")).rejects.toThrow(PaymentOrderNotFoundError);
    });
  });

  describe("resolveCheckoutSession", () => {
    it("resolves valid token returning minimal DTO", async () => {
      ordersMock["order-1"] = { ...baseOrder };
      const { token, sessionId } = await service.createCheckoutSessionForPaymentOrder("order-1");
      const dto = await service.resolveCheckoutSession(token);
      expect(dto.serviceId).toBe("srv-1");
      expect(dto.amountMinor).toBe(1000);
      expect((dto as any).tokenHash).toBeUndefined();
      expect((dto as any).customerReference).toBeUndefined();
    });

    it("rejects malformed token without hitting DB", async () => {
      await expect(service.resolveCheckoutSession("short")).rejects.toThrow(InvalidCheckoutTokenFormatError);
      expect(uow.context.checkoutSessions.findByTokenHash).not.toHaveBeenCalled();
    });

    it("rejects unknown token", async () => {
      ordersMock["order-1"] = { ...baseOrder };
      const { token } = await service.createCheckoutSessionForPaymentOrder("order-1");
      await expect(service.resolveCheckoutSession(token + "x")).rejects.toThrow(InvalidCheckoutTokenFormatError);

      const res = await service.createCheckoutSessionForPaymentOrder("order-1");
      // Muck up token hash in db or just query a non-existent token format
      // Actually to test unknown token, let's just make up a valid formatted token
      const unknownToken = "a".repeat(43);
      await expect(service.resolveCheckoutSession(unknownToken)).rejects.toThrow(CheckoutSessionNotFoundError);
    });
  });
});
