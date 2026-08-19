import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { PostgresJurisprudencePublicationSourceReader } from "@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { JurisprudenceRepositoryError } from "@/lib/jurisprudence-repository-error";

vi.mock("@/database/roles/with-jurisprudence-internal-read-role", () => ({
  withJurisprudenceInternalReadRole: vi.fn(async (db, cb) => cb(db)),
}));

describe("J1-G.2R.5D PostgresJurisprudencePublicationSourceReader Canonical Mapping", () => {
  let mockLimit: Mock;
  let mockTx: PostgresJsDatabase<Record<string, never>>;
  let reader: PostgresJurisprudencePublicationSourceReader;

  beforeEach(() => {
    mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    mockTx = {
      select: mockSelect,
    } as Partial<PostgresJsDatabase<Record<string, never>>> as PostgresJsDatabase<Record<string, never>>;
    reader = new PostgresJurisprudencePublicationSourceReader(mockTx);
  });

  it("should map canonical snapshot properly to ProjectionSourceRecord", async () => {
    const realisticSnapshot = {
      id: "REC-001",
      recordVersion: 1,
      slug: "rec-001",
      caseNumber: "EXP-123",
      resolutionNumber: "RES-456",
      resolutionType: "Sentencia",
      institution: {
        id: "INST-001",
        name: "Institución E2E",
        shortName: "IE",
        country: "PE",
        kind: "judiciary",
        officialHomepage: null,
      },
      issuingBody: "Sala Suprema",
      instanceLevel: "Suprema",
      specialty: "Penal",
      matter: "Homicidio",
      submatter: null,
      judicialDistrict: null,
      chamberOrCourt: "Sala Suprema",
      rapporteur: null,
      issuedAt: "2026-08-19",
      officiallyPublishedAt: null,
      editorialStatus: "verified",
      publicationStatus: "private",
      createdAt: "2026-08-19T00:00:00Z",
      updatedAt: "2026-08-19T00:00:00Z",
      editorialContent: {
        editorialTitle: "STC 123",
        editorialSummary: null,
        publicExcerpt: null,
        legalIssue: null,
        mainCriterion: null,
        relevantGrounds: [],
        decision: null,
        citedNorms: [],
        citedPrecedentIds: [],
        relatedRecordIds: [],
        keywords: [],
      },
      officialContent: {
        officialSummary: "Resumen oficial",
        officialFullText: "Texto completo",
        fullTextAvailable: true,
        publicationAllowed: true,
        documentAvailability: "full_text_available",
        originFormat: "pdf",
        language: "es",
        pageCount: null,
      },
      generatedContent: {
        internalDraft: null,
        reviewed: false,
        supportedBySource: false,
      },
      authority: {
        resolutionCategory: "ordinary_decision",
        legalAuthority: "unknown",
        authorityEvidence: null,
        authorityVerifiedAt: null,
        validityStatus: "unknown",
        validityEvidence: null,
      },
      source: {
        type: "official_judiciary",
        name: "Fuente Oficial Test",
        url: null,
        documentId: null,
        publishedAt: null,
        retrievedAt: null,
        checksum: null,
        verificationStatus: "unverified",
        verifiedAt: null,
        verifiedBy: null,
        verificationNotes: null,
        evidenceReference: null,
      },
      officialFile: null,
      search: {
        normalizedSearchText: "test",
        normalizedMatters: [],
        normalizedBodies: [],
        jurisdiction: "pe",
        tags: [],
        editorialRelevance: 0,
      },
      internal: {
        editorialNotes: [],
        contradictions: [],
        generatedContentOnly: false,
      },
    };

    mockLimit.mockResolvedValue([{ snapshotJson: realisticSnapshot }]);

    const result = await reader.getPublicationSource({ recordId: "REC-001", recordVersion: 1 });
    expect(result).not.toBeNull();
    expect(result?.institutionName).toBe("Institución E2E");
    expect(result?.id).toBe("REC-001");
    expect(result?.caseNumber).toBe("EXP-123");
    expect(result?.resolutionNumber).toBe("RES-456");
    expect(result?.resolutionType).toBe("Sentencia");
    expect(result?.issuingBody).toBe("Sala Suprema");
    expect(result?.matter).toBe("Homicidio");
    expect(result?.issuedAt).toBe("2026-08-19");
    expect(result?.editorialContent.editorialTitle).toBe("STC 123");
    expect(result?.source.name).toBe("Fuente Oficial Test");
  });

  it("should fail with canonical error if snapshot is malformed", async () => {
    mockLimit.mockResolvedValue([{ snapshotJson: { id: "invalid" } }]);

    await expect(reader.getPublicationSource({ recordId: "REC-001", recordVersion: 1 }))
      .rejects.toThrow(JurisprudenceRepositoryError);

    await expect(reader.getPublicationSource({ recordId: "REC-001", recordVersion: 1 }))
      .rejects.toThrow("El snapshot recuperado no cumple el contrato canónico.");
  });
});
