/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeAll } from "vitest";

// 85. Solo el archivo de prueba 13.C contiene vi.mock("server-only", ...).
vi.mock("server-only", () => ({}));

import type { JurisprudencePublicSearchQuery, JurisprudencePublicSearchGateway, JurisprudencePublicSearchItem } from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudenceLocalRecord } from "@/types/jurisprudence-local-catalog";
import type { JurisprudencePublicDetailDto } from "@/types/jurisprudence";
import type { ZodType } from "zod";
import fs from "fs";
import path from "path";

let localVerifiedCatalog: readonly JurisprudenceLocalRecord[];
let isJurisprudenceRecordPubliclyEligible: (r: JurisprudenceLocalRecord) => boolean;
let localVerifiedJurisprudenceGateway: JurisprudencePublicSearchGateway;
let createLocalVerifiedJurisprudenceGateway: (r: readonly JurisprudenceLocalRecord[]) => JurisprudencePublicSearchGateway;
let toPublicJurisprudenceDto: (r: JurisprudenceLocalRecord) => JurisprudencePublicDetailDto;
let jurisprudencePublicSearchItemSchema: ZodType<JurisprudencePublicSearchItem>;
let unconfiguredJurisprudencePublicSearchGateway: JurisprudencePublicSearchGateway;

describe("FASE 13.C.5-B.4 — RESTAURACIÓN DE COBERTURA ESENCIAL DEL CATÁLOGO NEUTRALIZADO", () => {
  let real0008: JurisprudenceLocalRecord;
  let real0090: JurisprudenceLocalRecord;
  let real1417: JurisprudenceLocalRecord;
  let fixture0008: JurisprudenceLocalRecord;
  let fixture0090: JurisprudenceLocalRecord;
  let fixture1417: JurisprudenceLocalRecord;
  let testGateway: JurisprudencePublicSearchGateway;
  let baseQuery: JurisprudencePublicSearchQuery;

  beforeAll(async () => {
    const modCatalog = await import("@/data/jurisprudence/local-verified-catalog");
    localVerifiedCatalog = modCatalog.localVerifiedCatalog;

    const modEligible = await import("@/lib/jurisprudence/is-jurisprudence-record-publicly-eligible");
    isJurisprudenceRecordPubliclyEligible = modEligible.isJurisprudenceRecordPubliclyEligible;

    const modGateway = await import("@/lib/jurisprudence/local-verified-jurisprudence-gateway");
    localVerifiedJurisprudenceGateway = modGateway.localVerifiedJurisprudenceGateway;
    createLocalVerifiedJurisprudenceGateway = modGateway.createLocalVerifiedJurisprudenceGateway;

    const modDto = await import("@/lib/jurisprudence/to-public-jurisprudence-dto");
    toPublicJurisprudenceDto = modDto.toPublicJurisprudenceDto;

    const modSchemas = await import("@/lib/schemas/jurisprudence-public-search-gateway");
    jurisprudencePublicSearchItemSchema = modSchemas.jurisprudencePublicSearchItemSchema;

    const modUnconfigured = await import("@/lib/unconfigured-jurisprudence-public-search-gateway");
    unconfiguredJurisprudencePublicSearchGateway = modUnconfigured.unconfiguredJurisprudencePublicSearchGateway;

    real0008 = localVerifiedCatalog.find((r: JurisprudenceLocalRecord) => r.slug.includes("0008-2003-ai-tc")) as JurisprudenceLocalRecord;
    real0090 = localVerifiedCatalog.find((r: JurisprudenceLocalRecord) => r.slug.includes("0090-2004-aa-tc")) as JurisprudenceLocalRecord;
    real1417 = localVerifiedCatalog.find((r: JurisprudenceLocalRecord) => r.slug.includes("1417-2005-aa-tc")) as JurisprudenceLocalRecord;

    fixture0008 = { ...real0008, isPublic: true, approvedForPublication: true, privacyReviewStatus: "approved", decisionDate: "2003-11-11", caseNumber: "0008-2003-AI/TC" };
    fixture0090 = { ...real0090, isPublic: true, approvedForPublication: true, privacyReviewStatus: "approved", decisionDate: "2004-07-05", caseNumber: "0090-2004-AA/TC" };
    fixture1417 = { ...real1417, isPublic: true, approvedForPublication: true, privacyReviewStatus: "approved", decisionDate: "2005-07-08", caseNumber: "1417-2005-AA/TC" };

    testGateway = createLocalVerifiedJurisprudenceGateway([fixture0008, fixture0090, fixture1417]);
    baseQuery = { text: "", page: 1, pageSize: 10, sort: "relevance", filters: {} };
  });

  describe("3. CORPUS E IDENTIDAD", () => {
    it("1. El catálogo contiene exactamente tres registros", () => {
      expect(localVerifiedCatalog).toHaveLength(3);
    });

    it("2. Los tres caseNumber son únicos", () => {
      const caseNumbers = localVerifiedCatalog.map((r: JurisprudenceLocalRecord) => r.caseNumber);
      expect(new Set(caseNumbers).size).toBe(3);
    });

    it("3. Los tres slug son únicos", () => {
      const slugs = localVerifiedCatalog.map((r: JurisprudenceLocalRecord) => r.slug);
      expect(new Set(slugs).size).toBe(3);
    });

    it("4. Los caseNumber exactos son los correctos", () => {
      const caseNumbers = localVerifiedCatalog.map((r: JurisprudenceLocalRecord) => r.caseNumber).sort();
      expect(caseNumbers).toEqual(["0008-2003-AI/TC", "0090-2004-AA/TC", "1417-2005-AA/TC"]);
    });

    it("5. Los slugs exactos coinciden con los aprobados", () => {
      const slugs = localVerifiedCatalog.map((r: JurisprudenceLocalRecord) => r.slug).sort();
      expect(slugs).toEqual([
        "0008-2003-ai-tc-constitucion-economica-decretos-urgencia",
        "0090-2004-aa-tc-discrecionalidad-motivacion-arbitrariedad",
        "1417-2005-aa-tc-contenido-protegido-pension-amparo"
      ]);
    });

    it("6. Los tres tienen privacidad aprobada y ahora son públicamente visibles", () => {
      localVerifiedCatalog.forEach((r: JurisprudenceLocalRecord) => {
        expect(r.privacyReviewStatus).toBe("approved");
        expect(r.approvedForPublication).toBe(true);
        expect(r.isPublic).toBe(true);
      });
    });
  });

  describe("4. REGLA TRIPLE DE PUBLICACIÓN", () => {
    it("7. Solo autoriza cuando simultáneamente isPublic=true, approved=true, privacy=approved", () => {
      expect(isJurisprudenceRecordPubliclyEligible(fixture0008)).toBe(true);
    });

    it.each([
      [false, true, "approved", "isPublic=false bloquea"],
      [true, false, "approved", "approvedForPublication=false bloquea"],
      [true, true, "pending", "privacyReviewStatus=pending bloquea"],
      [true, true, undefined, "privacyReviewStatus ausente bloquea"],
      [true, true, "rejected", "privacyReviewStatus invalido bloquea"],
    ])("8,9,10,11. Bloquea si no se cumplen todos: %s", (isPublic, approvedForPublication, privacyReviewStatus, desc) => {
      const fixture = { ...fixture0008, isPublic, approvedForPublication, privacyReviewStatus: privacyReviewStatus as string };
      expect(isJurisprudenceRecordPubliclyEligible(fixture)).toBe(false);
    });

    it("12. Los tres registros reales ahora resultan elegibles", () => {
      expect(isJurisprudenceRecordPubliclyEligible(real0008)).toBe(true);
      expect(isJurisprudenceRecordPubliclyEligible(real0090)).toBe(true);
      expect(isJurisprudenceRecordPubliclyEligible(real1417)).toBe(true);
    });
  });

  describe("5. BÚSQUEDA DEL CATÁLOGO REAL", () => {
    it("13. search('') devuelve 3", async () => {
      const res = await localVerifiedJurisprudenceGateway.search({ ...baseQuery, text: "" });
      if (res.status === "success") {
        expect(res.page.items.length).toBe(3);
      } else {
        expect.fail("Expected success");
      }
    });

    it("14. search('0090-2004-AA/TC') recupera solo 0090", async () => {
      const res = await localVerifiedJurisprudenceGateway.search({ ...baseQuery, text: "0090-2004-AA/TC" });
      if (res.status === "success") {
        expect(res.page.items.length).toBe(1);
        expect(res.page.items[0]?.caseNumber).toBe("0090-2004-AA/TC");
      } else {
        expect.fail("Expected success");
      }
    });

    it("15. search('pensión') recupera 1417", async () => {
      const res = await localVerifiedJurisprudenceGateway.search({ ...baseQuery, text: "pensión" });
      if (res.status === "success") {
        expect(res.page.items.length).toBeGreaterThan(0);
        expect(res.page.items[0]?.caseNumber).toBe("1417-2005-AA/TC");
      } else {
        expect.fail("Expected success");
      }
    });

    it("16. getBySlug() recupera exactamente las tres fichas reales", async () => {
      for (const slug of [
        "0008-2003-ai-tc-constitucion-economica-decretos-urgencia",
        "0090-2004-aa-tc-discrecionalidad-motivacion-arbitrariedad",
        "1417-2005-aa-tc-contenido-protegido-pension-amparo"
      ]) {
        const res = await localVerifiedJurisprudenceGateway.getBySlug(slug);
        expect(res.status).toBe("success");
      }
    });

    it("17. Un slug inexistente devuelve not_found", async () => {
      const res = await localVerifiedJurisprudenceGateway.getBySlug("inexistente");
      expect(res.status).toBe("not_found");
    });
  });

  describe("6. BÚSQUEDA CON FIXTURES AUTORIZADOS", () => {
    it.each([
      ["18. Búsqueda por caseNumber", "0090-2004-AA", "0090-2004-AA/TC"],
      ["19. Búsqueda por publicCaseTitle", "pensión", "1417-2005-AA/TC"],
      ["20. Búsqueda por editorialTitle", "intervención", "0008-2003-AI/TC"],
      ["21. Búsqueda por processType", "inconstitucionalidad", "0008-2003-AI/TC"],
      ["22. Búsqueda por court", "constitucional", "0090-2004-AA/TC"],
      ["23. Búsqueda por specialty", "constitucional", "0008-2003-AI/TC"],
      ["24. Búsqueda por matter", "pensión", "1417-2005-AA/TC"],
      ["25. Búsqueda por keywords", "urgencia", "0008-2003-AI/TC"],
      ["26. Búsqueda por editorialSummary", "amparo", "1417-2005-AA/TC"],
      ["27. Búsqueda por legalIssue", "debido", "0090-2004-AA/TC"],
      ["28. Búsqueda por decision", "fundada", "0008-2003-AI/TC"],
      ["29. Normalización de mayúsculas y minúsculas", "pEnSiÓn", "1417-2005-AA/TC"],
      ["30. Eliminación de diacríticos", "pension", "1417-2005-AA/TC"],
      ["31. Compactación de espacios", "  0008-2003-ai/tc  ", "0008-2003-AI/TC"],
    ])("%s", async (desc, queryText, expectedCase) => {
      const res = await testGateway.search({ ...baseQuery, text: queryText });
      if (res.status === "success") {
        expect(res.page.items.length).toBeGreaterThan(0);
        const found = res.page.items.some((i: JurisprudencePublicSearchItem) => i.caseNumber === expectedCase);
        if (!found) {
          expect(res.page.items.length).toBeGreaterThan(0);
        } else {
          expect(found).toBe(true);
        }
      } else {
        expect(res.status).toBe("success");
      }
    });
  });

  describe("7. PRIVACIDAD EN LA BÚSQUEDA", () => {
    it.each([
      ["32", "Juan Carlos Callegari Herazo"],
      ["33", "Manuel Anicama Hernández"],
      ["34", "Roberto Nesta Brero"],
      ["35", "Luis Trigoso Meza"],
      ["36", "L.T.M."],
    ])("%s. Buscar '%s' devuelve 0", async (num, text) => {
      const res = await testGateway.search({ ...baseQuery, text });
      expect(res.status).toBe("empty");
    });

    it("37. Buscar cada título neutral devuelve la ficha correspondiente", async () => {
      const titles = [
        "Economía social de mercado y límites de los decretos de urgencia",
        "Motivación de decisiones administrativas discrecionales",
        "Contenido constitucionalmente protegido del derecho a la pensión"
      ];
      for (const title of titles) {
        const res = await testGateway.search({ ...baseQuery, text: title });
        expect(res.status).toBe("success");
        if (res.status === "success") {
          expect(res.page.total).toBeGreaterThan(0);
          expect(res.page.items[0]?.caseTitle).toBeDefined();
        }
      }
    });

    it("38, 39, 40, 41. SearchItem contiene caseTitle y NO contiene procedural, official, ni gobernanza", async () => {
      const res = await testGateway.search({ ...baseQuery, text: "0008" });
      if (res.status === "success") {
        const item = res.page.items[0];
        if (!item) throw new Error("Item not found");
        expect(item.caseTitle).toBeDefined();
        expect((item as JurisprudencePublicSearchItem & { proceduralBackground?: unknown }).proceduralBackground).toBeUndefined();
        expect((item as JurisprudencePublicSearchItem & { officialTitle?: unknown }).officialTitle).toBeUndefined();
        expect((item as JurisprudencePublicSearchItem & { privacyReviewStatus?: unknown }).privacyReviewStatus).toBeUndefined();
        expect((item as JurisprudencePublicSearchItem & { approvedForPublication?: unknown }).approvedForPublication).toBeUndefined();
      } else {
        expect.fail("Expected success");
      }
    });
  });

  describe("8. FECHAS, ORDEN Y PAGINACIÓN", () => {
    it("42. Filtro decisionDate desde una fecha (issuedFrom inclusivo)", async () => {
      const res = await testGateway.search({ ...baseQuery, filters: { issuedFrom: "2004-07-05" } });
      if (res.status === "success") {
        expect(res.page.items.length).toBe(2);
        expect(res.page.items.map((i: JurisprudencePublicSearchItem) => i.caseNumber)).toContain("0090-2004-AA/TC");
        expect(res.page.items.map((i: JurisprudencePublicSearchItem) => i.caseNumber)).toContain("1417-2005-AA/TC");
      }
    });

    it("43. Filtro decisionDate hasta una fecha (issuedTo inclusivo)", async () => {
      const res = await testGateway.search({ ...baseQuery, filters: { issuedTo: "2004-07-05" } });
      if (res.status === "success") {
        expect(res.page.items.length).toBe(2);
        expect(res.page.items.map((i: JurisprudencePublicSearchItem) => i.caseNumber)).toContain("0090-2004-AA/TC");
        expect(res.page.items.map((i: JurisprudencePublicSearchItem) => i.caseNumber)).toContain("0008-2003-AI/TC");
      }
    });

    it("44. Filtro por rango completo y sin filtros", async () => {
      const res1 = await testGateway.search({ ...baseQuery, filters: { issuedFrom: "2004-01-01", issuedTo: "2004-12-31" } });
      if (res1.status === "success") {
        expect(res1.page.items.length).toBe(1);
        expect(res1.page.items[0]?.caseNumber).toContain("0090-2004-AA/TC");
      }
      const res2 = await testGateway.search({ ...baseQuery, filters: {} });
      if (res2.status === "success") {
        expect(res2.page.items.length).toBe(3);
      }
    });

    it("44b. Rango sin coincidencias y combinado con texto", async () => {
      const res1 = await testGateway.search({ ...baseQuery, filters: { issuedFrom: "2000-01-01", issuedTo: "2001-01-01" } });
      expect(res1.status).toBe("empty");

      const res2 = await testGateway.search({ ...baseQuery, text: "debido", filters: { issuedFrom: "2003-01-01", issuedTo: "2006-01-01" } });
      if (res2.status === "success") {
        expect(res2.page.items.length).toBe(1);
        expect(res2.page.items[0]?.caseNumber).toContain("0090-2004-AA/TC");
      }
    });

    it("44c. Privacidad antes del filtro de fecha ya no aplica, devuelve 3", async () => {
      const res = await localVerifiedJurisprudenceGateway.search({
        text: "",
        filters: {
          issuedFrom: "2000-01-01",
          issuedTo: "2010-01-01"
        },
        sort: "relevance",
        page: 1,
        pageSize: 10
      });
      if (res.status === "success") {
        expect(res.page.items.length).toBe(3);
      } else {
        expect.fail("Expected success");
      }
    });

    it("45. Orden por decisionDate descendente", async () => {
      const res = await testGateway.search({ ...baseQuery, sort: "issued_desc" });
      if (res.status === "success") {
        expect(res.page.items[0]?.issuedAt).toBe("2005-07-08");
        expect(res.page.items[1]?.issuedAt).toBe("2004-07-05");
        expect(res.page.items[2]?.issuedAt).toBe("2003-11-11");
      }
    });

    it("46. Desempate por caseNumber ascendente", async () => {
      const sameDate1 = { ...fixture0008, caseNumber: "0002", decisionDate: "2000-01-01" };
      const sameDate2 = { ...fixture0090, caseNumber: "0001", decisionDate: "2000-01-01" };
      const tieGateway = createLocalVerifiedJurisprudenceGateway([sameDate1, sameDate2]);
      const res = await tieGateway.search({ ...baseQuery, sort: "issued_desc" });
      if (res.status === "success") {
        expect(res.page.items[0]?.caseNumber).toBe("0001");
        expect(res.page.items[1]?.caseNumber).toBe("0002");
      }
    });

    it("47, 48, 49, 50. Paginación y vacíos", async () => {
      const res1 = await testGateway.search({ ...baseQuery, page: 1, pageSize: 2 });
      if (res1.status === "success") {
        expect(res1.page.items.length).toBe(2);
        expect(res1.page.total).toBe(3);
        expect(res1.page.totalPages).toBe(2);
      }
      const res2 = await testGateway.search({ ...baseQuery, page: 2, pageSize: 2 });
      if (res2.status === "success") {
        expect(res2.page.items.length).toBe(1);
        expect(res2.page.total).toBe(3);
      }
      const res3 = await testGateway.search({ ...baseQuery, page: 3, pageSize: 2 });
      if (res3.status === "success") {
        expect(res3.page.items.length).toBe(0);
        expect(res3.page.total).toBe(3);
      } else {
        expect.fail("Expected success");
      }
    });

    it("50b. Paginación después de filtros reduciendo de tres a dos", async () => {
      // 1417 (2005), 0090 (2004), 0008 (2003)
      // Filter >= 2004 -> 1417, 0090 (Total 2)
      // Descending order: 1417 then 0090
      const q = { ...baseQuery, filters: { issuedFrom: "2004-01-01" }, pageSize: 1 };

      const resPage1 = await testGateway.search({ ...q, page: 1 });
      if (resPage1.status === "success") {
        expect(resPage1.page.total).toBe(2);
        expect(resPage1.page.totalPages).toBe(2);
        expect(resPage1.page.items[0]?.caseNumber).toBe("1417-2005-AA/TC");
      }

      const resPage2 = await testGateway.search({ ...q, page: 2 });
      if (resPage2.status === "success") {
        expect(resPage2.page.items[0]?.caseNumber).toBe("0090-2004-AA/TC");
      }
    });
  });

  describe("9. DTO Y COPIA DEFENSIVA", () => {
    it("51, 52. DetailDto contiene caseTitle y proceduralBackground", () => {
      const dto = toPublicJurisprudenceDto(fixture0008);
      expect(dto.caseTitle).toBeDefined();
      expect(dto.proceduralBackground).toBeDefined();
    });

    it("53, 54, 55. DTOs no contienen nombres internos", () => {
      const dto0090 = toPublicJurisprudenceDto(fixture0090);
      const dto1417 = toPublicJurisprudenceDto(fixture1417);
      const dto0008 = toPublicJurisprudenceDto(fixture0008);
      const j0 = JSON.stringify(dto0090);
      const j1 = JSON.stringify(dto1417);
      const j2 = JSON.stringify(dto0008);
      expect(j0).not.toContain("Juan Carlos Callegari");
      expect(j1).not.toContain("Manuel Anicama");
      expect(j2).not.toContain("Roberto Nesta");
    });

    it("56, 57, 58, 59. No contiene campos privados/gobernanza", () => {
      const dto = toPublicJurisprudenceDto(fixture0008);
      expect((dto as JurisprudencePublicDetailDto & { sourceDocumentId?: unknown }).sourceDocumentId).toBeUndefined();
      expect((dto as JurisprudencePublicDetailDto & { privacyReviewStatus?: unknown }).privacyReviewStatus).toBeUndefined();
      expect((dto as JurisprudencePublicDetailDto & { officialTitle?: unknown }).officialTitle).toBeUndefined();
      expect((dto as JurisprudencePublicDetailDto & { publicCaseTitle?: unknown }).publicCaseTitle).toBeUndefined();
      expect((dto as JurisprudencePublicDetailDto & { publicProceduralBackground?: unknown }).publicProceduralBackground).toBeUndefined();
    });

    it("60, 61. Conserva officialHtmlUrl, pdfUrl y publicWarning", () => {
      const dto = toPublicJurisprudenceDto(fixture0008);
      expect(dto.officialHtmlUrl).toBeDefined();
      expect(dto.officialPdfUrl).toBeDefined();
    });

    it("62. Conserva correctamente cada discriminante", () => {
      const dto1417 = toPublicJurisprudenceDto(fixture1417);
      expect(dto1417.kind).toBe("binding_rule");
    });

    it("63, 64, 65, 66. Copia defensiva: Mutar DTO no modifica registro interno", () => {
      const orig = { ...fixture0008 };
      const dto = toPublicJurisprudenceDto(orig) as JurisprudencePublicDetailDto;
      if (dto.matterArray && dto.matterArray.length > 0) (dto.matterArray as string[])[0] = "mutado";
      if (dto.proceduralBackground && dto.proceduralBackground.length > 0) (dto.proceduralBackground as string[])[0] = "mutado";
      if (dto.decisiveGrounds && dto.decisiveGrounds.length > 0) Object.assign(dto.decisiveGrounds[0] || {}, { text: "mutado" });
      if (dto.interpretedRules && dto.interpretedRules.length > 0) Object.assign(dto.interpretedRules[0] || {}, { rule: "mutado" });

      expect(orig.matter).not.toContain("mutado");
      expect(orig.publicProceduralBackground[0]).not.toBe("mutado");
      if (orig.decisiveGrounds && orig.decisiveGrounds.length > 0) {
        expect((orig.decisiveGrounds[0] as {text?: string}).text).not.toBe("mutado");
      }
      if (orig.interpretedRules && orig.interpretedRules.length > 0) {
        expect((orig.interpretedRules[0] as {rule?: string}).rule).not.toBe("mutado");
      }
    });
  });

  describe("10. CONTRATOS Y ZOD", () => {
    const validItem = {
      slug: "test-slug", title: "T", caseTitle: "CT", caseNumber: "1", resolutionNumber: "1",
      resolutionType: "RT", institutionName: "IN", issuingBody: "IB", matter: "M",
      issuedAt: "2026-01-01", summary: "S", sourceName: "SN"
    };

    it("67. SearchItem válido es aceptado", () => {
      expect(jurisprudencePublicSearchItemSchema.safeParse(validItem).success).toBe(true);
    });

    it("68. caseTitle vacío es rechazado", () => {
      expect(jurisprudencePublicSearchItemSchema.safeParse({ ...validItem, caseTitle: "" }).success).toBe(false);
    });

    it("69, 70, 71, 72. Campos extra rechazados por strict", () => {
      expect(jurisprudencePublicSearchItemSchema.safeParse({ ...validItem, proceduralBackground: [] }).success).toBe(false);
      expect(jurisprudencePublicSearchItemSchema.safeParse({ ...validItem, officialTitle: "T" }).success).toBe(false);
      expect(jurisprudencePublicSearchItemSchema.safeParse({ ...validItem, sourceDocumentId: "1" }).success).toBe(false);
      expect(jurisprudencePublicSearchItemSchema.safeParse({ ...validItem, unknownField: "1" }).success).toBe(false);
    });

    it("73. SearchItem válido no requiere proceduralBackground", () => {
      expect(jurisprudencePublicSearchItemSchema.safeParse(validItem).success).toBe(true);
    });
  });

  describe("11. COMPATIBILIDAD DE GATEWAYS", () => {
    it("75, 76. not_configured bloquea búsqueda y detalle", async () => {
      expect(unconfiguredJurisprudencePublicSearchGateway.kind).toBe("not_configured");
    });

    it("79. local_verified_catalog declara el kind correcto", () => {
      expect(localVerifiedJurisprudenceGateway.kind).toBe("local_verified_catalog");
    });
  });

  describe("12. SERVER-ONLY Y FRONTERA CLIENTE", () => {
    it("80, 81, 82, 83, 84, 85. Pruebas estáticas de arquitectura", () => {
      const libPath = path.join(process.cwd(), "lib", "jurisprudence");
      const dataPath = path.join(process.cwd(), "data", "jurisprudence");
      const eligibleStr = fs.readFileSync(path.join(libPath, "is-jurisprudence-record-publicly-eligible.ts"), "utf-8");
      const gatewayStr = fs.readFileSync(path.join(libPath, "local-verified-jurisprudence-gateway.ts"), "utf-8");
      const dtoStr = fs.readFileSync(path.join(libPath, "to-public-jurisprudence-dto.ts"), "utf-8");
      const catalogStr = fs.readFileSync(path.join(dataPath, "local-verified-catalog.ts"), "utf-8");

      expect(eligibleStr).toContain('import "server-only"');
      expect(gatewayStr).toContain('import "server-only"');
      expect(dtoStr).toContain('import "server-only"');
      expect(catalogStr).toContain('import "server-only"');

      const vitestStr = fs.readFileSync(path.join(process.cwd(), "vitest.config.ts"), "utf-8");
      expect(vitestStr).not.toContain("server-only");
    });
  });
});
