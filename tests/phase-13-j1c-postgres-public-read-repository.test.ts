// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/database/client", () => ({
  getJurisprudencePublicReadDatabase: vi.fn(),
}));

import { readJurisprudencePublicReadDatabaseConfig } from "@/database/config";
import * as roles from "@/database/roles";
import { withJurisprudencePublicReadRole } from "@/database/roles";
import { getJurisprudencePublicReadDatabase } from "@/database/client";
import { PostgresJurisprudencePublicReadRepository } from "@/lib/jurisprudence/postgres-jurisprudence-public-read-repository";

describe("J1-C Postgres Public Read Repository", () => {
  describe("Config & Lazy Initialization", () => {
    it("throws if DATABASE_JURISPRUDENCE_READ_URL is missing", () => {
      expect(() => readJurisprudencePublicReadDatabaseConfig({})).toThrow("jurisprudence_public_read_database_configuration_missing");
    });

    it("throws if DATABASE_JURISPRUDENCE_READ_URL is invalid", () => {
      expect(() => readJurisprudencePublicReadDatabaseConfig({
        DATABASE_JURISPRUDENCE_READ_URL: "invalid-url",
      })).toThrow("jurisprudence_public_read_database_configuration_invalid");
    });

    it("returns correct config with prepare: false when URL is valid", () => {
      const config = readJurisprudencePublicReadDatabaseConfig({
        DATABASE_JURISPRUDENCE_READ_URL: "postgres://user:pass@host/db",
      });
      expect(config.url).toBe("postgres://user:pass@host/db");
      expect(config.prepare).toBe(false);
    });
  });

  describe("SET LOCAL ROLE in same transaction", () => {
    it("executes SET LOCAL ROLE jurisprudence_public_read_runtime before callback in same tx", async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue(true),
      };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          return await cb(mockTx);
        }),
      };

      let callbackExecuted = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await withJurisprudencePublicReadRole(mockDb as any, async (tx) => {
        expect(tx).toBe(mockTx);
        expect(mockTx.execute).toHaveBeenCalled();
        // Drizzle sql tags produce an object with query property
        const executeArg = mockTx.execute.mock.calls[0]![0];
        const queryStrings = executeArg.queryChunks.map((chunk: unknown) => {
          if (typeof chunk === "string") return chunk;
          if (typeof chunk === "object" && chunk !== null && "value" in chunk) return (chunk as {value: string}).value;
          return "";
        }).join("");
        expect(queryStrings).toContain("SET LOCAL ROLE jurisprudence_public_read_runtime");
        callbackExecuted = true;
        return "result";
      });

      expect(callbackExecuted).toBe(true);
      // Ensure read only isolation level was specified
      expect(mockDb.transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: "repeatable read",
          accessMode: "read only",
        })
      );
    });
  });

  describe("Repository API", () => {
    it("instantiates correctly and implements search and getBySlug", () => {
      const repo = new PostgresJurisprudencePublicReadRepository();
      expect(typeof repo.search).toBe("function");
      expect(typeof repo.getBySlug).toBe("function");
    });
  });

  describe("Provenance and Null Mapping in getBySlug (D1-R2)", () => {
    async function executeMockTx(
      cb: Function | undefined,
      mockSelect: unknown
    ): Promise<import("@/types/jurisprudence-public-exposure").JurisprudencePublicReadModel | null> {
      const mockTx = {
        select: mockSelect,
        execute: vi.fn().mockResolvedValue(true),
      };
      return cb!(mockTx);
    }

    it("maps official URLs exactly and preserves null summary and null provenance", async () => {
      let capturedTxCallback: Parameters<typeof withJurisprudencePublicReadRole>[1] | undefined;

      vi.mocked(getJurisprudencePublicReadDatabase).mockReturnValue({
        transaction: async (cb: Parameters<typeof withJurisprudencePublicReadRole>[1]) => {
          capturedTxCallback = cb;
          return null;
        }
      } as ReturnType<typeof getJurisprudencePublicReadDatabase>);

      const repo = new PostgresJurisprudencePublicReadRepository();
      repo.getBySlug("test-slug").catch(() => {});
      await Promise.resolve();

      expect(capturedTxCallback).toBeDefined();

      const mockLimit = vi.fn().mockResolvedValue([
        {
          slug: "test-slug",
          title: "Title",
          caseTitle: "Case Title",
          caseNumber: "EXP",
          resolutionNumber: "RES",
          resolutionType: "TYPE",
          institutionName: "INST",
          issuingBody: "BODY",
          matter: "MATTER",
          issuedAt: "2026",
          summary: null,
          sourceName: "Source",
          officialHtmlUrl: "https://tc.gob.pe/html",
          officialPdfUrl: "https://tc.gob.pe/pdf",
        }
      ]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      const result = await executeMockTx(capturedTxCallback, mockSelect);

      expect(result).toBeDefined();
      expect(result?.summary).toBeNull();
      expect(result?.officialHtmlUrl).toBe("https://tc.gob.pe/html");
      expect(result?.officialPdfUrl).toBe("https://tc.gob.pe/pdf");
    });

    it("maps null provenance to null", async () => {
      let capturedTxCallback: Parameters<typeof withJurisprudencePublicReadRole>[1] | undefined;

      vi.mocked(getJurisprudencePublicReadDatabase).mockReturnValue({
        transaction: async (cb: Parameters<typeof withJurisprudencePublicReadRole>[1]) => {
          capturedTxCallback = cb;
          return null;
        }
      } as ReturnType<typeof getJurisprudencePublicReadDatabase>);

      const repo = new PostgresJurisprudencePublicReadRepository();
      repo.getBySlug("test-slug").catch(() => {});
      await Promise.resolve();

      const mockLimit = vi.fn().mockResolvedValue([
        {
          slug: "test-slug",
          title: "Title",
          caseTitle: "Case Title",
          caseNumber: "EXP",
          resolutionNumber: "RES",
          resolutionType: "TYPE",
          institutionName: "INST",
          issuingBody: "BODY",
          matter: "MATTER",
          issuedAt: "2026",
          summary: "Summary",
          sourceName: "Source",
          officialHtmlUrl: null,
          officialPdfUrl: null,
        }
      ]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      const result = await executeMockTx(capturedTxCallback, mockSelect);

      expect(result?.officialHtmlUrl).toBeNull();
      expect(result?.officialPdfUrl).toBeNull();
    });
  });
});
