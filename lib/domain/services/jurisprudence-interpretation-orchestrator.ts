import type { HermesRequest } from "../../hermes/contracts/hermes-envelope";
import type { JurisprudenceInterpretation, Citation } from "../../hermes/contracts/jurisprudence-interpretation";
import type { JurisprudenceInterpretationSourcePort } from "../repositories/jurisprudence-interpretation-source-port";
import { buildJurisprudenceSystemPolicy } from "../../hermes/boundaries/jurisprudence-system-policy-boundary";
import { buildJurisprudenceUserMessage } from "../../hermes/boundaries/jurisprudence-user-content-boundary";

export type JurisprudenceInterpretationErrorCode =
  | "record_not_found"
  | "record_version_mismatch"
  | "source_too_large"
  | "provider_failure"
  | "invalid_interpretation"
  | "grounding_failed";

export type JurisprudenceInterpretationResult =
  | { readonly ok: true; readonly interpretation: JurisprudenceInterpretation }
  | { readonly ok: false; readonly code: JurisprudenceInterpretationErrorCode };

export type JurisprudencePreparationErrorCode =
  | "record_not_found"
  | "record_version_mismatch"
  | "source_too_large";

export type JurisprudencePreparationResult =
  | {
      readonly ok: true;
      readonly recordId: string;
      readonly recordVersion: number;
      readonly sourceText: string;
      readonly request: HermesRequest;
    }
  | {
      readonly ok: false;
      readonly code: JurisprudencePreparationErrorCode;
    };

export interface JurisprudenceInterpretationOrchestratorProps {
  jurisprudenceRepository: JurisprudenceInterpretationSourcePort;
}

export class JurisprudenceInterpretationOrchestrator {
  private readonly jurisprudenceRepository: JurisprudenceInterpretationSourcePort;

  public static readonly MAX_SOURCE_LENGTH = 100000;

  constructor(props: JurisprudenceInterpretationOrchestratorProps) {
    this.jurisprudenceRepository = props.jurisprudenceRepository;
  }

  /**
   * Read-only preparation of requested jurisprudence document for analysis.
   * Resolves canonical record, validates version, checks size limits, and builds Hermes request.
   * Never mutates state, reserves quota, or calls remote LLM providers.
   */
  async prepareInterpretation(
    recordId: string,
    recordVersion: number
  ): Promise<JurisprudencePreparationResult> {
    const record = await this.jurisprudenceRepository.findById(recordId);

    if (!record) {
      return { ok: false, code: "record_not_found" };
    }

    if (record.recordVersion !== recordVersion) {
      return { ok: false, code: "record_version_mismatch" };
    }

    const sourceText = record.fullText;
    if (sourceText.length > JurisprudenceInterpretationOrchestrator.MAX_SOURCE_LENGTH) {
      return { ok: false, code: "source_too_large" };
    }

    const systemMessage = buildJurisprudenceSystemPolicy();
    const userMessage = buildJurisprudenceUserMessage(record);

    const request: HermesRequest = {
      messages: [systemMessage, userMessage],
      structuredOutputIntent: "buholex_jurisprudence_interpretation",
      metadata: { analysisId: recordId, locale: "es-PE" },
    };

    return {
      ok: true,
      recordId,
      recordVersion,
      sourceText,
      request,
    };
  }

  /**
   * Deterministic citation grounding validation.
   * Verifies that all citations and references in the structured interpretation
   * are strictly grounded in the canonical source text.
   */
  validateGrounding(
    interpretation: JurisprudenceInterpretation,
    sourceText: string
  ): boolean {
    return this.validateCitations(interpretation, sourceText);
  }

  private validateCitations(interpretation: JurisprudenceInterpretation, sourceText: string): boolean {
    const normalizedSource = this.normalizeText(sourceText);

    if (!this.checkSupport(interpretation.citations, normalizedSource)) return false;

    if (!this.checkSupport(interpretation.ratioDecidendi.support, normalizedSource)) return false;

    for (const obiter of interpretation.obiterDicta) {
      if (!this.checkSupport(obiter.support, normalizedSource)) return false;
    }

    for (const norm of interpretation.citedNorms) {
      if (!this.checkSupport(norm.support, normalizedSource)) return false;
      if (!this.checkReference(norm.reference, norm.support, normalizedSource)) return false;
    }

    for (const prec of interpretation.citedPrecedents) {
      if (!this.checkSupport(prec.support, normalizedSource)) return false;
      if (!this.checkReference(prec.reference, prec.support, normalizedSource)) return false;
    }

    return true;
  }

  private checkSupport(citations: Citation[], normalizedSource: string): boolean {
    for (const citation of citations) {
      const normalizedQuote = this.normalizeText(citation.quote);
      if (!normalizedSource.includes(normalizedQuote)) return false;
    }
    return true;
  }

  private checkReference(reference: string, support: Citation[], normalizedSource: string): boolean {
    const normalizedRef = this.normalizeText(reference);
    if (normalizedRef.length === 0) return false;

    // Case A: reference is an exact literal substring of the canonical source text
    if (normalizedSource.includes(normalizedRef)) {
      return true;
    }

    // Case B: reference is not an exact literal substring;
    // requires non-empty evidentiary support.
    if (support.length === 0) {
      return false;
    }

    // Case C: all supporting quotes must be grounded verbatim in the canonical source
    if (!this.checkSupport(support, normalizedSource)) {
      return false;
    }

    // Case D: deterministic anchor extraction & binding (HERMES-PROD-A1.13B)
    const anchors = this.extractNumericAnchors(reference);
    if (anchors.length === 0) {
      return false;
    }

    return support.some((citation) => {
      const normalizedQuote = this.normalizeText(citation.quote);
      return anchors.every((anchor) => this.containsAnchor(normalizedQuote, anchor));
    });
  }

  private extractNumericAnchors(reference: string): string[] {
    const matches = reference.match(/\d+/g);
    if (!matches) return [];
    return Array.from(new Set(matches));
  }

  private containsAnchor(text: string, anchor: string): boolean {
    return new RegExp(`\\b${anchor}\\b`).test(text);
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}
