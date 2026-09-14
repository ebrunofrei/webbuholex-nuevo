import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentAttempt } from "@/lib/payments/create-payment-attempt";
import { PaymentAttemptConflictError, PaymentAttemptCreationError } from "@/lib/payments/payment-errors";
import { UnitOfWork, PaymentContext, PaymentOrderRepository, PaymentAttemptRepository, PaymentQuoteRepository, PaymentCheckoutSessionRepository, PaymentProviderEventRepository } from "@/lib/payments/payment-repositories";
import { PaymentOrder, PaymentAttempt } from "@/lib/schemas/payments";

class MockUnitOfWork implements UnitOfWork {
  constructor(public context: PaymentContext) {}
  async execute<T>(work: (context: PaymentContext) => Promise<T>): Promise<T> {
    return work(this.context);
  }
}

describe("createPaymentAttempt", () => {
  let uow: MockUnitOfWork;
  let ordersMock: Record<string, PaymentOrder>;
  let attemptsMock: PaymentAttempt[];

  beforeEach(() => {
    ordersMock = {};
    attemptsMock = [];

    const ordersRepo: PaymentOrderRepository = {
      findById: vi.fn(),
      findByIdForUpdate: vi.fn(async (id) => ordersMock[id] || null),
      findByQuoteReference: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      insertIdempotent: vi.fn(),
      markProcessingFromAwaitingPayment: vi.fn(),
      finalizePaidFromAwaitingPayment: vi.fn(),
    };

    const attemptsRepo: PaymentAttemptRepository = {
      findById: vi.fn(),
      findByOperationKey: vi.fn(async (key) => attemptsMock.find(a => a.operationKey === key) || null),
      listByPaymentOrderId: vi.fn(),
      findLatestByPaymentOrderId: vi.fn(async (orderId) => {
        const orderAttempts = attemptsMock.filter(a => a.paymentOrderId === orderId);
        if (orderAttempts.length === 0) return null;
        return orderAttempts.reduce((max, a) => (a.attemptNumber > max.attemptNumber ? a : max));
      }),
      insert: vi.fn(async (a) => { attemptsMock.push(a); }),
      assignProviderPaymentId: vi.fn(),
      transitionStatus: vi.fn(),
      transitionStatusFromProcessing: vi.fn(),
      claimAttempt: vi.fn(),
    };

    uow = new MockUnitOfWork({
      orders: ordersRepo,
      attempts: attemptsRepo,
      quotes: {} as PaymentQuoteRepository,
      checkoutSessions: {} as PaymentCheckoutSessionRepository,
      providerEvents: {} as PaymentProviderEventRepository,
    });
  });

  const testOrderId = "11111111-1111-4111-8111-111111111111";
  const testAttemptId1 = "22222222-2222-4222-8222-222222222222";

  const baseOrder: PaymentOrder = {
    id: testOrderId,
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

  it("creates a new attempt when valid", async () => {
    ordersMock[testOrderId] = { ...baseOrder };

    const attempt = await uow.execute(ctx =>
      createPaymentAttempt(ctx, testOrderId, "card", "op-1")
    );

    expect(attempt).toBeDefined();
    expect(attempt.attemptNumber).toBe(1);
    expect(attempt.status).toBe("created");
    expect(attemptsMock).toHaveLength(1);
    expect(attemptsMock[0]!.id).toBe(attempt.id);
  });

  it("increments attemptNumber correctly", async () => {
    ordersMock[testOrderId] = { ...baseOrder };
    attemptsMock.push({
      id: testAttemptId1,
      paymentOrderId: testOrderId,
      attemptNumber: 5,
      operationKey: "op-old",
      provider: "culqi",
      paymentMethod: "card",
      providerPaymentId: null,
      status: "failed",
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: new Date(),
      succeededAt: null,
      failedAt: new Date(),
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    });

    const attempt = await uow.execute(ctx =>
      createPaymentAttempt(ctx, testOrderId, "card", "op-new")
    );

    expect(attempt.attemptNumber).toBe(6);
  });

  it("returns existing attempt idempotently if intent matches", async () => {
    ordersMock[testOrderId] = { ...baseOrder };
    attemptsMock.push({
      id: testAttemptId1,
      paymentOrderId: testOrderId,
      attemptNumber: 1,
      operationKey: "op-idempotent",
      provider: "culqi",
      paymentMethod: "card",
      providerPaymentId: null,
      status: "created",
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    });

    const attempt = await uow.execute(ctx =>
      createPaymentAttempt(ctx, testOrderId, "card", "op-idempotent")
    );

    expect(attempt.id).toBe(testAttemptId1);
    expect(attemptsMock).toHaveLength(1); // No new attempt inserted
  });

  it("throws conflict error if operationKey reused with different intent", async () => {
    ordersMock[testOrderId] = { ...baseOrder };
    attemptsMock.push({
      id: testAttemptId1,
      paymentOrderId: testOrderId,
      attemptNumber: 1,
      operationKey: "op-conflict",
      provider: "culqi",
      paymentMethod: "card", // Original was card
      providerPaymentId: null,
      status: "created",
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    });

    await expect(
      uow.execute(ctx => createPaymentAttempt(ctx, testOrderId, "yape", "op-conflict"))
    ).rejects.toThrow(PaymentAttemptConflictError);
  });

  it("rejects attempt if order is not awaiting_payment", async () => {
    ordersMock[testOrderId] = { ...baseOrder, status: "paid" };

    await expect(
      uow.execute(ctx => createPaymentAttempt(ctx, testOrderId, "card", "op-1"))
    ).rejects.toThrow(PaymentAttemptCreationError);
  });

  it("rejects attempt if order is expired", async () => {
    ordersMock[testOrderId] = { ...baseOrder, expiresAt: new Date(Date.now() - 10000) };

    await expect(
      uow.execute(ctx => createPaymentAttempt(ctx, testOrderId, "card", "op-1"))
    ).rejects.toThrow(PaymentAttemptCreationError);
  });
});
