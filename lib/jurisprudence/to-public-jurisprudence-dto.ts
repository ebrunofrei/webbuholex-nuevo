import "server-only";
import { JurisprudenceLocalRecord } from "@/types/jurisprudence-local-catalog";
import {
  JurisprudencePublicDetailDto,
  JurisprudencePublicDetailDtoProspective,
  JurisprudencePublicDetailDtoBinding,
  JurisprudencePublicDetailDtoConstitutional
} from "@/types/jurisprudence";

export function toPublicJurisprudenceDto(record: JurisprudenceLocalRecord): JurisprudencePublicDetailDto {
  const base = {
    slug: record.slug,
    caseNumber: record.caseNumber,
    title: record.editorialTitle,
    resolutionNumber: "",
    resolutionType: record.processType,
    institutionName: record.court,
    issuingBody: record.chamber,
    matter: record.matter[0] || "",
    issuedAt: record.decisionDate,
    summary: record.editorialSummary,
    sourceName: "Tribunal Constitucional",

    caseTitle: record.publicCaseTitle,
    editorialTitle: record.editorialTitle,
    processType: record.processType,
    court: record.court,
    chamber: record.chamber,
    decisionDate: record.decisionDate,
    publicationDate: record.publicationDate,
    jurisdiction: record.jurisdiction,
    specialty: record.specialty,
    matterArray: [...record.matter],
    officialHtmlUrl: record.officialHtmlUrl,
    officialPdfUrl: record.officialPdfUrl,
    relevantFacts: [...record.relevantFacts],
    proceduralBackground: record.publicProceduralBackground.map((item) => item),
    legalIssue: record.legalIssue,
    subIssues: [...record.subIssues],
    decision: record.decision,
    operativeOrders: [...record.operativeOrders],
    caseSpecificRatio: record.caseSpecificRatio,
    caseSpecificRatioSupportingParagraphs: [...record.caseSpecificRatioSupportingParagraphs],

    decisiveGrounds: record.decisiveGrounds.map(g => ({ ...g, officialParagraphs: [...g.officialParagraphs] })),
    interpretedRules: record.interpretedRules.map(r => ({ ...r, officialParagraphs: [...r.officialParagraphs] })),
    citedPrecedents: record.citedPrecedents.map(p => ({ ...p })),
    dissentingOrSeparateOpinions: record.dissentingOrSeparateOpinions.map(o => ({ ...o, supportingReferences: [...o.supportingReferences] })),
    applicability: [...record.applicability],
    limits: [...record.limits],
    nonHoldingObservations: [...record.nonHoldingObservations],
    editorialSummary: record.editorialSummary,
    keywords: [...record.keywords],
    publicWarning: record.publicWarning,
  };

  switch (record.kind) {
    case "prospective_rule":
      return {
        ...base,
        kind: "prospective_rule",
        prospectiveJurisprudentialRule: record.prospectiveJurisprudentialRule,
        prospectiveRuleSupportingParagraphs: [...record.prospectiveRuleSupportingParagraphs],
      } satisfies JurisprudencePublicDetailDtoProspective;
    case "binding_rule":
      return {
        ...base,
        kind: "binding_rule",
        bindingJurisprudentialRule: record.bindingJurisprudentialRule,
        bindingRuleSupportingParagraphs: [...record.bindingRuleSupportingParagraphs],
        protectedPensionCategories: record.protectedPensionCategories.map(c => ({ ...c })),
      } satisfies JurisprudencePublicDetailDtoBinding;
    case "constitutional_economic_rule":
      return {
        ...base,
        kind: "constitutional_economic_rule",
        constitutionalEconomicRule: record.constitutionalEconomicRule,
        constitutionalEconomicRuleSupportingParagraphs: [...record.constitutionalEconomicRuleSupportingParagraphs],
        emergencyDecreeRequirements: record.emergencyDecreeRequirements.map(r => ({ ...r })),
      } satisfies JurisprudencePublicDetailDtoConstitutional;
  }
}
