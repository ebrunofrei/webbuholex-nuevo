import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresJurisprudencePublicationDossierRepository } from "@/lib/postgres-jurisprudence-publication-dossier-repository";
import { JurisprudencePublicationGovernanceError } from "@/lib/jurisprudence-publication-dossier-repository";
import type {
  JurisprudenceSourceRecord,
  JurisprudenceSourceBinding,
  JurisprudencePublicationDossier,
  PublicationDossierEvent,
  PublicationGovernanceIdempotencyEntry
} from "@/types/jurisprudence-publication-governance";

const validSource: JurisprudenceSourceRecord = {
  sourceId: "source-ficticio-valido-1",
  metadataVersion: 1,
  sourceKind: "official_judicial_portal",
  originType: "primary_official_online",
  institutionalOrigin: "Origen Ficticio",
  jurisdiction: "Nacional",
  documentReference: "ref-doc-1",
  sourceUrl: null,
  sourceDate: "2026-08-25",
  retrievedAt: "2026-08-25T00:00:00.000Z",
  custodyStatus: "documented",
  provenanceStatus: "unverified",
  integrityStatus: "not_checked",
  rightsStatus: "unknown",
  privacyStatus: "not_started",
  availabilityStatus: "available_internal",
  verificationStatus: "unverified",
  sourceChecksum: "a".repeat(64),
  sourceChecksumAlgorithm: "sha256",
  sourceFingerprint: "b".repeat(64),
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
};

const validBinding: JurisprudenceSourceBinding = {
  bindingId: "binding-ficticio-valido-1",
  sourceId: "source-ficticio-valido-1",
  recordId: "record-ficticio-1",
  recordVersion: 1,
  bindingKind: "official_basis",
  isPrimarySource: true,
  secondarySourceJustificationReference: null,
  bindingStatus: "active",
  createdAt: "2026-08-25T00:00:00.000Z",
  supersededAt: null,
  supersededByBindingId: null,
};

const validDossier: JurisprudencePublicationDossier = {
  dossierId: "dossier-ficticio-valido-1",
  recordId: "record-ficticio-1",
  recordVersion: 1,
  version: 1,
  editorialCaseId: "case-ficticio-1",
  editorialCaseVersion: 1,
  sourceBindingIds: ["binding-ficticio-valido-1"],
  provenanceAssessment: null,
  integrityAssessment: null,
  rightsAssessment: null,
  privacyAssessment: null,
  publicProjectionAssessment: null,
  institutionalOwnerReference: "owner-1",
  status: "draft",
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
  supersededAt: null,
  closedAt: null,
};

const validEvent: PublicationDossierEvent = {
  eventId: "event-ficticio-valido-1",
  dossierId: "dossier-ficticio-valido-1",
  sequence: 1,
  type: "dossier_opened",
  occurredAt: "2026-08-25T00:00:00.000Z",
  recordVersion: 1,
  dossierVersion: 1,
  payload: {
    recordId: "record-ficticio-1",
  },
};

const validIdempotency: PublicationGovernanceIdempotencyEntry = {
  idempotencyKey: "ik-ficticia-valida-1",
  commandFingerprint: "fingerprint-1",
  result: { source: validSource },
};

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

describe("J2-WEB-PROVENANCE-D3-B3 PostgresJurisprudencePublicationDossierRepository", () => {
  let repo: PostgresJurisprudencePublicationDossierRepository;
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

    repo = new PostgresJurisprudencePublicationDossierRepository();
  });

  describe("governed sources", () => {
    it("returns null if governed source is absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findSourceById("not-found")).resolves.toBeNull();
    });

    it("hydrates governed source valid jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validSource) }]);
      await expect(repo.findSourceById("source-ficticio-valido-1")).resolves.toEqual(validSource);
    });

    it("rejects invalid governed source jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: "{ malformed json" }]);
      await expect(repo.findSourceById("id")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });

    it("creates governed source", async () => {
      mockTx.values.mockResolvedValueOnce(undefined);
      await expect(repo.createSource(validSource, validIdempotency)).resolves.toBeUndefined();
    });
  });

  describe("source bindings", () => {
    it("returns null if source binding is absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findBindingById("not-found")).resolves.toBeNull();
    });

    it("hydrates source binding valid jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validBinding) }]);
      await expect(repo.findBindingById("b1")).resolves.toEqual(validBinding);
    });

    it("rejects invalid source binding jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: '{"incomplete": true}' }]);
      await expect(repo.findBindingById("b1")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });

    it("creates source binding", async () => {
      mockTx.values.mockResolvedValueOnce(undefined);
      await expect(repo.createBinding(validBinding, validIdempotency)).resolves.toBeUndefined();
    });

    it("supersedes source binding throwing VERSION_CONFLICT if previous not active", async () => {
      mockTx.where.mockResolvedValueOnce({ count: 0 }); // updateResult.count
      await expect(repo.supersedeBinding(validBinding, validBinding, validIdempotency)).rejects.toThrow(JurisprudencePublicationGovernanceError);
    });

    it("supersedes source binding successfully", async () => {
      mockTx.where.mockResolvedValueOnce({ count: 1 });
      await expect(repo.supersedeBinding(validBinding, validBinding, validIdempotency)).resolves.toBeUndefined();
    });
  });

  describe("dossiers", () => {
    it("returns null if dossier is absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findById("not-found")).resolves.toBeNull();
    });

    it("hydrates valid dossier jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validDossier) }]);
      await expect(repo.findById("d1")).resolves.toEqual(validDossier);
    });

    it("rejects invalid dossier jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: '{"status": "unknown"}' }]);
      await expect(repo.findById("d1")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });

    it("returns null if active dossier is absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findActiveByRecordAndVersion("r1", 1)).resolves.toBeNull();
    });

    it("hydrates valid active dossier jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validDossier) }]);
      await expect(repo.findActiveByRecordAndVersion("r1", 1)).resolves.toEqual(validDossier);
    });

    it("creates dossier successfully", async () => {
      mockTx.values.mockResolvedValueOnce(undefined);
      await expect(repo.create({ dossier: validDossier, event: validEvent, idempotency: validIdempotency })).resolves.toBeUndefined();
    });

    it("commits dossier successfully", async () => {
      mockTx.where.mockResolvedValueOnce({ count: 1 });
      await expect(repo.commit({ dossier: validDossier, expectedVersion: 1, event: validEvent, idempotency: validIdempotency })).resolves.toBeUndefined();
    });

    it("throws VERSION_CONFLICT on optimistic locking failure", async () => {
      mockTx.where.mockResolvedValueOnce({ count: 0 });
      await expect(repo.commit({ dossier: validDossier, expectedVersion: 1, event: validEvent, idempotency: validIdempotency })).rejects.toThrow(JurisprudencePublicationGovernanceError);
    });
  });

  describe("events", () => {
    it("throws NOT_FOUND if listing events for absent dossier", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.listEvents("not-found")).rejects.toThrow(JurisprudencePublicationGovernanceError);
    });

    it("hydrates valid events jsonb and respects ordering", async () => {
      const event2 = { ...validEvent, sequence: 2 };
      mockTx.limit.mockResolvedValueOnce([{ dossierId: "d1" }]);
      mockTx.orderBy.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validEvent) }, { payloadJson: JSON.stringify(event2) }]);

      const events = await repo.listEvents("d1");
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(validEvent);
      expect(events[1]).toEqual(event2);
      expect(mockTx.orderBy).toHaveBeenCalled(); // Asserts order clause is attached
    });

    it("rejects invalid event jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ dossierId: "d1" }]);
      mockTx.orderBy.mockResolvedValueOnce([{ payloadJson: "{}" }]);
      await expect(repo.listEvents("d1")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });
  });

  describe("idempotency", () => {
    it("returns null if idempotency absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findIdempotencyResult("not-found")).resolves.toBeNull();
    });

    it("hydrates valid idempotency jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ commandFingerprint: "fingerprint-1", resultJson: JSON.stringify({ source: validSource }) }]);
      await expect(repo.findIdempotencyResult("ik-ficticia-valida-1")).resolves.toEqual(validIdempotency);
    });

    it("rejects invalid idempotency jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ commandFingerprint: "fingerprint-1", resultJson: "{}" }]);
      await expect(repo.findIdempotencyResult("ik")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });
  });

  describe("postgres constraint mappings", () => {
    const simulateError = (code: string, constraint?: string) => {
      mockTx.values.mockRejectedValueOnce({ code, constraint_name: constraint });
    };

    it("maps concurrent 23505 duplicate active dossier", async () => {
      simulateError("23505", "jurisprudence_publication_dossiers_active_idx");
      await expect(repo.create({ dossier: validDossier, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "DUPLICATE_ACTIVE_DOSSIER" });
    });

    it("maps concurrent 23505 event sequence conflict", async () => {
      simulateError("23505", "jurisprudence_pub_dossier_events_seq_unique");
      await expect(repo.create({ dossier: validDossier, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    });

    it("maps concurrent 23505 idempotency conflict", async () => {
      simulateError("23505", "jurisprudence_publication_governance_idempotency_pkey");
      await expect(repo.create({ dossier: validDossier, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    });

    it("falls back safely on unrelated 23505", async () => {
      simulateError("23505", "unrelated_constraint");
      await expect(repo.create({ dossier: validDossier, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });

    it("falls back safely on duplicate PK missing specific mapping", async () => {
      simulateError("23505", "jurisprudence_governed_sources_pkey");
      await expect(repo.createSource(validSource, validIdempotency)).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });
  });

  describe("lifecycle", () => {
    it("closes and prevents operations", async () => {
      await repo.close();
      await expect(repo.findById("d1")).rejects.toMatchObject({ code: "RESOURCE_CLOSED" });
    });

    it("is idempotent on close", async () => {
      await repo.close();
      await expect(repo.close()).resolves.toBeUndefined();
    });
  });
});
