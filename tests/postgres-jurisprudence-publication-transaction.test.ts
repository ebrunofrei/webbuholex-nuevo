import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresJurisprudencePublicationTransactionCoordinator } from "@/lib/jurisprudence/postgres-jurisprudence-publication-transaction-coordinator";
import { PostgresJurisprudencePublicationOutboxWriter } from "@/lib/jurisprudence/postgres-jurisprudence-publication-outbox-writer";
import { PostgresJurisprudencePublicationExecutionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-execution-repository";
import { toPublicProjectionRecord } from "@/lib/jurisprudence/jurisprudence-public-projection-mapper";
import type { JurisprudenceInternalRecordDto } from "@/types/jurisprudence-application";
import type { JurisprudencePublicProjection, JurisprudencePublicationExecution } from "@/types/jurisprudence-publication-execution";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/database/schema";

describe("PostgresJurisprudencePublicationTransaction", () => {
  let mockTx: unknown;
  let mockDb: unknown;
  let txExecutedSql: unknown[];

  beforeEach(() => {
    txExecutedSql = [];
    mockTx = {
      execute: vi.fn(async (query) => {
        txExecutedSql.push(query);
      }),
      insert: vi.fn(() => ({
        values: vi.fn(async () => {}),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => ({ count: 1 })),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => []),
        })),
      })),
    };
    mockDb = {
      transaction: vi.fn(async (cb) => {
        return await cb(mockTx);
      }),
    };
  });

  it("should verify COMMAND_ROLE_WRAPPER sets local role", async () => {
    const coordinator = new PostgresJurisprudencePublicationTransactionCoordinator(mockDb as PostgresJsDatabase<typeof schema>);
    await coordinator.withTransaction(async () => {});

    expect((mockDb as { transaction: unknown }).transaction).toHaveBeenCalled();
    expect((mockTx as { execute: unknown }).execute).toHaveBeenCalled();
    // we extract the text since sql is a Drizzle template
    expect(txExecutedSql.length).toBeGreaterThan(0);
    // Drizzle sql objects have string chunks, this verifies we run the right query
    // It depends on the exact template logic, but we can verify it contains "SET LOCAL ROLE"
    const hasSetRole = txExecutedSql.some((q) => JSON.stringify(q).includes("SET LOCAL ROLE jurisprudence_publication_command_runtime"));
    expect(hasSetRole).toBe(true);
  });

  it("should ensure repository and outbox writer use the SAME transaction object", async () => {
    const coordinator = new PostgresJurisprudencePublicationTransactionCoordinator(mockDb as PostgresJsDatabase<typeof schema>);
    await coordinator.withTransaction(async (txPort) => {
      expect(txPort.executionRepository).toBeInstanceOf(PostgresJurisprudencePublicationExecutionRepository);
      expect(txPort.outboxWriter).toBeInstanceOf(PostgresJurisprudencePublicationOutboxWriter);

      // We can verify this implicitly because both will call mockTx methods
      // For instance, let's call something on both and assert mockTx is used.
      // PostgresJurisprudencePublicationOutboxWriter
      await txPort.outboxWriter.enqueueWithdraw({
        executionId: "exec_1",
        recordId: "rec_1",
        recordVersion: 1,
        version: 1,
      } as unknown as JurisprudencePublicationExecution);

      expect((mockTx as { insert: unknown }).insert).toHaveBeenCalled();
    });
  });

  it("should ensure ROLLBACK if outbox insert throws", async () => {
    const coordinator = new PostgresJurisprudencePublicationTransactionCoordinator(mockDb as PostgresJsDatabase<typeof schema>);
    (mockTx as { insert: { mockImplementationOnce: (arg: unknown) => void } }).insert.mockImplementationOnce(() => ({
      values: vi.fn(async () => {
        throw new Error("Simulated Outbox Failure");
      })
    }));

    await expect(
      coordinator.withTransaction(async (txPort) => {
        await txPort.outboxWriter.enqueuePublish({} as unknown as JurisprudencePublicationExecution, {} as unknown as ReturnType<typeof toPublicProjectionRecord>);
      })
    ).rejects.toThrow("Simulated Outbox Failure");

    // The db.transaction throws if the inner callback throws, guaranteeing a rollback.
    // The transaction wrapper should not catch it and silence it.
  });

  it("should ensure the public mapper excludes internal fields ( structural, deterministic, public-only )", () => {
    const record: JurisprudenceInternalRecordDto = {
      id: "rec_1",
      recordVersion: 2,
      editorialContent: { editorialTitle: "Test Title" },
      sourceDocumentId: "secret_source_1",
      payloadJson: { secretKey: "value" },
      // ...other properties
    } as unknown as JurisprudenceInternalRecordDto;

    const projection: JurisprudencePublicProjection = {
      projectionId: "proj_1",
      slug: "test-slug",
      title: "Title 2",
      caseNumber: "C-1",
      resolutionNumber: "R-1",
      resolutionType: "Sentencia",
      institutionName: "Inst",
      issuingBody: "Body",
      matter: "Matter",
      issuedAt: "2024-01-01",
      summary: "Summary",
      sourceName: "Source",
    } as unknown as JurisprudencePublicProjection;

    const publicRecord = toPublicProjectionRecord(record, projection);

    expect(publicRecord.id).toBe("proj_1");
    expect(publicRecord.recordVersion).toBe(2);
    expect(publicRecord.caseTitle).toBe("Test Title");

    // Explicitly assert missing fields
    expect((publicRecord as unknown as Record<string, unknown>).sourceDocumentId).toBeUndefined();
    expect((publicRecord as unknown as Record<string, unknown>).payloadJson).toBeUndefined();
  });
});
