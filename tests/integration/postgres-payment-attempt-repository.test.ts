import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PostgresPaymentAttemptRepository } from "../../lib/payments/postgres-payment-attempt-repository";
import { PostgresPaymentOrderRepository } from "../../lib/payments/postgres-payment-order-repository";
import { randomUUID } from "crypto";
import * as schema from "../../database/schema";

const testDatabaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;

describe.runIf(!!testDatabaseUrl)("PostgresPaymentAttemptRepository", () => {
  let sql: postgres.Sql;
  let dbInstance: PostgresJsDatabase<typeof schema>;
  let orderRepo: PostgresPaymentOrderRepository;
  let attemptRepo: PostgresPaymentAttemptRepository;

  let paymentOrderId: string;

  beforeAll(async () => {
    sql = postgres(testDatabaseUrl!);
    dbInstance = drizzle(sql, { schema });

    orderRepo = new PostgresPaymentOrderRepository(dbInstance);
    attemptRepo = new PostgresPaymentAttemptRepository(dbInstance);

    paymentOrderId = randomUUID();
    await orderRepo.insertIdempotent({
      id: paymentOrderId,
      serviceId: "test",
      subOfferId: null,
      customerReference: "test-customer",
      quoteReference: null,
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
    });
  });

  afterAll(async () => {
    await sql.end();
  });

  it("should insert and find an attempt", async () => {
    const attemptId = randomUUID();
    const opKey = randomUUID();

    const attempt = {
      id: attemptId,
      paymentOrderId,
      attemptNumber: 1,
      operationKey: opKey,
      provider: "culqi" as const,
      paymentMethod: "card" as const,
      providerPaymentId: null,
      status: "created" as const,
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    };

    await attemptRepo.insert(attempt);

    const foundById = await attemptRepo.findById(attemptId);
    expect(foundById).toBeDefined();
    expect(foundById?.id).toBe(attemptId);

    const foundByOpKey = await attemptRepo.findByOperationKey(opKey);
    expect(foundByOpKey).toBeDefined();
    expect(foundByOpKey?.id).toBe(attemptId);
  });

  it("should update an attempt", async () => {
    const attemptId = randomUUID();
    const attempt = {
      id: attemptId,
      paymentOrderId,
      attemptNumber: 2,
      operationKey: randomUUID(),
      provider: "culqi" as const,
      paymentMethod: "yape" as const,
      providerPaymentId: null,
      status: "created" as const,
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    };

    await attemptRepo.insert(attempt);

    const updateTime = new Date();
    await attemptRepo.transitionStatus(attemptId, "processing", updateTime);
    await attemptRepo.assignProviderPaymentId(attemptId, "prv_123", updateTime);

    const found = await attemptRepo.findById(attemptId);
    expect(found?.status).toBe("processing");
    expect(found?.startedAt).toEqual(updateTime);
    expect(found?.providerPaymentId).toBe("prv_123");
  });

  it("should find latest attempt by order id", async () => {
    const order2 = randomUUID();
    await orderRepo.insertIdempotent({
      id: order2,
      serviceId: "test",
      subOfferId: null,
      customerReference: "test-customer",
      quoteReference: null,
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
    });

    const attempt1 = {
      id: randomUUID(),
      paymentOrderId: order2,
      attemptNumber: 1,
      operationKey: randomUUID(),
      provider: "culqi" as const,
      paymentMethod: "card" as const,
      providerPaymentId: null,
      status: "failed" as const,
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: new Date(),
      succeededAt: null,
      failedAt: new Date(),
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    };

    const attempt2 = {
      id: randomUUID(),
      paymentOrderId: order2,
      attemptNumber: 2,
      operationKey: randomUUID(),
      provider: "culqi" as const,
      paymentMethod: "card" as const,
      providerPaymentId: null,
      status: "created" as const,
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    };

    await attemptRepo.insert(attempt1);
    await attemptRepo.insert(attempt2);

    const latest = await attemptRepo.findLatestByPaymentOrderId(order2);
    expect(latest).toBeDefined();
    expect(latest?.id).toBe(attempt2.id);
    expect(latest?.attemptNumber).toBe(2);

    const all = await attemptRepo.listByPaymentOrderId(order2);
    expect(all).toHaveLength(2);
    expect(all[0]!.id).toBe(attempt2.id); // DESC order
  });

  it("should assign providerPaymentId atomically and reject conflicts", async () => {
    const attemptId = randomUUID();
    const attempt = {
      id: attemptId,
      paymentOrderId,
      attemptNumber: 3,
      operationKey: randomUUID(),
      provider: "culqi" as const,
      paymentMethod: "card" as const,
      providerPaymentId: null,
      status: "created" as const,
      failureCategory: null,
      failureCode: null,
      createdAt: new Date(),
      startedAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
      indeterminateAt: null,
      updatedAt: new Date(),
    };

    await attemptRepo.insert(attempt);

    const time = new Date();
    // Concurrent assignments with different IDs
    const p1 = attemptRepo.assignProviderPaymentId(attemptId, "prv_A", time);
    const p2 = attemptRepo.assignProviderPaymentId(attemptId, "prv_B", time);

    const results = await Promise.allSettled([p1, p2]);

    // One should succeed, one should fail with PaymentAttemptProviderPaymentIdConflictError
    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as any).reason.name).toBe("PaymentAttemptProviderPaymentIdConflictError");

    // Idempotent assignment with the winning ID should succeed
    const found = await attemptRepo.findById(attemptId);
    expect(found?.providerPaymentId).toBeDefined();

    await expect(
      attemptRepo.assignProviderPaymentId(attemptId, found!.providerPaymentId!, time)
    ).resolves.toBeUndefined();
  });
});
