export type OwlAnalysisMode =
  | "analyze_raw_text"
  | "analyze_jurisprudence"
  | "ask_about_jurisprudence"
  | "compare_jurisprudence"
  | "evaluate_applicability";

export type OwlPublicErrorCode =
  | "invalid_input"
  | "text_too_short"
  | "text_too_long"
  | "privacy_notice_required"
  | "automated_analysis_notice_required"
  | "unsupported_mode"
  | "validation_failed"
  | "analysis_unavailable"
  | "analysis_failed"
  | "cancelled";

export type OwlAnalysisWarningCode =
  | "automated_analysis"
  | "not_legal_advice"
  | "limited_sources"
  | "unverified_rule"
  | "insufficient_context"
  | "sensitive_content_detected"
  | "possible_prompt_injection"
  | "professional_review_recommended"
  | "professional_review_priority"
  | "truncated_output";

export type OwlExecutionState =
  | { readonly status: "created" }
  | { readonly status: "validating" }
  | { readonly status: "rejected"; readonly errorCode: OwlPublicErrorCode; readonly message: string }
  | { readonly status: "ready" }
  | { readonly status: "processing"; readonly phase: "classifying" | "retrieving" | "reasoning" | "guarding" }
  | { readonly status: "completed"; readonly result: OwlLegalAnalysisResult }
  | { readonly status: "completed_with_warnings"; readonly result: OwlLegalAnalysisResult; readonly warnings: readonly OwlAnalysisWarning[] }
  | { readonly status: "failed"; readonly errorCode: OwlPublicErrorCode; readonly message: string }
  | { readonly status: "cancelled" };

export type OwlPersistenceState =
  | "ephemeral"
  | "private_saved"
  | "retention_pending"
  | "deletion_requested"
  | "deleted";

export type OwlCommercialStatus =
  | "free_eligible"
  | "free_consumed"
  | "credit_required"
  | "credit_reserved"
  | "credit_confirmed"
  | "credit_released"
  | "professional_review_offered";

export type OwlCommercialTier =
  | "free_summary"
  | "specialized_analysis"
  | "professional_review";

export type OwlEpistemicProvenance =
  | "extracted_from_input"
  | "mentioned_in_input"
  | "matched_in_verified_source"
  | "model_inference"
  | "unverified_inference";

export type OwlVerificationLevel =
  | "verified"
  | "partially_verified"
  | "unverified"
  | "not_applicable";

export type OwlAuthorityLevel =
  | "official_binding"
  | "official_persuasive"
  | "official_non_binding"
  | "editorial"
  | "user_provided"
  | "unknown";

export type OwlJurisprudenceMatchType =
  | "thematic_similarity"
  | "potentially_applicable_rule"
  | "binding_precedent"
  | "persuasive_criterion"
  | "comparison_reference"
  | "not_automatically_transferable";

export type OwlApplicabilityStatus =
  | "not_evaluated"
  | "potentially_applicable"
  | "partially_applicable"
  | "not_applicable"
  | "insufficient_information"
  | "professional_review_required";

export type OwlConfidenceBand = "low" | "medium" | "high";

export type OwlRiskCategory =
  | "procedural_deadline"
  | "criminal_exposure"
  | "economic_impact"
  | "insufficient_evidence"
  | "conflicting_authority"
  | "sensitive_information"
  | "document_incompleteness"
  | "legal_strategy"
  | "other";

export type OwlRiskSeverity = "low" | "medium" | "high" | "critical";

export type OwlAnalysisId = string;
export type OwlAnalysisVersion = string;
export type OwlGeneratedAt = string;

export interface OwlRelevantFact {
  readonly id: string;
  readonly content: string;
  readonly provenance: OwlEpistemicProvenance;
  readonly verificationStatus?: OwlVerificationLevel;
  readonly sourceReferences?: readonly string[];
}

export interface OwlLegalIssue {
  readonly id: string;
  readonly content: string;
  readonly provenance: OwlEpistemicProvenance;
}

export interface OwlLegalRule {
  readonly id: string;
  readonly content: string;
  readonly provenance: OwlEpistemicProvenance;
  readonly verificationStatus?: OwlVerificationLevel;
}

export interface OwlClaim {
  readonly id: string;
  readonly content: string;
  readonly provenance: OwlEpistemicProvenance;
}

export interface OwlEvidence {
  readonly evidenceId: string;
  readonly sourceType: string;
  readonly authorityLevel: OwlAuthorityLevel;
  readonly verificationStatus: OwlVerificationLevel;
  readonly sourceId: string;
  readonly sourceLabel: string;
  readonly excerpt: string;
  readonly paragraphReference?: string;
  readonly recordSlug?: string;
  readonly sourceUrl?: string;
}

export interface OwlJurisprudenceMatch {
  readonly recordSlug: string;
  readonly caseNumber: string;
  readonly title: string;
  readonly matchType: OwlJurisprudenceMatchType;
  readonly matchedIssues: readonly string[];
  readonly relevanceReason: string;
  readonly verificationStatus: OwlVerificationLevel;
  readonly evidenceIds: readonly string[];
}

export interface OwlRatioAnalysis {
  readonly id: string;
  readonly content: string;
  readonly provenance: OwlEpistemicProvenance;
}

export interface OwlApplicabilityAssessment {
  readonly status: OwlApplicabilityStatus;
  readonly summary: string;
  readonly supportingFactIds: readonly string[];
  readonly supportingRuleIds: readonly string[];
  readonly supportingEvidenceIds: readonly string[];
  readonly counterFactors: readonly string[];
  readonly missingInformation: readonly string[];
  readonly confidenceBand: OwlConfidenceBand;
}

export interface OwlLegalRisk {
  readonly riskId: string;
  readonly category: OwlRiskCategory;
  readonly severity: OwlRiskSeverity;
  readonly summary: string;
  readonly basis: string;
  readonly relatedFactIds: readonly string[];
  readonly relatedEvidenceIds: readonly string[];
  readonly professionalReviewRecommended: boolean;
}

export interface OwlAnalysisLimit {
  readonly id: string;
  readonly content: string;
}

export interface OwlAnalysisWarning {
  readonly code: OwlAnalysisWarningCode;
  readonly message: string;
}

export interface OwlCitation {
  readonly id: string;
  readonly evidenceId: string;
  readonly content: string;
}

export interface OwlVerificationSummary {
  readonly totalVerified: number;
  readonly totalUnverified: number;
  readonly summary: string;
}

export interface OwlNextAction {
  readonly id: string;
  readonly content: string;
}

export interface OwlLegalAnalysisRequest {
  readonly mode: "analyze_raw_text";
  readonly text: string;
  readonly persistence: "ephemeral";
  readonly requestedTier: "free_summary";
  readonly acceptedPrivacyNotice: true;
  readonly acceptedAutomatedAnalysisNotice: true;
  readonly locale: "es-PE";
}

export interface OwlLegalAnalysisResult {
  readonly analysisId: OwlAnalysisId;
  readonly analysisVersion: OwlAnalysisVersion;
  readonly mode: OwlAnalysisMode;
  readonly documentType: string;
  readonly legalArea: string;
  readonly executiveSummary: string;
  readonly relevantFacts: readonly OwlRelevantFact[];
  readonly legalIssues: readonly OwlLegalIssue[];
  readonly rules: readonly OwlLegalRule[];
  readonly claims: readonly OwlClaim[];
  readonly evidence: readonly OwlEvidence[];
  readonly jurisprudenceMatches: readonly OwlJurisprudenceMatch[];
  readonly ratioAnalysis: readonly OwlRatioAnalysis[];
  readonly applicability: readonly OwlApplicabilityAssessment[];
  readonly risks: readonly OwlLegalRisk[];
  readonly limits: readonly OwlAnalysisLimit[];
  readonly warnings: readonly OwlAnalysisWarning[];
  readonly citations: readonly OwlCitation[];
  readonly verificationSummary: OwlVerificationSummary;
  readonly nextActions: readonly OwlNextAction[];
  readonly commercialTier: OwlCommercialTier;
  readonly commercialStatus: OwlCommercialStatus;
  readonly persistenceStatus: OwlPersistenceState;
  readonly generatedAt: OwlGeneratedAt;
}
