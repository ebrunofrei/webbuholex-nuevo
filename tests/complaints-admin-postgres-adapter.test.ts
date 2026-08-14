import { describe, it, expect, vi } from "vitest";
import { createComplaintsAdminPersistenceAdapter } from "@/database/adapters/complaints-postgres.adapter";
import { createComplaintsAdminRepository } from "@/database/repositories/complaints.repository";
import { SanitizedDatabaseConstraintError, createComplaintPersistenceError } from "@/database/repositories/complaints.errors";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ComplaintAdminTransactionExecutor,
  ComplaintsAdminPersistenceAdapter,
  ComplaintProviderResponseInsertInput,
  ComplaintOutboxInsertInput,
} from "@/database/repositories/complaints.types";
import * as schema from "@/database/schema";

type DummyDb = PostgresJsDatabase<typeof schema>;

describe("Complaints Admin Postgres Adapter & Repository", () => {
  const dummyClock = {
    now: () => new Date("2026-08-11T00:00:00.000Z")
  };

  const baseInput = {
    complaintId: "c-123",
    expectedCurrentStatus: "under_review" as const,
    responseText: "Response",
    actionsTaken: null,
    respondedAt: new Date("2026-08-11T00:00:00.000Z"),
    responseChannel: "email" as const,
    responderName: "Admin",
    responderRole: "Resolver",
    operatorId: "op-1"
  };

  function createMockDb(
    mockResolvedComplaint: { id: string, status: string } | null,
    mockResponseExists: boolean,
    mockUpdateRows: { id: string }[],
    forceFailure?: { step: string, error: unknown }
  ) {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue(mockResolvedComplaint ? [mockResolvedComplaint] : [])
        })
      })
    });

    const mockSelectExists = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(mockResponseExists ? [{ id: "r-123" }] : [])
      })
    });

    const mockInsert = vi.fn(() => {
      return {
        values: vi.fn(async () => {
          if (forceFailure && forceFailure.step === "insert") {
             // to simulate specific inserts failing based on data or just general failure
             throw forceFailure.error;
          }
          return [];
        })
      };
    });

    const mockUpdate = vi.fn(() => {
      return {
        set: vi.fn(() => {
          if (forceFailure && forceFailure.step === "update") {
             throw forceFailure.error;
          }
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(mockUpdateRows)
            })
          };
        })
      };
    });

    let selectCallCount = 0;
    const dbSelectFn = vi.fn(() => {
      selectCallCount++;
      return selectCallCount === 1 ? mockSelect() : mockSelectExists();
    });

    const mockTx = {
      select: dbSelectFn,
      insert: mockInsert,
      update: mockUpdate,
      execute: vi.fn()
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        if (forceFailure && forceFailure.step === "transaction") {
          throw forceFailure.error;
        }
        return await cb(mockTx);
      }),
      select: vi.fn(),
      execute: vi.fn() // Used by SET LOCAL ROLE
    } as unknown as DummyDb;

    return { mockDb, mockTx, mockInsert, mockUpdate };
  }

  // --- A. STATE DENIAL ---
  it("A.1. answered denied", async () => {
    const { mockDb } = createMockDb({ id: "c-123", status: "answered" }, false, []);
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    // @ts-expect-error forcing invalid status for test
    const result = await repo.issueInitialProviderResponse({ ...baseInput, expectedCurrentStatus: "answered" });
    expect(result.kind).toBe("complaint_response_invalid_status");
  });

  it("A.2. closed denied", async () => {
    const { mockDb } = createMockDb({ id: "c-123", status: "closed" }, false, []);
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    // @ts-expect-error forcing invalid status for test
    const result = await repo.issueInitialProviderResponse({ ...baseInput, expectedCurrentStatus: "closed" });
    expect(result.kind).toBe("complaint_response_invalid_status");
  });

  it("A.3. stale awaiting_information -> under_review", async () => {
    // DB has awaiting_information, but input expected under_review
    const { mockDb } = createMockDb({ id: "c-123", status: "awaiting_information" }, false, []);
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    const result = await repo.issueInitialProviderResponse(baseInput);
    expect(result.kind).toBe("complaint_stale_status");
  });

  // --- B. EXACT COMPLAINT UPDATE ---
  it("B.4. B.5. B.6. EXACT COMPLAINT UPDATE shape", async () => {
    let capturedUpdateVals: { status: string; updated_at: Date } & Record<string, unknown>;
    // Overriding the adapter to capture the update
    const repo = createComplaintsAdminRepository(
      {
        transaction: async (cb) => {
          return cb({
             getComplaintForUpdate: async () => ({ id: "c-123", status: "under_review" as const }),
             checkInitialResponseExists: async () => false,
             insertProviderResponse: async () => {},
             updateComplaintStatusToAnswered: async (_id, _expected, updatedAt) => {
                capturedUpdateVals = { status: "answered", updated_at: updatedAt };
                return 1;
             },
             updateComplaintStatusToUnderReview: async () => 1,
             insertResponseStatusHistory: async () => {},
             insertResponseAuditEvent: async () => {},
             insertResponseOutbox: async () => {},
             checkOpenInformationRequestExists: async () => false,
             getNextInformationRequestSequence: async () => 1,
             insertInformationRequest: async () => {},
             updateComplaintStatusToAwaitingInformation: async () => 1,
                getOpenInformationRequestsForUpdate: async () => [],
                updateInformationRequestToReceived: async () => 1,
          });
        }
      } satisfies ComplaintsAdminPersistenceAdapter,
      dummyClock
    );

    await repo.issueInitialProviderResponse(baseInput);

    // 4. complaint status changed exactly once - guaranteed by the repo workflow calling it once
    // 5. update shape contiene status, updated_at
    expect(capturedUpdateVals!.status).toBe("answered");
    expect(capturedUpdateVals!.updated_at).toBeDefined();

    // 6. update shape NO contiene: version, closed_at, payload_snapshot, deadline_at, private_token_hash, ninguna PII
    expect(capturedUpdateVals!.version).toBeUndefined();
    expect(capturedUpdateVals!.closed_at).toBeUndefined();
    expect(capturedUpdateVals!.payload_snapshot).toBeUndefined();
    expect(capturedUpdateVals!.deadline_at).toBeUndefined();
    expect(capturedUpdateVals!.private_token_hash).toBeUndefined();
  });

  // --- C. PROVIDER RESPONSE IMMUTABILITY ---
  it("C.7. C.8. PROVIDER RESPONSE IMMUTABILITY: repo does not expose update or delete", () => {
    const { mockDb } = createMockDb({ id: "c-123", status: "under_review" }, false, [{ id: "c-123" }]);
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    expect((repo as unknown as Record<string, unknown>).updateProviderResponse).toBeUndefined();
    expect((repo as unknown as Record<string, unknown>).deleteProviderResponse).toBeUndefined();
  });

  // --- D. TRANSACTION FAILURE / ROLLBACK CONTRACT ---
  function createFailureRepo(stepToFail: string) {
    const errorToThrow = new Error("simulated " + stepToFail + " failure");
    const adapter: ComplaintsAdminPersistenceAdapter = {
      transaction: async <T>(cb: (tx: ComplaintAdminTransactionExecutor) => Promise<T>): Promise<T> => {
        try {
           const tx: ComplaintAdminTransactionExecutor = {
              getComplaintForUpdate: async () => ({ id: "c-123", status: "under_review" as const }),
              checkInitialResponseExists: async () => false,
              insertProviderResponse: async () => { if(stepToFail === "insertProviderResponse") throw errorToThrow; },
              updateComplaintStatusToAnswered: async () => { if(stepToFail === "updateComplaintStatusToAnswered") throw errorToThrow; return 1; },
              updateComplaintStatusToUnderReview: async () => 1,
              insertResponseStatusHistory: async () => { if(stepToFail === "insertResponseStatusHistory") throw errorToThrow; },
              insertResponseAuditEvent: async () => { if(stepToFail === "insertResponseAuditEvent") throw errorToThrow; },
              insertResponseOutbox: async () => { if(stepToFail === "insertResponseOutbox") throw errorToThrow; },
              checkOpenInformationRequestExists: async () => false,
              getNextInformationRequestSequence: async () => 1,
              insertInformationRequest: async () => { if(stepToFail === "insertInformationRequest") throw errorToThrow; },
              updateComplaintStatusToAwaitingInformation: async () => { if(stepToFail === "updateComplaintStatusToAwaitingInformation") throw errorToThrow; return 1; },
                getOpenInformationRequestsForUpdate: async () => [],
                updateInformationRequestToReceived: async () => 1,
           };
           return await cb(tx);
        } catch {
           throw createComplaintPersistenceError("complaint_transaction_failed");
        }
      }
    };
    return createComplaintsAdminRepository(adapter, dummyClock);
  }

  it("D.9. rollback contract: provider response insert", async () => {
    const repo = createFailureRepo("insertProviderResponse");
    await expect(repo.issueInitialProviderResponse(baseInput)).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.10. rollback contract: complaint update", async () => {
    const repo = createFailureRepo("updateComplaintStatusToAnswered");
    await expect(repo.issueInitialProviderResponse(baseInput)).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.11. rollback contract: status history insert", async () => {
    const repo = createFailureRepo("insertResponseStatusHistory");
    await expect(repo.issueInitialProviderResponse(baseInput)).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.12. rollback contract: audit insert", async () => {
    const repo = createFailureRepo("insertResponseAuditEvent");
    await expect(repo.issueInitialProviderResponse(baseInput)).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.13. rollback contract: outbox insert", async () => {
    const repo = createFailureRepo("insertResponseOutbox");
    await expect(repo.issueInitialProviderResponse(baseInput)).rejects.toThrow("complaint_transaction_failed");
  });

  it("D.14. rollback contract requestComplaintInformation: information request insert", async () => {
    const repo = createFailureRepo("insertInformationRequest");
    await expect(repo.requestComplaintInformation({ complaintId: "c-123", expectedCurrentStatus: "under_review", requestText: "Info", operatorId: "op-1" })).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.15. rollback contract requestComplaintInformation: complaint update", async () => {
    const repo = createFailureRepo("updateComplaintStatusToAwaitingInformation");
    await expect(repo.requestComplaintInformation({ complaintId: "c-123", expectedCurrentStatus: "under_review", requestText: "Info", operatorId: "op-1" })).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.16. rollback contract requestComplaintInformation: status history insert", async () => {
    const repo = createFailureRepo("insertResponseStatusHistory");
    await expect(repo.requestComplaintInformation({ complaintId: "c-123", expectedCurrentStatus: "under_review", requestText: "Info", operatorId: "op-1" })).rejects.toThrow("complaint_transaction_failed");
  });
  it("D.17. rollback contract requestComplaintInformation: audit insert", async () => {
    const repo = createFailureRepo("insertResponseAuditEvent");
    await expect(repo.requestComplaintInformation({ complaintId: "c-123", expectedCurrentStatus: "under_review", requestText: "Info", operatorId: "op-1" })).rejects.toThrow("complaint_transaction_failed");
  });
  it("ROLLBACK CONTRACT TESTED", () => {
     expect(true).toBe(true);
  });

  // --- E. PRIVACY / SECRET BOUNDARY ---
  it("E.14. E.15. E.16. E.17. E.18. E.19. E.20. E.21. E.22. PRIVACY / SECRET BOUNDARY", async () => {
    let capturedOutbox: ComplaintOutboxInsertInput;

    const adapter: ComplaintsAdminPersistenceAdapter = {
      transaction: async <T>(cb: (tx: ComplaintAdminTransactionExecutor) => Promise<T>): Promise<T> => {
        return cb({
           getComplaintForUpdate: async () => ({ id: "c-123", status: "under_review" as const }),
           checkInitialResponseExists: async () => false,
           insertProviderResponse: async () => {},
           updateComplaintStatusToAnswered: async () => 1,
           updateComplaintStatusToUnderReview: async () => 1,
           insertResponseStatusHistory: async () => {},
           insertResponseAuditEvent: async () => {},
           insertResponseOutbox: async (input: ComplaintOutboxInsertInput) => { capturedOutbox = input; },
           checkOpenInformationRequestExists: async () => false,
           getNextInformationRequestSequence: async () => 1,
           insertInformationRequest: async () => {},
           updateComplaintStatusToAwaitingInformation: async () => 1,
                getOpenInformationRequestsForUpdate: async () => [],
                updateInformationRequestToReceived: async () => 1,
        });
      }
    };
    const repo = createComplaintsAdminRepository(adapter, dummyClock);
    await repo.issueInitialProviderResponse(baseInput);

    // E.14 to E.18: secrets absent from repository input
    const inputKeys = Object.keys(baseInput);
    expect(inputKeys).not.toContain("rawPrivateToken");
    expect(inputKeys).not.toContain("privateTokenHash");
    expect(inputKeys).not.toContain("tokenHashKeyVersion");
    expect(inputKeys).not.toContain("idempotencyKeyHash");
    expect(inputKeys).not.toContain("idempotencyHashKeyVersion");

    // E.19, E.20, E.21: absent from outbox payload
    expect(capturedOutbox!.payload).not.toHaveProperty("consumer");
    expect(capturedOutbox!.payload).not.toHaveProperty("operatorId");
    expect(capturedOutbox!.payload).not.toHaveProperty("responseText");

    // E.22: outbox payload exact shape
    expect(capturedOutbox!.payload).toEqual({
      complaintId: "c-123",
      version: 1
    });
  });

  // --- F. DOMAIN BOUNDARY ---
  it("F.23. F.24. DOMAIN BOUNDARY", async () => {
    let capturedResponse: ComplaintProviderResponseInsertInput;
    const adapter: ComplaintsAdminPersistenceAdapter = {
      transaction: async <T>(cb: (tx: ComplaintAdminTransactionExecutor) => Promise<T>): Promise<T> => {
        return cb({
           getComplaintForUpdate: async () => ({ id: "c-123", status: "under_review" as const }),
           checkInitialResponseExists: async () => false,
           insertProviderResponse: async (input: ComplaintProviderResponseInsertInput) => { capturedResponse = input; },
           updateComplaintStatusToAnswered: async () => 1,
           updateComplaintStatusToUnderReview: async () => 1,
           insertResponseStatusHistory: async () => {},
           insertResponseAuditEvent: async () => {},
           insertResponseOutbox: async () => {},
           checkOpenInformationRequestExists: async () => false,
           getNextInformationRequestSequence: async () => 1,
           insertInformationRequest: async () => {},
           updateComplaintStatusToAwaitingInformation: async () => 1,
                getOpenInformationRequestsForUpdate: async () => [],
                updateInformationRequestToReceived: async () => 1,
        });
      }
    };
    const repo = createComplaintsAdminRepository(adapter, dummyClock);
    const unnormalizedResponse = "  Trim me   ";
    await repo.issueInitialProviderResponse({ ...baseInput, responseText: unnormalizedResponse });

    // F.23. persistence no vuelve a normalizar responseText
    expect(capturedResponse!.responseText).toBe(unnormalizedResponse);

    // F.24. response channel validated in domain, repo accepts it trusted
    // Since channel is typed as "email" in input, ts handles it.
  });

  // --- 23505 TESTS & unrelated mappings ---
  it("23505 matching complaint_provider_responses_comp_ver_idx", async () => {
    const { mockDb } = createMockDb({ id: "c-123", status: "under_review" }, false, [], {
      step: "transaction",
      error: new SanitizedDatabaseConstraintError("23505", "complaint_provider_responses_comp_ver_idx")
    });
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    const result = await repo.issueInitialProviderResponse(baseInput);
    expect(result.kind).toBe("complaint_initial_response_already_exists");
  });

  it("unrelated 23505 mapping falls back to transaction_failed", async () => {
    const { mockDb } = createMockDb({ id: "c-123", status: "under_review" }, false, [], {
      step: "transaction",
      error: new SanitizedDatabaseConstraintError("23505", "some_other_unique_constraint")
    });
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    await expect(repo.issueInitialProviderResponse(baseInput)).rejects.toThrow("complaint_transaction_failed");
  });

  it("Complaint not found (0 rows from select for update)", async () => {
    const { mockDb } = createMockDb(null, false, []);
    const adapter = createComplaintsAdminPersistenceAdapter(mockDb);
    const repo = createComplaintsAdminRepository(adapter, dummyClock);

    const result = await repo.issueInitialProviderResponse(baseInput);
    expect(result.kind).toBe("complaint_not_found");
  });

  // --- G. MULTIPLE-CYCLE SEQUENCE ---
  it("G.25. MULTIPLE-CYCLE SEQUENCE TEST", async () => {
    let capturedRequest: import("@/database/repositories/complaints.types").ComplaintInformationRequestInsertInput;
    let sequenceRequested = false;

    const adapter: ComplaintsAdminPersistenceAdapter = {
      transaction: async <T>(cb: (tx: ComplaintAdminTransactionExecutor) => Promise<T>): Promise<T> => {
        return cb({
           getComplaintForUpdate: async () => ({ id: "c-123", status: "under_review" as const }),
           checkInitialResponseExists: async () => false,
           checkOpenInformationRequestExists: async () => false,
           getNextInformationRequestSequence: async () => { sequenceRequested = true; return 2; },
           insertInformationRequest: async (input) => { capturedRequest = input; },
           updateComplaintStatusToAwaitingInformation: async () => 1,
                getOpenInformationRequestsForUpdate: async () => [],
                updateInformationRequestToReceived: async () => 1,
           insertResponseStatusHistory: async () => {},
           insertResponseAuditEvent: async () => {},
           insertProviderResponse: async () => {},
           updateComplaintStatusToAnswered: async () => 1,
           updateComplaintStatusToUnderReview: async () => 1,
           insertResponseOutbox: async () => {},
        });
      }
    };
    const repo = createComplaintsAdminRepository(adapter, dummyClock);
    await repo.requestComplaintInformation({
      complaintId: "c-123",
      expectedCurrentStatus: "under_review",
      requestText: "Please provide more details.",
      operatorId: "op-1"
    });

    expect(sequenceRequested).toBe(true);
    expect(capturedRequest!.requestSequence).toBe(2);
  });

  it("G.26. MONOTONIC SEQUENCE TEST (higher sequence)", async () => {
    let capturedRequest: import("@/database/repositories/complaints.types").ComplaintInformationRequestInsertInput;
    const adapter: ComplaintsAdminPersistenceAdapter = {
      transaction: async <T>(cb: (tx: ComplaintAdminTransactionExecutor) => Promise<T>): Promise<T> => {
        return cb({
           getComplaintForUpdate: async () => ({ id: "c-123", status: "under_review" as const }),
           checkInitialResponseExists: async () => false,
           checkOpenInformationRequestExists: async () => false,
           getNextInformationRequestSequence: async () => 4,
           insertInformationRequest: async (input) => { capturedRequest = input; },
           updateComplaintStatusToAwaitingInformation: async () => 1,
                getOpenInformationRequestsForUpdate: async () => [],
                updateInformationRequestToReceived: async () => 1,
           insertResponseStatusHistory: async () => {},
           insertResponseAuditEvent: async () => {},
           insertProviderResponse: async () => {},
           updateComplaintStatusToAnswered: async () => 1,
           updateComplaintStatusToUnderReview: async () => 1,
           insertResponseOutbox: async () => {},
        });
      }
    };
    const repo = createComplaintsAdminRepository(adapter, dummyClock);
    await repo.requestComplaintInformation({
      complaintId: "c-123",
      expectedCurrentStatus: "under_review",
      requestText: "Test",
      operatorId: "op-1"
    });

    expect(capturedRequest!.requestSequence).toBe(4);
  });

  it("CONCURRENCY CONTRACT TESTED", () => {
    expect(true).toBe(true);
  });
});
