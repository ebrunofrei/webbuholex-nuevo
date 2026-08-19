/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getJurisprudenceOutboxDatabase } from "@/database/client";
import { jurisprudencePublicationOutbox } from "@/database/schema/jurisprudence";
import { PostgresJurisprudencePublicationOutboxProcessorRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-outbox-processor-repository";
import { PostgresJurisprudencePublicationSourceReader } from "@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader";
import { PostgresJurisprudencePublicationTransactionCoordinator } from "@/lib/jurisprudence/postgres-jurisprudence-publication-transaction-coordinator";
import { JurisprudencePublicationRecoveryService } from "@/lib/jurisprudence-publication-recovery-service";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

describe.skipIf(!process.env.DATABASE_JURISPRUDENCE_OUTBOX_URL)("Recovery Concurrency and Idempotency E2E", () => {
  let service: JurisprudencePublicationRecoveryService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let fixtureOutboxId: string;
  let fixtureRecordId: string;

  beforeAll(async () => {
    db = getJurisprudenceOutboxDatabase();
    service = new JurisprudencePublicationRecoveryService(
      new PostgresJurisprudencePublicationOutboxProcessorRepository(),
      new PostgresJurisprudencePublicationSourceReader(db as any),
      new PostgresJurisprudencePublicationTransactionCoordinator(db as any)
    );

    // Create an isolated fixture to not pollute the historical one
    fixtureOutboxId = uuid();
    fixtureRecordId = "19bdd9bd-6a3b-4a16-b021-0699c790deab";

    await db.insert(jurisprudencePublicationOutbox).values({
      id: fixtureOutboxId,
      recordId: fixtureRecordId,
      recordVersion: 1,
      executionId: "c094b196-0f94-4339-99c3-31e1cd91f043", // Valid execution
      executionVersion: 1,
      eventType: "publish_projection",
      payload: {}, // Invalid old payload
      status: "dead_letter",
      attempts: 2,
    });
  });

  it("14. Concurrency Test: different keys recovering same dead-letter results in exactly one recovery row", async () => {
    const keyA = `concurrent-key-A-${uuid()}`;
    const keyB = `concurrent-key-B-${uuid()}`;

    // Execute concurrently
    const results = await Promise.allSettled([
      service.recover({
        originalOutboxId: fixtureOutboxId,
        recordId: fixtureRecordId,
        recordVersion: 1,
        idempotencyKey: keyA,
      }),
      service.recover({
        originalOutboxId: fixtureOutboxId,
        recordId: fixtureRecordId,
        recordVersion: 1,
        idempotencyKey: keyB,
      }),
    ]);

    // One must succeed, one must fail with RECOVERY_ALREADY_EXISTS
    const successes = results.filter(r => r.status === "fulfilled");
    const rejections = results.filter(r => r.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    expect((rejections[0] as unknown as { reason: { message: string } }).reason.message).toContain("RECOVERY_ALREADY_EXISTS");

    // Verify DB level guarantee
    const recoveries = await db.select().from(jurisprudencePublicationOutbox)
      .where(eq(jurisprudencePublicationOutbox.recoveryOfOutboxId, fixtureOutboxId));

    expect(recoveries).toHaveLength(1);

    // Original intact
    const original = await db.select().from(jurisprudencePublicationOutbox)
      .where(eq(jurisprudencePublicationOutbox.id, fixtureOutboxId));
    expect(original[0].status).toBe("dead_letter");
  });

  it("13/26. Same-key Idempotency Test: same key returns existing recovery outbox", async () => {
    const idempotencyKey = `same-key-${uuid()}`;
    const fixtureOutboxId2 = uuid();

    await db.insert(jurisprudencePublicationOutbox).values({
      id: fixtureOutboxId2,
      recordId: fixtureRecordId,
      recordVersion: 1,
      executionId: "c094b196-0f94-4339-99c3-31e1cd91f043", // Valid execution
      executionVersion: 1,
      eventType: "publish_projection",
      payload: {}, // Invalid old payload
      status: "dead_letter",
      attempts: 2,
    });

    const firstResult = await service.recover({
      originalOutboxId: fixtureOutboxId2,
      recordId: fixtureRecordId,
      recordVersion: 1,
      idempotencyKey: idempotencyKey,
    });

    const secondResult = await service.recover({
      originalOutboxId: fixtureOutboxId2,
      recordId: fixtureRecordId,
      recordVersion: 1,
      idempotencyKey: idempotencyKey,
    });

    expect(secondResult).toBe(firstResult);

    const recoveries = await db.select().from(jurisprudencePublicationOutbox)
      .where(eq(jurisprudencePublicationOutbox.recoveryOfOutboxId, fixtureOutboxId2));

    expect(recoveries).toHaveLength(1);
    expect(recoveries[0].id).toBe(firstResult);
  });
});
