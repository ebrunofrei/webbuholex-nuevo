import { describe, expect, it } from "vitest";
import { assistantResultSchema, assistantSessionSchema } from "@/lib/schemas/assistant";
import { jurisprudenceAnalysisResultSchema } from "@/lib/schemas/jurisprudence-analysis";

const sourceId = "33333333-3333-4333-8333-333333333333";
const citation = { id: "44444444-4444-4444-8444-444444444444", sourceId, locator: "párrafo 1", proposition: "Proposición verificada de prueba", exactQuote: null, verified: true } as const;
const source = { id: sourceId, title: "Fuente verificable de prueba", issuingBody: "Órgano de prueba", sourceUrl: "https://example.test/source", publishedAt: "2026-01-01", verifiedAt: "2026-07-27T12:00:00.000Z", verificationStatus: "verified" } as const;

describe("contratos del asistente", () => {
  it("registra consentimiento, traza y política de retención por sesión", () => {
    expect(assistantSessionSchema.safeParse({ id: "55555555-5555-4555-8555-555555555555", traceId: "66666666-6666-4666-8666-666666666666", jurisdiction: "Perú", matter: "Civil", privacyConsentAt: "2026-07-27T12:00:00.000Z", startedAt: "2026-07-27T12:00:00.000Z", retentionPolicyVersion: "draft-1", status: "collecting" }).success).toBe(true);
  });

  it("rechaza citas no verificadas en resultados", () => {
    const result = assistantResultSchema.safeParse({ sessionId: "55555555-5555-4555-8555-555555555555", orientationSummary: "Resumen de orientación suficientemente detallado para validar.", knownFacts: [], missingInformation: [], nextSteps: ["Solicitar evaluación profesional"], warnings: ["No sustituye asesoría"], sources: [source], citations: [{ ...citation, verified: false }], confidence: "low", risk: "routine", referral: null, templateRecommendations: [] });
    expect(result.success).toBe(false);
  });

  it("exige que cada cita jurisprudencial pertenezca a una fuente verificada", () => {
    const baseResult = { requestId: "77777777-7777-4777-8777-777777777777", identity: { court: "Órgano de prueba", caseNumber: "EXP-TEST", decisionDate: "2026-01-01", matter: "Civil", jurisdiction: "Perú" }, background: [], legalIssue: "Problema jurídico de prueba", grounds: [], ratioDecidendi: [], obiterDicta: [], applicableRules: [], opinions: [], comparisonWithUserCase: [], applicabilityLimits: ["No usar fuera de esta prueba"], sources: [source], citations: [citation], confidence: "medium", unresolvedFields: [] } as const;
    expect(jurisprudenceAnalysisResultSchema.safeParse(baseResult).success).toBe(true);
    expect(jurisprudenceAnalysisResultSchema.safeParse({ ...baseResult, sources: [{ ...source, verificationStatus: "unverified" }] }).success).toBe(false);
  });
});
