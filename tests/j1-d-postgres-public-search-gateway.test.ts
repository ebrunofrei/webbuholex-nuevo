// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
vi.mock('server-only', () => ({}));
import { PostgresJurisprudencePublicSearchGateway } from "@/lib/jurisprudence/postgres-jurisprudence-public-search-gateway";
import { PostgresJurisprudencePublicReadRepository } from "@/lib/jurisprudence/postgres-jurisprudence-public-read-repository";
import type { JurisprudencePublicSearchQuery } from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicProjectionDetail } from "@/types/jurisprudence";

const mockRepository = {
  search: vi.fn(),
  getBySlug: vi.fn(),
} as unknown as PostgresJurisprudencePublicReadRepository;

describe("PostgresJurisprudencePublicSearchGateway (Fase J1.D)", () => {
  it("identifica el gateway como 'postgres'", () => {
    const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);
    expect(gateway.kind).toBe("postgres");
  });

  describe("search()", () => {
    it("retorna 'success' cuando hay resultados", async () => {
      const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);
      const mockPage = {
        items: [],
        total: 10,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };

      vi.spyOn(mockRepository, "search").mockResolvedValueOnce(mockPage);
      const query: JurisprudencePublicSearchQuery = {
        text: "",
        filters: {},
        sort: "relevance",
        page: 1,
        pageSize: 10
      };

      const response = await gateway.search(query);
      expect(response.status).toBe("success");
      if (response.status === "success") {
        expect(response.page).toBe(mockPage);
      }
    });

    it("retorna 'empty' cuando no hay resultados", async () => {
      const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);
      const mockPage = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };

      vi.spyOn(mockRepository, "search").mockResolvedValueOnce(mockPage);
      const query: JurisprudencePublicSearchQuery = {
        text: "",
        filters: {},
        sort: "relevance",
        page: 1,
        pageSize: 10
      };

      const response = await gateway.search(query);
      expect(response.status).toBe("empty");
    });

    it("retorna 'error' controlado si el repositorio falla", async () => {
      const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);

      vi.spyOn(mockRepository, "search").mockRejectedValueOnce(new Error("DB Error"));
      const query: JurisprudencePublicSearchQuery = {
        text: "",
        filters: {},
        sort: "relevance",
        page: 1,
        pageSize: 10
      };

      const response = await gateway.search(query);
      expect(response.status).toBe("error");
    });
  });

  describe("getBySlug()", () => {
    it("retorna 'success' cuando el registro existe", async () => {
      const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);
      const mockItem = {
        slug: "test-slug",
        title: "Test Title",
        caseTitle: "Test Case Title",
        caseNumber: "EXP",
        resolutionNumber: "RES",
        resolutionType: "Sentencia",
        institutionName: "TC",
        issuingBody: "Pleno",
        matter: "Constitucional",
        issuedAt: "2026-08-01",
        summary: "Summary",
        sourceName: "TC",
        officialHtmlUrl: null,
        officialPdfUrl: null,
      } satisfies JurisprudencePublicProjectionDetail;
      vi.spyOn(mockRepository, "getBySlug").mockResolvedValueOnce(mockItem);
      const response = await gateway.getBySlug("test-slug");
      expect(response.status).toBe("success");
      if (response.status === "success") {
        expect(response.item).toBe(mockItem);
      }
    });

    it("retorna 'not_found' cuando el registro no existe", async () => {
      const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);
      vi.spyOn(mockRepository, "getBySlug").mockResolvedValueOnce(null);
      const response = await gateway.getBySlug("test-slug-404");
      expect(response.status).toBe("not_found");
    });

    it("retorna 'error' controlado si el repositorio falla", async () => {
      const gateway = new PostgresJurisprudencePublicSearchGateway(mockRepository);
      vi.spyOn(mockRepository, "getBySlug").mockRejectedValueOnce(new Error("DB Error"));
      const response = await gateway.getBySlug("test-slug");
      expect(response.status).toBe("error");
    });
  });
});
