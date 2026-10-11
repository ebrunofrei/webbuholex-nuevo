import { describe, expect, it } from "vitest";
import { CanonicalJurisprudenceInterpretationSourceAdapter } from "@/lib/jurisprudence/canonical-jurisprudence-interpretation-source-adapter";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import type {
  GetInternalJurisprudenceRecordQuery,
  JurisprudenceInternalRecordDto,
  JurisprudenceInternalRecordResultDto,
} from "@/types/jurisprudence-application";
import type {
  JurisprudenceEditorialStatus,
  JurisprudencePublicationStatus,
  JurisprudenceVerificationStatus,
} from "@/types/jurisprudence";

function createFixtureRecord(
  options: {
    id?: string;
    recordVersion?: number;
    caseNumber?: string;
    resolutionNumber?: string | null;
    institutionName?: string;
    issuingBody?: string;
    issuedAt?: string;
    publicationStatus?: JurisprudencePublicationStatus;
    editorialStatus?: JurisprudenceEditorialStatus;
    verificationStatus?: JurisprudenceVerificationStatus;
    publicable?: boolean;
    publicationAllowed?: boolean;
    officialFullText?: string | null;
  } = {}
): JurisprudenceInternalRecordDto {
  const fullText = options.officialFullText !== undefined
    ? options.officialFullText
    : "Texto oficial y vinculante de la sentencia del Tribunal Constitucional.";

  return {
    id: options.id ?? "rec-tc-2024-001",
    slug: "tc-2024-001",
    recordVersion: options.recordVersion ?? 2,
    editorialStatus: options.editorialStatus ?? "verified",
    publicationStatus: options.publicationStatus ?? "published",
    verificationStatus: options.verificationStatus ?? "verified",
    caseNumber: options.caseNumber ?? "EXP. 0001-2024-PI/TC",
    resolutionNumber: options.resolutionNumber !== undefined ? options.resolutionNumber : "RES. 001-2024",
    resolutionType: "Sentencia",
    institutionId: "inst-tc",
    institutionName: options.institutionName ?? "Tribunal Constitucional del Perú",
    issuingBody: options.issuingBody ?? "Pleno Jurisdiccional",
    specialty: "Constitucional",
    matter: "Derechos Fundamentales",
    submatter: null,
    issuedAt: options.issuedAt ?? "2024-02-20",
    updatedAt: "2024-02-21T00:00:00.000Z",
    legalAuthority: "binding_precedent",
    publicable: options.publicable ?? true,
    createdAt: "2024-02-20T00:00:00.000Z",
    officiallyPublishedAt: "2024-02-20T00:00:00.000Z",
    instanceLevel: "Única y definitiva",
    judicialDistrict: null,
    chamberOrCourt: "Pleno",
    rapporteur: "Magistrado Ponente",
    institution: {
      id: "inst-tc",
      name: options.institutionName ?? "Tribunal Constitucional del Perú",
      shortName: "TC",
      country: "PE",
      kind: "constitutional_court",
      officialHomepage: "https://tc.gob.pe",
    },
    officialContent: {
      officialSummary: "Resumen oficial",
      officialFullText: fullText,
      fullTextAvailable: fullText !== null,
      publicationAllowed: options.publicationAllowed ?? true,
      documentAvailability: fullText === null ? "metadata_only" : "full_text_available",
      originFormat: "pdf",
      language: "es",
      pageCount: 15,
    },
    editorialContent: {
      editorialTitle: "Título editorial",
      editorialSummary: "Resumen editorial",
      publicExcerpt: "Extracto público",
      legalIssue: "Cuestión litigiosa",
      mainCriterion: "Criterio determinante",
      relevantGrounds: ["Fundamento 15"],
      decision: "Fundada la demanda",
      citedNorms: [],
      citedPrecedentIds: [],
      relatedRecordIds: [],
      keywords: ["derechos fundamentales"],
    },
    generatedContent: {
      internalDraft: null,
      reviewed: false,
      supportedBySource: false,
    },
    authority: {
      resolutionCategory: "constitutional_judgment",
      legalAuthority: "binding_precedent",
      authorityEvidence: "Publicación en El Peruano",
      authorityVerifiedAt: "2024-02-20T00:00:00.000Z",
      validityStatus: "current",
      validityEvidence: null,
    },
    source: {
      type: "constitutional_court",
      name: "Diario Oficial El Peruano",
      url: "https://elperuano.pe",
      documentId: "pub-001",
      evidenceReference: null,
      publishedAt: "2024-02-20",
      retrievedAt: null,
      checksum: null,
      verificationStatus: "verified",
      verifiedAt: "2024-02-20T00:00:00.000Z",
      verifiedBy: null,
      verificationNotes: null,
    },
    officialFile: null,
    search: {
      normalizedSearchText: "exp 0001 2024 pi tc tribunal constitucional",
      normalizedMatters: ["constitucional"],
      normalizedBodies: ["pleno jurisdiccional"],
      jurisdiction: "PE",
      tags: ["constitucional"],
      editorialRelevance: 10,
    },
    internal: {
      editorialNotes: [],
      contradictions: [],
      generatedContentOnly: false,
    },
  };
}

class FakeJurisprudenceApplicationService {
  constructor(private readonly recordStore: Map<string, JurisprudenceInternalRecordDto>) {}

  async getInternalRecord(query: GetInternalJurisprudenceRecordQuery): Promise<JurisprudenceInternalRecordResultDto> {
    const record = this.recordStore.get(query.id);
    if (!record) {
      throw new JurisprudenceApplicationError("NOT_FOUND", "Registro no encontrado", {
        requestId: query.context.requestId,
        recordId: query.id,
      });
    }
    return {
      requestId: query.context.requestId,
      record: structuredClone(record),
    };
  }
}

describe("CanonicalJurisprudenceInterpretationSourceAdapter", () => {
  it("maps eligible published record correctly with exact recordVersion and fullText", async () => {
    const fixture = createFixtureRecord({
      id: "rec-1",
      recordVersion: 3,
      caseNumber: "EXP. 0005-2020-AI",
      resolutionNumber: "RES. 005-2020",
      institutionName: "Tribunal Constitucional",
      issuingBody: "Pleno",
      issuedAt: "2020-10-25",
      officialFullText: "Texto íntegro oficial de la sentencia",
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-1", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-1");

    expect(source).not.toBeNull();
    expect(source).toEqual({
      recordId: "rec-1",
      recordVersion: 3,
      caseNumber: "EXP. 0005-2020-AI",
      resolutionNumber: "RES. 005-2020",
      institutionName: "Tribunal Constitucional",
      issuingBody: "Pleno",
      issuedAt: "2020-10-25",
      fullText: "Texto íntegro oficial de la sentencia",
    });
  });

  it("returns null when official full text is null", async () => {
    const fixture = createFixtureRecord({
      id: "rec-null-text",
      officialFullText: null,
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-null-text", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-null-text");
    expect(source).toBeNull();
  });

  it("returns null when official full text is empty or whitespace", async () => {
    const fixture = createFixtureRecord({
      id: "rec-blank-text",
      officialFullText: "    \n\t   ",
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-blank-text", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-blank-text");
    expect(source).toBeNull();
  });

  it("returns null when publication status is unpublished or draft", async () => {
    const fixture = createFixtureRecord({
      id: "rec-draft",
      publicationStatus: "private",
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-draft", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-draft");
    expect(source).toBeNull();
  });

  it("returns null when record is withdrawn", async () => {
    const fixture = createFixtureRecord({
      id: "rec-withdrawn",
      publicationStatus: "withdrawn",
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-withdrawn", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-withdrawn");
    expect(source).toBeNull();
  });

  it("returns null when publicability guard indicates false", async () => {
    const fixture = createFixtureRecord({
      id: "rec-not-publicable",
      publicable: false,
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-not-publicable", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-not-publicable");
    expect(source).toBeNull();
  });

  it("returns null when publicationAllowed is false", async () => {
    const fixture = createFixtureRecord({
      id: "rec-pub-disallowed",
      publicationAllowed: false,
    });

    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-pub-disallowed", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-pub-disallowed");
    expect(source).toBeNull();
  });

  it("returns null when service throws NOT_FOUND", async () => {
    const store = new Map<string, JurisprudenceInternalRecordDto>();
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("non-existent-id");
    expect(source).toBeNull();
  });

  it("returns null for invalid or blank id without querying service", async () => {
    let queried = false;
    const service = {
      async getInternalRecord(query: GetInternalJurisprudenceRecordQuery): Promise<JurisprudenceInternalRecordResultDto> {
        queried = true;
        return { requestId: query.context.requestId, record: createFixtureRecord() };
      },
    };
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    expect(await adapter.findById("")).toBeNull();
    expect(await adapter.findById("   ")).toBeNull();
    expect(queried).toBe(false);
  });

  it("does not mutate canonical record returned by application service", async () => {
    const fixture = createFixtureRecord({ id: "rec-immutability" });
    const originalText = fixture.officialContent.officialFullText;
    const store = new Map<string, JurisprudenceInternalRecordDto>([["rec-immutability", fixture]]);
    const service = new FakeJurisprudenceApplicationService(store);
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    const source = await adapter.findById("rec-immutability");
    expect(source).not.toBeNull();
    expect(fixture.officialContent.officialFullText).toBe(originalText);
  });

  it("propagates unexpected application or database errors instead of returning null", async () => {
    const unexpectedError = new JurisprudenceApplicationError("REPOSITORY_UNAVAILABLE", "Error de conexión a PostgreSQL", {
      requestId: "req-err-1",
      recordId: "rec-db-err",
    });
    const service = {
      async getInternalRecord(_query: GetInternalJurisprudenceRecordQuery): Promise<JurisprudenceInternalRecordResultDto> {
        throw unexpectedError;
      },
    };
    const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service });

    await expect(adapter.findById("rec-db-err")).rejects.toThrowError(unexpectedError);
  });
});
