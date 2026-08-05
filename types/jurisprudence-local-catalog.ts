import type {
  DecisiveGround,
  InterpretedRule,
  CitedPrecedent,
  SeparateOpinion,
  ProtectedPensionCategory,
  EmergencyDecreeRequirement
} from "./jurisprudence";

export interface JurisprudenceLocalRecordBase {
  readonly caseNumber: string;
  readonly slug: string;
  readonly officialTitle: string;
  readonly editorialTitle: string;
  readonly processType: string;
  readonly court: string;
  readonly chamber: string;
  readonly decisionDate: string;
  readonly publicationDate: string;
  readonly jurisdiction: string;
  readonly specialty: string;
  readonly matter: readonly string[];
  readonly officialHtmlUrl: string;
  readonly officialPdfUrl: string;
  readonly sourceDocumentId: string;
  readonly sourceVerificationStatus: string;
  readonly sourceVerifiedAt: string;
  readonly relevantFacts: readonly string[];
  readonly proceduralBackground: readonly string[];
  readonly publicCaseTitle: string;
  readonly publicProceduralBackground: readonly string[];
  readonly legalIssue: string;
  readonly subIssues: readonly string[];
  readonly decision: string;
  readonly operativeOrders: readonly string[];
  readonly caseSpecificRatio: string;
  readonly caseSpecificRatioSupportingParagraphs: readonly number[];

  readonly decisiveGrounds: readonly DecisiveGround[];
  readonly interpretedRules: readonly InterpretedRule[];
  readonly citedPrecedents: readonly CitedPrecedent[];
  readonly dissentingOrSeparateOpinions: readonly SeparateOpinion[];
  readonly applicability: readonly string[];
  readonly limits: readonly string[];
  readonly nonHoldingObservations: readonly string[];
  readonly editorialSummary: string;
  readonly keywords: readonly string[];
  readonly publicWarning: string;

  // Private fields
  readonly legalReviewStatus: string;
  readonly interpretationStatus: string;
  readonly humanReviewed: boolean;
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly approvedForPublication: boolean;
  readonly privacyReviewStatus: string;
  readonly isPublic: boolean;
}

export interface JurisprudenceLocalRecordProspective extends JurisprudenceLocalRecordBase {
  readonly kind: "prospective_rule";
  readonly prospectiveJurisprudentialRule: string;
  readonly prospectiveRuleSupportingParagraphs: readonly number[];
}

export interface JurisprudenceLocalRecordBinding extends JurisprudenceLocalRecordBase {
  readonly kind: "binding_rule";
  readonly bindingJurisprudentialRule: string;
  readonly bindingRuleSupportingParagraphs: readonly number[];
  readonly protectedPensionCategories: readonly ProtectedPensionCategory[];
}

export interface JurisprudenceLocalRecordConstitutional extends JurisprudenceLocalRecordBase {
  readonly kind: "constitutional_economic_rule";
  readonly constitutionalEconomicRule: string;
  readonly constitutionalEconomicRuleSupportingParagraphs: readonly number[];
  readonly emergencyDecreeRequirements: readonly EmergencyDecreeRequirement[];
}

export type JurisprudenceLocalRecord =
  | JurisprudenceLocalRecordProspective
  | JurisprudenceLocalRecordBinding
  | JurisprudenceLocalRecordConstitutional;
