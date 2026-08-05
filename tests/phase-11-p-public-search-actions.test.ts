// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  evaluateJurisprudencePublicSearchActivationReadiness,
  isJurisprudencePublicSearchActivationReady,
} from "@/lib/jurisprudence-public-search-activation-readiness";
import {
  getPublicJurisprudenceBySlugAction,
  searchPublicJurisprudenceAction,
  validatePublicSearchItem,
} from "@/lib/jurisprudence-public-search-actions";

describe("Jurisprudence Public Search Server Actions & Readiness (Fase 11.P)", () => {
  describe("evaluateJurisprudencePublicSearchActivationReadiness()", () => {
    it("mantiene todos los flags de activación productiva en false (dormant / default deny)", () => {
      const readiness = evaluateJurisprudencePublicSearchActivationReadiness();
      expect(readiness.adapterCodeImplemented).toBe(true);
      expect(readiness.activationAuthorized).toBe(false);
      expect(readiness.realPublicExposurePresent).toBe(false);
      expect(readiness.realSearchIndexPresent).toBe(false);
      expect(readiness.realPublicSearchGatewayConfigured).toBe(false);
      expect(readiness.publicSearchConnectedToRealData).toBe(false);
      expect(readiness.searchEndpointMounted).toBe(false);
      expect(readiness.published).toBe(false);
      expect(readiness.deployed).toBe(false);
    });

    it("isJurisprudencePublicSearchActivationReady() retorna false en el estado actual", () => {
      const readiness = evaluateJurisprudencePublicSearchActivationReadiness();
      expect(isJurisprudencePublicSearchActivationReady(readiness)).toBe(false);
    });
  });

  describe("searchPublicJurisprudenceAction()", () => {
    it("retorna status 'not_configured' ante una consulta válida cuando la activación no está autorizada", async () => {
      const response = await searchPublicJurisprudenceAction({
        text: "laboral",
        filters: {},
        sort: "relevance",
        page: 1,
        pageSize: 10,
      });

      expect(response.status).toBe("not_configured");
      if (response.status === "not_configured") {
        expect(response.message).toContain("todavía no se encuentra habilitado");
      }
    });

    it("retorna status 'invalid_query' ante una consulta inválida", async () => {
      const response = await searchPublicJurisprudenceAction({
        page: -5,
      });

      expect(response.status).toBe("invalid_query");
      if (response.status === "invalid_query") {
        expect(response.message).toBe("Revise los criterios de búsqueda.");
      }
    });

    it("soporta parámetros null u objetos malformados sin lanzar excepciones", async () => {
      const response = await searchPublicJurisprudenceAction(null);
      expect(response.status).toBe("invalid_query");
    });
  });

  describe("getPublicJurisprudenceBySlugAction()", () => {
    it("retorna status 'not_configured' para un slug válido cuando la activación no está autorizada", async () => {
      const response = await getPublicJurisprudenceBySlugAction("resolucion-valida-001");
      expect(response.status).toBe("not_configured");
    });

    it("retorna status 'not_found' para un slug sintácticamente inválido", async () => {
      const response = await getPublicJurisprudenceBySlugAction("SLUG INVALIDO #!");
      expect(response.status).toBe("not_found");
    });

    it("soporta tipos no string sin lanzar excepciones", async () => {
      const response = await getPublicJurisprudenceBySlugAction(12345);
      expect(response.status).toBe("not_found");
    });
  });

  describe("validatePublicSearchItem()", () => {
    it("acepta un ítem que cumple strictly con el allowlist público", async () => {
      const validItem = {
        slug: "resolucion-001",
        title: "Resolución de Prueba",
        caseNumber: "EXP-001",
        resolutionNumber: "RES-001",
        resolutionType: "Sentencia",
        institutionName: "TC",
        issuingBody: "Pleno",
        matter: "Constitucional",
        issuedAt: "2026-01-01",
        summary: "Resumen",
        sourceName: "TC Portal",
        sourceDocumentId: "DOC-001",
      };
      expect(await validatePublicSearchItem(validItem)).toBe(true);
    });

    it("rechaza ítems con campos ausentes o tipos incorrectos", async () => {
      const invalidItem = {
        slug: "resolucion-001",
        title: "Resolución de Prueba",
        // missing caseNumber
      };
      expect(await validatePublicSearchItem(invalidItem)).toBe(false);
    });
  });
});
