import type { GetInternalJurisprudenceRecordQuery, JurisprudenceInternalRecordResultDto } from "@/types/jurisprudence-application";
import type { JurisprudencePublicationAuthorizationView } from "@/types/jurisprudence-publication-authorization";
import type { JurisprudencePublicationExecutionView } from "@/types/jurisprudence-publication-execution";
import type { PublicationDossierView } from "@/types/jurisprudence-publication-governance";

export type JurisprudencePublicReadModelStatus = "prepared_internal" | "exposure_pending" | "exposed" | "withdrawn" | "superseded" | "rejected";
export type JurisprudencePublicExposureOperation = "evaluate_exposure" | "prepare_public_read_model" | "expose" | "withdraw" | "supersede";
export type JurisprudencePublicExposureBlocker =
  | "execution_missing"
  | "execution_not_current"
  | "internal_projection_missing"
  | "internal_projection_withdrawn"
  | "internal_projection_superseded"
  | "authorization_missing"
  | "authorization_not_current"
  | "authorization_revoked"
  | "authorization_expired"
  | "authorization_superseded"
  | "record_version_mismatch"
  | "record_id_mismatch"
  | "rights_not_cleared"
  | "privacy_not_cleared"
  | "integrity_not_cleared"
  | "slug_missing"
  | "slug_invalid"
  | "summary_missing"
  | "source_not_publicly_permitted"
  | "internal_fields_present"
  | "public_review_not_current"
  | "active_exposure_exists";

export interface JurisprudencePublicExposureContext { readonly requestId: string; readonly actorReference: string; readonly requestedAt: string }

export interface JurisprudencePublicReadModel {
  readonly publicRecordId: string;
  readonly projectionId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly slug: string;
  readonly title: string;
  readonly caseNumber: string;
  readonly resolutionNumber: string;
  readonly resolutionType: string;
  readonly institutionName: string;
  readonly issuingBody: string;
  readonly matter: string;
  readonly issuedAt: string;
  readonly summary: string;
  readonly sourceName: string;
  readonly sourceDocumentId: string | null;
  readonly publicStatus: JurisprudencePublicReadModelStatus;
  readonly preparedAt: string;
  readonly exposedAt: string | null;
  readonly withdrawnAt: string | null;
  readonly supersededAt: string | null;
  readonly publicRevision: number;
  readonly exposedPublicly: boolean;
  readonly indexed: false;
  readonly deployed: false;
}

export interface JurisprudencePublicExposure {
  readonly exposureId: string;
  readonly publicRecordId: string;
  readonly executionId: string;
  readonly authorizationCaseId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly status: JurisprudencePublicReadModelStatus;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly exposedAt: string | null;
  readonly withdrawnAt: string | null;
  readonly supersededAt: string | null;
  readonly supersededByRecordVersion: number | null;
  readonly realPublicExposure: false;
  readonly indexed: false;
  readonly deployed: false;
}

export type JurisprudencePublicExposureEvaluation =
  | { readonly status: "ready"; readonly blockers: readonly []; readonly realPublicExposure: false }
  | { readonly status: "blocked"; readonly blockers: readonly JurisprudencePublicExposureBlocker[]; readonly realPublicExposure: false }
  | { readonly status: "already_exposed"; readonly publicRecordId: string; readonly blockers: readonly ["active_exposure_exists"]; readonly realPublicExposure: false }
  | { readonly status: "withdrawn"; readonly publicRecordId: string; readonly blockers: readonly ["internal_projection_withdrawn"]; readonly realPublicExposure: false }
  | { readonly status: "superseded"; readonly publicRecordId: string; readonly blockers: readonly ["internal_projection_superseded"]; readonly realPublicExposure: false };

export interface JurisprudencePublicExposureView {
  readonly readModel: JurisprudencePublicReadModel;
  readonly exposure: JurisprudencePublicExposure;
  readonly activeForTests: boolean;
  readonly realPublicExposure: false;
  readonly publicSearchConnected: false;
  readonly indexed: false;
  readonly deployed: false;
}

export type JurisprudencePublicExposureEventType = "public_read_model_prepared" | "public_exposure_activated" | "public_exposure_withdrawn" | "public_exposure_superseded";
export interface JurisprudencePublicExposureEvent {
  readonly eventId: string;
  readonly exposureId: string;
  readonly publicRecordId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly publicRevision: number;
  readonly sequence: number;
  readonly type: JurisprudencePublicExposureEventType;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
}

export interface EvaluateJurisprudencePublicExposureCommand { readonly context: JurisprudencePublicExposureContext; readonly executionId: string; readonly expectedRecordVersion: number }
export interface PrepareJurisprudencePublicReadModelCommand extends EvaluateJurisprudencePublicExposureCommand { readonly idempotencyKey: string }
export interface ExposeJurisprudencePublicReadModelCommand { readonly context: JurisprudencePublicExposureContext; readonly publicRecordId: string; readonly expectedRevision: number; readonly idempotencyKey: string }
export interface WithdrawJurisprudencePublicExposureCommand extends ExposeJurisprudencePublicReadModelCommand { readonly reason: "authorization_changed" | "rights_review_required" | "privacy_review_required" | "institutional_withdrawal" }
export interface SupersedeJurisprudencePublicExposureCommand extends ExposeJurisprudencePublicReadModelCommand { readonly newRecordVersion: number }
export interface JurisprudencePublicExposureQuery { readonly context: JurisprudencePublicExposureContext; readonly publicRecordId: string }
export interface JurisprudencePublicExposureHistoryQuery { readonly context: JurisprudencePublicExposureContext; readonly recordId: string }

export interface JurisprudencePublicExposureIdempotencyEntry { readonly idempotencyKey: string; readonly commandFingerprint: string; readonly result: JurisprudencePublicExposureView }
export interface JurisprudencePublicExposureCreateCommit { readonly readModel: JurisprudencePublicReadModel; readonly exposure: JurisprudencePublicExposure; readonly event: JurisprudencePublicExposureEvent; readonly idempotency: JurisprudencePublicExposureIdempotencyEntry }
export interface JurisprudencePublicExposureUpdateCommit extends JurisprudencePublicExposureCreateCommit { readonly expectedRevision: number }

export interface JurisprudencePublicReadModelRepository {
  findById(publicRecordId: string): Promise<JurisprudencePublicReadModel | null>;
  findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicReadModel | null>;
  findActiveBySlug(slug: string): Promise<JurisprudencePublicReadModel | null>;
  listByRecord(recordId: string): Promise<readonly JurisprudencePublicReadModel[]>;
  close(): Promise<void>;
}
export interface JurisprudencePublicExposureRepository {
  findByPublicRecordId(publicRecordId: string): Promise<JurisprudencePublicExposure | null>;
  findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicExposure | null>;
  findLatestByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicExposure | null>;
  listHistory(recordId: string): Promise<readonly JurisprudencePublicExposureEvent[]>;
  findIdempotencyResult(idempotencyKey: string): Promise<JurisprudencePublicExposureIdempotencyEntry | null>;
  create(commit: JurisprudencePublicExposureCreateCommit): Promise<void>;
  update(commit: JurisprudencePublicExposureUpdateCommit): Promise<void>;
  close(): Promise<void>;
}

export type JurisprudencePublicExposureErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "EXPOSURE_BLOCKED" | "ACTIVE_EXPOSURE_EXISTS" | "EXPOSURE_NOT_CURRENT" | "IDEMPOTENCY_CONFLICT" | "REVISION_CONFLICT" | "RESOURCE_CLOSED" | "REPOSITORY_UNAVAILABLE" | "INTERNAL_ERROR";
export interface JurisprudencePublicExposureLogEvent { readonly requestId: string; readonly operation: JurisprudencePublicExposureOperation; readonly resultCode: string; readonly publicRecordId?: string; readonly recordVersion?: number; readonly publicRevision?: number; readonly timestamp: string }
export interface JurisprudencePublicExposureLogger { log(event: JurisprudencePublicExposureLogEvent): void }

export interface JurisprudencePublicExposureRecordReader {
  getInternalRecord(query: GetInternalJurisprudenceRecordQuery): Promise<{
    readonly requestId: string;
    readonly record: Pick<JurisprudenceInternalRecordResultDto["record"], "id" | "recordVersion">;
  }>;
}
export interface JurisprudencePublicExposureExecutionReader { getExecution(input: unknown): Promise<JurisprudencePublicationExecutionView> }
export interface JurisprudencePublicExposureAuthorizationReader { getAuthorizationCase(input: unknown): Promise<JurisprudencePublicationAuthorizationView> }
export interface JurisprudencePublicExposureGovernanceReader { getDossier(input: unknown): Promise<PublicationDossierView> }

export interface JurisprudencePublicExposureDependencies {
  readonly api: JurisprudencePublicExposureRecordReader;
  readonly execution: JurisprudencePublicExposureExecutionReader;
  readonly authorization: JurisprudencePublicExposureAuthorizationReader;
  readonly governance: JurisprudencePublicExposureGovernanceReader;
  readonly exposureRepository: JurisprudencePublicExposureRepository;
  readonly readModelRepository: JurisprudencePublicReadModelRepository;
  readonly now: () => string;
  readonly generateId: () => string;
  readonly logger?: JurisprudencePublicExposureLogger;
}
export interface JurisprudencePublicExposureService {
  evaluateExposure(input: unknown): Promise<JurisprudencePublicExposureEvaluation>;
  preparePublicReadModel(input: unknown): Promise<JurisprudencePublicExposureView>;
  expose(input: unknown): Promise<JurisprudencePublicExposureView>;
  withdraw(input: unknown): Promise<JurisprudencePublicExposureView>;
  supersede(input: unknown): Promise<JurisprudencePublicExposureView>;
  getPublicReadModel(input: unknown): Promise<JurisprudencePublicExposureView>;
  getHistory(input: unknown): Promise<readonly JurisprudencePublicExposureEvent[]>;
  close(): Promise<void>;
}

export interface JurisprudencePublicExposureReadiness {
  readonly publicReadModelContractReady: true;
  readonly exposureEvaluationReady: true;
  readonly exposureExecutionContractReady: true;
  readonly withdrawalReady: true;
  readonly supersessionReady: true;
  readonly productionPublicReadModelReady: false;
  readonly realPublicExposurePresent: false;
  readonly publicExposureAuthorized: false;
  readonly publicProjectionExposed: false;
  readonly publicSearchConnected: false;
  readonly sitemapConnected: false;
  readonly robotsExposureEnabled: false;
  readonly endpointsMounted: false;
  readonly uiConnected: false;
  readonly published: false;
  readonly deployed: false;
  readonly overrideSupported: false;
}
