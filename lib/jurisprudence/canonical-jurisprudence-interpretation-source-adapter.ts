import type { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import type {
  JurisprudenceInterpretationSource,
  JurisprudenceInterpretationSourcePort,
} from "@/lib/domain/repositories/jurisprudence-interpretation-source-port";
import type { JurisprudenceApplicationContext } from "@/types/jurisprudence-application";

export interface CanonicalJurisprudenceInterpretationSourceAdapterDependencies {
  readonly service: Pick<JurisprudenceApplicationService, "getInternalRecord">;
  readonly contextFactory?: () => JurisprudenceApplicationContext;
}

function defaultContextFactory(): JurisprudenceApplicationContext {
  return {
    requestId: `hermes-source-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    actor: { kind: "system", id: "hermes_interpretation_adapter" },
    operationSource: "internal_api",
    requestedAt: new Date().toISOString(),
  };
}

export class CanonicalJurisprudenceInterpretationSourceAdapter implements JurisprudenceInterpretationSourcePort {
  private readonly service: Pick<JurisprudenceApplicationService, "getInternalRecord">;
  private readonly contextFactory: () => JurisprudenceApplicationContext;

  constructor(dependencies: CanonicalJurisprudenceInterpretationSourceAdapterDependencies) {
    this.service = dependencies.service;
    this.contextFactory = dependencies.contextFactory ?? defaultContextFactory;
  }

  async findById(id: string): Promise<JurisprudenceInterpretationSource | null> {
    if (typeof id !== "string" || id.trim().length === 0) {
      return null;
    }

    try {
      const context = this.contextFactory();
      const result = await this.service.getInternalRecord({ id, context });
      const { record } = result;

      // Public eligibility invariants
      if (record.publicationStatus !== "published") {
        return null;
      }

      if (!record.publicable) {
        return null;
      }

      if (!record.officialContent.publicationAllowed) {
        return null;
      }

      const rawFullText = record.officialContent.officialFullText;
      if (rawFullText === null || rawFullText.trim().length === 0) {
        return null;
      }

      const source: JurisprudenceInterpretationSource = {
        recordId: record.id,
        recordVersion: record.recordVersion,
        caseNumber: record.caseNumber,
        resolutionNumber: record.resolutionNumber,
        institutionName: record.institutionName,
        issuingBody: record.issuingBody,
        issuedAt: record.issuedAt,
        fullText: rawFullText,
      };

      return source;
    } catch (error) {
      if (error instanceof JurisprudenceApplicationError && error.code === "NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }
}
