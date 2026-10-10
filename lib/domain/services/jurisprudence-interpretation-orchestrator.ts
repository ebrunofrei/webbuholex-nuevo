import type { HermesProviderPort } from "../../hermes/contracts/hermes-provider-port";
import { jurisprudenceInterpretationSchema } from "../../hermes/contracts/jurisprudence-interpretation";
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

export interface JurisprudenceInterpretationOrchestratorProps {
  hermesProvider: HermesProviderPort;
  jurisprudenceRepository: JurisprudenceInterpretationSourcePort;
}

export class JurisprudenceInterpretationOrchestrator {
  private hermesProvider: HermesProviderPort;
  private jurisprudenceRepository: JurisprudenceInterpretationSourcePort;

  private static readonly MAX_SOURCE_LENGTH = 100000;

  constructor(props: JurisprudenceInterpretationOrchestratorProps) {
    this.hermesProvider = props.hermesProvider;
    this.jurisprudenceRepository = props.jurisprudenceRepository;
  }

  async interpret(recordId: string, recordVersion: number): Promise<JurisprudenceInterpretationResult> {
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

    const outcome = await this.hermesProvider.generateStructuredOutput({
      messages: [systemMessage, userMessage],
      structuredOutputIntent: "buholex_jurisprudence_interpretation",
      metadata: { analysisId: recordId, locale: "es-PE" }
    });

    if (!outcome.ok) {
      return { ok: false, code: "provider_failure" };
    }

    const validated = jurisprudenceInterpretationSchema.safeParse(outcome.payload);
    if (!validated.success) {
      return { ok: false, code: "invalid_interpretation" };
    }

    const interpretation = validated.data;
    const isGrounded = this.validateCitations(interpretation, sourceText);

    if (!isGrounded) {
      return { ok: false, code: "grounding_failed" };
    }

    return { ok: true, interpretation };
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
    if (normalizedSource.includes(normalizedRef)) return true;
    for (const citation of support) {
      if (this.normalizeText(citation.quote).includes(normalizedRef)) return true;
    }
    return false;
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}
