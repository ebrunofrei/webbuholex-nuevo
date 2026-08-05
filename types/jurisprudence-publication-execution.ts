import type { JurisprudenceInternalApi, JurisprudenceInternalRecordDto } from "@/types/jurisprudence-application";
import type { JurisprudenceEditorialWorkflow } from "@/types/jurisprudence-editorial-workflow";
import type { JurisprudencePublicationAuthorizationService } from "@/types/jurisprudence-publication-authorization";
import type { JurisprudencePublicationGovernanceService } from "@/types/jurisprudence-publication-governance";

export type JurisprudencePublicationExecutionOperation =
  | "evaluate_execution"
  | "execute_publication"
  | "withdraw_publication"
  | "supersede_execution"
  | "get_execution"
  | "get_execution_history";

export type JurisprudencePublicationExecutionStatus = "pending" | "executed" | "withdrawn" | "superseded" | "failed";
export type JurisprudencePublicProjectionStatus = "generated" | "active_internal" | "withdrawn" | "superseded";
export type JurisprudencePublicationWithdrawalReason =
  | "authorization_revoked"
  | "record_corrected"
  | "rights_reassessment_required"
  | "privacy_reassessment_required"
  | "institutional_withdrawal";

export type JurisprudencePublicationExecutionBlocker =
  | "record_not_found"
  | "record_version_mismatch"
  | "editorial_case_missing"
  | "editorial_case_not_verified"
  | "publication_dossier_incomplete"
  | "source_governance_incomplete"
  | "rights_not_cleared"
  | "privacy_not_cleared"
  | "integrity_not_cleared"
  | "authorization_missing"
  | "authorization_record_mismatch"
  | "authorization_version_mismatch"
  | "authorization_not_current"
  | "authorization_revoked"
  | "authorization_expired"
  | "authorization_superseded"
  | "execution_already_active"
  | "execution_withdrawn"
  | "execution_superseded"
  | "public_projection_unavailable";

export interface JurisprudencePublicationExecutionContext {
  readonly requestId: string;
  readonly actorReference: string;
  readonly requestedAt: string;
}

export interface JurisprudencePublicationExecution {
  readonly executionId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly editorialCaseId: string;
  readonly publicationDossierId: string;
  readonly authorizationCaseId: string;
  readonly projectionId: string;
  readonly status: JurisprudencePublicationExecutionStatus;
  readonly version: number;
  readonly executedAt: string;
  readonly executedByReference: string;
  readonly withdrawnAt: string | null;
  readonly withdrawalReason: JurisprudencePublicationWithdrawalReason | null;
  readonly supersededAt: string | null;
  readonly supersededByRecordVersion: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publicationExecuted: boolean;
  readonly deployed: false;
}

export interface JurisprudencePublicProjection {
  readonly projectionId: string;
  readonly executionId: string;
  readonly authorizationCaseId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly status: JurisprudencePublicProjectionStatus;
  readonly slug: string | null;
  readonly title: string;
  readonly caseNumber: string;
  readonly resolutionNumber: string;
  readonly resolutionType: string;
  readonly institutionName: string;
  readonly issuingBody: string;
  readonly matter: string;
  readonly issuedAt: string;
  readonly summary: string | null;
  readonly sourceName: string;
  readonly sourceDocumentId: string | null;
  readonly generatedAt: string;
  readonly updatedAt: string;
  readonly exposedPublicly: false;
  readonly deployed: false;
}

export type JurisprudencePublicationExecutionEvaluation =
  | { readonly status: "ready"; readonly blockers: readonly []; readonly publicationExecuted: false }
  | { readonly status: "blocked"; readonly blockers: readonly JurisprudencePublicationExecutionBlocker[]; readonly publicationExecuted: false }
  | { readonly status: "already_executed"; readonly executionId: string; readonly blockers: readonly ["execution_already_active"]; readonly publicationExecuted: true }
  | { readonly status: "withdrawn"; readonly executionId: string; readonly blockers: readonly ["execution_withdrawn"]; readonly publicationExecuted: false }
  | { readonly status: "superseded"; readonly executionId: string; readonly blockers: readonly ["execution_superseded"]; readonly publicationExecuted: false };

export interface JurisprudencePublicationExecutionView {
  readonly execution: JurisprudencePublicationExecution;
  readonly projection: JurisprudencePublicProjection;
  readonly current: boolean;
  readonly publicationExecuted: boolean;
  readonly publicProjectionExposed: false;
  readonly deployed: false;
}

export type JurisprudencePublicationExecutionEventType =
  | "publication_executed"
  | "publication_withdrawn"
  | "publication_execution_superseded";

export interface JurisprudencePublicationExecutionEvent {
  readonly eventId: string;
  readonly executionId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly executionVersion: number;
  readonly sequence: number;
  readonly type: JurisprudencePublicationExecutionEventType;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
}

export interface EvaluateJurisprudencePublicationExecutionCommand {
  readonly context: JurisprudencePublicationExecutionContext;
  readonly recordId: string;
  readonly expectedRecordVersion: number;
  readonly editorialCaseId: string;
  readonly publicationDossierId: string;
  readonly authorizationCaseId: string;
}

export interface ExecuteJurisprudencePublicationCommand extends EvaluateJurisprudencePublicationExecutionCommand {
  readonly idempotencyKey: string;
}

export interface WithdrawJurisprudencePublicationCommand {
  readonly context: JurisprudencePublicationExecutionContext;
  readonly executionId: string;
  readonly expectedVersion: number;
  readonly reason: JurisprudencePublicationWithdrawalReason;
  readonly idempotencyKey: string;
}

export interface SupersedeJurisprudencePublicationExecutionCommand {
  readonly context: JurisprudencePublicationExecutionContext;
  readonly executionId: string;
  readonly expectedVersion: number;
  readonly newRecordVersion: number;
  readonly idempotencyKey: string;
}

export interface JurisprudencePublicationExecutionQuery {
  readonly context: JurisprudencePublicationExecutionContext;
  readonly executionId: string;
}

export interface JurisprudencePublicationExecutionHistoryQuery {
  readonly context: JurisprudencePublicationExecutionContext;
  readonly recordId: string;
}

export interface JurisprudencePublicationExecutionIdempotencyEntry {
  readonly idempotencyKey: string;
  readonly commandFingerprint: string;
  readonly result: JurisprudencePublicationExecutionView;
}

export interface JurisprudencePublicationExecutionCreateCommit {
  readonly execution: JurisprudencePublicationExecution;
  readonly projection: JurisprudencePublicProjection;
  readonly event: JurisprudencePublicationExecutionEvent;
  readonly idempotency: JurisprudencePublicationExecutionIdempotencyEntry;
}

export interface JurisprudencePublicationExecutionUpdateCommit extends JurisprudencePublicationExecutionCreateCommit {
  readonly expectedVersion: number;
}

export interface JurisprudencePublicationExecutionRepository {
  findById(executionId: string): Promise<JurisprudencePublicationExecution | null>;
  findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicationExecution | null>;
  findLatestByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicationExecution | null>;
  listHistory(recordId: string): Promise<readonly JurisprudencePublicationExecutionEvent[]>;
  findIdempotencyResult(idempotencyKey: string): Promise<JurisprudencePublicationExecutionIdempotencyEntry | null>;
  createExecution(commit: JurisprudencePublicationExecutionCreateCommit): Promise<void>;
  updateExecution(commit: JurisprudencePublicationExecutionUpdateCommit): Promise<void>;
  close(): Promise<void>;
}

export interface JurisprudencePublicProjectionRepository {
  findById(projectionId: string): Promise<JurisprudencePublicProjection | null>;
  findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicProjection | null>;
  listByRecord(recordId: string): Promise<readonly JurisprudencePublicProjection[]>;
  close(): Promise<void>;
}

export type JurisprudencePublicationExecutionErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "EXECUTION_BLOCKED"
  | "EXECUTION_ALREADY_ACTIVE"
  | "EXECUTION_NOT_CURRENT"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_CONFLICT"
  | "RESOURCE_CLOSED"
  | "REPOSITORY_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface JurisprudencePublicationExecutionLogEvent {
  readonly requestId: string;
  readonly operation: JurisprudencePublicationExecutionOperation;
  readonly resultCode: string;
  readonly executionReference?: string;
  readonly recordReference?: string;
  readonly recordVersion?: number;
  readonly timestamp: string;
}

export interface JurisprudencePublicationExecutionLogger {
  log(event: JurisprudencePublicationExecutionLogEvent): void;
}

export interface JurisprudencePublicationExecutionDependencies {
  readonly api: JurisprudenceInternalApi;
  readonly editorialWorkflow: JurisprudenceEditorialWorkflow;
  readonly publicationGovernance: JurisprudencePublicationGovernanceService;
  readonly publicationAuthorization: JurisprudencePublicationAuthorizationService;
  readonly executionRepository: JurisprudencePublicationExecutionRepository;
  readonly projectionRepository: JurisprudencePublicProjectionRepository;
  readonly now: () => string;
  readonly generateId: () => string;
  readonly logger?: JurisprudencePublicationExecutionLogger;
}

export interface JurisprudencePublicationExecutionService {
  evaluateExecution(input: unknown): Promise<JurisprudencePublicationExecutionEvaluation>;
  executePublication(input: unknown): Promise<JurisprudencePublicationExecutionView>;
  withdrawPublication(input: unknown): Promise<JurisprudencePublicationExecutionView>;
  supersedeExecution(input: unknown): Promise<JurisprudencePublicationExecutionView>;
  getExecution(input: unknown): Promise<JurisprudencePublicationExecutionView>;
  getExecutionHistory(input: unknown): Promise<readonly JurisprudencePublicationExecutionEvent[]>;
  close(): Promise<void>;
}

export interface JurisprudencePublicationExecutionReadiness {
  readonly executionContractsReady: true;
  readonly executionRepositoryReadyForTesting: true;
  readonly projectionRepositoryReadyForTesting: true;
  readonly executionServiceReadyForTesting: true;
  readonly realInstitutionalAuthorizationPresent: false;
  readonly realPublicationExecutionPresent: false;
  readonly publicProjectionExposed: false;
  readonly authenticationReal: false;
  readonly routeMountReady: false;
  readonly uiConnectionReady: false;
  readonly productionReady: false;
  readonly deploymentReady: false;
  readonly overrideSupported: false;
  readonly statement: "11.K valida exclusivamente el ejecutor interno reversible con datos ficticios; no expone jurisprudencia ni despliega el sitio.";
}

export type JurisprudenceProjectionSourceRecord = Pick<
  JurisprudenceInternalRecordDto,
  | "id"
  | "recordVersion"
  | "slug"
  | "caseNumber"
  | "resolutionNumber"
  | "resolutionType"
  | "institutionName"
  | "issuingBody"
  | "matter"
  | "issuedAt"
  | "editorialContent"
  | "officialContent"
  | "source"
>;
