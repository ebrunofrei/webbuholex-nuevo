import { z } from "zod";
import { assistantCitationSchema, assistantConfidenceLevelSchema, assistantSourceSchema } from "@/lib/schemas/assistant";

export const jurisprudenceAnalysisRequestSchema = z.object({
  id: z.string().uuid(),
  inputKind: z.enum(["text", "document_reference"]),
  text: z.string().trim().min(50).max(100000).nullable(),
  documentRef: z.string().trim().min(3).max(500).nullable(),
  userCaseSummary: z.string().trim().min(20).max(5000).nullable(),
  privacyConsent: z.literal(true),
}).superRefine((request, context) => {
  if (request.inputKind === "text" && !request.text) context.addIssue({ code: "custom", path: ["text"], message: "El análisis por texto requiere contenido." });
  if (request.inputKind === "document_reference" && !request.documentRef) context.addIssue({ code: "custom", path: ["documentRef"], message: "El análisis documental requiere una referencia segura." });
  if (request.inputKind === "text" && request.documentRef) context.addIssue({ code: "custom", path: ["documentRef"], message: "No mezcle texto y documento en una misma solicitud." });
  if (request.inputKind === "document_reference" && request.text) context.addIssue({ code: "custom", path: ["text"], message: "No mezcle texto y documento en una misma solicitud." });
});

export const jurisprudenceAnalysisResultSchema = z.object({
  requestId: z.string().uuid(),
  identity: z.object({
    court: z.string().trim().min(2).max(300),
    caseNumber: z.string().trim().min(1).max(120),
    decisionDate: z.string().date(),
    matter: z.string().trim().min(2).max(120),
    jurisdiction: z.string().trim().min(2).max(120),
  }),
  background: z.array(z.string().trim().min(3).max(1000)),
  legalIssue: z.string().trim().min(10).max(2000),
  grounds: z.array(z.string().trim().min(3).max(1500)),
  ratioDecidendi: z.array(z.string().trim().min(3).max(1500)),
  obiterDicta: z.array(z.string().trim().min(3).max(1500)),
  applicableRules: z.array(z.string().trim().min(2).max(500)),
  opinions: z.array(z.object({ signedBy: z.string().trim().min(2).max(200).nullable(), type: z.enum(["majority", "concurring", "dissenting"]), summary: z.string().trim().min(10).max(1500) })),
  comparisonWithUserCase: z.array(z.string().trim().min(3).max(1000)),
  applicabilityLimits: z.array(z.string().trim().min(3).max(1000)).min(1),
  sources: z.array(assistantSourceSchema).min(1),
  citations: z.array(assistantCitationSchema),
  confidence: assistantConfidenceLevelSchema,
  unresolvedFields: z.array(z.string().trim().min(2).max(300)),
}).superRefine((result, context) => {
  const verifiedSourceIds = new Set(result.sources.filter((source) => source.verificationStatus === "verified").map((source) => source.id));
  result.citations.forEach((citation, index) => {
    if (!citation.verified || !verifiedSourceIds.has(citation.sourceId)) {
      context.addIssue({ code: "custom", path: ["citations", index], message: "Toda cita debe enlazar una fuente verificada incluida en el resultado." });
    }
  });
});
