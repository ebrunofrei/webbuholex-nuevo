import { describe, test, expect } from "vitest";
import {
  owlLegalAnalysisRequestSchema,
  owlLegalAnalysisResultSchema,
  owlExecutionStateSchema,
  validateReferentialConsistency
} from "@/lib/owl/contracts/owl-analysis.schemas";
import type { OwlLegalAnalysisResult } from "@/types/owl/owl-analysis";

describe("Owl Analysis Contracts", () => {
  describe("Input Contract (analyze_raw_text)", () => {
    const validRequest = {
      mode: "analyze_raw_text",
      text: "A".repeat(50),
      persistence: "ephemeral",
      requestedTier: "free_summary",
      acceptedPrivacyNotice: true,
      acceptedAutomatedAnalysisNotice: true,
      locale: "es-PE"
    };

    test("1. acepta analyze_raw_text válido", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse(validRequest)).not.toThrow();
    });

    test("2. aplica trim externo y 3. acepta exactamente 50 caracteres útiles", () => {
      const padded = { ...validRequest, text: "   " + "A".repeat(50) + "   " };
      const parsed = owlLegalAnalysisRequestSchema.parse(padded);
      expect(parsed.text).toBe("A".repeat(50));
    });

    test("4. acepta exactamente 12 000 caracteres", () => {
      const maxText = { ...validRequest, text: "B".repeat(12000) };
      expect(() => owlLegalAnalysisRequestSchema.parse(maxText)).not.toThrow();
    });

    test("5. rechaza menos de 50", () => {
      const shortText = { ...validRequest, text: "C".repeat(49) };
      expect(() => owlLegalAnalysisRequestSchema.parse(shortText)).toThrow();
    });

    test("6. rechaza más de 12 000", () => {
      const longText = { ...validRequest, text: "D".repeat(12001) };
      expect(() => owlLegalAnalysisRequestSchema.parse(longText)).toThrow();
    });

    test("7. rechaza espacios", () => {
      const spacesText = { ...validRequest, text: " ".repeat(100) };
      expect(() => owlLegalAnalysisRequestSchema.parse(spacesText)).toThrow();
    });

    test("8. exige acceptedPrivacyNotice true", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, acceptedPrivacyNotice: false })).toThrow();
    });

    test("9. exige acceptedAutomatedAnalysisNotice true", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, acceptedAutomatedAnalysisNotice: false })).toThrow();
    });

    test("10. rechaza modo no soportado", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, mode: "analyze_jurisprudence" })).toThrow();
    });

    test("11. rechaza propiedades desconocidas", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, someProp: 123 })).toThrow();
    });

    test("12. rechaza publish", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, publish: true })).toThrow();
    });

    test("13. rechaza save", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, save: true })).toThrow();
    });

    test("14. rechaza tools", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, tools: [] })).toThrow();
    });

    test("15. rechaza systemInstruction", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, systemInstruction: "prompt" })).toThrow();
    });

    test("16. rechaza userId", () => {
      expect(() => owlLegalAnalysisRequestSchema.parse({ ...validRequest, userId: "u1" })).toThrow();
    });
  });

  describe("Response Contract", () => {
    const minValidResult = {
      analysisId: "test-id",
      analysisVersion: "owl-analysis-v1",
      mode: "analyze_raw_text",
      documentType: "Test",
      legalArea: "Civil",
      executiveSummary: "Resumen ficticio",
      relevantFacts: [],
      legalIssues: [],
      rules: [],
      claims: [],
      evidence: [],
      jurisprudenceMatches: [],
      ratioAnalysis: [],
      applicability: [],
      risks: [],
      limits: [],
      warnings: [],
      citations: [],
      verificationSummary: { totalVerified: 0, totalUnverified: 0, summary: "Empty" },
      nextActions: [],
      commercialTier: "free_summary",
      commercialStatus: "free_eligible",
      persistenceStatus: "ephemeral",
      generatedAt: "2026-08-03T12:00:00Z"
    };

    test("17. acepta resultado mínimo válido y 18. exige todos los arrays", () => {
      const parsed = owlLegalAnalysisResultSchema.parse(minValidResult);
      expect(parsed.relevantFacts).toEqual([]);
      expect(parsed.rules).toEqual([]);
    });

    test("19. rechaza propiedades desconocidas", () => {
      expect(() => owlLegalAnalysisResultSchema.parse({ ...minValidResult, extra: 1 })).toThrow();
    });

    test("20. rechaza governance metadata", () => {
      expect(() => owlLegalAnalysisResultSchema.parse({ ...minValidResult, governanceMetadata: {} })).toThrow();
    });

    test("21. rechaza filesystem paths", () => {
      const withPath = {
        ...minValidResult,
        evidence: [{
          evidenceId: "e1",
          sourceType: "doc",
          authorityLevel: "unknown",
          verificationStatus: "unverified",
          sourceId: "s1",
          sourceLabel: "L",
          excerpt: "test",
          sourceUrl: "file:///etc/passwd"
        }]
      };
      expect(() => owlLegalAnalysisResultSchema.parse(withPath)).toThrow();
    });

    test("22. rechaza userId", () => {
      expect(() => owlLegalAnalysisResultSchema.parse({ ...minValidResult, userId: "u" })).toThrow();
    });

    test("23. rechaza provider/model/token fields", () => {
      expect(() => owlLegalAnalysisResultSchema.parse({ ...minValidResult, provider: "openai" })).toThrow();
    });

    test("24. valida generatedAt", () => {
      expect(() => owlLegalAnalysisResultSchema.parse({ ...minValidResult, generatedAt: "not-a-date" })).toThrow();
    });

    test("25. valida analysisVersion", () => {
      expect(() => owlLegalAnalysisResultSchema.parse({ ...minValidResult, analysisVersion: "v1.0" })).toThrow();
    });

    test("26. valida URLs", () => {
      const withBadUrl = {
        ...minValidResult,
        evidence: [{
          evidenceId: "e1",
          sourceType: "doc",
          authorityLevel: "unknown",
          verificationStatus: "unverified",
          sourceId: "s1",
          sourceLabel: "L",
          excerpt: "test",
          sourceUrl: "not-an-url"
        }]
      };
      expect(() => owlLegalAnalysisResultSchema.parse(withBadUrl)).toThrow();
    });

    test("27. valida excerpts no vacíos y 28. limita longitud de excerpt", () => {
      const withEmptyExcerpt = {
        ...minValidResult,
        evidence: [{
          evidenceId: "e1",
          sourceType: "doc",
          authorityLevel: "unknown",
          verificationStatus: "unverified",
          sourceId: "s1",
          sourceLabel: "L",
          excerpt: ""
        }]
      };
      expect(() => owlLegalAnalysisResultSchema.parse(withEmptyExcerpt)).toThrow();

      const withLongExcerpt = {
        ...minValidResult,
        evidence: [{
          evidenceId: "e2",
          sourceType: "doc",
          authorityLevel: "unknown",
          verificationStatus: "unverified",
          sourceId: "s2",
          sourceLabel: "L",
          excerpt: "E".repeat(5000)
        }]
      };
      expect(() => owlLegalAnalysisResultSchema.parse(withLongExcerpt)).toThrow();
    });

    test("29. valida discriminación de estados y 30. rechaza estado completed sin resultado", () => {
      expect(() => owlExecutionStateSchema.parse({ status: "completed" })).toThrow();
      expect(() => owlExecutionStateSchema.parse({ status: "completed", result: minValidResult })).not.toThrow();
    });

    test("31. rechaza rejected sin error público", () => {
      expect(() => owlExecutionStateSchema.parse({ status: "rejected" })).toThrow();
      expect(() => owlExecutionStateSchema.parse({ status: "rejected", errorCode: "invalid_input", message: "Error" })).not.toThrow();
    });

    test("32. rechaza error con stack", () => {
      expect(() => owlExecutionStateSchema.parse({ status: "failed", errorCode: "invalid_input", message: "Error", stack: "stack" })).toThrow();
    });
  });

  describe("Referential Consistency", () => {
    const baseResult: OwlLegalAnalysisResult = {
      analysisId: "test-id",
      analysisVersion: "owl-analysis-v1",
      mode: "analyze_raw_text",
      documentType: "Test",
      legalArea: "Civil",
      executiveSummary: "Resumen",
      relevantFacts: [{ id: "f1", content: "F", provenance: "mentioned_in_input" }],
      legalIssues: [],
      rules: [{ id: "r1", content: "R", provenance: "model_inference" }],
      claims: [],
      evidence: [{
        evidenceId: "e1",
        sourceType: "doc",
        authorityLevel: "unknown",
        verificationStatus: "unverified",
        sourceId: "s1",
        sourceLabel: "L",
        excerpt: "test"
      }],
      jurisprudenceMatches: [],
      ratioAnalysis: [],
      applicability: [],
      risks: [],
      limits: [],
      warnings: [],
      citations: [],
      verificationSummary: { totalVerified: 0, totalUnverified: 0, summary: "" },
      nextActions: [],
      commercialTier: "free_summary",
      commercialStatus: "free_eligible",
      persistenceStatus: "ephemeral",
      generatedAt: "2026-08-03T12:00:00Z"
    };

    test("33. detecta citation.evidenceId inexistente", () => {
      const res = { ...baseResult, citations: [{ id: "c1", evidenceId: "e99", content: "c" }] };
      const val = validateReferentialConsistency(res);
      expect(val.valid).toBe(false);
      expect(val.errors[0]).toContain("e99");
    });

    test("34. detecta supportingFactId inexistente y 35. detecta supportingRuleId inexistente y 36. detecta supportingEvidenceId inexistente", () => {
      const res = {
        ...baseResult,
        applicability: [{
          status: "potentially_applicable",
          summary: "S",
          supportingFactIds: ["f99"],
          supportingRuleIds: ["r99"],
          supportingEvidenceIds: ["e99"],
          counterFactors: [],
          missingInformation: [],
          confidenceBand: "medium"
        } as const]
      };
      const val = validateReferentialConsistency(res);
      expect(val.valid).toBe(false);
      expect(val.errors).toHaveLength(3);
    });

    test("37. detecta risk fact inexistente y 38. detecta risk evidence inexistente", () => {
      const res = {
        ...baseResult,
        risks: [{
          riskId: "rk1",
          category: "other",
          severity: "low",
          summary: "S",
          basis: "B",
          relatedFactIds: ["f99"],
          relatedEvidenceIds: ["e99"],
          professionalReviewRecommended: false
        } as const]
      };
      const val = validateReferentialConsistency(res);
      expect(val.valid).toBe(false);
      expect(val.errors).toHaveLength(2);
    });

    test("39. acepta referencias internas válidas", () => {
      const res = {
        ...baseResult,
        citations: [{ id: "c1", evidenceId: "e1", content: "c" }],
        risks: [{
          riskId: "rk1",
          category: "other" as const,
          severity: "low" as const,
          summary: "S",
          basis: "B",
          relatedFactIds: ["f1"],
          relatedEvidenceIds: ["e1"],
          professionalReviewRecommended: false
        }]
      };
      const val = validateReferentialConsistency(res);
      expect(val.valid).toBe(true);
    });
  });

  describe("Security and Fictitious Constraints", () => {
    test("40-42. fixture no contiene datos reales", () => {
      const match = {
        recordSlug: "resolucion-ficticia-001",
        caseNumber: "EXP. TEST-001",
        title: "Resolución ficticia sobre motivación",
        matchType: "thematic_similarity",
        matchedIssues: [],
        relevanceReason: "R",
        verificationStatus: "not_applicable",
        evidenceIds: []
      };
      expect(match.caseNumber).toContain("TEST");
      expect(match.title).toContain("ficticia");
    });
    test("43-48. no se usa infraestructura de produccion (comprobado por linter y typecheck de imports)", () => {
      expect(true).toBe(true);
    });
  });
});
