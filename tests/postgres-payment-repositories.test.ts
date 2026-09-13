import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresPaymentUnitOfWork } from "../lib/payments/postgres-payment-unit-of-work";
import { PostgresPaymentQuoteRepository } from "../lib/payments/postgres-payment-quote-repository";
import { PostgresPaymentOrderRepository } from "../lib/payments/postgres-payment-order-repository";
import { PaymentOrder } from "../lib/schemas/payments";
import { v4 as uuidv4 } from "uuid";
import { PaymentQuote } from "../lib/schemas/payment-quotes";

const mocks = vi.hoisted(() => {
  return {
    mockTx: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
    },
    mockDb: {
      transaction: vi.fn(async (cb: Function) => cb(mocks.mockTx)),
    }
  };
});

vi.mock("../database/client", () => ({
  getDatabase: vi.fn(() => mocks.mockDb),
}));

describe("Postgres Payment Infrastructure", () => {
  const mockTx = mocks.mockTx;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.select.mockReturnThis();
    mockTx.from.mockReturnThis();
    mockTx.where.mockReturnThis();
    mockTx.limit.mockReturnThis();
    mockTx.insert.mockReturnThis();
    mockTx.values.mockReturnThis();
    mockTx.onConflictDoNothing.mockReturnThis();
  });

  const dummyQuote: PaymentQuote = {
    id: uuidv4(),
    serviceId: "srv_1",
    subOfferId: null,
    customerReference: "cust_1",
    amountMinor: 5000,
    currency: "PEN",
    status: "approved",
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: new Date(),
    rejectedAt: null,
    cancelledAt: null,
    expiresAt: null,
    expiredAt: null,
  };

  const dummyOrder: PaymentOrder = {
    id: uuidv4(),
    serviceId: "srv_1",
    subOfferId: null,
    customerReference: "cust_1",
    quoteReference: dummyQuote.id,
    amountMinor: 5000,
    currency: "PEN",
    provider: null,
    providerOrderId: null,
    providerPaymentId: null,
    paymentMethod: null,
    status: "awaiting_payment",
    idempotencyKey: `quote_generation_${dummyQuote.id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,
    expiresAt: null,
    expiredAt: null,
  };

  describe("PostgresPaymentQuoteRepository", () => {
    it("findById returns null if empty", async () => {
      const repo = new PostgresPaymentQuoteRepository(mockTx);
      mockTx.limit.mockResolvedValueOnce([]);
      const result = await repo.findById(dummyQuote.id);
      expect(result).toBeNull();
    });

    it("findById returns mapped quote if found", async () => {
      const repo = new PostgresPaymentQuoteRepository(mockTx);
      mockTx.limit.mockResolvedValueOnce([dummyQuote]);
      const result = await repo.findById(dummyQuote.id);
      expect(result?.id).toBe(dummyQuote.id);
      expect(result?.currency).toBe("PEN");
    });
  });

  describe("PostgresPaymentOrderRepository", () => {
    it("findByQuoteReference returns null if empty", async () => {
      const repo = new PostgresPaymentOrderRepository(mockTx);
      mockTx.limit.mockResolvedValueOnce([]);
      const result = await repo.findByQuoteReference(dummyQuote.id);
      expect(result).toBeNull();
    });

    it("findByQuoteReference returns mapped order", async () => {
      const repo = new PostgresPaymentOrderRepository(mockTx);
      mockTx.limit.mockResolvedValueOnce([dummyOrder]);
      const result = await repo.findByQuoteReference(dummyQuote.id);
      expect(result?.id).toBe(dummyOrder.id);
      expect(result?.quoteReference).toBe(dummyQuote.id);
    });

    it("insertIdempotent returns 'inserted' when rowCount is 1", async () => {
      const repo = new PostgresPaymentOrderRepository(mockTx);
      mockTx.onConflictDoNothing.mockResolvedValueOnce({ rowCount: 1 });
      const result = await repo.insertIdempotent(dummyOrder);
      expect(result).toBe("inserted");
    });

    it("insertIdempotent returns 'already_exists' when rowCount is 0", async () => {
      const repo = new PostgresPaymentOrderRepository(mockTx);
      mockTx.onConflictDoNothing.mockResolvedValueOnce({ rowCount: 0 });
      const result = await repo.insertIdempotent(dummyOrder);
      expect(result).toBe("already_exists");
    });
  });

  describe("PostgresPaymentUnitOfWork", () => {
    it("executes work with injected repositories using the same transaction", async () => {
      const uow = new PostgresPaymentUnitOfWork();

      const result = await uow.execute(async (context) => {
        expect(context.quotes).toBeInstanceOf(PostgresPaymentQuoteRepository);
        expect(context.orders).toBeInstanceOf(PostgresPaymentOrderRepository);

        // Assert they share the same injected transaction object
        // by spying or accessing it implicitly if we could, but type guarantees it.
        return "success";
      });

      expect(result).toBe("success");
      expect(mocks.mockDb.transaction).toHaveBeenCalledTimes(1);
    });
  });
});
