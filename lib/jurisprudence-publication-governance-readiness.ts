import type { JurisprudenceEditorialCaseView } from "@/types/jurisprudence-editorial-workflow";
import type {
  JurisprudencePublicationDossier,
  JurisprudencePublicationGovernanceReadiness,
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  PublicationAuthorizationEvaluation,
  PublicationDossierBlocker,
} from "@/types/jurisprudence-publication-governance";

export interface PublicationDossierEvaluationInput {
  readonly dossier: JurisprudencePublicationDossier;
  readonly currentRecordVersion: number;
  readonly editorialCase: JurisprudenceEditorialCaseView | null;
  readonly bindings: readonly JurisprudenceSourceBinding[];
  readonly sources: readonly JurisprudenceSourceRecord[];
}

function unique<T>(values: readonly T[]): readonly T[] { return [...new Set(values)]; }

export function evaluatePublicationDossierCompleteness(input: PublicationDossierEvaluationInput): PublicationAuthorizationEvaluation {
  const blockers: PublicationDossierBlocker[] = [];
  const { dossier } = input;
  if (dossier.supersededAt !== null) blockers.push("dossier_superseded");
  if (input.currentRecordVersion !== dossier.recordVersion) blockers.push("record_version_mismatch");
  if (input.editorialCase === null) blockers.push("editorial_case_missing");
  else {
    if (input.editorialCase.case.caseId !== dossier.editorialCaseId || input.editorialCase.case.caseVersion !== dossier.editorialCaseVersion || input.editorialCase.status !== "verified_for_publication_evaluation") blockers.push("editorial_case_not_verified");
    if (input.editorialCase.openBlockingObservations > 0) blockers.push("blocking_observations_present");
  }
  if (input.bindings.length === 0 || input.bindings.length !== dossier.sourceBindingIds.length || input.sources.length !== input.bindings.length) blockers.push("source_binding_missing");
  const bindingEligible = input.bindings.every((binding) => binding.bindingStatus === "active" && binding.recordId === dossier.recordId && binding.recordVersion === dossier.recordVersion);
  if (!bindingEligible) blockers.push("source_binding_missing");
  const primaryOrJustified = input.bindings.some((binding) => binding.isPrimarySource || binding.secondarySourceJustificationReference !== null);
  if (!primaryOrJustified) blockers.push("source_binding_missing");
  if (input.sources.some((source) => source.provenanceStatus === "disputed") || dossier.provenanceAssessment?.status === "disputed") blockers.push("source_provenance_unverified");
  else if (dossier.provenanceAssessment?.status !== "verified") blockers.push("source_provenance_unverified");
  const integrityStatus = dossier.integrityAssessment?.status;
  if (integrityStatus === "integrity_conflict" || input.sources.some((source) => source.integrityStatus === "integrity_conflict")) blockers.push("source_integrity_conflict");
  else if (integrityStatus !== "checksum_verified" && integrityStatus !== "certified_copy_verified") blockers.push("source_integrity_unverified");
  if (dossier.rightsAssessment === null || ["unknown", "review_required"].includes(dossier.rightsAssessment.status) || input.sources.some((source) => ["unknown", "review_required"].includes(source.rightsStatus))) blockers.push("source_rights_unknown");
  else if (dossier.rightsAssessment.status !== "public_display_permitted" || input.sources.some((source) => source.rightsStatus !== "public_display_permitted")) blockers.push("source_rights_restricted");
  if (dossier.privacyAssessment === null || ["not_started", "in_review", "approved_for_internal_use"].includes(dossier.privacyAssessment.status) || input.sources.some((source) => ["not_started", "in_review", "approved_for_internal_use"].includes(source.privacyStatus))) blockers.push("privacy_review_missing");
  else if (dossier.privacyAssessment.status === "requires_redaction") blockers.push("privacy_redaction_required");
  else if (dossier.privacyAssessment.status !== "approved_for_public_projection" || input.sources.some((source) => source.privacyStatus !== "approved_for_public_projection")) blockers.push("public_projection_not_approved");
  if (dossier.publicProjectionAssessment?.status !== "approved") blockers.push("public_projection_not_approved");
  if (dossier.institutionalOwnerReference === null) blockers.push("institutional_owner_missing", "publication_authority_not_defined");

  const normalized = unique(blockers);
  if (normalized.length > 0) return { decision: "incomplete", blockers: normalized, publicationAuthorizationGranted: false, publicationExecuted: false };
  return {
    decision: "ready_for_authorization_evaluation",
    conditions: ["institutional_authorization_required", "publication_must_be_executed_separately", "record_version_must_remain_unchanged"],
    publicationAuthorizationGranted: false,
    publicationExecuted: false,
  };
}

export function evaluateJurisprudencePublicationGovernanceReadiness(): JurisprudencePublicationGovernanceReadiness {
  return Object.freeze({
    sourceGovernanceContractsReady: true,
    publicationDossierContractsReady: true,
    inMemoryAdapterReady: true,
    sqliteAdapterReadyForTesting: true,
    publicationAuthorizationPolicyReady: false,
    publicationExecutionReady: false,
    productionSourceGovernanceReady: false,
    productionPrivacyReviewReady: false,
    authenticationReal: false,
    endpointsMounted: false,
    uiConnected: false,
    publicSearchConnected: false,
    publicationAuthorizationGranted: false,
    publicationExecuted: false,
    readyForRouteMount: false,
    overrideSupported: false,
  });
}
