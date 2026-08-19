import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostgresJurisprudencePublicationSourceReader } from "@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";

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
        execute: async (query: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          executedQueries.push((query as any).queryChunks[0].value[0]);
        }
      };
      const fakeDb = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transaction: async (callback: (tx: any) => Promise<any>) => {
          return await callback(fakeTx);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await withJurisprudenceInternalReadRole(fakeDb as any, async (tx) => {
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
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new PostgresJurisprudencePublicationSourceReader(fakeDb as any);
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
        institutionName: "Supreme Court",
        issuingBody: "Chamber 1",
        matter: "Civil",
        issuedAt: "2026-01-01",
        editorialContent: { editorialTitle: "Test Title", publicExcerpt: "Excerpt", editorialSummary: "Summary" },
        officialContent: { officialSummary: "Official" },
        source: { name: "Court API", documentId: "doc-1" },
        // these should not matter to the mapped output, but verify it returns exactly what is needed
        extraField: "ignored",
      };

      const fakeDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ snapshotJson: snapshot }]),
        transaction: vi.fn().mockImplementation(async (cb) => cb(fakeDb)),
        execute: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new PostgresJurisprudencePublicationSourceReader(fakeDb as any);
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
        editorialContent: { editorialTitle: "Test Title", publicExcerpt: "Excerpt", editorialSummary: "Summary" },
        officialContent: { officialSummary: "Official" },
        source: { name: "Court API", documentId: "doc-1" },
      });
    });
  });
});
