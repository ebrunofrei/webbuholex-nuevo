import { describe, it, expect, vi, beforeEach } from "vitest";
import { JurisprudenceInterpretationOrchestrator } from "../../lib/domain/services/jurisprudence-interpretation-orchestrator";
import type { HermesProviderPort } from "../../lib/hermes/contracts/hermes-provider-port";
import type { JurisprudenceInterpretationSourcePort, JurisprudenceInterpretationSource } from "../../lib/domain/repositories/jurisprudence-interpretation-source-port";
import type { HermesProviderOutcome } from "../../lib/hermes/contracts/hermes-envelope";

class MockProvider implements HermesProviderPort {
  async generateStructuredOutput(): Promise<HermesProviderOutcome> {
    return { ok: false, error: { code: "unknown_provider_failure", isRetryable: false } };
  }
}
class MockRepo implements JurisprudenceInterpretationSourcePort {
  async findById(): Promise<JurisprudenceInterpretationSource | null> { return null; }
}

describe("Jurisprudence MVP B1 Orchestrator", () => {
  let mockProvider: MockProvider;
  let mockRepo: MockRepo;
  let orchestrator: JurisprudenceInterpretationOrchestrator;

  beforeEach(() => {
    mockProvider = new MockProvider();
    mockRepo = new MockRepo();
    orchestrator = new JurisprudenceInterpretationOrchestrator({
      hermesProvider: mockProvider,
      jurisprudenceRepository: mockRepo
    });
  });

  const baseSource: JurisprudenceInterpretationSource = {
    recordId: "123", recordVersion: 1, caseNumber: "c1", resolutionNumber: "r1", institutionName: "inst", issuingBody: "body", issuedAt: "2024", fullText: "canonical text."
  };

  it("missing record -> record_not_found", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue(null);
    const providerSpy = vi.spyOn(mockProvider, "generateStructuredOutput");
    const res = await orchestrator.interpret("123", 1);
    expect(res).toEqual({ ok: false, code: "record_not_found" });
    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("uses canonical server text, mismatch version fails", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue(baseSource);
    const providerSpy = vi.spyOn(mockProvider, "generateStructuredOutput");

    const res = await orchestrator.interpret("123", 2);
    expect(res).toEqual({ ok: false, code: "record_version_mismatch" });
    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("oversized source fails safely without silent truncation", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: "a".repeat(100001) });
    const providerSpy = vi.spyOn(mockProvider, "generateStructuredOutput");

    const res = await orchestrator.interpret("123", 1);
    expect(res).toEqual({ ok: false, code: "source_too_large" });
    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("grounding check fails on fabricated top-level citation", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: "Real source." });
    vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({ ok: true, payload: {
      summary: "sum", legalMatter: "matter", legalIssues: [], keyCriteria: [], scope: "scope", limitations: "limitations", citations: [{ quote: "Fake source", paragraphReference: null, pageReference: null }], verificationStatus: "machine_generated_unverified", ratioDecidendi: { status: "not_explicit", text: null, support: [] }, obiterDicta: [], citedNorms: [], citedPrecedents: []
    }});

    const res = await orchestrator.interpret("123", 1);
    expect(res).toEqual({ ok: false, code: "grounding_failed" });
  });

  it("grounding check passes on valid ratio support", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: "Real source with specific quote." });
    vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({ ok: true, payload: {
      summary: "sum", legalMatter: "matter", legalIssues: [], keyCriteria: [], scope: "scope", limitations: "limitations", citations: [], verificationStatus: "machine_generated_unverified", ratioDecidendi: { status: "identified", text: "text", support: [{ quote: "specific quote", paragraphReference: null, pageReference: null }] }, obiterDicta: [], citedNorms: [], citedPrecedents: []
    }});

    const res = await orchestrator.interpret("123", 1);
    expect(res.ok).toBe(true);
  });

  describe("Grounding Invariant Cases (Section 12)", () => {
    const fullText = "El Tribunal Administrativo Ficticio de Resolucion resuelve que todo acto debe ser motivado.";

    function makePayload(quote: string) {
      return {
        summary: "sum",
        legalMatter: "matter",
        legalIssues: [],
        keyCriteria: [],
        scope: "scope",
        limitations: "limitations",
        citations: [{ quote, paragraphReference: null, pageReference: null }],
        verificationStatus: "machine_generated_unverified" as const,
        ratioDecidendi: { status: "not_explicit" as const, text: null, support: [] },
        obiterDicta: [],
        citedNorms: [],
        citedPrecedents: []
      };
    }

    it("CASO 1: exact quote -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("todo acto debe ser motivado")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    it("CASO 2: whitespace and line-break differences admitted by normalizeText -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("todo   acto\n  debe\tser   motivado")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    it("CASO 3: paraphrased quote -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("cualquier acto tiene que estar motivado")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    it("CASO 4: added word -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("todo acto administrativo debe ser motivado")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    it("CASO 5: omitted word -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("todo acto motivado")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    it("CASO 6: altered punctuation -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("todo acto, debe ser motivado.")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    it("CASO 7: altered capitalization -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePayload("TODO ACTO DEBE SER MOTIVADO")
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });
  });

  describe("Legal Reference Semantics vs Strict Quote Grounding (HERMES-PROD-A1.13)", () => {
    const referenceFullText = "Este Tribunal recuerda que conforme al artículo 139 inciso 5 de la Constitución Política del Perú y al artículo 3 de la Ley N.° 27444, todo acto administrativo debe ser motivado. Asimismo, en la Casación N.° 1234-2024 Lima se estableció regla vinculante.";

    function makeNormPayload(reference: string, quotes: string[]) {
      return {
        summary: "sum",
        legalMatter: "matter",
        legalIssues: [],
        keyCriteria: [],
        scope: "scope",
        limitations: "limitations",
        citations: [],
        verificationStatus: "machine_generated_unverified" as const,
        ratioDecidendi: { status: "not_explicit" as const, text: null, support: [] },
        obiterDicta: [],
        citedNorms: [
          {
            reference,
            support: quotes.map((quote) => ({ quote, paragraphReference: null, pageReference: null }))
          }
        ],
        citedPrecedents: []
      };
    }

    function makePrecedentPayload(reference: string, quotes: string[]) {
      return {
        summary: "sum",
        legalMatter: "matter",
        legalIssues: [],
        keyCriteria: [],
        scope: "scope",
        limitations: "limitations",
        citations: [],
        verificationStatus: "machine_generated_unverified" as const,
        ratioDecidendi: { status: "not_explicit" as const, text: null, support: [] },
        obiterDicta: [],
        citedNorms: [],
        citedPrecedents: [
          {
            reference,
            support: quotes.map((quote) => ({ quote, paragraphReference: null, pageReference: null }))
          }
        ]
      };
    }

    // CASE 1: reference exacta + exact support -> PASS
    it("CASE 1: reference exacta + exact support -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "artículo 139 inciso 5 de la Constitución Política del Perú",
          ["artículo 139 inciso 5 de la Constitución Política del Perú"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    // CASE 2: reference cambia solo capitalización -> PASS
    it("CASE 2: reference cambia solo capitalización ('Artículo 139...') con support exacto -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Artículo 139 inciso 5 de la Constitución Política del Perú",
          ["artículo 139 inciso 5 de la Constitución Política del Perú"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    // CASE 3: reference usa variante tipográfica ("N° 27444") con support exacto ("N.° 27444") -> PASS
    it("CASE 3: reference usa variante tipográfica ('N° 27444') con support exacto -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Ley N° 27444",
          ["Ley N.° 27444"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    // CASE 4: reference usa denominación canónica/abreviada razonable con support exacto -> PASS
    it("CASE 4: reference usa denominación canónica pero support contiene literalmente la norma -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "TUO de la Ley del Procedimiento Administrativo General - Ley 27444",
          ["artículo 3 de la Ley N.° 27444"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    // CASE 5: reference no literal + support vacío -> FAIL (grounding_failed)
    it("CASE 5: reference no literal + support vacío -> FAIL (grounding_failed)", async () => {
      const payload = makeNormPayload(
        "Artículo 139 inciso 5 de la Constitución",
        []
      );

      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(false);
    });

    // CASE 6: reference no literal + support parafraseado -> FAIL (grounding_failed)
    it("CASE 6: reference no literal + support parafraseado -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Artículo 139 inciso 5",
          ["la constitución exige fundamentar los actos jurídicos"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 7: reference inventada + support vacío -> FAIL
    it("CASE 7: reference inventada + support vacío -> FAIL", async () => {
      const payload = makeNormPayload(
        "Ley de Procedimientos Galácticos 99999",
        []
      );

      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(false);
    });

    // CASE 8: reference inventada + support quote que NO existe -> FAIL (grounding_failed)
    it("CASE 8: reference inventada + support quote inexistente -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Ley de Procedimientos Galácticos 99999",
          ["texto inventado que no está en la fuente"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 9: citedPrecedents reference no literal pero support exacto -> PASS
    it("CASE 9: citedPrecedents reference no literal ('Casación N°...') pero support exacto -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePrecedentPayload(
          "Casación N° 1234-2024 Lima",
          ["Casación N.° 1234-2024 Lima"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    // CASE 10: citedPrecedents reference no literal sin support -> FAIL
    it("CASE 10: citedPrecedents reference no literal sin support -> FAIL", async () => {
      const payload = makePrecedentPayload(
        "Casación N° 1234-2024 Lima",
        []
      );

      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(false);
    });

    // CASE 11: ordinary citation.quote con capitalización alterada -> STILL FAIL
    it("CASE 11: ordinary citation.quote con capitalización alterada -> STILL FAIL", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: {
          summary: "sum",
          legalMatter: "matter",
          legalIssues: [],
          keyCriteria: [],
          scope: "scope",
          limitations: "limitations",
          citations: [{ quote: "TODO ACTO ADMINISTRATIVO DEBE SER MOTIVADO", paragraphReference: null, pageReference: null }],
          verificationStatus: "machine_generated_unverified" as const,
          ratioDecidendi: { status: "not_explicit" as const, text: null, support: [] },
          obiterDicta: [],
          citedNorms: [],
          citedPrecedents: []
        }
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 12: ordinary citation.quote con punctuation alterada -> STILL FAIL
    it("CASE 12: ordinary citation.quote con punctuation alterada -> STILL FAIL", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: {
          summary: "sum",
          legalMatter: "matter",
          legalIssues: [],
          keyCriteria: [],
          scope: "scope",
          limitations: "limitations",
          citations: [{ quote: "todo acto administrativo, debe ser motivado.", paragraphReference: null, pageReference: null }],
          verificationStatus: "machine_generated_unverified" as const,
          ratioDecidendi: { status: "not_explicit" as const, text: null, support: [] },
          obiterDicta: [],
          citedNorms: [],
          citedPrecedents: []
        }
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 13: ratio support parafraseado -> STILL FAIL
    it("CASE 13: ratio support parafraseado -> STILL FAIL", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: {
          summary: "sum",
          legalMatter: "matter",
          legalIssues: [],
          keyCriteria: [],
          scope: "scope",
          limitations: "limitations",
          citations: [],
          verificationStatus: "machine_generated_unverified" as const,
          ratioDecidendi: {
            status: "identified" as const,
            text: "motivación obligatoria",
            support: [{ quote: "cualquier acto debe estar debidamente motivado", paragraphReference: null, pageReference: null }]
          },
          obiterDicta: [],
          citedNorms: [],
          citedPrecedents: []
        }
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 14: reference inventada con identificador 99999 + support real grounded de Ley 27444 -> FAIL (grounding_failed)
    it("CASE 14: reference inventada con identificador 99999 + support real grounded de Ley 27444 -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Ley de Procedimientos Galácticos 99999",
          ["artículo 3 de la Ley N.° 27444"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 15: reference "Ley N° 27444" + support exacto "Ley N.° 27444" -> PASS
    it("CASE 15: reference 'Ley N° 27444' + support exacto 'Ley N.° 27444' -> PASS", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Ley N° 27444",
          ["Ley N.° 27444"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });

    // CASE 16: reference "Casación N° 1234-2024 Lima" + support grounded de otra casación 5678-2023 -> FAIL
    it("CASE 16: reference 'Casación N° 1234-2024 Lima' + support grounded de otra casación 5678-2023 -> FAIL (grounding_failed)", async () => {
      const sourceWithAnotherCasacion = `${referenceFullText} Por otro lado, en la Casación N.° 5678-2023 Lima no se abordó el fondo.`;
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: sourceWithAnotherCasacion });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makePrecedentPayload(
          "Casación N° 1234-2024 Lima",
          ["Casación N.° 5678-2023 Lima"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 17: reference no literal sin anchor numérico determinista + support grounded -> FAIL
    it("CASE 17: reference no literal sin anchor numérico determinista + support grounded -> FAIL (grounding_failed)", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "Constitución Política del Estado",
          ["artículo 139 inciso 5 de la Constitución Política del Perú"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res).toEqual({ ok: false, code: "grounding_failed" });
    });

    // CASE 18: reference literal exacta en source -> conserva PASS conforme al contrato actual
    it("CASE 18: reference literal exacta en source -> conserva PASS conforme al contrato actual", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: referenceFullText });
      vi.spyOn(mockProvider, "generateStructuredOutput").mockResolvedValue({
        ok: true,
        payload: makeNormPayload(
          "artículo 3 de la Ley N.° 27444",
          ["artículo 3 de la Ley N.° 27444"]
        )
      });
      const res = await orchestrator.interpret("123", 1);
      expect(res.ok).toBe(true);
    });
  });
});
