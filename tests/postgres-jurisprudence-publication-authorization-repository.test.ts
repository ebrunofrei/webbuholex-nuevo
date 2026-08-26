import { describe, it, expect, vi, beforeEach } from "vitest";
import { asc } from "drizzle-orm";
import { jurisprudencePublicationAuthorizationEvents } from "@/database/schema/jurisprudence";
import { PostgresJurisprudencePublicationAuthorizationRepository } from "@/lib/postgres-jurisprudence-publication-authorization-repository";
import { JurisprudencePublicationAuthorizationError } from "@/lib/jurisprudence-publication-authorization-repository";
import type {
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationIdempotencyEntry
} from "@/types/jurisprudence-publication-authorization";

const validCase: JurisprudencePublicationAuthorizationCase = {
  authorizationCaseId: "auth-case-1",
  publicationDossierId: "dossier-1",
  recordId: "record-1",
  recordVersion: 1,
  decision: "authorize",
  status: "authorized",
  institutionalAuthorityRef: "auth-ref",
  decisionRef: "dec-ref",
  authorizationScopeRef: "scope-ref",
  decidedAt: "2026-08-25T00:00:00.000Z",
  effectiveFrom: "2026-08-25T00:00:00.000Z",
  reasons: [],
  blockers: [],
  conditions: ["source_governance_complete", "editorial_review_current", "legal_verification_current", "rights_assessment_accepted", "privacy_assessment_accepted", "public_projection_assessed", "institutional_owner_confirmed", "publication_scope_defined", "validity_period_defined", "revocation_procedure_defined"],
  version: 1,
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
  revokedAt: null,
  supersededAt: null,
  publicationAuthorizationGranted: true,
  publicationExecuted: false,
};

const validEvent: JurisprudencePublicationAuthorizationEvent = {
  eventId: "event-1",
  authorizationCaseId: "auth-case-1",
  sequence: 1,
  type: "authorization_granted",
  occurredAt: "2026-08-25T00:00:00.000Z",
  recordVersion: 1,
  authorizationVersion: 1,
  payload: {
    recordId: "record-1",
  },
};

const validIdempotency: JurisprudencePublicationAuthorizationIdempotencyEntry = {
  idempotencyKey: "ik-1",
  commandFingerprint: "fingerprint-1",
  result: {
    authorizationCase: validCase,
    authorizationCurrent: true,
    publicationAuthorizationGranted: true,
    publicationExecuted: false,
  },
};

const mocks = vi.hoisted(() => {
  return {
    mockTx: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
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

describe("J2-WEB-PROVENANCE-D3-B4 PostgresJurisprudencePublicationAuthorizationRepository", () => {
  let repo: PostgresJurisprudencePublicationAuthorizationRepository;
  const mockTx = mocks.mockTx;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx.select.mockReturnThis();
    mockTx.from.mockReturnThis();
    mockTx.where.mockReturnThis();
    mockTx.limit.mockReturnThis();
    mockTx.orderBy.mockReturnThis();
    mockTx.innerJoin.mockReturnThis();
    mockTx.insert.mockReturnThis();
    mockTx.values.mockReturnThis();
    mockTx.update.mockReturnThis();
    mockTx.set.mockReturnThis();

    repo = new PostgresJurisprudencePublicationAuthorizationRepository();
  });

  describe("cases", () => {
    it("returns null if authorization case is absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findById("not-found")).resolves.toBeNull();
    });

    it("hydrates authorization case valid jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validCase) }]);
      await expect(repo.findById("auth-case-1")).resolves.toEqual(validCase);
    });

    it("rejects invalid authorization case jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ payloadJson: '{"status": "unknown"}' }]);
      await expect(repo.findById("id")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });

    it("returns null if active authorization is absent", async () => {
      mockTx.where.mockResolvedValueOnce([]);
      await expect(repo.findActiveByRecordVersion("record-1", 1, "2026-08-25T00:00:00.000Z")).resolves.toBeNull();
    });

    it("hydrates valid active authorization case jsonb", async () => {
      mockTx.where.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validCase) }]);
      await expect(repo.findActiveByRecordVersion("record-1", 1, "2026-08-25T00:00:00.000Z")).resolves.toEqual(validCase);
    });

    it("ignores expired active authorization", async () => {
      const expiredCase = { ...validCase, effectiveFrom: "2026-08-23T00:00:00.000Z", expiresAt: "2026-08-24T00:00:00.000Z" };
      mockTx.where.mockResolvedValueOnce([{ payloadJson: JSON.stringify(expiredCase) }]);
      await expect(repo.findActiveByRecordVersion("record-1", 1, "2026-08-25T00:00:00.000Z")).resolves.toBeNull();
    });

    it("ignores revoked active authorization", async () => {
      const revokedCase = { ...validCase, revokedAt: "2026-08-24T00:00:00.000Z" };
      mockTx.where.mockResolvedValueOnce([{ payloadJson: JSON.stringify(revokedCase) }]);
      await expect(repo.findActiveByRecordVersion("record-1", 1, "2026-08-25T00:00:00.000Z")).resolves.toBeNull();
    });

    it("ignores superseded active authorization", async () => {
      const supersededCase = { ...validCase, supersededAt: "2026-08-24T00:00:00.000Z" };
      mockTx.where.mockResolvedValueOnce([{ payloadJson: JSON.stringify(supersededCase) }]);
      await expect(repo.findActiveByRecordVersion("record-1", 1, "2026-08-25T00:00:00.000Z")).resolves.toBeNull();
    });

    it("creates authorization successfully", async () => {
      mockTx.where.mockResolvedValueOnce([]); // no existing active
      mockTx.values.mockResolvedValueOnce(undefined);
      await expect(repo.createDecision({ authorizationCase: validCase, event: validEvent, idempotency: validIdempotency })).resolves.toBeUndefined();
    });

    it("throws EXISTING_ACTIVE_AUTHORIZATION if creating and one is active", async () => {
      mockTx.where.mockResolvedValueOnce([{ payloadJson: JSON.stringify(validCase) }]); // active exists
      await expect(repo.createDecision({ authorizationCase: validCase, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "EXISTING_ACTIVE_AUTHORIZATION" });
    });

    it("updates (revoke) authorization successfully", async () => {
      mockTx.where.mockResolvedValueOnce({ count: 1 });
      await expect(repo.revokeAuthorization({ authorizationCase: validCase, expectedVersion: 1, event: validEvent, idempotency: validIdempotency })).resolves.toBeUndefined();
    });

    it("throws VERSION_CONFLICT on optimistic locking failure for update", async () => {
      mockTx.where.mockResolvedValueOnce({ count: 0 });
      await expect(repo.revokeAuthorization({ authorizationCase: validCase, expectedVersion: 1, event: validEvent, idempotency: validIdempotency })).rejects.toThrow(JurisprudencePublicationAuthorizationError);
    });
  });

  describe("events", () => {
    it("hydrates valid events jsonb and respects deterministic multi-case ordering in listHistoryByRecord", async () => {
      // Event conceptually from a second case
      const event2 = { ...validEvent, eventId: "event-2", authorizationCaseId: "auth-case-2", sequence: 1, type: "authorization_rejected" as const, occurredAt: "2026-08-25T01:00:00.000Z" };

      mockTx.orderBy.mockResolvedValueOnce([
        { payloadJson: JSON.stringify(validEvent) },
        { payloadJson: JSON.stringify(event2) }
      ]);

      const events = await repo.listHistoryByRecord("record-1");
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(validEvent);
      expect(events[1]).toEqual(event2);

      // Asserts order clause is attached properly for cross-case chronological ordering
      expect(mockTx.orderBy).toHaveBeenCalledWith(
        asc(jurisprudencePublicationAuthorizationEvents.occurredAt),
        asc(jurisprudencePublicationAuthorizationEvents.eventId)
      );
    });

    it("rejects invalid event jsonb", async () => {
      mockTx.orderBy.mockResolvedValueOnce([{ payloadJson: "{}" }]);
      await expect(repo.listHistoryByRecord("record-1")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });
  });

  describe("idempotency", () => {
    it("returns null if idempotency absent", async () => {
      mockTx.limit.mockResolvedValueOnce([]);
      await expect(repo.findIdempotencyResult("not-found")).resolves.toBeNull();
    });

    it("hydrates valid idempotency jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ commandFingerprint: "fingerprint-1", resultJson: JSON.stringify(validIdempotency.result) }]);
      await expect(repo.findIdempotencyResult("ik-1")).resolves.toEqual(validIdempotency);
    });

    it("rejects invalid idempotency jsonb", async () => {
      mockTx.limit.mockResolvedValueOnce([{ commandFingerprint: "fingerprint-1", resultJson: "{}" }]);
      await expect(repo.findIdempotencyResult("ik-1")).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });
  });

  describe("postgres constraint mappings", () => {
    const simulateError = (code: string, constraint?: string) => {
      // Simulate error coming from transaction
      mocks.mockTx.values.mockRejectedValueOnce({ code, constraint_name: constraint });
    };

    it("maps concurrent 23505 event sequence conflict", async () => {
      mockTx.where.mockResolvedValueOnce([]); // mock existing active check
      simulateError("23505", "jurisprudence_auth_events_seq_unique");
      await expect(repo.createDecision({ authorizationCase: validCase, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    });

    it("maps concurrent 23505 idempotency conflict", async () => {
      mockTx.where.mockResolvedValueOnce([]); // mock existing active check
      simulateError("23505", "jurisprudence_publication_authorization_idempotency_pkey");
      await expect(repo.createDecision({ authorizationCase: validCase, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    });

    it("falls back safely on unrelated 23505", async () => {
      mockTx.where.mockResolvedValueOnce([]); // mock existing active check
      simulateError("23505", "unrelated_constraint");
      await expect(repo.createDecision({ authorizationCase: validCase, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    });

    it("falls back safely on duplicate PK missing specific mapping", async () => {
      mockTx.where.mockResolvedValueOnce([]); // mock existing active check
      simulateError("23505", "jurisprudence_publication_authorization_cases_pkey");
      await expect(repo.createDecision({ authorizationCase: validCase, event: validEvent, idempotency: validIdempotency })).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
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
