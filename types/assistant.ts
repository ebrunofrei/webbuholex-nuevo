import type { TemplateProduct } from "@/types/catalog";
import type { ProfessionalAttentionType } from "@/types/consultation";

export type AssistantConfidenceLevel = "insufficient" | "low" | "medium" | "high";
export type AssistantRiskLevel = "routine" | "sensitive" | "urgent" | "critical";

export interface AssistantSession {
  id: string;
  traceId: string;
  jurisdiction: string | null;
  matter: string | null;
  privacyConsentAt: string | null;
  startedAt: string;
  retentionPolicyVersion: string;
  status: "collecting" | "orienting" | "referred" | "closed";
}

export interface AssistantConsultation {
  id: string;
  sessionId: string;
  summary: string;
  jurisdiction: string;
  matter: string;
  urgencySignals: readonly string[];
  missingInformation: readonly string[];
  containsSensitiveData: boolean;
}

export interface AssistantMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  traceId: string;
}

export interface AssistantSource {
  id: string;
  title: string;
  issuingBody: string;
  sourceUrl: string;
  publishedAt: string | null;
  verifiedAt: string;
  verificationStatus: "verified" | "unverified" | "unavailable";
}

export interface AssistantCitation {
  id: string;
  sourceId: string;
  locator: string;
  proposition: string;
  exactQuote: string | null;
  verified: boolean;
}

export interface AssistantReferral {
  id: string;
  consultationId: string;
  reason: string;
  riskLevel: AssistantRiskLevel;
  recommendedAttention: ProfessionalAttentionType;
  status: "suggested" | "accepted" | "declined";
}

export interface TemplateRecommendation {
  productId: TemplateProduct["id"];
  reason: string;
  limitations: readonly string[];
  requiresProfessionalReview: boolean;
}

export interface AssistantResult {
  sessionId: string;
  orientationSummary: string;
  knownFacts: readonly string[];
  missingInformation: readonly string[];
  nextSteps: readonly string[];
  warnings: readonly string[];
  sources: readonly AssistantSource[];
  citations: readonly AssistantCitation[];
  confidence: AssistantConfidenceLevel;
  risk: AssistantRiskLevel;
  referral: AssistantReferral | null;
  templateRecommendations: readonly TemplateRecommendation[];
}
