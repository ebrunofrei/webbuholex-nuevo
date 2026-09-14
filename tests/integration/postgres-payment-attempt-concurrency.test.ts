import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { PostgresPaymentUnitOfWork } from "../../lib/payments/postgres-payment-unit-of-work";
import { createPaymentAttempt } from "../../lib/payments/create-payment-attempt";
import { randomUUID } from "crypto";
import * as schema from "../../database/schema";

// This test suite runs ONLY when POSTGRES_TEST_DATABASE_URL is provided.
const testDatabaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;

describe.runIf(!!testDatabaseUrl)("PostgresPaymentAttemptConcurrency", () => {
  let sql: postgres.Sql;
  let db: PostgresJsDatabase<typeof schema>;
  let uow: PostgresPaymentUnitOfWork;

  let paymentOrderId: string;

  beforeAll(async () => {
    sql = postgres(testDatabaseUrl!);
    db = drizzle(sql, { schema });
    uow = new PostgresPaymentUnitOfWork(db);
    await uow.execute(async (ctx) => {
      paymentOrderId = randomUUID();
      const order = {
        id: paymentOrderId,
        serviceId: "test",
        subOfferId: null,
        customerReference: "test-customer",
        quoteReference: null, // bypassing quote for simplicity if allowed
        amountMinor: 1000,
        currency: "PEN" as const,
        provider: null,
        providerOrderId: null,
        providerPaymentId: null,
        paymentMethod: null,
        status: "awaiting_payment" as const,
        idempotencyKey: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,
        expiresAt: null,
        expiredAt: null,
      };

      await ctx.orders.insertIdempotent(order);
    });
  });

  afterAll(async () => {
    if (paymentOrderId && db) {
      await db.delete(schema.paymentProviderEvents).where(eq(schema.paymentProviderEvents.paymentOrderId, paymentOrderId));
      await db.delete(schema.paymentAttempts).where(eq(schema.paymentAttempts.paymentOrderId, paymentOrderId));
      await db.delete(schema.paymentCheckoutSessions).where(eq(schema.paymentCheckoutSessions.paymentOrderId, paymentOrderId));
      await db.delete(schema.paymentOrders).where(eq(schema.paymentOrders.id, paymentOrderId));
    }
    if (sql) {
      await sql.end();
    }
  });

  it("should generate monotonic unique attempt numbers under concurrency", async () => {
    const operationKey1 = randomUUID();
    const operationKey2 = randomUUID();

    // Start two concurrent createPaymentAttempt requests for the SAME order
    const p1 = uow.execute(async (ctx) => {
      return createPaymentAttempt(ctx, paymentOrderId, "card", operationKey1);
    });

    const p2 = uow.execute(async (ctx) => {
      // small delay to ensure they overlap if locks were absent,
      // but Promises run concurrently
      return createPaymentAttempt(ctx, paymentOrderId, "card", operationKey2);
    });

    const [attempt1, attempt2] = await Promise.all([p1, p2]);

    expect(attempt1).toBeDefined();
    expect(attempt2).toBeDefined();

    expect(attempt1.attemptNumber).toBeGreaterThan(0);
    expect(attempt2.attemptNumber).toBeGreaterThan(0);
    expect(attempt1.attemptNumber).not.toEqual(attempt2.attemptNumber);
    expect(attempt1.paymentOrderId).toEqual(paymentOrderId);
    expect(attempt2.paymentOrderId).toEqual(paymentOrderId);

    const attempts = [attempt1.attemptNumber, attempt2.attemptNumber].sort((a, b) => a - b);
    expect(attempts).toEqual([1, 2]); // Should be exactly 1 and 2
  });

  it("should return identical attempt for same operationKey (idempotent)", async () => {
    const operationKey = randomUUID();

    const attempt1 = await uow.execute(async (ctx) => {
      return createPaymentAttempt(ctx, paymentOrderId, "yape", operationKey);
    });

    const attempt2 = await uow.execute(async (ctx) => {
      return createPaymentAttempt(ctx, paymentOrderId, "yape", operationKey);
    });

    expect(attempt1.id).toEqual(attempt2.id);
    expect(attempt1.attemptNumber).toEqual(attempt2.attemptNumber);
  });
});
