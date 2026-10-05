import { describe, expect, it, vi, beforeEach } from "vitest";
import { PostgresJurisprudencePublicationExecutionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-execution-repository";
import { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { PgTransaction } from "drizzle-orm/pg-core";
import { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "@/database/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type DbExecutor = PostgresJsDatabase<typeof schema> | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

import type { Mock } from "vitest";

interface MockTx {
  select: Mock;
  insert: Mock;
  update: Mock;
}

describe("J1-E.3A.2 PostgresJurisprudencePublicationExecutionRepository", () => {
  const commit = {
    execution: {
      executionId: "exec_1",
      recordId: "rec_123",
      recordVersion: 1,
      editorialCaseId: "ed_1",
      publicationDossierId: "pub_1",
      authorizationCaseId: "auth_1",
      projectionId: "proj_1",
      status: "executed" as const,
      version: 1,
      executedAt: "2026-08-17T12:00:00.000Z",
      executedByReference: "user_1",
      withdrawnAt: null,
      withdrawalReason: null,
      supersededAt: null,
      supersededByRecordVersion: null,
      createdAt: "2026-08-17T12:00:00.000Z",
      updatedAt: "2026-08-17T12:00:00.000Z",
      publicationExecuted: true,
      deployed: false as const,
    },
    projection: {
      projectionId: "proj_1",
      executionId: "exec_1",
      authorizationCaseId: "auth_1",
      recordId: "rec_123",
      recordVersion: 1,
      status: "active_internal" as const,
      slug: "slug",
      title: "title",
      caseNumber: "case",
      resolutionNumber: "res",
      resolutionType: "type",
      institutionName: "inst",
      issuingBody: "body",
      matter: "matter",
      issuedAt: "2026-08-01",
      summary: null,
      sourceName: "source",
      officialHtmlUrl: null,
      officialPdfUrl: null,
      sourceDocumentId: null,
      generatedAt: "2026-08-17T12:00:00.000Z",
      updatedAt: "2026-08-17T12:00:00.000Z",
      exposedPublicly: false as const,
      deployed: false as const,
    },
    event: {
      eventId: "ev_1",
      executionId: "exec_1",
      recordId: "rec_123",
      recordVersion: 1,
      executionVersion: 1,
      sequence: 1,
      type: "publication_executed" as const,
      occurredAt: "2026-08-17T12:00:00.000Z",
      payload: { action: "create" },
    },
    idempotency: {
      idempotencyKey: "idem_1",
      commandFingerprint: "finger_1",
      result: {
        execution: {
          executionId: "exec_1",
          recordId: "rec_123",
          recordVersion: 1,
          editorialCaseId: "ed_1",
          publicationDossierId: "pub_1",
          authorizationCaseId: "auth_1",
          projectionId: "proj_1",
          status: "executed" as const,
          version: 1,
          executedAt: "2026-08-17T12:00:00.000Z",
          executedByReference: "user_1",
          withdrawnAt: null,
          withdrawalReason: null,
          supersededAt: null,
          supersededByRecordVersion: null,
          createdAt: "2026-08-17T12:00:00.000Z",
          updatedAt: "2026-08-17T12:00:00.000Z",
          publicationExecuted: true,
          deployed: false as const,
        },
        projection: {
          projectionId: "proj_1",
          executionId: "exec_1",
          authorizationCaseId: "auth_1",
          recordId: "rec_123",
          recordVersion: 1,
          status: "active_internal" as const,
          slug: "slug",
          title: "title",
          caseNumber: "case",
          resolutionNumber: "res",
          resolutionType: "type",
          institutionName: "inst",
          issuingBody: "body",
          matter: "matter",
          issuedAt: "2026-08-01",
          summary: null,
          sourceName: "source",
          officialHtmlUrl: null,
          officialPdfUrl: null,
          sourceDocumentId: null,
          generatedAt: "2026-08-17T12:00:00.000Z",
          updatedAt: "2026-08-17T12:00:00.000Z",
          exposedPublicly: false as const,
          deployed: false as const,
        },
        current: true,
        publicationExecuted: true,
        publicProjectionExposed: false as const,
        deployed: false as const,
      }
    }
  };

  let mockTx: MockTx;
  let dbExecutor: DbExecutor;

  beforeEach(() => {
    mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(true)
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ count: 1 })
        })
      }),
    };

    const sql = postgres({ max: 1 });
    dbExecutor = drizzle(sql, { schema });

    Object.assign(dbExecutor, {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    });
  });

  it("should write execution and projection atomically on create", async () => {
    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
    const mockValues = vi.fn().mockResolvedValue(true);
    mockTx.insert.mockReturnValue({ values: mockValues });

    await pgRepo.createExecution(commit);

    expect(dbExecutor.transaction).toHaveBeenCalled();
    expect(mockTx.insert!).toHaveBeenCalledTimes(4); // execution, projection, event, idempotency

    expect(mockValues).toHaveBeenCalledTimes(4);
    const projectionPayload = mockValues.mock.calls[1]?.[0];

    expect(projectionPayload).toMatchObject({
      projectionId: "proj_1",
      executionId: "exec_1",
      recordId: "rec_123",
      recordVersion: 1,
      status: "active_internal",
      payloadJson: expect.any(Object),
    });
  });

  it("should update execution and projection inside same transaction", async () => {
    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);

    await pgRepo.updateExecution({ expectedVersion: 1, ...commit });

    expect(dbExecutor.transaction).toHaveBeenCalled();
    expect(mockTx.update!).toHaveBeenCalledTimes(2); // execution, projection
    expect(mockTx.insert!).toHaveBeenCalledTimes(2); // event, idempotency
  });

  it("should throw VERSION_CONFLICT if execution update count != 1 and skip projection", async () => {
    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
    mockTx.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ count: 0 })
      })
    });

    await expect(pgRepo.updateExecution({ expectedVersion: 1, ...commit })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(mockTx.update!).toHaveBeenCalledTimes(1);
    expect(mockTx.insert!).toHaveBeenCalledTimes(0);
  });

  it("should throw REPOSITORY_UNAVAILABLE if projection update count != 1 and skip events", async () => {
    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
    mockTx.update
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ count: 1 })
        })
      })
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ count: 0 })
        })
      });

    await expect(pgRepo.updateExecution({ expectedVersion: 1, ...commit })).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    expect(mockTx.update!).toHaveBeenCalledTimes(2);
    expect(mockTx.insert!).toHaveBeenCalledTimes(0);
  });

  it("should throw IDEMPOTENCY_CONFLICT on 23505 idempotency_pkey constraint", async () => {
    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
    mockTx.insert.mockReturnValueOnce({
      values: vi.fn().mockRejectedValue({ code: '23505', constraint_name: 'jurisprudence_publication_idempotency_pkey' })
    });

    await expect(pgRepo.createExecution(commit)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("should throw REPOSITORY_UNAVAILABLE on unrelated 23505 constraint", async () => {
    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
    mockTx.insert.mockReturnValueOnce({
      values: vi.fn().mockRejectedValue({ code: '23505', constraint_name: 'some_other_index' })
    });

    await expect(pgRepo.createExecution(commit)).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
  });

  it("should extract safe diagnostics and log on unexpected error without logging credentials or raw objects", async () => {
    const originalConsoleError = console.error;
    const consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;

    try {
      const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
      const rawError = {
        code: "53300",
        message: "too many connections",
        constraint_name: "my_constraint",
        severity: "FATAL",
        routine: "InitPostgres",
        schema_name: "public",
        table_name: "my_table",
        column_name: "my_col",
        internalQuery: "SELECT * FROM secrets",
        password: "my_password"
      };

      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(rawError)
      });

      await expect(pgRepo.createExecution(commit)).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });

      expect(consoleErrorMock).toHaveBeenCalledTimes(1);
      const call = consoleErrorMock.mock.calls[0];
      if (!call) throw new Error("Expected console.error to be called");
      const prefix = call[0];
      const diagnostic = call[1];
      expect(prefix).toBe("[JURIS_EXEC_REPOSITORY_ERROR]");

      expect(diagnostic).toEqual({
        code: "53300",
        message: "too many connections",
        constraint_name: "my_constraint",
        severity: "FATAL",
        routine: "InitPostgres",
        schema_name: "public",
        table_name: "my_table",
        column_name: "my_col",
      });

      expect(diagnostic).not.toBe(rawError);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("should not log safe diagnostics for known mapped constraints", async () => {
    const originalConsoleError = console.error;
    const consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;

    try {
      const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(dbExecutor);
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockRejectedValue({ code: '23505', constraint_name: 'jurisprudence_publication_idempotency_pkey' })
      });

      await expect(pgRepo.createExecution(commit)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
      expect(consoleErrorMock).not.toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
  });
});
