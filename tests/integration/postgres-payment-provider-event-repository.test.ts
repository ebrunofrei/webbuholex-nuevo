import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PostgresPaymentProviderEventRepository } from "../../lib/payments/postgres-payment-provider-event-repository";
import { randomUUID } from "crypto";
import { PaymentProviderEvent } from "../../lib/schemas/payments";
import * as schema from "../../database/schema";

const testDatabaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;

describe.runIf(!!testDatabaseUrl)("PostgresPaymentProviderEventRepository", () => {
  let sql: postgres.Sql;
  let dbInstance: PostgresJsDatabase<typeof schema>;
  let repo: PostgresPaymentProviderEventRepository;

  beforeAll(async () => {
    sql = postgres(testDatabaseUrl!);
    dbInstance = drizzle(sql, { schema });

    repo = new PostgresPaymentProviderEventRepository(dbInstance);
  });

  afterAll(async () => {
    await sql.end();
  });

  it("should insert an event idempotently", async () => {
    const eventId = randomUUID();
    const dedupKey = randomUUID();

    const event: PaymentProviderEvent = {
      id: eventId,
      provider: "culqi",
      providerEventId: randomUUID(),
      deduplicationKey: dedupKey,
      providerObjectId: null,
      paymentOrderId: null,
      paymentAttemptId: null,
      eventType: "order.status.changed",
      payloadHash: "a".repeat(64), // 64 hex chars
      status: "received",
      receivedAt: new Date(),
      processingStartedAt: null,
      processedAt: null,
      failedAt: null,
      failureCode: null,
      createdAt: new Date(),
    };

    const result1 = await repo.insertIdempotent(event);
    expect(result1).toBe("inserted");

    const result2 = await repo.insertIdempotent(event);
    expect(result2).toBe("already_exists");

    const found = await repo.findById(eventId);
    expect(found).toBeDefined();
    expect(found?.id).toBe(eventId);
  });

  it("should find by deduplicationKey", async () => {
    const dedupKey = randomUUID();
    const event: PaymentProviderEvent = {
      id: randomUUID(),
      provider: "culqi",
      providerEventId: randomUUID(),
      deduplicationKey: dedupKey,
      providerObjectId: null,
      paymentOrderId: null,
      paymentAttemptId: null,
      eventType: "order.status.changed",
      payloadHash: "b".repeat(64),
      status: "received",
      receivedAt: new Date(),
      processingStartedAt: null,
      processedAt: null,
      failedAt: null,
      failureCode: null,
      createdAt: new Date(),
    };

    await repo.insertIdempotent(event);

    const found = await repo.findByDeduplicationKey(dedupKey);
    expect(found).toBeDefined();
    expect(found?.id).toBe(event.id);
  });

  it("should mark processing, processed, and failed", async () => {
    const event: PaymentProviderEvent = {
      id: randomUUID(),
      provider: "culqi",
      providerEventId: randomUUID(),
      deduplicationKey: randomUUID(),
      providerObjectId: null,
      paymentOrderId: null,
      paymentAttemptId: null,
      eventType: "order.status.changed",
      payloadHash: "c".repeat(64),
      status: "received",
      receivedAt: new Date(),
      processingStartedAt: null,
      processedAt: null,
      failedAt: null,
      failureCode: null,
      createdAt: new Date(),
    };

    await repo.insertIdempotent(event);

    const t1 = new Date();
    await repo.markProcessing(event.id, t1);
    let found = await repo.findById(event.id);
    expect(found?.status).toBe("processing");
    expect(found?.processingStartedAt).toEqual(t1);

    const t2 = new Date();
    await repo.markProcessed(event.id, t2);
    found = await repo.findById(event.id);
    expect(found?.status).toBe("processed");
    expect(found?.processedAt).toEqual(t2);

    const t3 = new Date();
    await repo.markFailed(event.id, "error_123", t3);
    found = await repo.findById(event.id);
    expect(found?.status).toBe("failed");
    expect(found?.failedAt).toEqual(t3);
    expect(found?.failureCode).toBe("error_123");
  });
});
