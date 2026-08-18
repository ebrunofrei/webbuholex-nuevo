import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { withJurisprudenceInternalWriteRole } from "@/database/roles";
import { JurisprudenceCreateInput, JurisprudenceUpdateInput } from "@/types/jurisprudence-repository";

vi.mock("@/database/client", () => ({
  getJurisprudenceInternalWriteDatabase: vi.fn(),
}));

vi.mock("@/database/roles", () => ({
  withJurisprudenceInternalWriteRole: vi.fn(),
}));

describe("J1-G.2B.2 PostgresJurisprudenceRepository", () => {
  let mockDb: Record<string, unknown>;
  let mockTx: {
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    offset: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    values: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };
  let repo: PostgresJurisprudenceRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    };

    mockDb = {};
    (getJurisprudenceInternalWriteDatabase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    (withJurisprudenceInternalWriteRole as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (db: unknown, cb: (tx: unknown) => unknown) => {
      return cb(mockTx);
    });

    repo = new PostgresJurisprudenceRepository({
      now: () => "2026-08-18T12:00:00.000Z",
      generateId: () => "rec_new",
    });
  });

  const dummyRecord: JurisprudenceCreateInput["record"] = {
    slug: null,
    editorialStatus: "draft",
    publicationStatus: "private",
    caseNumber: "123",
    resolutionNumber: "456",
    resolutionType: "Sentencia",
    institution: { id: "inst_1", name: "Poder Judicial", shortName: "PJ", country: "Peru", kind: "judiciary", officialHomepage: null },
    issuingBody: "Sala",
    instanceLevel: "Corte Suprema",
    specialty: "Penal",
    matter: "Robo",
    submatter: null,
    judicialDistrict: null,
    chamberOrCourt: "Sala Penal",
    rapporteur: null,
    issuedAt: "2026-08-01",
    officiallyPublishedAt: null,
    officialContent: {
      officialSummary: null, officialFullText: null, fullTextAvailable: false, publicationAllowed: false, documentAvailability: "metadata_only", originFormat: "other", language: "es", pageCount: null
    },
    editorialContent: {
      editorialTitle: "Title", editorialSummary: null, publicExcerpt: null, legalIssue: null, mainCriterion: null, relevantGrounds: [], decision: null, citedNorms: [], citedPrecedentIds: [], relatedRecordIds: [], keywords: []
    },
    generatedContent: {
      internalDraft: null, reviewed: false, supportedBySource: false
    },
    authority: {
      resolutionCategory: "ordinary_decision", legalAuthority: "unknown", authorityEvidence: null, authorityVerifiedAt: null, validityStatus: "unknown", validityEvidence: null
    },
    source: {
      type: "official_judiciary", name: "Source", url: null, documentId: null, publishedAt: null, retrievedAt: null, checksum: null, verificationStatus: "unverified", verifiedAt: null, verifiedBy: null, verificationNotes: null, evidenceReference: null
    },
    officialFile: null,
    search: {
      normalizedSearchText: "TEXT", normalizedMatters: [], normalizedBodies: [], jurisdiction: "Peru", tags: [], editorialRelevance: 0
    },
    internal: {
      editorialNotes: [], contradictions: [], generatedContentOnly: false
    }
  };

  const dummyCreateInput: JurisprudenceCreateInput = {
    idempotencyKey: "idem_12345",
    record: dummyRecord
  };

  it("create - 1. idempotency lookup; 3. insert record; 4. insert version; 5. insert idempotency; all in same tx", async () => {
    // idempotency not found, uniqueness not found
    mockTx.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockTx.values.mockResolvedValue({});

    await repo.create(dummyCreateInput);

    expect(withJurisprudenceInternalWriteRole).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalledTimes(3); // record, version, idempotency
  });

  it("create - replay canonical result", async () => {
    const existingPayload = JSON.parse(JSON.stringify({ ...dummyCreateInput.record, id: "rec_1", recordVersion: 1, createdAt: "2026-08-18T12:00:00.000Z", updatedAt: "2026-08-18T12:00:00.000Z" }));
    // 1st query: idempotency lookup -> where
    // 2nd query: existing record -> where().limit()
    mockTx.where.mockResolvedValueOnce([{ inputJson: JSON.parse(JSON.stringify(dummyCreateInput.record)), recordId: "rec_1" }]);
    mockTx.limit.mockResolvedValueOnce([{ payloadJson: existingPayload, id: "rec_1" }]);

    const result = await repo.create(dummyCreateInput);
    expect(result.id).toBe("rec_1");
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it("update - 1. lock row FOR UPDATE; 2. validation; 3. update record; 4. insert version; 5. same tx", async () => {
    const updateInput: JurisprudenceUpdateInput = {
      id: "rec_1",
      expectedVersion: 1,
      changeKind: "editorial_update",
      record: dummyCreateInput.record
    };

    mockTx.execute.mockResolvedValueOnce([{ id: "rec_1", recordVersion: 1, createdAt: new Date("2026-08-18T10:00:00Z"), updatedAt: new Date("2026-08-18T10:00:00Z") }]);

    // dupRows limit mock
    mockTx.limit.mockResolvedValueOnce([]); // uniq dup
    mockTx.limit.mockResolvedValueOnce([]); // slug dup

    // update result mock. The real builder for update().set().where() returns a promise directly.
    mockTx.set.mockReturnValue({
      where: vi.fn().mockResolvedValue({ count: 1 })
    });

    mockTx.values.mockResolvedValue({});

    await repo.update(updateInput);

    const sqlArg = mockTx.execute.mock.calls[0]![0];
    expect(JSON.stringify(sqlArg)).toContain("FOR UPDATE");

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalledTimes(1);
  });

  it("update - rolls back on version mismatch without executing updates", async () => {
    const updateInput: JurisprudenceUpdateInput = {
      id: "rec_1",
      expectedVersion: 2,
      changeKind: "editorial_update",
      record: dummyCreateInput.record
    };

    mockTx.execute.mockResolvedValueOnce([{ id: "rec_1", recordVersion: 1, createdAt: new Date("2026-08-18T10:00:00Z"), updatedAt: new Date("2026-08-18T10:00:00Z") }]);

    try {
      await repo.update(updateInput);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as { code: string }).code).toBe("VERSION_CONFLICT");
    }

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(mockTx.insert).not.toHaveBeenCalled();
  });
});
