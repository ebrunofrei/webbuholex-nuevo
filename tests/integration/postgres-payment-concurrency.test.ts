import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PaymentService } from "../../lib/payments/payment-service";
import { PostgresPaymentUnitOfWork } from "../../lib/payments/postgres-payment-unit-of-work";
import { v4 as uuidv4 } from "uuid";
import * as schema from "../../database/schema";
import { paymentQuotes } from "../../database/schema/payment-quotes";
import { paymentOrders } from "../../database/schema/payments";
import { eq } from "drizzle-orm";

// ------------------------------------------------------------------
// PREREQUISITES FOR EXECUTION:
// ------------------------------------------------------------------
// 1. A real PostgreSQL instance must be running.
// 2. The database must have the WebBuholex schema applied (pnpm db:migrate).
// 3. Environment variable POSTGRES_TEST_DATABASE_URL must be set.
// 4. Run via: pnpm exec vitest run tests/integration/postgres-payment-concurrency.test.ts
// ------------------------------------------------------------------

const TEST_DB_URL = process.env.POSTGRES_TEST_DATABASE_URL;

describe.runIf(!!TEST_DB_URL)("REAL POSTGRES CONCURRENCY TEST", () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let service: PaymentService;

  // Track IDs for cleanup
  let currentQuoteId: string | null = null;
  let currentOrderIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(TEST_DB_URL as string, { max: 10 });
    db = drizzle(sql, { schema });

    const uow = new PostgresPaymentUnitOfWork(db);
    service = new PaymentService(uow);
  });

  afterAll(async () => {
    if (sql) {
      await sql.end();
    }
  });

  afterEach(async () => {
    // Cleanup generated data using explicit identifiers
    if (currentOrderIds.length > 0) {
      for (const orderId of currentOrderIds) {
        await db.delete(paymentOrders).where(eq(paymentOrders.id, orderId));
      }
      currentOrderIds = [];
    }
    if (currentQuoteId) {
      await db.delete(paymentQuotes).where(eq(paymentQuotes.id, currentQuoteId));
      currentQuoteId = null;
    }
  });

  it("concurrent quote conversion resolves to exactly ONE unique canonical order", async () => {
    // 1. Create a real approved quote in the DB
    currentQuoteId = uuidv4();
    await db.insert(paymentQuotes).values({
      id: currentQuoteId,
      serviceId: "srv_concurrent",
      subOfferId: null,
      customerReference: "cust_concurrent",
      amountMinor: 5000,
      currency: "PEN",
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: new Date(),
    });

    // 2. Launch concurrent creation attempts
    const [order1, order2, order3] = await Promise.all([
      service.createPaymentOrderFromApprovedQuote(currentQuoteId),
      service.createPaymentOrderFromApprovedQuote(currentQuoteId),
      service.createPaymentOrderFromApprovedQuote(currentQuoteId),
    ]);

    // Track for cleanup
    if (order1) currentOrderIds.push(order1.id);

    // 3. Assert all calls returned the SAME canonical order ID
    expect(order1.id).toBe(order2.id);
    expect(order1.id).toBe(order3.id);
    expect(order1.idempotencyKey).toBe(`quote_generation_${currentQuoteId}`);

    // 4. Assert exactly ONE order exists in the DB for this quote
    const dbOrders = await db.select().from(schema.paymentOrders).where(eq(schema.paymentOrders.quoteReference, currentQuoteId));
    expect(dbOrders.length).toBe(1);
    expect(dbOrders[0]?.id).toBe(order1.id);
  });
});
