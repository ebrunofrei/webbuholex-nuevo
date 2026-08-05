import type { JurisprudencePublicReadModel } from "@/types/jurisprudence-public-exposure";
import type { JurisprudenceSearchMatch } from "@/types/jurisprudence-public-search";
import type { JurisprudencePublicSearchItem } from "@/types/jurisprudence-public-search-gateway";

/**
 * Projects an internal search match to a public item using an explicit allowlist.
 *
 * Only the 12 authorized public fields are copied, field by field.
 * No spread operator. No internal identifiers leak.
 */
export function projectSearchMatchToPublicItem(
  match: JurisprudenceSearchMatch,
): JurisprudencePublicSearchItem {
  return Object.freeze({
    slug: match.slug,
    title: match.title,
    caseNumber: match.caseNumber,
    resolutionNumber: match.resolutionNumber,
    resolutionType: match.resolutionType,
    institutionName: match.institutionName,
    issuingBody: match.issuingBody,
    matter: match.matter,
    issuedAt: match.issuedAt,
    summary: match.summary,
    sourceName: match.sourceName,
    sourceDocumentId: match.sourceDocumentId,
    caseTitle: match.title,
  });
}

/**
 * Projects a public read model to a public item using an explicit allowlist.
 *
 * Only the 12 authorized public fields are copied, field by field.
 * No spread operator. No internal identifiers leak.
 */
export function projectReadModelToPublicItem(
  model: JurisprudencePublicReadModel,
): JurisprudencePublicSearchItem {
  return Object.freeze({
    slug: model.slug,
    title: model.title,
    caseNumber: model.caseNumber,
    resolutionNumber: model.resolutionNumber,
    resolutionType: model.resolutionType,
    institutionName: model.institutionName,
    issuingBody: model.issuingBody,
    matter: model.matter,
    issuedAt: model.issuedAt,
    summary: model.summary,
    sourceName: model.sourceName,
    sourceDocumentId: model.sourceDocumentId,
    caseTitle: model.title,
  });
}
