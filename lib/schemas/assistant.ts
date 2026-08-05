import { z } from "zod";
import { productIdentifierSchema } from "@/lib/schemas/catalog";

export const assistantConfidenceLevelSchema = z.enum(["insufficient", "low", "medium", "high"]);
export const assistantRiskLevelSchema = z.enum(["routine", "sensitive", "urgent", "critical"]);
export const assistantSourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(300),
  issuingBody: z.string().trim().min(2).max(200),
  sourceUrl: z.string().url(),
  publishedAt: z.string().date().nullable(),
  verifiedAt: z.string().datetime(),
  verificationStatus: z.enum(["verified", "unverified", "unavailable"]),
});
export const assistantCitationSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  locator: z.string().trim().min(1).max(200),
  proposition: z.string().trim().min(5).max(1000),
  exactQuote: z.string().trim().max(2000).nullable(),
  verified: z.boolean(),
});
export const assistantSessionSchema = z.object({
  id: z.string().uuid(),
  traceId: z.string().uuid(),
  jurisdiction: z.string().trim().min(2).max(120).nullable(),
  matter: z.string().trim().min(2).max(120).nullable(),
  privacyConsentAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime(),
  retentionPolicyVersion: z.string().trim().min(1).max(40),
  status: z.enum(["collecting", "orienting", "referred", "closed"]),
});
export const assistantConsultationSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  summary: z.string().trim().min(20).max(4000),
  jurisdiction: z.string().trim().min(2).max(120),
  matter: z.string().trim().min(2).max(120),
  urgencySignals: z.array(z.string().trim().min(2).max(300)),
  missingInformation: z.array(z.string().trim().min(2).max(300)),
  containsSensitiveData: z.boolean(),
});
export const assistantMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1).max(6000),
  createdAt: z.string().datetime(),
  traceId: z.string().uuid(),
});
export const assistantReferralSchema = z.object({
  id: z.string().uuid(),
  consultationId: z.string().uuid(),
  reason: z.string().trim().min(10).max(1000),
  riskLevel: assistantRiskLevelSchema,
  recommendedAttention: z.enum(["legal_orientation", "document_review", "drafting", "case_file_analysis", "video_consultation", "representation_or_defense"]),
  status: z.enum(["suggested", "accepted", "declined"]),
});
export const templateRecommendationSchema = z.object({
  productId: productIdentifierSchema,
  reason: z.string().trim().min(10).max(1000),
  limitations: z.array(z.string().trim().min(2).max(500)).min(1),
  requiresProfessionalReview: z.boolean(),
});
export const assistantResultSchema = z.object({
  sessionId: z.string().uuid(),
  orientationSummary: z.string().trim().min(20).max(4000),
  knownFacts: z.array(z.string().trim().min(2).max(500)),
  missingInformation: z.array(z.string().trim().min(2).max(500)),
  nextSteps: z.array(z.string().trim().min(2).max(500)).min(1),
  warnings: z.array(z.string().trim().min(2).max(500)).min(1),
  sources: z.array(assistantSourceSchema),
  citations: z.array(assistantCitationSchema),
  confidence: assistantConfidenceLevelSchema,
  risk: assistantRiskLevelSchema,
  referral: assistantReferralSchema.nullable(),
  templateRecommendations: z.array(templateRecommendationSchema),
}).superRefine((result, context) => {
  const verifiedSourceIds = new Set(result.sources.filter((source) => source.verificationStatus === "verified").map((source) => source.id));
  result.citations.forEach((citation, index) => {
    if (!citation.verified || !verifiedSourceIds.has(citation.sourceId)) context.addIssue({ code: "custom", path: ["citations", index], message: "Una cita debe enlazar una fuente verificada incluida en el resultado." });
  });
});

export const assistantInputSchema = z.object({
  message: z.string().trim().min(10).max(3000),
  privacyConsent: z.literal(true),
  containsSensitiveData: z.boolean(),
});

export type AssistantInput = z.infer<typeof assistantInputSchema>;
