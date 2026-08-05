// @vitest-environment node

import { describe, expect, it } from "vitest";
import { ConfiguredJurisprudencePublicSearchGateway } from "@/lib/configured-jurisprudence-public-search-gateway";
import { projectReadModelToPublicItem, projectSearchMatchToPublicItem } from "@/lib/jurisprudence-public-search-projection";
import { jurisprudencePublicSearchItemSchema } from "@/lib/schemas/jurisprudence-public-search-gateway";
import type { JurisprudencePublicReadModel, JurisprudencePublicReadModelRepository } from "@/types/jurisprudence-public-exposure";
import type { JurisprudencePublicSearchIndexService, JurisprudenceSearchMatch, JurisprudenceSearchResult } from "@/types/jurisprudence-public-search";
import type { JurisprudencePublicSearchItem, JurisprudencePublicSearchQuery } from "@/types/jurisprudence-public-search-gateway";

const validQuery: JurisprudencePublicSearchQuery = Object.freeze({
  text: "criterio laboral",
  filters: Object.freeze({ matter: "laboral" }),
  sort: "relevance",
  page: 1,
  pageSize: 10,
});

const mockSearchMatch: JurisprudenceSearchMatch = Object.freeze({
  searchDocumentId: "doc-internal-001",
  publicRecordId: "public-001",
  recordId: "rec-001",
  recordVersion: 1,
  publicRevision: 1,
  slug: "resolucion-laboral-001",
  title: "Casación Laboral 1234-2025",
  caseNumber: "EXP-1234-2025",
  resolutionNumber: "RES-1234",
  resolutionType: "Casación",
  institutionName: "Corte Suprema",
  issuingBody: "Sala Derecho Constitucional y Social",
  matter: "Laboral",
  issuedAt: "2025-06-15",
  summary: "Resumen de prueba de casación laboral.",
  sourceName: "Diario Oficial El Peruano",
  sourceDocumentId: "DOC-PERUANO-001",
  matchedBy: ["terms" as const],
  score: 1.5,
});

const mockReadModel: JurisprudencePublicReadModel = Object.freeze({
  publicRecordId: "public-001",
  projectionId: "proj-001",
  recordId: "rec-001",
  recordVersion: 1,
  slug: "resolucion-laboral-001",
  title: "Casación Laboral 1234-2025",
  caseNumber: "EXP-1234-2025",
  resolutionNumber: "RES-1234",
  resolutionType: "Casación",
  institutionName: "Corte Suprema",
  issuingBody: "Sala Derecho Constitucional y Social",
  matter: "Laboral",
  issuedAt: "2025-06-15",
  summary: "Resumen de prueba de casación laboral.",
  sourceName: "Diario Oficial El Peruano",
  sourceDocumentId: "DOC-PERUANO-001",
  publicStatus: "exposed",
  preparedAt: "2025-06-15T10:00:00.000Z",
  exposedAt: "2025-06-15T10:05:00.000Z",
  withdrawnAt: null,
  supersededAt: null,
  publicRevision: 1,
  exposedPublicly: true,
  indexed: false,
  deployed: false,
});

function createMockSearchService(
  overrides?: Partial<JurisprudencePublicSearchIndexService>,
): JurisprudencePublicSearchIndexService {
  return {
    prepare: async () => { throw new Error("not implemented"); },
    index: async () => { throw new Error("not implemented"); },
    search: async (): Promise<JurisprudenceSearchResult> => ({
      items: [mockSearchMatch],
      total: 1,
      offset: 0,
      limit: 10,
      hasMore: false,
      querySummary: { textProvided: true, filterCount: 1, sort: "relevance" },
      realPublicSearch: false,
    }),
    withdraw: async () => { throw new Error("not implemented"); },
    supersede: async () => { throw new Error("not implemented"); },
    get: async () => { throw new Error("not implemented"); },
    getHistory: async () => [],
    close: async () => {},
    ...overrides,
  };
}

function createMockReadModelRepository(
  overrides?: Partial<JurisprudencePublicReadModelRepository>,
): JurisprudencePublicReadModelRepository {
  return {
    findById: async () => null,
    findActiveByRecordVersion: async () => null,
    findActiveBySlug: async (slug: string) => (slug === mockReadModel.slug ? mockReadModel : null),
    listByRecord: async () => [],
    close: async () => {},
    ...overrides,
  };
}

describe("ConfiguredJurisprudencePublicSearchGateway (Fase 11.P)", () => {
  it("identifica el gateway como 'configured'", () => {
    const gateway = new ConfiguredJurisprudencePublicSearchGateway(
      createMockSearchService(),
      createMockReadModelRepository(),
    );
    expect(gateway.kind).toBe("configured");
  });

  describe("search()", () => {
    it("retorna 'success' con elementos proyectados según allowlist", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService(),
        createMockReadModelRepository(),
      );

      const response = await gateway.search(validQuery);
      expect(response.status).toBe("success");
      if (response.status === "success") {
        expect(response.page.total).toBe(1);
        expect(response.page.items).toHaveLength(1);
        const item = response.page.items[0]!;
        expect(item.slug).toBe(mockSearchMatch.slug);
        expect(item.title).toBe(mockSearchMatch.title);

        // Verify explicit allowlist (no internal leak)
        const parseResult = jurisprudencePublicSearchItemSchema.safeParse(item);
        expect(parseResult.success).toBe(true);
        expect(Object.keys(item).sort()).toEqual([
          "caseNumber",
          "institutionName",
          "issuedAt",
          "issuingBody",
          "matter",
          "resolutionNumber",
          "resolutionType",
          "slug",
          "sourceDocumentId",
          "sourceName",
          "summary",
          "title",
        ].sort());
      }
    });

    it("retorna 'empty' cuando la búsqueda no devuelve coincidencias", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService({
          search: async (): Promise<JurisprudenceSearchResult> => ({
            items: [],
            total: 0,
            offset: 0,
            limit: 10,
            hasMore: false,
            querySummary: { textProvided: false, filterCount: 0, sort: "relevance" },
            realPublicSearch: false,
          }),
        }),
        createMockReadModelRepository(),
      );

      const response = await gateway.search(validQuery);
      expect(response.status).toBe("empty");
      if (response.status === "empty") {
        expect(response.page.total).toBe(0);
        expect(response.page.items).toHaveLength(0);
      }
    });

    it("retorna 'invalid_query' ante una consulta con datos no válidos", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService(),
        createMockReadModelRepository(),
      );

      const response = await gateway.search({
        ...validQuery,
        page: -1,
      });
      expect(response.status).toBe("invalid_query");
    });

    it("retorna 'error' controlado si el servicio de índice falla", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService({
          search: async () => {
            throw new Error("Simulated index connection error");
          },
        }),
        createMockReadModelRepository(),
      );

      const response = await gateway.search(validQuery);
      expect(response.status).toBe("error");
    });
  });

  describe("getBySlug()", () => {
    it("retorna 'success' con el ítem proyectado cuando el slug existe", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService(),
        createMockReadModelRepository(),
      );

      const response = await gateway.getBySlug("resolucion-laboral-001");
      expect(response.status).toBe("success");
      if (response.status === "success") {
        expect(response.item.slug).toBe("resolucion-laboral-001");
        expect(jurisprudencePublicSearchItemSchema.safeParse(response.item).success).toBe(true);
      }
    });

    it("retorna 'not_found' cuando el slug no existe", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService(),
        createMockReadModelRepository(),
      );

      const response = await gateway.getBySlug("slug-inexistente");
      expect(response.status).toBe("not_found");
    });

    it("retorna 'not_found' ante un slug sintácticamente inválido", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService(),
        createMockReadModelRepository(),
      );

      const response = await gateway.getBySlug("slug INVALIDO!");
      expect(response.status).toBe("not_found");
    });

    it("retorna 'error' controlado si el repositorio falla", async () => {
      const gateway = new ConfiguredJurisprudencePublicSearchGateway(
        createMockSearchService(),
        createMockReadModelRepository({
          findActiveBySlug: async () => {
            throw new Error("Database failure");
          },
        }),
      );

      const response = await gateway.getBySlug("resolucion-laboral-001");
      expect(response.status).toBe("error");
    });
  });

  describe("Proyecciones Allowlist públicas", () => {
    it("projectSearchMatchToPublicItem sólo retiene 12 campos autorizados", () => {
      const publicItem: JurisprudencePublicSearchItem = projectSearchMatchToPublicItem(mockSearchMatch);
      expect(Object.keys(publicItem).length).toBe(12);
      expect(publicItem).not.toHaveProperty("searchDocumentId");
      expect(publicItem).not.toHaveProperty("publicRecordId");
      expect(publicItem).not.toHaveProperty("recordId");
      expect(publicItem).not.toHaveProperty("score");
      expect(publicItem).not.toHaveProperty("matchedBy");
    });

    it("projectReadModelToPublicItem sólo retiene 12 campos autorizados", () => {
      const publicItem: JurisprudencePublicSearchItem = projectReadModelToPublicItem(mockReadModel);
      expect(Object.keys(publicItem).length).toBe(12);
      expect(publicItem).not.toHaveProperty("projectionId");
      expect(publicItem).not.toHaveProperty("publicRecordId");
      expect(publicItem).not.toHaveProperty("recordId");
      expect(publicItem).not.toHaveProperty("publicStatus");
    });
  });
});
