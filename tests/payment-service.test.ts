import { describe, it, expect, beforeEach, vi } from "vitest";
import { PaymentService, PaymentQuoteNotApprovedError, PaymentQuoteExpiredError, PaymentQuoteNotFoundError, PaymentOrderReconciliationError } from "../lib/payments/payment-service";
import { PaymentQuote } from "../lib/schemas/payment-quotes";
import { PaymentOrder } from "../lib/schemas/payments";
import { PaymentQuoteRepository, PaymentOrderRepository, UnitOfWork } from "../lib/payments/payment-repositories";
import { v4 as uuidv4 } from "uuid";

class MockUnitOfWork implements UnitOfWork {
  constructor(private context: { quotes: PaymentQuoteRepository; orders: PaymentOrderRepository }) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute<T>(work: (context: any) => Promise<T>): Promise<T> {
    return work(this.context);
  }
}

class MockQuoteRepository implements PaymentQuoteRepository {
  quotes: Map<string, PaymentQuote> = new Map();

  async findById(id: string): Promise<PaymentQuote | null> {
    return this.quotes.get(id) || null;
  }
  async save(quote: PaymentQuote): Promise<void> {
    this.quotes.set(quote.id, quote);
  }
}

class MockOrderRepository implements PaymentOrderRepository {
  orders: Map<string, PaymentOrder> = new Map();
  findById = vi.fn().mockImplementation(async (id: string) => this.orders.get(id) || null);

  async findByQuoteReference(quoteReference: string): Promise<PaymentOrder | null> {
    for (const order of this.orders.values()) {
      if (order.quoteReference === quoteReference) return order;
    }
    return null;
  }

  async findByIdempotencyKey(key: string): Promise<PaymentOrder | null> {
    for (const order of this.orders.values()) {
      if (order.idempotencyKey === key) return order;
    }
    return null;
  }
  async insertIdempotent(order: PaymentOrder): Promise<"inserted" | "already_exists"> {
    for (const existing of this.orders.values()) {
      if (existing.idempotencyKey === order.idempotencyKey || existing.quoteReference === order.quoteReference) {
        return "already_exists";
      }
    }
    this.orders.set(order.id, order);
    return "inserted";
  }
}

describe("Payment Service", () => {
  let uow: MockUnitOfWork;
  let quotes: MockQuoteRepository;
  let orders: MockOrderRepository;
  let service: PaymentService;

  beforeEach(() => {
    quotes = new MockQuoteRepository();
    orders = new MockOrderRepository();
    uow = new MockUnitOfWork({ quotes, orders });
    service = new PaymentService(uow);
  });

  const createQuote = (overrides: Partial<PaymentQuote>): PaymentQuote => {
    const q: PaymentQuote = {
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
      ...overrides,
    };
    quotes.quotes.set(q.id, q);
    return q;
  };

  it("approved quote creates PaymentOrder", async () => {
    const quote = createQuote({});
    const now = new Date();

    const order = await service.createPaymentOrderFromApprovedQuote(quote.id, now);

    expect(order.amountMinor).toBe(quote.amountMinor);
    expect(order.currency).toBe(quote.currency);
    expect(order.serviceId).toBe(quote.serviceId);
    expect(order.subOfferId).toBe(quote.subOfferId);
    expect(order.customerReference).toBe(quote.customerReference);
    expect(order.quoteReference).toBe(quote.id);
    expect(order.provider).toBeNull();
    expect(order.paymentMethod).toBeNull();
    expect(order.status).toBe("awaiting_payment");
    expect(order.idempotencyKey).toBe(`quote_generation_${quote.id}`);
  });

  it("draft quote NO crea orden", async () => {
    const quote = createQuote({ status: "draft", approvedAt: null });
    await expect(service.createPaymentOrderFromApprovedQuote(quote.id)).rejects.toThrow(
      PaymentQuoteNotApprovedError
    );
  });

  it("rejected quote NO crea orden", async () => {
    const quote = createQuote({ status: "rejected", approvedAt: null, rejectedAt: new Date() });
    await expect(service.createPaymentOrderFromApprovedQuote(quote.id)).rejects.toThrow(
      PaymentQuoteNotApprovedError
    );
  });

  it("cancelled quote NO crea orden", async () => {
    const quote = createQuote({ status: "cancelled", cancelledAt: new Date() });
    await expect(service.createPaymentOrderFromApprovedQuote(quote.id)).rejects.toThrow(
      PaymentQuoteNotApprovedError
    );
  });

  it("expired quote NO crea orden", async () => {
    const quote = createQuote({ status: "expired", expiredAt: new Date() });
    await expect(service.createPaymentOrderFromApprovedQuote(quote.id)).rejects.toThrow(
      PaymentQuoteNotApprovedError
    );
  });

  it("approved quote sin expiresAt -> order.expiresAt null", async () => {
    const quote = createQuote({ expiresAt: null });
    const order = await service.createPaymentOrderFromApprovedQuote(quote.id);
    expect(order.expiresAt).toBeNull();
  });

  it("approved quote con expiresAt futuro -> order.expiresAt exactamente igual", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 48);
    const quote = createQuote({ expiresAt: futureDate });

    const order = await service.createPaymentOrderFromApprovedQuote(quote.id);
    expect(order.expiresAt).toEqual(futureDate);
  });

  it("approved quote con expiresAt <= now -> no crea order", async () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);
    const quote = createQuote({ expiresAt: pastDate });

    await expect(service.createPaymentOrderFromApprovedQuote(quote.id)).rejects.toThrow(
      PaymentQuoteExpiredError
    );
  });

  it("repeated creation returns same order", async () => {
    const quote = createQuote({});
    const order1 = await service.createPaymentOrderFromApprovedQuote(quote.id);
    const order2 = await service.createPaymentOrderFromApprovedQuote(quote.id);

    expect(order1).toBe(order2);
    expect(order1.id).toEqual(order2.id);
    expect(orders.orders.size).toBe(1);
  });

  it("missing canonical order after conflict raises explicit error", async () => {
    const quote = createQuote({});
    // Simulate inserting correctly
    await service.createPaymentOrderFromApprovedQuote(quote.id);
    // Erase from orders to force the collision retrieval to fail
    orders.orders.clear();

    // The insertIdempotent mock will still say "already_exists" if we adjust the mock,
    // wait, the mock checks for existing in the map. Let's force it.
    orders.insertIdempotent = vi.fn().mockResolvedValue("already_exists");
    orders.findByIdempotencyKey = vi.fn().mockResolvedValue(null);

    await expect(service.createPaymentOrderFromApprovedQuote(quote.id)).rejects.toThrow(
      PaymentOrderReconciliationError
    );
  });
});
