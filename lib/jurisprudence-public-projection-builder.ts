import type {
  JurisprudenceProjectionSourceRecord,
  JurisprudencePublicProjection,
} from "@/types/jurisprudence-publication-execution";

export interface BuildJurisprudencePublicProjectionInput {
  readonly record: JurisprudenceProjectionSourceRecord;
  readonly projectionId: string;
  readonly executionId: string;
  readonly authorizationCaseId: string;
  readonly generatedAt: string;
}

export function buildJurisprudencePublicProjection(
  input: BuildJurisprudencePublicProjectionInput,
): JurisprudencePublicProjection {
  const summary = input.record.editorialContent.publicExcerpt
    ?? input.record.editorialContent.editorialSummary
    ?? input.record.officialContent.officialSummary;
  return Object.freeze({
    projectionId: input.projectionId,
    executionId: input.executionId,
    authorizationCaseId: input.authorizationCaseId,
    recordId: input.record.id,
    recordVersion: input.record.recordVersion,
    status: "active_internal",
    slug: input.record.slug,
    title: input.record.editorialContent.editorialTitle,
    caseNumber: input.record.caseNumber,
    resolutionNumber: input.record.resolutionNumber,
    resolutionType: input.record.resolutionType,
    institutionName: input.record.institutionName,
    issuingBody: input.record.issuingBody,
    matter: input.record.matter,
    issuedAt: input.record.issuedAt,
    summary,
    sourceName: input.record.source.name,
    sourceDocumentId: input.record.source.documentId,
    generatedAt: input.generatedAt,
    updatedAt: input.generatedAt,
    exposedPublicly: false,
    deployed: false,
  });
}
