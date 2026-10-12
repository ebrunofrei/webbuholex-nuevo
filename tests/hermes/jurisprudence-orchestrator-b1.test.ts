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
});
