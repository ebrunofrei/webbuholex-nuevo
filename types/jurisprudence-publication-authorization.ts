import type { JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type { JurisprudenceEditorialWorkflow } from "@/types/jurisprudence-editorial-workflow";
import type { JurisprudencePublicationGovernanceService } from "@/types/jurisprudence-publication-governance";

export type JurisprudencePublicationAuthorizationDecision = "authorize" | "reject" | "defer" | "revoke";
export type JurisprudencePublicationAuthorizationStatus =
  | "not_evaluated"
  | "deferred"
  | "rejected"
  | "authorized"
  | "revoked"
  | "superseded";

export type JurisprudencePublicationAuthorizationCondition =
  | "source_governance_complete"
  | "editorial_review_current"
  | "legal_verification_current"
  | "rights_assessment_accepted"
  | "privacy_assessment_accepted"
  | "public_projection_assessed"
  | "institutional_owner_confirmed"
  | "publication_scope_defined"
  | "validity_period_defined"
  | "revocation_procedure_defined";

export type JurisprudencePublicationAuthorizationBlocker =
  | "publication_dossier_incomplete"
  | "editorial_case_missing"
  | "editorial_case_superseded"
  | "legal_verification_missing"
  | "record_version_mismatch"
  | "source_governance_incomplete"
  | "rights_not_cleared"
  | "privacy_not_cleared"
  | "public_projection_not_assessed"
  | "institutional_authority_missing"
  | "institutional_decision_missing"
  | "authorization_scope_missing"
  | "authorization_validity_missing"
  | "authorization_revocation_policy_missing"
  | "existing_active_authorization";

export const JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS = Object.freeze([
  "source_governance_complete",
  "editorial_review_current",
  "legal_verification_current",
  "rights_assessment_accepted",
  "privacy_assessment_accepted",
  "public_projection_assessed",
  "institutional_owner_confirmed",
  "publication_scope_defined",
  "validity_period_defined",
  "revocation_procedure_defined",
] satisfies readonly JurisprudencePublicationAuthorizationCondition[]);

export interface JurisprudencePublicationAuthorizationContext {
  readonly requestId: string;
  readonly actorReference: string;
  readonly requestedAt: string;
}

export interface JurisprudencePublicationAuthorizationCase {
  readonly authorizationCaseId: string;
  readonly publicationDossierId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly decision: JurisprudencePublicationAuthorizationDecision;
  readonly status: Exclude<JurisprudencePublicationAuthorizationStatus, "not_evaluated">;
  readonly institutionalAuthorityRef: string;
  readonly decisionRef: string;
  readonly authorizationScopeRef: string;
  readonly decidedAt: string;
  readonly effectiveFrom: string;
  readonly expiresAt?: string;
  readonly reasons: readonly string[];
  readonly blockers: readonly JurisprudencePublicationAuthorizationBlocker[];
  readonly conditions: readonly JurisprudencePublicationAuthorizationCondition[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revokedAt: string | null;
  readonly supersededAt: string | null;
  readonly publicationAuthorizationGranted: boolean;
  readonly publicationExecuted: false;
}

export type JurisprudencePublicationAuthorizationEvaluation =
  | {
      readonly decision: "incomplete";
      readonly blockers: readonly JurisprudencePublicationAuthorizationBlocker[];
      readonly publicationAuthorizationGranted: false;
      readonly publicationExecuted: false;
    }
  | {
      readonly decision: "ready_for_institutional_decision";
      readonly conditions: readonly JurisprudencePublicationAuthorizationCondition[];
      readonly publicationAuthorizationGranted: false;
      readonly publicationExecuted: false;
    };

export interface JurisprudencePublicationAuthorizationView {
  readonly authorizationCase: JurisprudencePublicationAuthorizationCase;
  readonly authorizationCurrent: boolean;
  readonly publicationAuthorizationGranted: boolean;
  readonly publicationExecuted: false;
}

export type JurisprudencePublicationAuthorizationEventType =
  | "authorization_granted"
  | "authorization_rejected"
  | "authorization_deferred"
  | "authorization_revoked"
  | "authorization_superseded";

export interface JurisprudencePublicationAuthorizationEvent {
  readonly eventId: string;
  readonly authorizationCaseId: string;
  readonly sequence: number;
  readonly type: JurisprudencePublicationAuthorizationEventType;
  readonly occurredAt: string;
  readonly recordVersion: number;
  readonly authorizationVersion: number;
  readonly payload: Readonly<Record<string, string | number | boolean | readonly string[]>>;
}

export interface EvaluateJurisprudencePublicationAuthorizationCommand {
  readonly context: JurisprudencePublicationAuthorizationContext;
  readonly publicationDossierId: string;
  readonly expectedRecordVersion: number;
}

export interface AuthorizeJurisprudencePublicationCommand extends EvaluateJurisprudencePublicationAuthorizationCommand {
  readonly institutionalAuthorityRef: string;
  readonly decisionRef: string;
  readonly authorizationScopeRef: string;
  readonly effectiveFrom: string;
  readonly expiresAt?: string;
  readonly reasons: readonly string[];
  readonly conditions: readonly JurisprudencePublicationAuthorizationCondition[];
  readonly idempotencyKey: string;
}

export interface RejectJurisprudencePublicationAuthorizationCommand extends EvaluateJurisprudencePublicationAuthorizationCommand {
  readonly institutionalAuthorityRef: string;
  readonly decisionRef: string;
  readonly authorizationScopeRef: string;
  readonly reasons: readonly string[];
  readonly idempotencyKey: string;
}

export interface DeferJurisprudencePublicationAuthorizationCommand extends EvaluateJurisprudencePublicationAuthorizationCommand {
  readonly institutionalAuthorityRef: string;
  readonly decisionRef: string;
  readonly authorizationScopeRef: string;
  readonly blockers: readonly JurisprudencePublicationAuthorizationBlocker[];
  readonly idempotencyKey: string;
}

export interface RevokeJurisprudencePublicationAuthorizationCommand {
  readonly context: JurisprudencePublicationAuthorizationContext;
  readonly authorizationCaseId: string;
  readonly expectedVersion: number;
  readonly institutionalAuthorityRef: string;
  readonly decisionRef: string;
  readonly reasons: readonly string[];
  readonly idempotencyKey: string;
}

export interface SupersedeJurisprudencePublicationAuthorizationCommand {
  readonly context: JurisprudencePublicationAuthorizationContext;
  readonly authorizationCaseId: string;
  readonly expectedVersion: number;
  readonly newRecordVersion: number;
  readonly idempotencyKey: string;
}

export interface JurisprudencePublicationAuthorizationQuery {
  readonly context: JurisprudencePublicationAuthorizationContext;
  readonly authorizationCaseId: string;
}

export interface JurisprudencePublicationAuthorizationHistoryQuery {
  readonly context: JurisprudencePublicationAuthorizationContext;
  readonly recordId: string;
}

export interface JurisprudencePublicationAuthorizationIdempotencyEntry {
  readonly idempotencyKey: string;
  readonly commandFingerprint: string;
  readonly result: JurisprudencePublicationAuthorizationView;
}

export interface JurisprudencePublicationAuthorizationCreateCommit {
  readonly authorizationCase: JurisprudencePublicationAuthorizationCase;
  readonly event: JurisprudencePublicationAuthorizationEvent;
  readonly idempotency: JurisprudencePublicationAuthorizationIdempotencyEntry;
}

export interface JurisprudencePublicationAuthorizationUpdateCommit extends JurisprudencePublicationAuthorizationCreateCommit {
  readonly expectedVersion: number;
}

export interface JurisprudencePublicationAuthorizationRepository {
  findById(authorizationCaseId: string): Promise<JurisprudencePublicationAuthorizationCase | null>;
  findActiveByRecordVersion(recordId: string, recordVersion: number, evaluatedAt: string): Promise<JurisprudencePublicationAuthorizationCase | null>;
  listHistoryByRecord(recordId: string): Promise<readonly JurisprudencePublicationAuthorizationEvent[]>;
  createDecision(commit: JurisprudencePublicationAuthorizationCreateCommit): Promise<void>;
  revokeAuthorization(commit: JurisprudencePublicationAuthorizationUpdateCommit): Promise<void>;
  supersedeByRecordVersion(commit: JurisprudencePublicationAuthorizationUpdateCommit): Promise<void>;
  findIdempotencyResult(idempotencyKey: string): Promise<JurisprudencePublicationAuthorizationIdempotencyEntry | null>;
  close(): Promise<void>;
}

export type JurisprudencePublicationAuthorizationErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DOSSIER_INCOMPLETE"
  | "EXISTING_ACTIVE_AUTHORIZATION"
  | "AUTHORIZATION_NOT_CURRENT"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_CONFLICT"
  | "RESOURCE_CLOSED"
  | "REPOSITORY_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface JurisprudencePublicationAuthorizationLogEvent {
  readonly requestId: string;
  readonly operation: string;
  readonly resultCode: string;
  readonly authorizationCaseRef?: string;
  readonly recordRef?: string;
  readonly recordVersion?: number;
  readonly decision?: JurisprudencePublicationAuthorizationDecision;
  readonly authorizationStatus?: JurisprudencePublicationAuthorizationStatus;
  readonly timestamp: string;
}

export interface JurisprudencePublicationAuthorizationLogger {
  log(event: JurisprudencePublicationAuthorizationLogEvent): void;
}

export interface JurisprudencePublicationAuthorizationDependencies {
  readonly api: JurisprudenceInternalApi;
  readonly editorialWorkflow: JurisprudenceEditorialWorkflow;
  readonly publicationGovernance: JurisprudencePublicationGovernanceService;
  readonly repository: JurisprudencePublicationAuthorizationRepository;
  readonly now: () => string;
  readonly generateId: () => string;
  readonly logger?: JurisprudencePublicationAuthorizationLogger;
}

export interface JurisprudencePublicationAuthorizationService {
  evaluateAuthorization(input: unknown): Promise<JurisprudencePublicationAuthorizationEvaluation>;
  authorizePublication(input: unknown): Promise<JurisprudencePublicationAuthorizationView>;
  rejectAuthorization(input: unknown): Promise<JurisprudencePublicationAuthorizationView>;
  deferAuthorization(input: unknown): Promise<JurisprudencePublicationAuthorizationView>;
  revokeAuthorization(input: unknown): Promise<JurisprudencePublicationAuthorizationView>;
  getAuthorizationCase(input: unknown): Promise<JurisprudencePublicationAuthorizationView>;
  getAuthorizationHistory(input: unknown): Promise<readonly JurisprudencePublicationAuthorizationEvent[]>;
  supersedeAuthorizationForNewVersion(input: unknown): Promise<JurisprudencePublicationAuthorizationView>;
  close(): Promise<void>;
}

export interface JurisprudencePublicationAuthorizationReadiness {
  readonly authorizationContractsReady: true;
  readonly authorizationRepositoryReadyForTesting: true;
  readonly authorizationServiceReadyForTesting: true;
  readonly institutionalDecisionPresent: false;
  readonly authorizationGranted: false;
  readonly authorizationCurrent: false;
  readonly publicationExecutionReady: false;
  readonly routeMountReady: false;
  readonly productionReady: false;
  readonly overrideSupported: false;
  readonly statement: "11.J valida la puerta institucional de autorización, pero no registra una decisión institucional real ni ejecuta publicación.";
}
