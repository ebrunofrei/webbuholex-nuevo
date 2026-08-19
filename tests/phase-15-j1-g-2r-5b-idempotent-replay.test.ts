import { describe, it, expect, vi } from "vitest";
import { DefaultJurisprudencePublicationExecutionService } from "@/lib/jurisprudence-publication-execution-service";
import { randomUUID } from "node:crypto";
import { JurisprudencePublicationExecutionView } from "@/types/jurisprudence-publication-execution";
import { jurisprudencePublicationExecutionViewSchema } from "@/lib/schemas/jurisprudence-publication-execution";

describe("J1-G.2R.5B: Idempotent Replay Contract Integrity", () => {
  it("should reject source records missing strictly required schema fields before transaction", async () => {
    // 1. Arrange: Setup service with a source missing 'institutionName'
    const recordId = randomUUID();
    const expectedRecordVersion = 1;
    const actorReference = "test-actor";

    const sourceReader = {
      getPublicationSource: async () => ({
        id: recordId,
        recordVersion: expectedRecordVersion,
        slug: null,
        caseNumber: "123",
        resolutionNumber: "456",
        resolutionType: "Sentencia",
        issuedAt: new Date().toISOString(),
        institutionName: "   ", // EMPTY strings should be rejected
        issuingBody: "", // EMPTY strings should be rejected
        matter: "", // EMPTY strings should be rejected
        editorialContent: {
          editorialTitle: "Valid Title",
          editorialSummary: "Summary",
        },
        officialContent: {},
        source: {
          name: "Valid Source",
          documentId: null,
        }
      })
    } as any;

    const service = new DefaultJurisprudencePublicationExecutionService({
      now: () => new Date().toISOString(),
      generateId: () => randomUUID(),
      sourceReader,
      executionRepository: {
        findLatestByRecordVersion: async () => null
      } as any,
      projectionRepository: {} as any,
      transactionCoordinator: {} as any,
      editorialWorkflow: {
        getCase: async () => ({ case: { recordId, recordVersion: expectedRecordVersion }, status: "verified_for_publication_evaluation" })
      } as any,
      publicationGovernance: {
        getDossier: async () => ({
          dossier: {
            recordId,
            recordVersion: expectedRecordVersion,
            status: "complete_for_authorization_evaluation",
            provenanceAssessment: { status: "verified" },
            integrityAssessment: { status: "verified" },
            rightsAssessment: { status: "public_display_permitted" },
            privacyAssessment: { status: "approved_for_public_projection" }
          },
          evaluation: { decision: "ready_for_authorization_evaluation" }
        })
      } as any,
      publicationAuthorization: {
        getAuthorizationCase: async () => ({
          authorizationCase: { recordId, recordVersion: expectedRecordVersion, publicationDossierId: "dossier-id", status: "granted" },
          authorizationCurrent: true,
          publicationAuthorizationGranted: true
        })
      } as any,
    });

    // 2. Act
    const result = await service.evaluateExecution({
      context: { requestId: "req", actorReference, requestedAt: new Date().toISOString() },
      recordId,
      expectedRecordVersion,
      editorialCaseId: "editorial-case",
      publicationDossierId: "dossier-id",
      authorizationCaseId: "authorization-id"
    });

    // 3. Assert
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.blockers).toContain("public_projection_unavailable");
    }
  });

  it("should ensure that executed view can be perfectly deserialized by idempotent schema (symmetry)", async () => {
    // 1. Arrange: Setup service with a completely valid source
    const recordId = randomUUID();
    const expectedRecordVersion = 1;
    const actorReference = "test-actor";
    const idempotencyKey = randomUUID();

    let createdCommit: any = null;

    const executionRepository = {
      findActiveByRecordVersion: async () => null,
      findLatestByRecordVersion: async () => null,
      findIdempotencyResult: async () => null,
      createExecution: async (commit: any) => {
        createdCommit = commit; // Intercept what would be sent to DB
      }
    } as any;

    const transactionCoordinator = {
      withTransaction: async (cb: any) => cb({ executionRepository, outboxWriter: { enqueuePublish: async () => {} }, eventEmitter: { emit: () => {} } })
    } as any;

    const sourceReader = {
      getPublicationSource: async () => ({
        id: recordId,
        recordVersion: expectedRecordVersion,
        slug: null,
        caseNumber: "123",
        resolutionNumber: "456",
        resolutionType: "Sentencia",
        issuedAt: "2024-01-01",
        institutionName: "Court",
        issuingBody: "Chamber",
        matter: "Civil",
        editorialContent: {
          editorialTitle: "Valid Title",
          // Notice: publicExcerpt and editorialSummary are missing, to test the fallback to null
        },
        officialContent: {},
        source: {
          name: "Valid Source",
          // documentId is intentionally left out to test that JSON.stringify stripping it doesn't break replay
        }
      })
    } as any;

    const service = new DefaultJurisprudencePublicationExecutionService({
      now: () => new Date().toISOString(),
      generateId: () => randomUUID(),
      sourceReader,
      executionRepository,
      projectionRepository: {} as any,
      transactionCoordinator,
      editorialWorkflow: {
        getCase: async () => ({ case: { recordId, recordVersion: expectedRecordVersion }, status: "verified_for_publication_evaluation" })
      } as any,
      publicationGovernance: {
        getDossier: async () => ({
          dossier: {
            recordId,
            recordVersion: expectedRecordVersion,
            status: "complete_for_authorization_evaluation",
            provenanceAssessment: { status: "verified" },
            integrityAssessment: { status: "verified" },
            rightsAssessment: { status: "public_display_permitted" },
            privacyAssessment: { status: "approved_for_public_projection" }
          },
          evaluation: { decision: "ready_for_authorization_evaluation" }
        })
      } as any,
      publicationAuthorization: {
        getAuthorizationCase: async () => ({
          authorizationCase: { recordId, recordVersion: expectedRecordVersion, publicationDossierId: "dossier-id", status: "granted" },
          authorizationCurrent: true,
          publicationAuthorizationGranted: true
        })
      } as any,
    });

    // 2. Act
    await service.executePublication({
      context: { requestId: "req", actorReference, requestedAt: new Date().toISOString() },
      recordId,
      expectedRecordVersion,
      editorialCaseId: "editorial-case",
      publicationDossierId: "dossier-id",
      authorizationCaseId: "authorization-id",
      idempotencyKey
    });

    // 3. Assert: the exact object JSON.stringified must be perfectly parsable by Zod
    expect(createdCommit).not.toBeNull();
    const resultToStore = createdCommit.idempotency.result;

    // Simulate what Postgres does (JSONB drop undefined keys)
    const jsonString = JSON.stringify(resultToStore);
    const rehydrated = JSON.parse(jsonString);

    // This should NOT throw
    const parsed = jurisprudencePublicationExecutionViewSchema.safeParse(rehydrated);
    expect(parsed.success, parsed.success ? "" : "Validation error: " + JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});
