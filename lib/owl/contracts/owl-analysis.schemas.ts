import { z } from "zod";
import type {
  OwlLegalAnalysisRequest,
  OwlLegalAnalysisResult,
  OwlExecutionState
} from "@/types/owl/owl-analysis";

const owlEpistemicProvenanceSchema = z.enum([
  "extracted_from_input",
  "mentioned_in_input",
  "matched_in_verified_source",
  "model_inference",
  "unverified_inference"
]);

const owlVerificationLevelSchema = z.enum([
  "verified",
  "partially_verified",
  "unverified",
  "not_applicable"
]);

const owlAuthorityLevelSchema = z.enum([
  "official_binding",
  "official_persuasive",
  "official_non_binding",
  "editorial",
  "user_provided",
  "unknown"
]);

const owlJurisprudenceMatchTypeSchema = z.enum([
  "thematic_similarity",
  "potentially_applicable_rule",
  "binding_precedent",
  "persuasive_criterion",
  "comparison_reference",
  "not_automatically_transferable"
]);

const owlApplicabilityStatusSchema = z.enum([
  "not_evaluated",
  "potentially_applicable",
  "partially_applicable",
  "not_applicable",
  "insufficient_information",
  "professional_review_required"
]);

const owlConfidenceBandSchema = z.enum(["low", "medium", "high"]);

const owlRiskCategorySchema = z.enum([
  "procedural_deadline",
  "criminal_exposure",
  "economic_impact",
  "insufficient_evidence",
  "conflicting_authority",
  "sensitive_information",
  "document_incompleteness",
  "legal_strategy",
  "other"
]);

const owlRiskSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

const owlAnalysisWarningCodeSchema = z.enum([
  "automated_analysis",
  "not_legal_advice",
  "limited_sources",
  "unverified_rule",
  "insufficient_context",
  "sensitive_content_detected",
  "possible_prompt_injection",
  "professional_review_recommended",
  "professional_review_priority",
  "truncated_output"
]);

const owlPublicErrorCodeSchema = z.enum([
  "invalid_input",
  "text_too_short",
  "text_too_long",
  "privacy_notice_required",
  "automated_analysis_notice_required",
  "unsupported_mode",
  "validation_failed",
  "analysis_unavailable",
  "analysis_failed",
  "cancelled"
]);

export const owlRelevantFactSchema = z.object({
  id: z.string(),
  content: z.string(),
  provenance: owlEpistemicProvenanceSchema,
  verificationStatus: owlVerificationLevelSchema.optional(),
  sourceReferences: z.array(z.string()).optional()
}).strict();

export const owlLegalIssueSchema = z.object({
  id: z.string(),
  content: z.string(),
  provenance: owlEpistemicProvenanceSchema
}).strict();

export const owlLegalRuleSchema = z.object({
  id: z.string(),
  content: z.string(),
  provenance: owlEpistemicProvenanceSchema,
  verificationStatus: owlVerificationLevelSchema.optional()
}).strict();

export const owlClaimSchema = z.object({
  id: z.string(),
  content: z.string(),
  provenance: owlEpistemicProvenanceSchema
}).strict();

export const owlEvidenceSchema = z.object({
  evidenceId: z.string(),
  sourceType: z.string(),
  authorityLevel: owlAuthorityLevelSchema,
  verificationStatus: owlVerificationLevelSchema,
  sourceId: z.string(),
  sourceLabel: z.string(),
  excerpt: z.string().min(1).max(2000),
  paragraphReference: z.string().optional(),
  recordSlug: z.string().optional(),
  sourceUrl: z.string().url().refine(u => u.startsWith('http'), "Debe ser HTTP(s)").optional()
}).strict();

export const owlJurisprudenceMatchSchema = z.object({
  recordSlug: z.string(),
  caseNumber: z.string(),
  title: z.string(),
  matchType: owlJurisprudenceMatchTypeSchema,
  matchedIssues: z.array(z.string()),
  relevanceReason: z.string(),
  verificationStatus: owlVerificationLevelSchema,
  evidenceIds: z.array(z.string())
}).strict();

export const owlRatioAnalysisSchema = z.object({
  id: z.string(),
  content: z.string(),
  provenance: owlEpistemicProvenanceSchema
}).strict();

export const owlApplicabilityAssessmentSchema = z.object({
  status: owlApplicabilityStatusSchema,
  summary: z.string(),
  supportingFactIds: z.array(z.string()),
  supportingRuleIds: z.array(z.string()),
  supportingEvidenceIds: z.array(z.string()),
  counterFactors: z.array(z.string()),
  missingInformation: z.array(z.string()),
  confidenceBand: owlConfidenceBandSchema
}).strict();

export const owlLegalRiskSchema = z.object({
  riskId: z.string(),
  category: owlRiskCategorySchema,
  severity: owlRiskSeveritySchema,
  summary: z.string(),
  basis: z.string(),
  relatedFactIds: z.array(z.string()),
  relatedEvidenceIds: z.array(z.string()),
  professionalReviewRecommended: z.boolean()
}).strict();

export const owlAnalysisLimitSchema = z.object({
  id: z.string(),
  content: z.string()
}).strict();

export const owlAnalysisWarningSchema = z.object({
  code: owlAnalysisWarningCodeSchema,
  message: z.string()
}).strict();

export const owlCitationSchema = z.object({
  id: z.string(),
  evidenceId: z.string(),
  content: z.string()
}).strict();

export const owlVerificationSummarySchema = z.object({
  totalVerified: z.number(),
  totalUnverified: z.number(),
  summary: z.string()
}).strict();

export const owlNextActionSchema = z.object({
  id: z.string(),
  content: z.string()
}).strict();

export const owlLegalAnalysisRequestSchema = z.object({
  mode: z.literal("analyze_raw_text"),
  text: z.string().trim().min(50).max(12000),
  persistence: z.literal("ephemeral"),
  requestedTier: z.literal("free_summary"),
  acceptedPrivacyNotice: z.literal(true),
  acceptedAutomatedAnalysisNotice: z.literal(true),
  locale: z.literal("es-PE")
}).strict().transform((v): OwlLegalAnalysisRequest => v);

export const owlLegalAnalysisResultSchema = z.object({
  analysisId: z.string().min(1).max(255),
  analysisVersion: z.string().regex(/^owl-analysis-v[0-9]+$/),
  mode: z.enum([
    "analyze_raw_text",
    "analyze_jurisprudence",
    "ask_about_jurisprudence",
    "compare_jurisprudence",
    "evaluate_applicability"
  ]),
  documentType: z.string(),
  legalArea: z.string(),
  executiveSummary: z.string(),
  relevantFacts: z.array(owlRelevantFactSchema),
  legalIssues: z.array(owlLegalIssueSchema),
  rules: z.array(owlLegalRuleSchema),
  claims: z.array(owlClaimSchema),
  evidence: z.array(owlEvidenceSchema),
  jurisprudenceMatches: z.array(owlJurisprudenceMatchSchema),
  ratioAnalysis: z.array(owlRatioAnalysisSchema),
  applicability: z.array(owlApplicabilityAssessmentSchema),
  risks: z.array(owlLegalRiskSchema),
  limits: z.array(owlAnalysisLimitSchema),
  warnings: z.array(owlAnalysisWarningSchema),
  citations: z.array(owlCitationSchema),
  verificationSummary: owlVerificationSummarySchema,
  nextActions: z.array(owlNextActionSchema),
  commercialTier: z.enum([
    "free_summary",
    "specialized_analysis",
    "professional_review"
  ]),
  commercialStatus: z.enum([
    "free_eligible",
    "free_consumed",
    "credit_required",
    "credit_reserved",
    "credit_confirmed",
    "credit_released",
    "professional_review_offered"
  ]),
  persistenceStatus: z.enum([
    "ephemeral",
    "private_saved",
    "retention_pending",
    "deletion_requested",
    "deleted"
  ]),
  generatedAt: z.string().datetime()
}).strict().transform((v): OwlLegalAnalysisResult => v as unknown as OwlLegalAnalysisResult);

export const owlExecutionStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created") }).strict(),
  z.object({ status: z.literal("validating") }).strict(),
  z.object({ status: z.literal("rejected"), errorCode: owlPublicErrorCodeSchema, message: z.string() }).strict(),
  z.object({ status: z.literal("ready") }).strict(),
  z.object({ status: z.literal("processing"), phase: z.enum(["classifying", "retrieving", "reasoning", "guarding"]) }).strict(),
  z.object({ status: z.literal("completed"), result: owlLegalAnalysisResultSchema }).strict(),
  z.object({ status: z.literal("completed_with_warnings"), result: owlLegalAnalysisResultSchema, warnings: z.array(owlAnalysisWarningSchema) }).strict(),
  z.object({ status: z.literal("failed"), errorCode: owlPublicErrorCodeSchema, message: z.string() }).strict(),
  z.object({ status: z.literal("cancelled") }).strict()
]).transform((v): OwlExecutionState => v as unknown as OwlExecutionState);

export interface ReferentialConsistencyResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateReferentialConsistency(result: OwlLegalAnalysisResult): ReferentialConsistencyResult {
  const errors: string[] = [];
  const evidenceIds = new Set(result.evidence.map(e => e.evidenceId));
  const factIds = new Set(result.relevantFacts.map(f => f.id));
  const ruleIds = new Set(result.rules.map(r => r.id));

  for (const citation of result.citations) {
    if (!evidenceIds.has(citation.evidenceId)) {
      errors.push(`Citation missing evidenceId: ${citation.evidenceId}`);
    }
  }

  for (const match of result.jurisprudenceMatches) {
    for (const evId of match.evidenceIds) {
      if (!evidenceIds.has(evId)) {
        errors.push(`JurisprudenceMatch missing evidenceId: ${evId}`);
      }
    }
  }

  for (const app of result.applicability) {
    for (const fId of app.supportingFactIds) {
      if (!factIds.has(fId)) {
        errors.push(`Applicability missing supportingFactId: ${fId}`);
      }
    }
    for (const rId of app.supportingRuleIds) {
      if (!ruleIds.has(rId)) {
        errors.push(`Applicability missing supportingRuleId: ${rId}`);
      }
    }
    for (const evId of app.supportingEvidenceIds) {
      if (!evidenceIds.has(evId)) {
        errors.push(`Applicability missing supportingEvidenceId: ${evId}`);
      }
    }
  }

  for (const risk of result.risks) {
    for (const fId of risk.relatedFactIds) {
      if (!factIds.has(fId)) {
        errors.push(`Risk missing relatedFactId: ${fId}`);
      }
    }
    for (const evId of risk.relatedEvidenceIds) {
      if (!evidenceIds.has(evId)) {
        errors.push(`Risk missing relatedEvidenceId: ${evId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
