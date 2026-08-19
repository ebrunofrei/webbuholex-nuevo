import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostgresJurisprudencePublicationSourceReader } from "@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

describe("Phase J1-G.2R.2 - Publication Source Read Foundation", () => {
  describe("JurisprudenceInternalReadDatabase Configuration", () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.DATABASE_JURISPRUDENCE_INTERNAL_READ_URL;
      vi.resetModules();
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.DATABASE_JURISPRUDENCE_INTERNAL_READ_URL = originalEnv;
      } else {
        delete process.env.DATABASE_JURISPRUDENCE_INTERNAL_READ_URL;
      }
    });

    it("throws an error if environment variable is missing upon initialization", async () => {
      delete process.env.DATABASE_JURISPRUDENCE_INTERNAL_READ_URL;
      const dbModule = await import("@/database/jurisprudence-internal-read-database");
      expect(() => dbModule.getJurisprudenceInternalReadDatabase()).toThrow("DATABASE_JURISPRUDENCE_INTERNAL_READ_URL must be set in environment to initialize internal read database connection");
    });
  });

  describe("Role Wrapper", () => {
    it("starts a READ ONLY transaction and sets local role", async () => {
      const executedQueries: string[] = [];
      const fakeTx = {
        execute: ((query: unknown) => {
          const chunkValue = (query as { queryChunks?: { value?: string[] }[] }).queryChunks?.[0]?.value?.[0];
          if (chunkValue) executedQueries.push(chunkValue);
          return {} as never;
        })
      } as Partial<PostgresJsDatabase<Record<string, never>>> as PostgresJsDatabase<Record<string, never>>;
      const fakeDb = {
        transaction: async (callback: (tx: PostgresJsDatabase<Record<string, never>>) => Promise<unknown>) => {
          return await callback(fakeTx);
        }
      } as Partial<PostgresJsDatabase<Record<string, never>>> as PostgresJsDatabase<Record<string, never>>;

      const result = await withJurisprudenceInternalReadRole(fakeDb, async (tx) => {
        expect(tx).toBe(fakeTx);
        return "success";
      });

      expect(result).toBe("success");
      expect(executedQueries).toEqual([
        "SET TRANSACTION READ ONLY",
        "SET LOCAL ROLE jurisprudence_internal_read_runtime"
      ]);
    });
  });

  describe("PostgresJurisprudencePublicationSourceReader", () => {
    it("returns null when exact version does not exist in ledger", async () => {
      const fakeDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        transaction: vi.fn().mockImplementation(async (cb) => cb(fakeDb)),
        execute: vi.fn(),
      } as Partial<PostgresJsDatabase<Record<string, never>>> as PostgresJsDatabase<Record<string, never>>;

      const reader = new PostgresJurisprudencePublicationSourceReader(fakeDb);
      const result = await reader.getPublicationSource({ recordId: "rec-1", recordVersion: 2 });

      expect(result).toBeNull();
    });

    it("maps the exact immutable snapshot into JurisprudenceProjectionSourceRecord", async () => {
      const snapshot = {
        id: "rec-1",
        recordVersion: 2,
        slug: "some-slug",
        caseNumber: "CASE-123",
        resolutionNumber: "RES-456",
        resolutionType: "Sentence",
        institution: {
          id: "INST",
          name: "Supreme Court",
          shortName: "SC",
          country: "US",
          kind: "judiciary",
          officialHomepage: null,
        },
        issuingBody: "Chamber 1",
        instanceLevel: "Supreme",
        specialty: "Civil",
        matter: "Civil",
        submatter: null,
        judicialDistrict: null,
        chamberOrCourt: "Chamber 1",
        rapporteur: null,
        issuedAt: "2026-01-01",
        officiallyPublishedAt: null,
        editorialStatus: "verified",
        publicationStatus: "private",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        editorialContent: {
          editorialTitle: "Test Title",
          editorialSummary: "Summary",
          publicExcerpt: "Excerpt",
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
          officialSummary: "Official",
          officialFullText: "Text",
          fullTextAvailable: true,
          publicationAllowed: true,
          documentAvailability: "full_text_available",
          originFormat: "pdf",
          language: "en",
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
          name: "Court API",
          url: null,
          documentId: "doc-1",
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
          jurisdiction: "us",
          tags: [],
          editorialRelevance: 0,
        },
        internal: {
          editorialNotes: [],
          contradictions: [],
          generatedContentOnly: false,
        },
      };

      const fakeDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ snapshotJson: snapshot }]),
        transaction: vi.fn().mockImplementation(async (cb) => cb(fakeDb)),
        execute: vi.fn(),
      } as Partial<PostgresJsDatabase<Record<string, never>>> as PostgresJsDatabase<Record<string, never>>;

      const reader = new PostgresJurisprudencePublicationSourceReader(fakeDb);
      const result = await reader.getPublicationSource({ recordId: "rec-1", recordVersion: 2 });
      expect(result).toEqual({
        id: "rec-1",
        recordVersion: 2,
        slug: "some-slug",
        caseNumber: "CASE-123",
        resolutionNumber: "RES-456",
        resolutionType: "Sentence",
        institutionName: "Supreme Court",
        issuingBody: "Chamber 1",
        matter: "Civil",
        issuedAt: "2026-01-01",
        editorialContent: snapshot.editorialContent,
        officialContent: snapshot.officialContent,
        source: snapshot.source,
      });
    });
  });
});
