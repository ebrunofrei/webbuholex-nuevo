import type { JurisprudenceInternalApi } from "@/types/jurisprudence-application";

export type JurisprudenceEditorialCaseStatus =
  | "open"
  | "changes_requested"
  | "editorially_approved"
  | "legally_rejected"
  | "legally_verified"
  | "verified_for_publication_evaluation"
  | "superseded"
  | "closed_without_approval";

export type JurisprudenceEditorialReviewKind = "editorial_review" | "legal_verification";
export type JurisprudenceEditorialObservationCategory =
  | "metadata_incomplete"
  | "source_unverified"
  | "citation_incomplete"
  | "legal_text_inconsistent"
  | "identity_conflict"
  | "duplicate_requires_review"
  | "publication_requirement_missing"
  | "other_editorial_issue";
export type JurisprudenceEditorialObservationSeverity = "blocking" | "non_blocking";
export type JurisprudenceEditorialDecision =
  | "request_changes"
  | "editorial_approved"
  | "legal_verification_rejected"
  | "legal_verification_approved"
  | "close_without_approval";

export interface JurisprudenceEditorialWorkflowContext {
  readonly requestId: string;
  readonly actorReference: string;
  readonly requestedAt: string;
}

export interface JurisprudenceEditorialAssignment {
  readonly reviewKind: JurisprudenceEditorialReviewKind;
  readonly assigneeReference: string;
  readonly assignedByReference: string;
  readonly assignedAt: string;
}

export interface JurisprudenceEditorialObservation {
  readonly observationId: string;
  readonly category: JurisprudenceEditorialObservationCategory;
  readonly severity: JurisprudenceEditorialObservationSeverity;
  readonly note: string;
  readonly recordedByReference: string;
  readonly recordedAt: string;
  readonly resolvedAt: string | null;
  readonly resolvedByReference: string | null;
}

export interface JurisprudenceEditorialDecisionRecord {
  readonly decision: JurisprudenceEditorialDecision;
  readonly actorReference: string;
  readonly decidedAt: string;
  readonly recordVersion: number;
}

export interface JurisprudenceEditorialPublicationEvaluation {
  readonly evaluatedAt: string;
  readonly evaluatedByReference: string;
  readonly recordVersion: number;
  readonly domainPublicable: boolean;
  readonly blockers: readonly string[];
  readonly publicationAuthorizationGranted: false;
  readonly publicationExecuted: false;
}

export interface JurisprudenceEditorialCase {
  readonly caseId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly caseVersion: number;
  readonly purpose: string;
  readonly openedAt: string;
  readonly openedByReference: string;
  readonly expiresAt: string;
  readonly editorialAssignment: JurisprudenceEditorialAssignment | null;
  readonly legalAssignment: JurisprudenceEditorialAssignment | null;
  readonly observations: readonly JurisprudenceEditorialObservation[];
  readonly editorialDecision: JurisprudenceEditorialDecisionRecord | null;
  readonly legalDecision: JurisprudenceEditorialDecisionRecord | null;
  readonly publicationEvaluation: JurisprudenceEditorialPublicationEvaluation | null;
  readonly supersededAt: string | null;
  readonly supersededByRecordVersion: number | null;
  readonly closedAt: string | null;
  readonly closedByReference: string | null;
  readonly updatedAt: string;
}

export type JurisprudenceEditorialEventType =
  | "editorial_case_opened"
  | "review_assigned"
  | "observation_recorded"
  | "observation_resolved"
  | "editorial_decision_recorded"
  | "legal_decision_recorded"
  | "publication_evaluation_recorded"
  | "case_superseded"
  | "case_closed";

export interface JurisprudenceEditorialEvent {
  readonly eventId: string;
  readonly caseId: string;
  readonly sequence: number;
  readonly type: JurisprudenceEditorialEventType;
  readonly occurredAt: string;
  readonly actorReference: string;
  readonly recordVersion: number;
  readonly caseVersion: number;
  readonly payload: Readonly<Record<string, string | number | boolean | null | readonly string[]>>;
}

export interface JurisprudenceEditorialCaseView {
  readonly case: JurisprudenceEditorialCase;
  readonly status: JurisprudenceEditorialCaseStatus;
  readonly openBlockingObservations: number;
  readonly publicationAuthorizationGranted: false;
  readonly publicationExecuted: false;
}

export interface JurisprudenceEditorialPublicationEvaluationResult extends JurisprudenceEditorialCaseView {
  readonly eligibleForPublicationEvaluation: boolean;
  readonly blockers: readonly string[];
}

export interface OpenJurisprudenceEditorialCaseCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly recordId: string;
  readonly expectedRecordVersion: number;
  readonly purpose: string;
  readonly idempotencyKey: string;
}

export interface AssignJurisprudenceEditorialReviewCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly reviewKind: JurisprudenceEditorialReviewKind;
  readonly assigneeReference: string;
  readonly idempotencyKey: string;
}

export interface RecordJurisprudenceEditorialObservationCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly category: JurisprudenceEditorialObservationCategory;
  readonly severity: JurisprudenceEditorialObservationSeverity;
  readonly note: string;
  readonly idempotencyKey: string;
}

export interface ResolveJurisprudenceEditorialObservationCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly observationId: string;
  readonly idempotencyKey: string;
}

export interface RecordJurisprudenceEditorialDecisionCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly decision: JurisprudenceEditorialDecision;
  readonly idempotencyKey: string;
}

export interface EvaluateJurisprudenceEditorialPublicationCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly idempotencyKey: string;
}

export interface SynchronizeJurisprudenceEditorialCaseCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedCaseVersion: number;
  readonly idempotencyKey: string;
}

export interface CloseJurisprudenceEditorialCaseCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export interface JurisprudenceEditorialCaseQuery {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
}

export type JurisprudenceEditorialWorkflowErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DUPLICATE_ACTIVE_CASE"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_CONFLICT"
  | "CASE_CLOSED"
  | "CASE_EXPIRED"
  | "CASE_SUPERSEDED"
  | "ASSIGNMENT_REQUIRED"
  | "SEPARATION_OF_DUTIES_REQUIRED"
  | "OBSERVATION_NOT_FOUND"
  | "REPOSITORY_UNAVAILABLE"
  | "RESOURCE_CLOSED"
  | "INTERNAL_ERROR";

export interface JurisprudenceEditorialIdempotencyEntry {
  readonly idempotencyKey: string;
  readonly commandFingerprint: string;
  readonly result: JurisprudenceEditorialCaseView | JurisprudenceEditorialPublicationEvaluationResult;
}

export interface JurisprudenceEditorialCreateCommit {
  readonly editorialCase: JurisprudenceEditorialCase;
  readonly event: JurisprudenceEditorialEvent;
  readonly idempotency: JurisprudenceEditorialIdempotencyEntry;
}

export interface JurisprudenceEditorialUpdateCommit extends JurisprudenceEditorialCreateCommit {
  readonly expectedCaseVersion: number;
}

export interface JurisprudenceEditorialCaseRepository {
  findById(caseId: string): Promise<JurisprudenceEditorialCase | null>;
  findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudenceEditorialCase | null>;
  findIdempotency(idempotencyKey: string): Promise<JurisprudenceEditorialIdempotencyEntry | null>;
  create(commit: JurisprudenceEditorialCreateCommit): Promise<void>;
  update(commit: JurisprudenceEditorialUpdateCommit): Promise<void>;
  getHistory(caseId: string): Promise<readonly JurisprudenceEditorialEvent[]>;
  close(): Promise<void>;
}

export interface JurisprudenceEditorialLogEvent {
  readonly requestId: string;
  readonly operation: JurisprudenceEditorialEventType | "operation_rejected" | "workflow_closed";
  readonly resultCode: string;
  readonly caseReference?: string;
  readonly recordVersion?: number;
  readonly caseVersion?: number;
  readonly timestamp: string;
  readonly durationMs?: number;
}

export interface JurisprudenceEditorialLogger {
  log(event: JurisprudenceEditorialLogEvent): void;
}

export interface JurisprudenceEditorialWorkflowDependencies {
  readonly api: JurisprudenceInternalApi;
  readonly repository: JurisprudenceEditorialCaseRepository;
  readonly now: () => string;
  readonly generateId: () => string;
  readonly logger?: JurisprudenceEditorialLogger;
  readonly caseTtlMs?: number;
}

export interface JurisprudenceEditorialReadiness {
  readonly editorialWorkflowReady: boolean;
  readonly legalVerificationReady: boolean;
  readonly publicationEvaluationReady: boolean;
  readonly publicationAuthorizationReady: false;
  readonly publicationExecutionReady: false;
  readonly blockers: readonly string[];
  readonly overrideSupported: false;
}

export interface JurisprudenceEditorialWorkflow {
  openCase(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  assignReview(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  recordObservation(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  resolveObservation(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  recordDecision(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  evaluatePublication(input: unknown): Promise<JurisprudenceEditorialPublicationEvaluationResult>;
  synchronizeCase(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  closeCase(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  getCase(input: unknown): Promise<JurisprudenceEditorialCaseView>;
  getHistory(input: unknown): Promise<readonly JurisprudenceEditorialEvent[]>;
  close(): Promise<void>;
}
