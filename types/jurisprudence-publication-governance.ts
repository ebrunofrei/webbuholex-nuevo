import type { JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type { JurisprudenceEditorialWorkflow } from "@/types/jurisprudence-editorial-workflow";

export type JurisprudenceGovernedSourceKind =
  | "official_judicial_portal"
  | "official_publication"
  | "court_issued_copy"
  | "certified_copy"
  | "institutional_archive"
  | "authorized_private_submission"
  | "secondary_reference";
export type JurisprudenceSourceOriginType =
  | "primary_official_online"
  | "primary_official_document"
  | "certified_copy"
  | "simple_copy"
  | "third_party_submission"
  | "secondary_source";
export type SourceProvenanceStatus = "unverified" | "documented" | "verified" | "disputed";
export type SourceIntegrityStatus = "not_checked" | "checksum_verified" | "certified_copy_verified" | "integrity_conflict";
export type SourceRightsStatus =
  | "unknown"
  | "review_required"
  | "internal_use_only"
  | "public_display_permitted"
  | "public_reference_only"
  | "restricted"
  | "prohibited";
export type JurisprudencePrivacyReviewStatus =
  | "not_started"
  | "in_review"
  | "requires_redaction"
  | "approved_for_internal_use"
  | "approved_for_public_projection"
  | "rejected";
export type PrivacyRiskCategory =
  | "personal_identifiers"
  | "minors"
  | "health_data"
  | "family_information"
  | "victim_information"
  | "criminal_record"
  | "financial_information"
  | "precise_location"
  | "confidential_proceeding"
  | "other_restricted_information";
export type JurisprudenceSourceCustodyStatus = "documented" | "controlled_internal" | "custody_gap" | "disputed";
export type JurisprudenceSourceAvailabilityStatus = "available_internal" | "reference_only" | "unavailable";
export type JurisprudenceSourceVerificationStatus = "unverified" | "under_review" | "verified" | "disputed";

export interface JurisprudenceSourceRecord {
  readonly sourceId: string;
  readonly sourceKind: JurisprudenceGovernedSourceKind;
  readonly originType: JurisprudenceSourceOriginType;
  readonly institutionalOrigin: string;
  readonly jurisdiction: string;
  readonly documentReference: string;
  readonly sourceUrl: string | null;
  readonly sourceDate: string;
  readonly retrievedAt: string;
  readonly custodyStatus: JurisprudenceSourceCustodyStatus;
  readonly provenanceStatus: SourceProvenanceStatus;
  readonly integrityStatus: SourceIntegrityStatus;
  readonly rightsStatus: SourceRightsStatus;
  readonly privacyStatus: JurisprudencePrivacyReviewStatus;
  readonly availabilityStatus: JurisprudenceSourceAvailabilityStatus;
  readonly verificationStatus: JurisprudenceSourceVerificationStatus;
  readonly sourceChecksum: string;
  readonly sourceChecksumAlgorithm: "sha256";
  readonly sourceFingerprint: string;
  readonly metadataVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type JurisprudenceSourceBindingKind = "official_basis" | "supporting_evidence" | "secondary_context";
export type JurisprudenceSourceBindingStatus = "active" | "superseded" | "disputed";

export interface JurisprudenceSourceBinding {
  readonly bindingId: string;
  readonly sourceId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly bindingKind: JurisprudenceSourceBindingKind;
  readonly isPrimarySource: boolean;
  readonly secondarySourceJustificationReference: string | null;
  readonly bindingStatus: JurisprudenceSourceBindingStatus;
  readonly createdAt: string;
  readonly supersededAt: string | null;
  readonly supersededByBindingId: string | null;
}

export interface JurisprudenceProvenanceAssessment {
  readonly assessmentId: string;
  readonly status: SourceProvenanceStatus;
  readonly assessedAt: string;
}
export interface JurisprudenceIntegrityAssessment {
  readonly assessmentId: string;
  readonly status: SourceIntegrityStatus;
  readonly assessedAt: string;
}
export interface JurisprudenceRightsAssessment {
  readonly assessmentId: string;
  readonly status: SourceRightsStatus;
  readonly assessedAt: string;
}
export interface JurisprudencePrivacyAssessment {
  readonly assessmentId: string;
  readonly status: JurisprudencePrivacyReviewStatus;
  readonly riskCategories: readonly PrivacyRiskCategory[];
  readonly otherRiskReference: string | null;
  readonly assessedAt: string;
}
export interface JurisprudencePublicProjectionAssessment {
  readonly assessmentId: string;
  readonly status: "not_started" | "in_review" | "approved" | "rejected";
  readonly assessedAt: string;
}

export type PublicationDossierStatus =
  | "draft"
  | "under_review"
  | "blocked"
  | "complete_for_authorization_evaluation"
  | "superseded"
  | "closed";

export interface JurisprudencePublicationDossier {
  readonly dossierId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly editorialCaseId: string;
  readonly editorialCaseVersion: number;
  readonly sourceBindingIds: readonly string[];
  readonly provenanceAssessment: JurisprudenceProvenanceAssessment | null;
  readonly integrityAssessment: JurisprudenceIntegrityAssessment | null;
  readonly rightsAssessment: JurisprudenceRightsAssessment | null;
  readonly privacyAssessment: JurisprudencePrivacyAssessment | null;
  readonly publicProjectionAssessment: JurisprudencePublicProjectionAssessment | null;
  readonly institutionalOwnerReference: string | null;
  readonly status: PublicationDossierStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly supersededAt: string | null;
  readonly closedAt: string | null;
}

export type PublicationDossierBlocker =
  | "editorial_case_missing"
  | "editorial_case_not_verified"
  | "record_version_mismatch"
  | "source_binding_missing"
  | "source_provenance_unverified"
  | "source_integrity_unverified"
  | "source_integrity_conflict"
  | "source_rights_unknown"
  | "source_rights_restricted"
  | "privacy_review_missing"
  | "privacy_redaction_required"
  | "public_projection_not_approved"
  | "blocking_observations_present"
  | "institutional_owner_missing"
  | "dossier_superseded"
  | "publication_authority_not_defined";

export type PublicationDossierCondition =
  | "institutional_authorization_required"
  | "publication_must_be_executed_separately"
  | "record_version_must_remain_unchanged";

export type PublicationAuthorizationEvaluation =
  | { readonly decision: "incomplete"; readonly blockers: readonly PublicationDossierBlocker[]; readonly publicationAuthorizationGranted: false; readonly publicationExecuted: false }
  | { readonly decision: "ready_for_authorization_evaluation"; readonly conditions: readonly PublicationDossierCondition[]; readonly publicationAuthorizationGranted: false; readonly publicationExecuted: false }
  | { readonly decision: "rejected"; readonly reasons: readonly string[]; readonly publicationAuthorizationGranted: false; readonly publicationExecuted: false };

export type PublicationDossierEventType =
  | "dossier_opened"
  | "source_bound"
  | "source_superseded"
  | "provenance_assessed"
  | "integrity_assessed"
  | "rights_assessed"
  | "privacy_assessed"
  | "projection_assessed"
  | "dossier_blocked"
  | "dossier_completed"
  | "dossier_superseded"
  | "dossier_closed";

export interface PublicationDossierEvent {
  readonly eventId: string;
  readonly dossierId: string;
  readonly sequence: number;
  readonly type: PublicationDossierEventType;
  readonly occurredAt: string;
  readonly recordVersion: number;
  readonly dossierVersion: number;
  readonly payload: Readonly<Record<string, string | number | boolean | null | readonly string[]>>;
}

export interface PublicationGovernanceContext { readonly requestId: string; readonly actorReference: string; readonly requestedAt: string }
export interface RegisterJurisprudenceSourceCommand {
  readonly context: PublicationGovernanceContext;
  readonly source: Omit<JurisprudenceSourceRecord, "sourceId" | "metadataVersion" | "createdAt" | "updatedAt">;
  readonly idempotencyKey: string;
}
export interface BindJurisprudenceSourceCommand {
  readonly context: PublicationGovernanceContext;
  readonly sourceId: string;
  readonly recordId: string;
  readonly expectedRecordVersion: number;
  readonly bindingKind: JurisprudenceSourceBindingKind;
  readonly isPrimarySource: boolean;
  readonly secondarySourceJustificationReference: string | null;
  readonly idempotencyKey: string;
}
export interface SupersedeJurisprudenceSourceBindingCommand {
  readonly context: PublicationGovernanceContext;
  readonly bindingId: string;
  readonly replacementSourceId: string;
  readonly expectedRecordVersion: number;
  readonly bindingKind: JurisprudenceSourceBindingKind;
  readonly isPrimarySource: boolean;
  readonly secondarySourceJustificationReference: string | null;
  readonly idempotencyKey: string;
}
export interface OpenPublicationDossierCommand {
  readonly context: PublicationGovernanceContext;
  readonly recordId: string;
  readonly expectedRecordVersion: number;
  readonly editorialCaseId: string;
  readonly expectedEditorialCaseVersion: number;
  readonly sourceBindingIds: readonly string[];
  readonly institutionalOwnerReference: string | null;
  readonly idempotencyKey: string;
}
export interface PublicationDossierMutationBase {
  readonly context: PublicationGovernanceContext;
  readonly dossierId: string;
  readonly expectedRecordVersion: number;
  readonly expectedDossierVersion: number;
  readonly idempotencyKey: string;
}
export interface AssessProvenanceCommand extends PublicationDossierMutationBase { readonly status: SourceProvenanceStatus }
export interface AssessIntegrityCommand extends PublicationDossierMutationBase { readonly status: SourceIntegrityStatus }
export interface AssessRightsCommand extends PublicationDossierMutationBase { readonly status: SourceRightsStatus }
export interface AssessPrivacyCommand extends PublicationDossierMutationBase { readonly status: JurisprudencePrivacyReviewStatus; readonly riskCategories: readonly PrivacyRiskCategory[]; readonly otherRiskReference: string | null }
export interface AssessPublicProjectionCommand extends PublicationDossierMutationBase { readonly status: "not_started" | "in_review" | "approved" | "rejected" }
export type EvaluatePublicationDossierCommand = PublicationDossierMutationBase;
export interface SynchronizePublicationDossierCommand { readonly context: PublicationGovernanceContext; readonly dossierId: string; readonly expectedDossierVersion: number; readonly idempotencyKey: string }
export type ClosePublicationDossierCommand = PublicationDossierMutationBase;
export interface PublicationDossierQuery { readonly context: PublicationGovernanceContext; readonly dossierId: string }

export interface JurisprudenceSourceRegistrationResult { readonly source: JurisprudenceSourceRecord }
export interface JurisprudenceSourceBindingResult { readonly binding: JurisprudenceSourceBinding }
export interface PublicationDossierView { readonly dossier: JurisprudencePublicationDossier; readonly evaluation: PublicationAuthorizationEvaluation }
export type PublicationGovernanceStoredResult = JurisprudenceSourceRegistrationResult | JurisprudenceSourceBindingResult | PublicationDossierView;
export interface PublicationGovernanceIdempotencyEntry { readonly idempotencyKey: string; readonly commandFingerprint: string; readonly result: PublicationGovernanceStoredResult }

export interface PublicationDossierCreateCommit { readonly dossier: JurisprudencePublicationDossier; readonly event: PublicationDossierEvent; readonly idempotency: PublicationGovernanceIdempotencyEntry }
export interface PublicationDossierUpdateCommit extends PublicationDossierCreateCommit { readonly expectedVersion: number }

export interface JurisprudencePublicationDossierRepository {
  findSourceById(sourceId: string): Promise<JurisprudenceSourceRecord | null>;
  createSource(source: JurisprudenceSourceRecord, idempotency: PublicationGovernanceIdempotencyEntry): Promise<void>;
  findBindingById(bindingId: string): Promise<JurisprudenceSourceBinding | null>;
  createBinding(binding: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry): Promise<void>;
  supersedeBinding(previous: JurisprudenceSourceBinding, replacement: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry): Promise<void>;
  findById(dossierId: string): Promise<JurisprudencePublicationDossier | null>;
  findActiveByRecordAndVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicationDossier | null>;
  create(commit: PublicationDossierCreateCommit): Promise<void>;
  commit(commit: PublicationDossierUpdateCommit): Promise<void>;
  listEvents(dossierId: string): Promise<readonly PublicationDossierEvent[]>;
  findIdempotencyResult(idempotencyKey: string): Promise<PublicationGovernanceIdempotencyEntry | null>;
  close(): Promise<void>;
}

export type PublicationGovernanceErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "DUPLICATE_ACTIVE_DOSSIER" | "IDEMPOTENCY_CONFLICT" | "VERSION_CONFLICT" | "DOSSIER_SUPERSEDED" | "DOSSIER_CLOSED" | "SOURCE_NOT_ELIGIBLE" | "REPOSITORY_UNAVAILABLE" | "RESOURCE_CLOSED" | "INTERNAL_ERROR";
export interface PublicationGovernanceLogEvent { readonly requestId: string; readonly operation: string; readonly resultCode: string; readonly dossierRef?: string; readonly recordVersion?: number; readonly dossierVersion?: number; readonly timestamp: string }
export interface PublicationGovernanceLogger { log(event: PublicationGovernanceLogEvent): void }
export interface PublicationGovernanceDependencies { readonly api: JurisprudenceInternalApi; readonly editorialWorkflow: JurisprudenceEditorialWorkflow; readonly repository: JurisprudencePublicationDossierRepository; readonly now: () => string; readonly generateId: () => string; readonly logger?: PublicationGovernanceLogger }

export interface JurisprudencePublicationGovernanceService {
  registerSource(input: unknown): Promise<JurisprudenceSourceRegistrationResult>;
  bindSource(input: unknown): Promise<JurisprudenceSourceBindingResult>;
  supersedeSourceBinding(input: unknown): Promise<JurisprudenceSourceBindingResult>;
  openDossier(input: unknown): Promise<PublicationDossierView>;
  assessProvenance(input: unknown): Promise<PublicationDossierView>;
  assessIntegrity(input: unknown): Promise<PublicationDossierView>;
  assessRights(input: unknown): Promise<PublicationDossierView>;
  assessPrivacy(input: unknown): Promise<PublicationDossierView>;
  assessPublicProjection(input: unknown): Promise<PublicationDossierView>;
  evaluateDossier(input: unknown): Promise<PublicationDossierView>;
  synchronizeDossier(input: unknown): Promise<PublicationDossierView>;
  closeDossier(input: unknown): Promise<PublicationDossierView>;
  getDossier(input: unknown): Promise<PublicationDossierView>;
  getHistory(input: unknown): Promise<readonly PublicationDossierEvent[]>;
  close(): Promise<void>;
}

export interface JurisprudencePublicationGovernanceReadiness {
  readonly sourceGovernanceContractsReady: true;
  readonly publicationDossierContractsReady: true;
  readonly inMemoryAdapterReady: true;
  readonly sqliteAdapterReadyForTesting: true;
  readonly publicationAuthorizationPolicyReady: false;
  readonly publicationExecutionReady: false;
  readonly productionSourceGovernanceReady: false;
  readonly productionPrivacyReviewReady: false;
  readonly authenticationReal: false;
  readonly endpointsMounted: false;
  readonly uiConnected: false;
  readonly publicSearchConnected: false;
  readonly publicationAuthorizationGranted: false;
  readonly publicationExecuted: false;
  readonly readyForRouteMount: false;
  readonly overrideSupported: false;
}
