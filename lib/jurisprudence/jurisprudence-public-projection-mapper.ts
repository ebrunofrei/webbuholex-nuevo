import type { JurisprudencePublicProjectionRecord } from "@/types/jurisprudence-public-projection-writer";
import type { JurisprudencePublicProjection } from "@/types/jurisprudence-publication-execution";
import type { JurisprudenceProjectionSourceRecord } from "@/types/jurisprudence-publication-execution";

export function toPublicProjectionRecord(
  record: JurisprudenceProjectionSourceRecord,
  projection: JurisprudencePublicProjection
): JurisprudencePublicProjectionRecord {
  return {
    id: projection.projectionId,
    recordVersion: record.recordVersion,
    slug: projection.slug,
    title: projection.title,
    caseTitle: record.editorialContent.editorialTitle,
    caseNumber: projection.caseNumber,
    resolutionNumber: projection.resolutionNumber,
    resolutionType: projection.resolutionType,
    institutionName: projection.institutionName,
    issuingBody: projection.issuingBody,
    matter: projection.matter,
    issuedAt: projection.issuedAt,
    summary: projection.summary,
    sourceName: projection.sourceName,
  };
}
