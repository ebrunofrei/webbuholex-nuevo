import type {
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCaseStatus,
  JurisprudenceEditorialCaseView,
  JurisprudenceEditorialReadiness,
} from "@/types/jurisprudence-editorial-workflow";

function openBlockingObservations(editorialCase: JurisprudenceEditorialCase): number {
  return editorialCase.observations.filter((entry) => entry.severity === "blocking" && entry.resolvedAt === null).length;
}

function decisionsAreSeparated(editorialCase: JurisprudenceEditorialCase): boolean {
  return editorialCase.editorialDecision !== null
    && editorialCase.legalDecision !== null
    && editorialCase.editorialDecision.actorReference !== editorialCase.legalDecision.actorReference;
}

export function evaluateJurisprudenceEditorialReadiness(
  editorialCase: JurisprudenceEditorialCase,
  currentRecordVersion: number,
  evaluatedAt: string,
): JurisprudenceEditorialReadiness {
  const blockers: string[] = [];
  const active = editorialCase.closedAt === null && editorialCase.supersededAt === null;
  const currentVersion = editorialCase.recordVersion === currentRecordVersion;
  const unexpired = Date.parse(editorialCase.expiresAt) > Date.parse(evaluatedAt);
  const editorialApproved = editorialCase.editorialDecision?.decision === "editorial_approved"
    && editorialCase.editorialDecision.recordVersion === currentRecordVersion;
  const legallyVerified = editorialCase.legalDecision?.decision === "legal_verification_approved"
    && editorialCase.legalDecision.recordVersion === currentRecordVersion;
  const noBlockingObservations = openBlockingObservations(editorialCase) === 0;
  const evaluationCurrent = editorialCase.publicationEvaluation?.recordVersion === currentRecordVersion;

  if (!active) blockers.push("case_not_active");
  if (!currentVersion) blockers.push("record_version_changed");
  if (!unexpired) blockers.push("case_expired");
  if (!editorialApproved) blockers.push("editorial_approval_missing");
  if (!legallyVerified) blockers.push("legal_verification_missing");
  if (!decisionsAreSeparated(editorialCase)) blockers.push("separation_of_duties_missing");
  if (!noBlockingObservations) blockers.push("blocking_observations_open");
  if (!evaluationCurrent) blockers.push("publication_evaluation_missing_for_version");

  return Object.freeze({
    editorialWorkflowReady: active && currentVersion && unexpired,
    legalVerificationReady: active && currentVersion && unexpired && editorialCase.legalAssignment !== null,
    publicationEvaluationReady: active && currentVersion && unexpired && editorialApproved && legallyVerified
      && decisionsAreSeparated(editorialCase) && noBlockingObservations && evaluationCurrent,
    publicationAuthorizationReady: false,
    publicationExecutionReady: false,
    blockers: Object.freeze(blockers),
    overrideSupported: false,
  });
}

export function deriveJurisprudenceEditorialCaseStatus(
  editorialCase: JurisprudenceEditorialCase,
  currentRecordVersion: number,
  evaluatedAt: string,
): JurisprudenceEditorialCaseStatus {
  if (editorialCase.supersededAt !== null || editorialCase.recordVersion !== currentRecordVersion) return "superseded";
  if (editorialCase.closedAt !== null || Date.parse(editorialCase.expiresAt) <= Date.parse(evaluatedAt)) return "closed_without_approval";
  const readiness = evaluateJurisprudenceEditorialReadiness(editorialCase, currentRecordVersion, evaluatedAt);
  if (readiness.publicationEvaluationReady) return "verified_for_publication_evaluation";
  if (editorialCase.legalDecision?.decision === "legal_verification_rejected") return "legally_rejected";
  if (editorialCase.editorialDecision?.decision === "request_changes") return "changes_requested";
  if (editorialCase.legalDecision?.decision === "legal_verification_approved") return "legally_verified";
  if (editorialCase.editorialDecision?.decision === "editorial_approved") return "editorially_approved";
  return "open";
}

export function toJurisprudenceEditorialCaseView(
  editorialCase: JurisprudenceEditorialCase,
  currentRecordVersion: number,
  evaluatedAt: string,
): JurisprudenceEditorialCaseView {
  return structuredClone({
    case: editorialCase,
    status: deriveJurisprudenceEditorialCaseStatus(editorialCase, currentRecordVersion, evaluatedAt),
    openBlockingObservations: openBlockingObservations(editorialCase),
    publicationAuthorizationGranted: false,
    publicationExecuted: false,
  });
}
