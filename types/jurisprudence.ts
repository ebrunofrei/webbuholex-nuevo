import type { AssistantConfidenceLevel } from "@/types/assistant";

export type JurisprudenceInstitutionKind = "judiciary" | "constitutional_court" | "international_court" | "legal_information_system" | "other_official";
export type JurisprudenceSourceKind = "official_api" | "official_open_dataset" | "official_document" | "official_page" | "manual_official_link";
export type JurisprudenceIngestionState = "discovered" | "metadata_imported" | "official_link_verified" | "document_downloaded" | "integrity_verified" | "parsed" | "editorially_reviewed" | "approved" | "stale" | "source_unavailable";
export type JurisprudenceDocumentStatus = "metadata_only" | "source_verified" | "parsed" | "editorially_reviewed" | "approved" | "stale" | "unavailable";
export type JurisprudenceBindingStatus = "binding" | "persuasive" | "not_binding" | "undetermined";
export type JurisprudenceSectionKind = "identification" | "background" | "facts" | "procedural_history" | "legal_ground" | "decision" | "separate_opinion" | "annex";
export type HoldingKind = "ratio_decidendi" | "obiter_dictum" | "concurring_opinion" | "dissenting_opinion";
export type JurisprudenceQueryMode = "search" | "quick_read" | "question" | "compare" | "applicability";
export type JurisprudenceContentOrigin = "official_content" | "system_summary" | "legal_inference" | "applicability_assessment" | "limitation";

export interface JurisprudenceInstitution {
  id: string;
  name: string;
  shortName: string;
  country: string;
  kind: JurisprudenceInstitutionKind;
  officialHomepage: string | null;
}

export interface JurisprudenceOfficialSource {
  kind: JurisprudenceSourceKind;
  canonicalUrl: string;
  documentUrl: string | null;
  verifiedAt: string;
  state: JurisprudenceIngestionState;
}

export interface JurisprudenceSection {
  id: string;
  kind: JurisprudenceSectionKind;
  heading: string | null;
  startPage: number;
  endPage: number;
  officialExcerpt: string | null;
  systemSummary: string | null;
}

export interface LegalIssue {
  id: string;
  question: string;
  specialty: string;
  matter: string;
  submatter: string | null;
  sourceSectionIds: readonly string[];
  verified: boolean;
}

export interface Holding {
  id: string;
  kind: HoldingKind;
  statement: string;
  legalIssueIds: readonly string[];
  citationIds: readonly string[];
  verified: boolean;
}

export interface JurisprudenceCitation {
  id: string;
  documentId: string;
  pageStart: number;
  pageEnd: number;
  paragraph: string | null;
  quote: string | null;
  officialUrl: string;
  verified: boolean;
}

export interface JurisprudenceDocument {
  id: string;
  institution: JurisprudenceInstitution;
  issuingBody: string;
  chamber: string | null;
  resolutionType: string;
  resolutionNumber: string;
  caseNumber: string;
  date: string;
  publicationDate: string | null;
  specialty: string;
  matter: string;
  submatter: string | null;
  legalIssues: readonly LegalIssue[];
  holdings: readonly Holding[];
  sections: readonly JurisprudenceSection[];
  citations: readonly JurisprudenceCitation[];
  officialSource: JurisprudenceOfficialSource;
  bindingStatus: JurisprudenceBindingStatus;
  documentStatus: JurisprudenceDocumentStatus;
  pageCount: number | null;
  keywords: readonly string[];
  hasSeparateOpinions: boolean | null;
}

export interface JurisprudenceQuery {
  id: string;
  mode: JurisprudenceQueryMode;
  text: string;
  jurisdiction: string;
  specialty: string | null;
  matter: string | null;
  documentIds: readonly string[];
  userCaseSummary: string | null;
  privacyConsent: boolean;
}

export interface JurisprudenceResponseSegment {
  origin: JurisprudenceContentOrigin;
  title: string;
  content: readonly string[];
  citationIds: readonly string[];
  verified: boolean;
}

export interface JurisprudenceAssistantResponse {
  queryId: string;
  status: "not_executed" | "insufficient_sources" | "ready_for_review" | "verified";
  officialContent: readonly JurisprudenceResponseSegment[];
  systemSummary: readonly JurisprudenceResponseSegment[];
  legalInference: readonly JurisprudenceResponseSegment[];
  applicabilityAssessment: readonly JurisprudenceResponseSegment[];
  limitations: readonly JurisprudenceResponseSegment[];
  citations: readonly JurisprudenceCitation[];
  confidence: AssistantConfidenceLevel;
}

export interface JurisprudenceResult {
  document: JurisprudenceDocument;
  relevance: number;
  matchedLegalIssueIds: readonly string[];
  matchedHoldingIds: readonly string[];
  explanation: string;
  sourceVerified: boolean;
}

export interface JurisprudenceSourceAdapter {
  id: string;
  institutionId: string;
  kind: JurisprudenceSourceKind;
  enabled: false;
  supportsBulkAcquisition: false;
  respectsRateLimits: true;
  bypassesCaptcha: false;
  description: string;
}

export interface JurisprudenceSourcePolicy {
  priority: readonly JurisprudenceSourceKind[];
  scrapingEnabled: false;
  captchaBypassAllowed: false;
  privateEndpointsAllowed: false;
  repeatedBulkDownloadsAllowed: false;
}

export type JurisprudenceAgentId = "JurisprudenceQueryAgent" | "JurisprudenceRetrievalAgent" | "JudgmentReadingAgent" | "HoldingExtractionAgent" | "JurisprudenceComparisonAgent" | "ApplicabilityAssessmentAgent" | "CitationVerificationAgent";
export type JurisprudenceSkillId = "classify-legal-query" | "normalize-jurisprudence-terms" | "parse-judgment-structure" | "extract-legal-issues" | "extract-holdings" | "extract-relevant-grounds" | "compare-judgments" | "assess-case-applicability" | "verify-jurisprudence-citations" | "summarize-long-judgment" | "explain-for-lawyer" | "explain-for-citizen";

export interface JurisprudenceAgentContract {
  id: JurisprudenceAgentId;
  purpose: string;
  skills: readonly JurisprudenceSkillId[];
  requiresVerifiedSources: boolean;
  enabled: false;
}

export interface JurisprudenceIngestionStage {
  order: number;
  id: "discovery" | "official_location" | "private_retrieval" | "integrity" | "text_extraction" | "pagination" | "segmentation" | "legal_classification" | "preliminary_extraction" | "editorial_review" | "approval" | "retrieval_availability";
  label: string;
  requiresPreviousStage: boolean;
  automated: boolean;
}

export interface JurisprudenceGuardError {
  code: string;
  message: string;
  blocking: true;
  path: string;
}

/**
 * Canonical editorial record introduced in Phase 11.A.
 *
 * The earlier document and assistant contracts above describe cognitive flows.
 * This record is the source-neutral contract for future persistence and public
 * projections; it deliberately keeps official, editorial and generated content
 * in separate branches.
 */
export type JurisprudenceEditorialStatus = "draft" | "under_review" | "verified" | "rejected" | "archived";
export type JurisprudencePublicationStatus = "private" | "editorial_preview" | "published" | "unpublished" | "withdrawn";
export type JurisprudenceVerificationStatus = "unverified" | "source_located" | "partially_verified" | "verified" | "disputed";
export type JurisprudenceDocumentAvailability = "metadata_only" | "excerpt_available" | "full_text_available" | "official_file_available" | "unavailable";
export type JurisprudenceRecordSourceType = "official_judiciary" | "constitutional_court" | "government_platform" | "official_gazette" | "editorial_upload" | "other_official_source";
export type JurisprudenceLegalAuthority = "ordinary" | "persuasive" | "binding_precedent" | "plenary_decision" | "constitutional_precedent" | "unknown";
export type JurisprudenceResolutionCategory = "ordinary_decision" | "cassation" | "plenary_cassation" | "plenary_agreement" | "constitutional_judgment" | "other";
export type JurisprudenceValidityStatus = "current" | "modified" | "superseded" | "contradicted" | "unknown";
export type JurisprudenceOriginFormat = "pdf" | "html" | "docx" | "txt" | "xml" | "json" | "other";
export type JurisprudenceSearchSort = "relevance" | "date_desc" | "date_asc" | "editorial_relevance";
export type JurisprudenceSearchDataStatus = "unavailable" | "empty" | "available" | "partial";

export interface JurisprudenceRecordOfficialContent {
  officialSummary: string | null;
  officialFullText: string | null;
  fullTextAvailable: boolean;
  publicationAllowed: boolean;
  documentAvailability: JurisprudenceDocumentAvailability;
  originFormat: JurisprudenceOriginFormat;
  language: string;
  pageCount: number | null;
}

export interface JurisprudenceRecordEditorialContent {
  editorialTitle: string;
  editorialSummary: string | null;
  publicExcerpt: string | null;
  legalIssue: string | null;
  mainCriterion: string | null;
  relevantGrounds: readonly string[];
  decision: string | null;
  citedNorms: readonly string[];
  citedPrecedentIds: readonly string[];
  relatedRecordIds: readonly string[];
  keywords: readonly string[];
}

export interface JurisprudenceRecordGeneratedContent {
  internalDraft: string | null;
  reviewed: boolean;
  supportedBySource: boolean;
}

export interface JurisprudenceRecordSource {
  type: JurisprudenceRecordSourceType;
  name: string;
  url: string | null;
  documentId: string | null;
  publishedAt: string | null;
  retrievedAt: string | null;
  checksum: string | null;
  verificationStatus: JurisprudenceVerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verificationNotes: string | null;
  evidenceReference: string | null;
}

export interface JurisprudenceRecordFile {
  available: boolean;
  originalName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  checksum: string | null;
  internalLocation: string | null;
  publicAccessAllowed: boolean;
  publicAccessAuthorizedAt: string | null;
}

export interface JurisprudenceRecordAuthority {
  resolutionCategory: JurisprudenceResolutionCategory;
  legalAuthority: JurisprudenceLegalAuthority;
  authorityEvidence: string | null;
  authorityVerifiedAt: string | null;
  validityStatus: JurisprudenceValidityStatus;
  validityEvidence: string | null;
}

export interface JurisprudenceRecordSearchClassification {
  normalizedSearchText: string;
  normalizedMatters: readonly string[];
  normalizedBodies: readonly string[];
  jurisdiction: string;
  tags: readonly string[];
  editorialRelevance: number;
}

export interface JurisprudenceRecordContradiction {
  code: string;
  message: string;
  severity: "warning" | "critical";
}

export interface JurisprudenceRecordInternalControl {
  editorialNotes: readonly string[];
  contradictions: readonly JurisprudenceRecordContradiction[];
  generatedContentOnly: boolean;
}

export interface JurisprudenceRecord {
  id: string;
  slug: string | null;
  recordVersion: number;
  editorialStatus: JurisprudenceEditorialStatus;
  publicationStatus: JurisprudencePublicationStatus;
  createdAt: string;
  updatedAt: string;
  caseNumber: string;
  resolutionNumber: string;
  resolutionType: string;
  institution: JurisprudenceInstitution;
  issuingBody: string;
  instanceLevel: string;
  specialty: string;
  matter: string;
  submatter: string | null;
  judicialDistrict: string | null;
  chamberOrCourt: string;
  rapporteur: string | null;
  issuedAt: string;
  officiallyPublishedAt: string | null;
  officialContent: JurisprudenceRecordOfficialContent;
  editorialContent: JurisprudenceRecordEditorialContent;
  generatedContent: JurisprudenceRecordGeneratedContent;
  authority: JurisprudenceRecordAuthority;
  source: JurisprudenceRecordSource;
  officialFile: JurisprudenceRecordFile | null;
  search: JurisprudenceRecordSearchClassification;
  internal: JurisprudenceRecordInternalControl;
}

export interface JurisprudenceSearchInput {
  q: string | undefined;
  expediente: string | undefined;
  resolucion: string | undefined;
  materia: string | undefined;
  submateria: string | undefined;
  organo: string | undefined;
  instancia: string | undefined;
  distritoJudicial: string | undefined;
  tipoResolucion: string | undefined;
  fechaDesde: string | undefined;
  fechaHasta: string | undefined;
  authority: JurisprudenceLegalAuthority | undefined;
  page: number;
  pageSize: number;
  sort: JurisprudenceSearchSort;
}

export type JurisprudenceAppliedFilters = Omit<JurisprudenceSearchInput, "page" | "pageSize" | "sort">;

export interface PublicJurisprudenceSource {
  name: string;
  url: string | null;
  documentId: string | null;
  publishedAt: string | null;
}

export interface JurisprudenceSearchItem {
  id: string;
  slug: string | null;
  title: string;
  caseNumber: string;
  resolutionNumber: string;
  resolutionType: string;
  issuingBody: string;
  matter: string;
  issuedAt: string;
  summary: string | null;
  authority: JurisprudenceLegalAuthority;
  authorityVerified: boolean;
  documentAvailability: JurisprudenceDocumentAvailability;
  source: PublicJurisprudenceSource;
  verificationStatus: "verified";
}

export interface JurisprudenceDetail extends JurisprudenceSearchItem {
  institution: Pick<JurisprudenceInstitution, "id" | "name" | "shortName" | "country" | "kind">;
  instanceLevel: string;
  specialty: string;
  submatter: string | null;
  judicialDistrict: string | null;
  chamberOrCourt: string;
  rapporteur: string | null;
  officiallyPublishedAt: string | null;
  officialSummary: string | null;
  officialFullText: string | null;
  editorialSummary: string | null;
  publicExcerpt: string | null;
  legalIssue: string | null;
  mainCriterion: string | null;
  relevantGrounds: readonly string[];
  decision: string | null;
  citedNorms: readonly string[];
  relatedRecordIds: readonly string[];
  keywords: readonly string[];
  pageCount: number | null;
  validityStatus: JurisprudenceValidityStatus;
}

export interface JurisprudenceSearchResult {
  items: readonly JurisprudenceSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  appliedFilters: JurisprudenceAppliedFilters;
  sort: JurisprudenceSearchSort;
  dataStatus: JurisprudenceSearchDataStatus;
  generatedAt: string;
}

export type JurisprudencePublicationBlockerCode =
  | "SOURCE_NOT_IDENTIFIABLE"
  | "SOURCE_NOT_VERIFIED"
  | "PUBLICATION_STATUS_NOT_PUBLISHED"
  | "EDITORIAL_STATUS_NOT_VERIFIED"
  | "LEGAL_IDENTIFICATION_INCOMPLETE"
  | "CRITICAL_CONTRADICTION"
  | "GENERATED_CONTENT_WITHOUT_SUPPORT"
  | "OFFICIAL_FILE_NOT_AUTHORIZED";

export interface JurisprudencePublicationBlocker {
  code: JurisprudencePublicationBlockerCode;
  path: string;
  message: string;
}

export interface DecisiveGround {
  readonly ground: string;
  readonly officialParagraphs: readonly number[];
  readonly sourceType: string;
}

export interface InterpretedRule {
  readonly rule: string;
  readonly article: string;
  readonly roleInDecision: string;
  readonly officialParagraphs: readonly number[];
}

export interface CitedPrecedent {
  readonly caseNumber: string;
  readonly role: string;
}

export interface SeparateOpinion {
  readonly author: string;
  readonly opinionType: string;
  readonly position: string;
  readonly supportingReferences: readonly string[];
}

export interface ProtectedPensionCategory {
  readonly category: string;
  readonly officialReference: string;
}

export interface EmergencyDecreeRequirement {
  readonly requirement: string;
  readonly description: string;
  readonly officialReference: string;
}

export interface JurisprudencePublicDetailDtoBase {
  readonly caseNumber: string;
  readonly slug: string;
  readonly title: string;
  readonly resolutionNumber: string;
  readonly resolutionType: string;
  readonly institutionName: string;
  readonly issuingBody: string;
  readonly matter: string;
  readonly issuedAt: string;
  readonly summary: string;
  readonly sourceName: string;

  readonly caseTitle: string;
  readonly editorialTitle: string;
  readonly processType: string;
  readonly court: string;
  readonly chamber: string;
  readonly decisionDate: string;
  readonly publicationDate: string;
  readonly jurisdiction: string;
  readonly specialty: string;
  readonly matterArray: readonly string[];
  readonly officialHtmlUrl: string;
  readonly officialPdfUrl: string;
  readonly relevantFacts: readonly string[];
  readonly proceduralBackground: readonly string[];
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
}

export interface JurisprudencePublicDetailDtoProspective extends JurisprudencePublicDetailDtoBase {
  readonly kind: "prospective_rule";
  readonly prospectiveJurisprudentialRule: string;
  readonly prospectiveRuleSupportingParagraphs: readonly number[];
}

export interface JurisprudencePublicDetailDtoBinding extends JurisprudencePublicDetailDtoBase {
  readonly kind: "binding_rule";
  readonly bindingJurisprudentialRule: string;
  readonly bindingRuleSupportingParagraphs: readonly number[];
  readonly protectedPensionCategories: readonly ProtectedPensionCategory[];
}

export interface JurisprudencePublicDetailDtoConstitutional extends JurisprudencePublicDetailDtoBase {
  readonly kind: "constitutional_economic_rule";
  readonly constitutionalEconomicRule: string;
  readonly constitutionalEconomicRuleSupportingParagraphs: readonly number[];
  readonly emergencyDecreeRequirements: readonly EmergencyDecreeRequirement[];
}

export type JurisprudencePublicDetailDto =
  | JurisprudencePublicDetailDtoProspective
  | JurisprudencePublicDetailDtoBinding
  | JurisprudencePublicDetailDtoConstitutional;
