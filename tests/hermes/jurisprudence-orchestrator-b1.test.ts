import { describe, it, expect, vi, beforeEach } from "vitest";
import { JurisprudenceInterpretationOrchestrator } from "../../lib/domain/services/jurisprudence-interpretation-orchestrator";
import type { JurisprudenceInterpretationSourcePort, JurisprudenceInterpretationSource } from "../../lib/domain/repositories/jurisprudence-interpretation-source-port";

class MockRepo implements JurisprudenceInterpretationSourcePort {
  async findById(): Promise<JurisprudenceInterpretationSource | null> { return null; }
}

describe("Jurisprudence MVP B1 Orchestrator", () => {
  let mockRepo: MockRepo;
  let orchestrator: JurisprudenceInterpretationOrchestrator;

  beforeEach(() => {
    mockRepo = new MockRepo();
    orchestrator = new JurisprudenceInterpretationOrchestrator({
      jurisprudenceRepository: mockRepo,
    });
  });

  const baseSource: JurisprudenceInterpretationSource = {
    recordId: "123",
    recordVersion: 1,
    caseNumber: "c1",
    resolutionNumber: "r1",
    institutionName: "inst",
    issuingBody: "body",
    issuedAt: "2024",
    fullText: "canonical text.",
  };

  it("missing record -> record_not_found", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue(null);
    const res = await orchestrator.prepareInterpretation("123", 1);
    expect(res).toEqual({ ok: false, code: "record_not_found" });
  });

  it("uses canonical server text, mismatch version fails", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue(baseSource);
    const res = await orchestrator.prepareInterpretation("123", 2);
    expect(res).toEqual({ ok: false, code: "record_version_mismatch" });
  });

  it("oversized source fails safely without silent truncation", async () => {
    vi.spyOn(mockRepo, "findById").mockResolvedValue({ ...baseSource, fullText: "a".repeat(100001) });
    const res = await orchestrator.prepareInterpretation("123", 1);
    expect(res).toEqual({ ok: false, code: "source_too_large" });
  });

  it("grounding check fails on fabricated top-level citation", () => {
    const payload = {
      summary: "sum",
      legalMatter: "matter",
      legalIssues: [],
      keyCriteria: [],
      scope: "scope",
      limitations: "limitations",
      citations: [{ quote: "Fake source", paragraphReference: null, pageReference: null }],
      verificationStatus: "machine_generated_unverified" as const,
      ratioDecidendi: { status: "not_explicit" as const, text: null, support: [] },
      obiterDicta: [],
      citedNorms: [],
      citedPrecedents: [],
    };

    const isGrounded = orchestrator.validateGrounding(payload, "Real source.");
    expect(isGrounded).toBe(false);
  });

  it("grounding check passes on valid ratio support", () => {
    const payload = {
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
        text: "text",
        support: [{ quote: "specific quote", paragraphReference: null, pageReference: null }],
      },
      obiterDicta: [],
      citedNorms: [],
      citedPrecedents: [],
    };

    const isGrounded = orchestrator.validateGrounding(payload, "Real source with specific quote.");
    expect(isGrounded).toBe(true);
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
        citedPrecedents: [],
      };
    }

    it("CASO 1: exact quote -> PASS", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("todo acto debe ser motivado"), fullText);
      expect(isGrounded).toBe(true);
    });

    it("CASO 2: whitespace and line-break differences admitted by normalizeText -> PASS", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("todo   acto\n  debe\tser   motivado"), fullText);
      expect(isGrounded).toBe(true);
    });

    it("CASO 3: paraphrased quote -> FAIL (grounding_failed)", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("cualquier acto tiene que estar motivado"), fullText);
      expect(isGrounded).toBe(false);
    });

    it("CASO 4: added word -> FAIL (grounding_failed)", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("todo acto administrativo debe ser motivado"), fullText);
      expect(isGrounded).toBe(false);
    });

    it("CASO 5: omitted word -> FAIL (grounding_failed)", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("todo acto motivado"), fullText);
      expect(isGrounded).toBe(false);
    });

    it("CASO 6: altered punctuation -> FAIL (grounding_failed)", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("todo acto, debe ser motivado."), fullText);
      expect(isGrounded).toBe(false);
    });

    it("CASO 7: altered capitalization -> FAIL (grounding_failed)", () => {
      const isGrounded = orchestrator.validateGrounding(makePayload("TODO ACTO DEBE SER MOTIVADO"), fullText);
      expect(isGrounded).toBe(false);
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
            support: quotes.map((quote) => ({ quote, paragraphReference: null, pageReference: null })),
          },
        ],
        citedPrecedents: [],
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
            support: quotes.map((quote) => ({ quote, paragraphReference: null, pageReference: null })),
          },
        ],
      };
    }

    // CASE 1: reference exacta + exact support -> PASS
    it("CASE 1: reference exacta + exact support -> PASS", () => {
      const isGrounded = orchestrator.validateGrounding(
        makeNormPayload(
          "artículo 139 inciso 5 de la Constitución Política del Perú",
          ["artículo 139 inciso 5 de la Constitución Política del Perú"],
        ),
        referenceFullText,
      );
      expect(isGrounded).toBe(true);
    });

    // CASE 2: reference cambia solo capitalización -> PASS
    it("CASE 2: reference cambia solo capitalización ('Artículo 139...') con support exacto -> PASS", () => {
      const isGrounded = orchestrator.validateGrounding(
        makeNormPayload(
          "Artículo 139 inciso 5 de la Constitución Política del Perú",
          ["artículo 139 inciso 5 de la Constitución Política del Perú"],
        ),
        referenceFullText,
      );
      expect(isGrounded).toBe(true);
    });

    // CASE 3: reference usa variante tipográfica ("N° 27444") con support exacto ("N.° 27444") -> PASS
    it("CASE 3: reference usa variante tipográfica ('N° 27444') con support exacto -> PASS", () => {
      const isGrounded = orchestrator.validateGrounding(
        makeNormPayload(
          "Ley N° 27444",
          ["Ley N.° 27444"],
        ),
        referenceFullText,
      );
      expect(isGrounded).toBe(true);
    });

    // CASE 4: reference usa denominación canónica/abreviada razonable con support exacto -> PASS
    it("CASE 4: reference usa denominación canónica pero support contiene literalmente la norma -> PASS", () => {
      const isGrounded = orchestrator.validateGrounding(
        makeNormPayload(
          "TUO de la Ley del Procedimiento Administrativo General - Ley 27444",
          ["artículo 3 de la Ley N.° 27444"],
        ),
        referenceFullText,
      );
      expect(isGrounded).toBe(true);
    });

    // CASE 5: reference no literal + support vacío -> FAIL (grounding_failed)
    it("CASE 5: reference no literal + support vacío -> FAIL (grounding_failed)", () => {
      const payload = makeNormPayload(
        "Artículo 139 inciso 5 de la Constitución",
        [],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 6: reference no literal + support parafraseado -> FAIL (grounding_failed)
    it("CASE 6: reference no literal + support parafraseado -> FAIL (grounding_failed)", () => {
      const payload = makeNormPayload(
        "Artículo 139 inciso 5",
        ["la constitución exige fundamentar los actos jurídicos"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 7: reference inventada + support vacío -> FAIL
    it("CASE 7: reference inventada + support vacío -> FAIL", () => {
      const payload = makeNormPayload(
        "Ley de Procedimientos Galácticos 99999",
        [],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 8: reference inventada + support quote que NO existe -> FAIL (grounding_failed)
    it("CASE 8: reference inventada + support quote inexistente -> FAIL (grounding_failed)", () => {
      const payload = makeNormPayload(
        "Ley de Procedimientos Galácticos 99999",
        ["texto inventado que no está en la fuente"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 9: citedPrecedents reference no literal pero support exacto -> PASS
    it("CASE 9: citedPrecedents reference no literal ('Casación N°...') pero support exacto -> PASS", () => {
      const payload = makePrecedentPayload(
        "Casación N° 1234-2024 Lima",
        ["Casación N.° 1234-2024 Lima"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(true);
    });

    // CASE 10: citedPrecedents reference no literal sin support -> FAIL
    it("CASE 10: citedPrecedents reference no literal sin support -> FAIL", () => {
      const payload = makePrecedentPayload(
        "Casación N° 1234-2024 Lima",
        [],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 11: ordinary citation.quote con capitalización alterada -> STILL FAIL
    it("CASE 11: ordinary citation.quote con capitalización alterada -> STILL FAIL", () => {
      const payload = {
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
        citedPrecedents: [],
      };
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 12: ordinary citation.quote con punctuation alterada -> STILL FAIL
    it("CASE 12: ordinary citation.quote con punctuation alterada -> STILL FAIL", () => {
      const payload = {
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
        citedPrecedents: [],
      };
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 13: ratio support parafraseado -> STILL FAIL
    it("CASE 13: ratio support parafraseado -> STILL FAIL", () => {
      const payload = {
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
          support: [{ quote: "cualquier acto debe estar debidamente motivado", paragraphReference: null, pageReference: null }],
        },
        obiterDicta: [],
        citedNorms: [],
        citedPrecedents: [],
      };
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 14: reference inventada con identificador 99999 + support real grounded de Ley 27444 -> FAIL (grounding_failed)
    it("CASE 14: reference inventada con identificador 99999 + support real grounded de Ley 27444 -> FAIL (grounding_failed)", () => {
      const payload = makeNormPayload(
        "Ley de Procedimientos Galácticos 99999",
        ["artículo 3 de la Ley N.° 27444"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 15: reference "Ley N° 27444" + support exacto "Ley N.° 27444" -> PASS
    it("CASE 15: reference 'Ley N° 27444' + support exacto 'Ley N.° 27444' -> PASS", () => {
      const payload = makeNormPayload(
        "Ley N° 27444",
        ["Ley N.° 27444"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(true);
    });

    // CASE 16: reference "Casación N° 1234-2024 Lima" + support grounded de otra casación 5678-2023 -> FAIL
    it("CASE 16: reference 'Casación N° 1234-2024 Lima' + support grounded de otra casación 5678-2023 -> FAIL (grounding_failed)", () => {
      const sourceWithAnotherCasacion = `${referenceFullText} Por otro lado, en la Casación N.° 5678-2023 Lima no se abordó el fondo.`;
      const payload = makePrecedentPayload(
        "Casación N° 1234-2024 Lima",
        ["Casación N.° 5678-2023 Lima"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, sourceWithAnotherCasacion);
      expect(isGrounded).toBe(false);
    });

    // CASE 17: reference no literal sin anchor numérico determinista + support grounded -> FAIL
    it("CASE 17: reference no literal sin anchor numérico determinista + support grounded -> FAIL (grounding_failed)", () => {
      const payload = makeNormPayload(
        "Constitución Política del Estado",
        ["artículo 139 inciso 5 de la Constitución Política del Perú"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(false);
    });

    // CASE 18: reference literal exacta en source -> conserva PASS conforme al contrato actual
    it("CASE 18: reference literal exacta en source -> conserva PASS conforme al contrato actual", () => {
      const payload = makeNormPayload(
        "artículo 3 de la Ley N.° 27444",
        ["artículo 3 de la Ley N.° 27444"],
      );
      const isGrounded = orchestrator.validateGrounding(payload, referenceFullText);
      expect(isGrounded).toBe(true);
    });
  });
});
