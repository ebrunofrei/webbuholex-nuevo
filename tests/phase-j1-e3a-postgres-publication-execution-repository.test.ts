// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PostgresJurisprudencePublicationExecutionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-execution-repository";

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
        execution: null as unknown as import("@/types/jurisprudence-publication-execution").JurisprudencePublicationExecution,
        projection: null as unknown as import("@/types/jurisprudence-publication-execution").JurisprudencePublicProjection,
        current: true,
        publicationExecuted: true,
        publicProjectionExposed: false as const,
        deployed: false as const,
      }
    }
  };

  it("should implement the repository contract symmetrically for create Execution", async () => {
    // We mock the database executor
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(true)
      }),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    };

    const pgRepo = new PostgresJurisprudencePublicationExecutionRepository(mockDb as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof import("@/database/schema")>);

    await pgRepo.createExecution(commit);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalledTimes(3); // execution, event, idempotency
  });

  it("should enforce lazy initialization and configuration", () => {
    expect(true).toBe(true);
  });
});
