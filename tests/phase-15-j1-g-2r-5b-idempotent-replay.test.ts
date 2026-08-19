import { describe, it, expect } from "vitest";
import { DefaultJurisprudencePublicationExecutionService } from "@/lib/jurisprudence-publication-execution-service";
import { randomUUID } from "node:crypto";
import { jurisprudencePublicationExecutionViewSchema } from "@/lib/schemas/jurisprudence-publication-execution";
import type { JurisprudencePublicationSourceReader } from "@/types/jurisprudence-publication-source-reader";
import type {
  JurisprudencePublicationExecutionRepository,
  JurisprudencePublicProjectionRepository
} from "@/types/jurisprudence-publication-execution";
import type { JurisprudencePublicationTransactionCoordinator } from "@/types/jurisprudence-publication-transaction";
import type { JurisprudenceEditorialWorkflow } from "@/types/jurisprudence-editorial-workflow";
import type { JurisprudencePublicationGovernanceService } from "@/types/jurisprudence-publication-governance";
import type { JurisprudencePublicationAuthorizationService } from "@/types/jurisprudence-publication-authorization";

describe("J1-G.2R.5B: Idempotent Replay Contract Integrity", () => {
  it("should reject source records missing strictly required schema fields before transaction", async () => {
    // 1. Arrange: Setup service with a source missing 'institutionName'
    const recordId = randomUUID();
    const expectedRecordVersion = 1;
    const actorReference = "test-actor";

    const sourceReader: JurisprudencePublicationSourceReader = {
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
          publicExcerpt: null,
          legalIssue: null,
          mainCriterion: null,
          relevantGrounds: [],
          decision: null,
          citedNorms: [],
          citedPrecedentIds: [],
          relatedRecordIds: [],
          keywords: []
        },
        officialContent: {
          officialSummary: null,
          officialFullText: null,
          fullTextAvailable: false,
          publicationAllowed: true,
          documentAvailability: "metadata_only",
          originFormat: "pdf",
          language: "es",
          pageCount: null
        },
        source: {
          type: "official_judiciary",
          name: "Valid Source",
          url: null,
          documentId: null,
          publishedAt: null,
          retrievedAt: null,
          checksum: null,
          verificationStatus: "unverified",
          verifiedAt: null,
          verifiedBy: null,
          verificationNotes: null,
          evidenceReference: null
        }
      })
    };

    const executionRepository: JurisprudencePublicationExecutionRepository = {
      findById: async () => { throw new Error("not impl"); },
      findActiveByRecordVersion: async () => { throw new Error("not impl"); },
      findLatestByRecordVersion: async () => null,
      listHistory: async () => { throw new Error("not impl"); },
      findIdempotencyResult: async () => { throw new Error("not impl"); },
      createExecution: async () => { throw new Error("not impl"); },
      updateExecution: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const projectionRepository: JurisprudencePublicProjectionRepository = {
      findById: async () => { throw new Error("not impl"); },
      findActiveByRecordVersion: async () => { throw new Error("not impl"); },
      listByRecord: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const transactionCoordinator: JurisprudencePublicationTransactionCoordinator = {
      withTransaction: async () => { throw new Error("not impl"); },
    };

    const editorialWorkflow: JurisprudenceEditorialWorkflow = {
      openCase: async () => { throw new Error("not impl"); },
      assignReview: async () => { throw new Error("not impl"); },
      recordObservation: async () => { throw new Error("not impl"); },
      resolveObservation: async () => { throw new Error("not impl"); },
      recordDecision: async () => { throw new Error("not impl"); },
      evaluatePublication: async () => { throw new Error("not impl"); },
      synchronizeCase: async () => { throw new Error("not impl"); },
      closeCase: async () => { throw new Error("not impl"); },
      getCase: async () => ({
        case: {
          caseId: "editorial-case",
          recordId,
          recordVersion: expectedRecordVersion,
          caseVersion: 1,
          purpose: "publication",
          openedAt: new Date().toISOString(),
          openedByReference: actorReference,
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
          updatedAt: new Date().toISOString(),
          expiresAt: "2024-01-01"
        },
        status: "verified_for_publication_evaluation",
        openBlockingObservations: 0,
        publicationAuthorizationGranted: false,
        publicationExecuted: false
      }),
      getHistory: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const publicationGovernance: JurisprudencePublicationGovernanceService = {
      registerSource: async () => { throw new Error("not impl"); },
      bindSource: async () => { throw new Error("not impl"); },
      supersedeSourceBinding: async () => { throw new Error("not impl"); },
      openDossier: async () => { throw new Error("not impl"); },
      assessProvenance: async () => { throw new Error("not impl"); },
      assessIntegrity: async () => { throw new Error("not impl"); },
      assessRights: async () => { throw new Error("not impl"); },
      assessPrivacy: async () => { throw new Error("not impl"); },
      assessPublicProjection: async () => { throw new Error("not impl"); },
      evaluateDossier: async () => { throw new Error("not impl"); },
      synchronizeDossier: async () => { throw new Error("not impl"); },
      closeDossier: async () => { throw new Error("not impl"); },
      getDossier: async () => ({
        dossier: {
          dossierId: "dossier-id",
          recordId,
          recordVersion: expectedRecordVersion,
          editorialCaseId: "editorial-case",
          editorialCaseVersion: 1,
          sourceBindingIds: [],
          provenanceAssessment: { assessmentId: "1", status: "verified", assessedAt: new Date().toISOString() },
          integrityAssessment: { assessmentId: "2", status: "checksum_verified", assessedAt: new Date().toISOString() },
          rightsAssessment: { assessmentId: "3", status: "public_display_permitted", assessedAt: new Date().toISOString() },
          privacyAssessment: { assessmentId: "4", status: "approved_for_public_projection", riskCategories: [], otherRiskReference: null, assessedAt: new Date().toISOString() },
          publicProjectionAssessment: null,
          status: "complete_for_authorization_evaluation",
          version: 1,
          createdAt: new Date().toISOString(),
          createdByReference: actorReference,
          updatedAt: new Date().toISOString(),
          supersededAt: null,
          closedAt: null,
          institutionalOwnerReference: "owner"
        },
        evaluation: {
          decision: "ready_for_authorization_evaluation",
          blockers: [],
          conditions: [],
          publicationAuthorizationGranted: false,
          publicationExecuted: false
        }
      }),
      getHistory: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const publicationAuthorization: JurisprudencePublicationAuthorizationService = {
      evaluateAuthorization: async () => { throw new Error("not impl"); },
      authorizePublication: async () => { throw new Error("not impl"); },
      rejectAuthorization: async () => { throw new Error("not impl"); },
      deferAuthorization: async () => { throw new Error("not impl"); },
      revokeAuthorization: async () => { throw new Error("not impl"); },
      getAuthorizationCase: async () => ({
        authorizationCase: {
          authorizationCaseId: "authorization-id",
          publicationDossierId: "dossier-id",
          recordId,
          recordVersion: expectedRecordVersion,
          decision: "authorize",
          status: "authorized",
          institutionalAuthorityRef: "auth-1",
          decisionRef: "dec-1",
          authorizationScopeRef: "scope-1",
          decidedAt: new Date().toISOString(),
          effectiveFrom: new Date().toISOString(),
          reasons: [],
          blockers: [],
          conditions: [],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revokedAt: null,
          supersededAt: null,
          publicationAuthorizationGranted: true,
          publicationExecuted: false
        },
        authorizationCurrent: true,
        publicationAuthorizationGranted: true,
        publicationExecuted: false,
        blockers: []
      }),
      getAuthorizationHistory: async () => { throw new Error("not impl"); },
      supersedeAuthorizationForNewVersion: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const service = new DefaultJurisprudencePublicationExecutionService({
      now: () => new Date().toISOString(),
      generateId: () => randomUUID(),
      sourceReader,
      executionRepository,
      projectionRepository,
      transactionCoordinator,
      editorialWorkflow,
      publicationGovernance,
      publicationAuthorization,
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

    let createdCommit: unknown = null;

    const sourceReader: JurisprudencePublicationSourceReader = {
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
          editorialSummary: null,
          publicExcerpt: null,
          legalIssue: null,
          mainCriterion: null,
          relevantGrounds: [],
          decision: null,
          citedNorms: [],
          citedPrecedentIds: [],
          relatedRecordIds: [],
          keywords: []
        },
        officialContent: {
          officialSummary: null,
          officialFullText: null,
          fullTextAvailable: false,
          publicationAllowed: true,
          documentAvailability: "metadata_only",
          originFormat: "pdf",
          language: "es",
          pageCount: null
        },
        source: {
          type: "official_judiciary",
          name: "Valid Source",
          url: null,
          documentId: null,
          publishedAt: null,
          retrievedAt: null,
          checksum: null,
          verificationStatus: "unverified",
          verifiedAt: null,
          verifiedBy: null,
          verificationNotes: null,
          evidenceReference: null
        }
      })
    };

    const executionRepository: JurisprudencePublicationExecutionRepository = {
      findById: async () => { throw new Error("not impl"); },
      findActiveByRecordVersion: async () => null,
      findLatestByRecordVersion: async () => null,
      listHistory: async () => { throw new Error("not impl"); },
      findIdempotencyResult: async () => null,
      createExecution: async (commit) => {
        createdCommit = commit; // Intercept what would be sent to DB
      },
      updateExecution: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const projectionRepository: JurisprudencePublicProjectionRepository = {
      findById: async () => { throw new Error("not impl"); },
      findActiveByRecordVersion: async () => { throw new Error("not impl"); },
      listByRecord: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const transactionCoordinator: JurisprudencePublicationTransactionCoordinator = {
      withTransaction: async (cb) => cb({
        executionRepository,
        outboxWriter: {
          enqueuePublish: async () => {},
          enqueueWithdraw: async () => { throw new Error("not impl"); },
          enqueuePublishRecovery: async () => "dummy",
        }
      })
    };

    const editorialWorkflow: JurisprudenceEditorialWorkflow = {
      openCase: async () => { throw new Error("not impl"); },
      assignReview: async () => { throw new Error("not impl"); },
      recordObservation: async () => { throw new Error("not impl"); },
      resolveObservation: async () => { throw new Error("not impl"); },
      recordDecision: async () => { throw new Error("not impl"); },
      evaluatePublication: async () => { throw new Error("not impl"); },
      synchronizeCase: async () => { throw new Error("not impl"); },
      closeCase: async () => { throw new Error("not impl"); },
      getCase: async () => ({
        case: {
          caseId: "editorial-case",
          recordId,
          recordVersion: expectedRecordVersion,
          caseVersion: 1,
          purpose: "publication",
          openedAt: new Date().toISOString(),
          openedByReference: actorReference,
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
          updatedAt: new Date().toISOString(),
          expiresAt: "2024-01-01"
        },
        status: "verified_for_publication_evaluation",
        openBlockingObservations: 0,
        publicationAuthorizationGranted: false,
        publicationExecuted: false
      }),
      getHistory: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const publicationGovernance: JurisprudencePublicationGovernanceService = {
      registerSource: async () => { throw new Error("not impl"); },
      bindSource: async () => { throw new Error("not impl"); },
      supersedeSourceBinding: async () => { throw new Error("not impl"); },
      openDossier: async () => { throw new Error("not impl"); },
      assessProvenance: async () => { throw new Error("not impl"); },
      assessIntegrity: async () => { throw new Error("not impl"); },
      assessRights: async () => { throw new Error("not impl"); },
      assessPrivacy: async () => { throw new Error("not impl"); },
      assessPublicProjection: async () => { throw new Error("not impl"); },
      evaluateDossier: async () => { throw new Error("not impl"); },
      synchronizeDossier: async () => { throw new Error("not impl"); },
      closeDossier: async () => { throw new Error("not impl"); },
      getDossier: async () => ({
        dossier: {
          dossierId: "dossier-id",
          recordId,
          recordVersion: expectedRecordVersion,
          editorialCaseId: "editorial-case",
          editorialCaseVersion: 1,
          sourceBindingIds: [],
          provenanceAssessment: { assessmentId: "1", status: "verified", assessedAt: new Date().toISOString() },
          integrityAssessment: { assessmentId: "2", status: "checksum_verified", assessedAt: new Date().toISOString() },
          rightsAssessment: { assessmentId: "3", status: "public_display_permitted", assessedAt: new Date().toISOString() },
          privacyAssessment: { assessmentId: "4", status: "approved_for_public_projection", riskCategories: [], otherRiskReference: null, assessedAt: new Date().toISOString() },
          publicProjectionAssessment: null,
          status: "complete_for_authorization_evaluation",
          version: 1,
          createdAt: new Date().toISOString(),
          createdByReference: actorReference,
          updatedAt: new Date().toISOString(),
          supersededAt: null,
          closedAt: null,
          institutionalOwnerReference: "owner"
        },
        evaluation: {
          decision: "ready_for_authorization_evaluation",
          blockers: [],
          conditions: [],
          publicationAuthorizationGranted: false,
          publicationExecuted: false
        }
      }),
      getHistory: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const publicationAuthorization: JurisprudencePublicationAuthorizationService = {
      evaluateAuthorization: async () => { throw new Error("not impl"); },
      authorizePublication: async () => { throw new Error("not impl"); },
      rejectAuthorization: async () => { throw new Error("not impl"); },
      deferAuthorization: async () => { throw new Error("not impl"); },
      revokeAuthorization: async () => { throw new Error("not impl"); },
      getAuthorizationCase: async () => ({
        authorizationCase: {
          authorizationCaseId: "authorization-id",
          publicationDossierId: "dossier-id",
          recordId,
          recordVersion: expectedRecordVersion,
          decision: "authorize",
          status: "authorized",
          institutionalAuthorityRef: "auth-1",
          decisionRef: "dec-1",
          authorizationScopeRef: "scope-1",
          decidedAt: new Date().toISOString(),
          effectiveFrom: new Date().toISOString(),
          reasons: [],
          blockers: [],
          conditions: [],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revokedAt: null,
          supersededAt: null,
          publicationAuthorizationGranted: true,
          publicationExecuted: false
        },
        authorizationCurrent: true,
        publicationAuthorizationGranted: true,
        publicationExecuted: false,
        blockers: []
      }),
      getAuthorizationHistory: async () => { throw new Error("not impl"); },
      supersedeAuthorizationForNewVersion: async () => { throw new Error("not impl"); },
      close: async () => { throw new Error("not impl"); },
    };

    const service = new DefaultJurisprudencePublicationExecutionService({
      now: () => new Date().toISOString(),
      generateId: () => randomUUID(),
      sourceReader,
      executionRepository,
      projectionRepository,
      transactionCoordinator,
      editorialWorkflow,
      publicationGovernance,
      publicationAuthorization,
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

    // Use type assertion since we captured it as unknown to avoid 'any'
    const commit = createdCommit as { idempotency: { result: unknown } };
    const resultToStore = commit.idempotency.result;

    // Simulate what Postgres does (JSONB drop undefined keys)
    const jsonString = JSON.stringify(resultToStore);
    const rehydrated = JSON.parse(jsonString);

    // This should NOT throw
    const parsed = jurisprudencePublicationExecutionViewSchema.safeParse(rehydrated);
    expect(parsed.success, parsed.success ? "" : "Validation error: " + JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});
