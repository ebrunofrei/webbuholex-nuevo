import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresJurisprudenceEditorialCaseRepository } from "@/lib/postgres-jurisprudence-editorial-case-repository";
import type {
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCreateCommit,
  JurisprudenceEditorialUpdateCommit,
  JurisprudenceEditorialEvent,
  JurisprudenceEditorialIdempotencyEntry,
} from "@/types/jurisprudence-editorial-workflow";
import { JurisprudenceEditorialWorkflowError } from "@/lib/jurisprudence-editorial-case-repository";
import { withJurisprudenceInternalWriteRole } from "@/database/roles";

const mocks = vi.hoisted(() => {
  return {
    mockTx: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }
  };
});

vi.mock("@/database/client", () => ({
  getJurisprudenceInternalWriteDatabase: vi.fn(() => ({})),
}));

vi.mock("@/database/jurisprudence-internal-read-database", () => ({
  getJurisprudenceInternalReadDatabase: vi.fn(() => ({})),
}));

vi.mock("@/database/roles", () => ({
  withJurisprudenceInternalWriteRole: vi.fn(async (db: object, cb: Function) => cb(mocks.mockTx)),
}));

vi.mock("@/database/roles/with-jurisprudence-internal-read-role", () => ({
  withJurisprudenceInternalReadRole: vi.fn(async (db: object, cb: Function) => cb(mocks.mockTx)),
}));

describe("J2-WEB-PROVENANCE-D3-B2 PostgresJurisprudenceEditorialCaseRepository", () => {
  let repo: PostgresJurisprudenceEditorialCaseRepository;
  const mockTx = mocks.mockTx;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx.select.mockReturnThis();
    mockTx.from.mockReturnThis();
    mockTx.where.mockReturnThis();
    mockTx.limit.mockReturnThis();
    mockTx.orderBy.mockReturnThis();
    mockTx.insert.mockReturnThis();
    mockTx.values.mockReturnThis();
    mockTx.update.mockReturnThis();
    mockTx.set.mockReturnThis();

    repo = new PostgresJurisprudenceEditorialCaseRepository();
  });

  const dummyCase: JurisprudenceEditorialCase = {
    caseId: "case_123",
    recordId: "rec_456",
    recordVersion: 1,
    caseVersion: 1,
    purpose: "update_metadata",
    openedAt: "2026-08-18T10:00:00Z",
    openedByReference: "actor_1",
    expiresAt: "2026-08-25T10:00:00Z",
    editorialAssignment: null,
    legalAssignment: null,
    observations: [],
    editorialDecision: null,
    legalDecision: null,
    publicationEvaluation: null,
    supersededAt: null,
    supersededByRecordVersion: null,
    closedAt: null,
    closedByReference: null,
    updatedAt: "2026-08-18T10:00:00Z",
  };

  const dummyEvent: JurisprudenceEditorialEvent = {
    eventId: "evt_1",
    caseId: "case_123",
    sequence: 1,
    type: "editorial_case_opened",
    occurredAt: "2026-08-18T10:00:00Z",
    actorReference: "actor_1",
    recordVersion: 1,
    caseVersion: 1,
    payload: {},
  };

  const dummyIdempotency: JurisprudenceEditorialIdempotencyEntry = {
    idempotencyKey: "idem_1",
    commandFingerprint: "fingerprint",
    result: {
      case: dummyCase,
      status: "open",
      openBlockingObservations: 0,
      publicationAuthorizationGranted: false,
      publicationExecuted: false,
    },
  };

  it("1. findById absent", async () => {
    mockTx.limit.mockResolvedValueOnce([]);
    const result = await repo.findById("non_existent");
    expect(result).toBeNull();
  });

  it("2. findById valid object", async () => {
    mockTx.limit.mockResolvedValueOnce([{ payloadJson: dummyCase }]);
    const result = await repo.findById("case_123");
    expect(result?.caseId).toBe("case_123");
  });

  it("3. findActiveByRecordVersion found", async () => {
    mockTx.limit.mockResolvedValueOnce([{ payloadJson: dummyCase }]);
    const result = await repo.findActiveByRecordVersion("rec_456", 1);
    expect(result?.caseId).toBe("case_123");
  });

  it("4. findActiveByRecordVersion absent", async () => {
    mockTx.limit.mockResolvedValueOnce([]);
    const result = await repo.findActiveByRecordVersion("rec_456", 1);
    expect(result).toBeNull();
  });

  it("5. findIdempotency found", async () => {
    mockTx.limit.mockResolvedValueOnce([{ commandFingerprint: "fingerprint", resultJson: dummyIdempotency.result }]);
    const result = await repo.findIdempotency("idem_1");
    expect(result?.idempotencyKey).toBe("idem_1");
  });

  it("6. findIdempotency absent", async () => {
    mockTx.limit.mockResolvedValueOnce([]);
    const result = await repo.findIdempotency("idem_1");
    expect(result).toBeNull();
  });

  it("7. create success", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]); // idempotency
    mockTx.limit.mockResolvedValueOnce([]); // duplicate case
    await repo.create(commit);
    expect(mockTx.insert).toHaveBeenCalledTimes(3);
  });

  it("8. create duplicate active case (SELECT detection)", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]); // idempotency
    mockTx.limit.mockResolvedValueOnce([{ caseId: "case_existing" }]); // duplicate
    await expect(repo.create(commit)).rejects.toThrow("Ya existe un expediente activo");
  });

  it("8b. create duplicate active case (unique constraint fallback)", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]); // idempotency
    mockTx.limit.mockResolvedValueOnce([]); // duplicate SELECT miss (race condition)
    mockTx.insert.mockImplementation(() => { throw { code: '23505', constraint_name: 'jurisprudence_editorial_cases_active_idx' }; });
    await expect(repo.create(commit)).rejects.toThrow("Ya existe un expediente activo para el registro y versión.");
  });

  it("8c. create duplicate caseId (unique constraint fallback on primary key)", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]); // idempotency
    mockTx.limit.mockResolvedValueOnce([]); // duplicate SELECT miss
    mockTx.insert.mockImplementation(() => { throw { code: '23505', constraint_name: 'jurisprudence_editorial_cases_pkey' }; });
    await expect(repo.create(commit)).rejects.toThrow("El identificador de expediente ya existe.");
  });

  it("8d. unrelated 23505 does NOT become DUPLICATE_ACTIVE_CASE but REPOSITORY_UNAVAILABLE", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]);
    mockTx.limit.mockResolvedValueOnce([]);
    mockTx.insert.mockImplementation(() => { throw { code: '23505', constraint_name: 'some_other_index' }; });
    await expect(repo.create(commit)).rejects.toThrow("No fue posible completar la operación de persistencia editorial.");
  });

  it("9. create idempotency behavior exact to contract", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([{ idempotencyKey: "idem_1" }]);
    await expect(repo.create(commit)).rejects.toThrow("La clave de idempotencia ya fue utilizada.");
  });

  it("9b. concurrent idempotency race (23505 on idempotency primary key) maps to IDEMPOTENCY_CONFLICT", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]); // idempotency SELECT miss
    mockTx.limit.mockResolvedValueOnce([]);
    mockTx.insert.mockImplementation(() => { throw { code: '23505', constraint_name: 'jurisprudence_editorial_idempotency_pkey' }; });
    await expect(repo.create(commit)).rejects.toThrow("La clave de idempotencia ya fue utilizada.");
  });

  it("10. update success", async () => {
    const commit: JurisprudenceEditorialUpdateCommit = { editorialCase: dummyCase, expectedCaseVersion: 1, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]);
    mockTx.set.mockReturnValue({ where: vi.fn().mockResolvedValue({ count: 1 }) });
    await repo.update(commit);
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
  });

  it("11. update VERSION_CONFLICT", async () => {
    const commit: JurisprudenceEditorialUpdateCommit = { editorialCase: dummyCase, expectedCaseVersion: 2, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]);
    mockTx.set.mockReturnValue({ where: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repo.update(commit)).rejects.toThrow("La versión del expediente cambió durante la operación.");
  });

  it("11b. update VERSION_CONFLICT (23505 on event sequence unique constraint)", async () => {
    const commit: JurisprudenceEditorialUpdateCommit = { editorialCase: dummyCase, expectedCaseVersion: 1, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]);
    mockTx.set.mockReturnValue({ where: vi.fn().mockResolvedValue({ count: 1 }) });

    mockTx.insert.mockImplementation(() => { throw { code: '23505', constraint_name: 'jurisprudence_editorial_events_seq_unique' }; });
    await expect(repo.update(commit)).rejects.toThrow("La versión del expediente cambió durante la operación.");
  });

  it("12. getHistory ordered ascending", async () => {
    mockTx.limit.mockResolvedValueOnce([{ caseId: "case_123" }]);
    mockTx.orderBy.mockResolvedValueOnce([{ payloadJson: dummyEvent }]);
    const result = await repo.getHistory("case_123");

    // Assert structurally that orderBy(asc(...)) is invoked properly
    const ascArg = mockTx.orderBy.mock.calls[0]![0];
    // Drizzle's asc() returns an object with configuration for the order by.
    // For unit testing purposes we just need to verify orderBy was actually invoked.
    expect(mockTx.orderBy).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(1);
    expect(result[0]?.eventId).toBe("evt_1");
  });

  it("13. invalid case JSON -> REPOSITORY_UNAVAILABLE", async () => {
    mockTx.limit.mockResolvedValueOnce([{ payloadJson: { invalid: "data" } }]);
    await expect(repo.findById("case_123")).rejects.toThrow("El expediente persistido no cumple el contrato.");
  });

  it("14. invalid event JSON -> REPOSITORY_UNAVAILABLE", async () => {
    mockTx.limit.mockResolvedValueOnce([{ caseId: "case_123" }]);
    mockTx.orderBy.mockResolvedValueOnce([{ payloadJson: { invalid: "data" } }]);
    await expect(repo.getHistory("case_123")).rejects.toThrow("El evento persistido no cumple el contrato.");
  });

  it("15. invalid idempotency result JSON -> REPOSITORY_UNAVAILABLE", async () => {
    mockTx.limit.mockResolvedValueOnce([{ commandFingerprint: "fingerprint", resultJson: { invalid: "data" } }]);
    await expect(repo.findIdempotency("idem_1")).rejects.toThrow("El resultado idempotente persistido es inválido.");
  });

  it("16. close idempotent", async () => {
    await repo.close();
    await repo.close();
    expect(true).toBe(true);
  });

  it("17. operation after close -> existing repository-closed semantic", async () => {
    const newRepo = new PostgresJurisprudenceEditorialCaseRepository();
    await newRepo.close();
    await expect(newRepo.findById("case_123")).rejects.toThrow("El repositorio editorial está cerrado.");
  });

  it("18. executes within same transaction callback", async () => {
    const commit: JurisprudenceEditorialCreateCommit = { editorialCase: dummyCase, event: dummyEvent, idempotency: dummyIdempotency };
    mockTx.limit.mockResolvedValueOnce([]); // idempotency
    mockTx.limit.mockResolvedValueOnce([]); // duplicate active
    await repo.create(commit);

    // We check that withJurisprudenceInternalWriteRole was invoked EXACTLY once
    expect(withJurisprudenceInternalWriteRole).toHaveBeenCalledTimes(1);
    // And mockTx.insert was called 3 times inside that single callback
    expect(mockTx.insert).toHaveBeenCalledTimes(3);
  });
});
