import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  searchLocalVerifiedJurisprudenceAction,
  getLocalVerifiedJurisprudenceBySlugAction,
} from "@/lib/jurisprudence/local-verified-jurisprudence-public-actions";
import fs from "fs";
import path from "path";

vi.mock("server-only", () => ({}));

describe("Phase 13.C.7: Local Verified Server Actions", () => {
  const emptyQuery = {
    filters: {},
    sort: "relevance",
    page: 1,
    pageSize: 10,
  };

  let discoveredSlugs: string[] = [];

  beforeAll(async () => {
    const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
    if (response.status === "success") {
      discoveredSlugs = response.page.items.map((item) => item.slug);
    }
  });

  describe("4. Pruebas de Búsqueda", () => {
    it("1. La consulta vacía devuelve status 'success'", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      expect(response.status).toBe("success");
    });

    it("2. La consulta vacía devuelve exactamente tres resultados", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        expect(response.page.items).toHaveLength(3);
      } else {
        expect.fail("Status should be success");
      }
    });

    it("3. Devuelve únicamente los tres expedientes esperados", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        const caseNumbers = response.page.items.map((i) => i.caseNumber);
        expect(caseNumbers).toContain("0090-2004-AA/TC");
        expect(caseNumbers).toContain("1417-2005-AA/TC");
        expect(caseNumbers).toContain("0008-2003-AI/TC");
      } else {
        expect.fail("Status should be success");
      }
    });

    it("4. Cada resultado contiene caseTitle", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(item).toHaveProperty("caseTitle");
          expect(typeof item.caseTitle).toBe("string");
        });
      } else {
        expect.fail();
      }
    });

    it("5. Ningún SearchItem contiene proceduralBackground", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(item).not.toHaveProperty("proceduralBackground");
        });
      } else {
        expect.fail();
      }
    });

    it("6. Ningún SearchItem contiene officialTitle", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(item).not.toHaveProperty("officialTitle");
        });
      } else {
        expect.fail();
      }
    });

    it("7. Ningún SearchItem contiene sourceDocumentId", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(item).not.toHaveProperty("sourceDocumentId");
        });
      } else {
        expect.fail();
      }
    });

    it("8. Ningún SearchItem contiene campos privados internos", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction(emptyQuery);
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(item).not.toHaveProperty("privacyReviewStatus");
          expect(item).not.toHaveProperty("approvedForPublication");
          expect(item).not.toHaveProperty("isPublic");
          expect(item).not.toHaveProperty("reviewer");
          expect(item).not.toHaveProperty("reviewedAt");
          expect(item).not.toHaveProperty("legalReviewStatus");
          expect(item).not.toHaveProperty("interpretationStatus");
        });
      } else {
        expect.fail();
      }
    });

    it("9. Buscar '0090-2004-AA/TC' devuelve únicamente 0090", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        text: "0090-2004-AA/TC",
      });
      if (response.status === "success") {
        expect(response.page.items).toHaveLength(1);
        expect(response.page.items[0]?.caseNumber).toBe("0090-2004-AA/TC");
      } else {
        expect.fail();
      }
    });

    it("10. Buscar 'pensión' devuelve únicamente 1417", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        text: "pensión",
      });
      if (response.status === "success") {
        expect(response.page.items).toHaveLength(1);
        expect(response.page.items[0]?.caseNumber).toBe("1417-2005-AA/TC");
      } else {
        expect.fail();
      }
    });

    it("11. Buscar 'economía social de mercado' devuelve únicamente 0008", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        text: "economía social de mercado",
      });
      if (response.status === "success") {
        expect(response.page.items).toHaveLength(1);
        expect(response.page.items[0]?.caseNumber).toBe("0008-2003-AI/TC");
      } else {
        expect.fail();
      }
    });

    it("12. Buscar cada nombre privado devuelve status 'empty'", async () => {
      const privateNames = [
        "Juan Carlos Callegari Herazo",
        "Manuel Anicama Hernández",
        "Roberto Nesta Brero",
        "Luis Trigoso Meza",
        "L.T.M.",
      ];
      for (const name of privateNames) {
        const response = await searchLocalVerifiedJurisprudenceAction({
          ...emptyQuery,
          text: name,
        });
        expect(response.status).toBe("empty");
      }
    });

    it("13. Respeta issuedFrom", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        filters: { issuedFrom: "2005-01-01" },
      });
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(new Date(item.issuedAt).getTime()).toBeGreaterThanOrEqual(
            new Date("2005-01-01").getTime(),
          );
        });
      } else {
        expect.fail();
      }
    });

    it("14. Respeta issuedTo", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        filters: { issuedTo: "2004-12-31" },
      });
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          expect(new Date(item.issuedAt).getTime()).toBeLessThanOrEqual(
            new Date("2004-12-31").getTime(),
          );
        });
      } else {
        expect.fail();
      }
    });

    it("15. Respeta rango completo", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        filters: { issuedFrom: "2004-01-01", issuedTo: "2004-12-31" },
      });
      if (response.status === "success") {
        response.page.items.forEach((item) => {
          const time = new Date(item.issuedAt).getTime();
          expect(time).toBeGreaterThanOrEqual(new Date("2004-01-01").getTime());
          expect(time).toBeLessThanOrEqual(new Date("2004-12-31").getTime());
        });
      } else {
        expect.fail();
      }
    });

    it("16. Respeta page y pageSize", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        page: 1,
        pageSize: 1,
      });
      if (response.status === "success") {
        expect(response.page.items).toHaveLength(1);
        expect(response.page.total).toBe(3);
        expect(response.page.totalPages).toBe(3);
      } else {
        expect.fail();
      }
    });

    it("17. Una consulta sin coincidencias devuelve status 'empty'", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        ...emptyQuery,
        text: "texto definitivamente no existe en la base de datos",
      });
      expect(response.status).toBe("empty");
    });

    it("18. Una consulta inválida devuelve status 'invalid_query' y mensaje público seguro", async () => {
      const response = await searchLocalVerifiedJurisprudenceAction({
        invalid: "query",
      });
      expect(response.status).toBe("invalid_query");
      if (response.status === "invalid_query") {
        expect(response.message).toBe("Revise los criterios de búsqueda.");
      }
    });
  });

  describe("5. Pruebas de Detalle", () => {
    it("19. Cada uno de los tres slugs válidos devuelve status 'success'", async () => {
      expect(discoveredSlugs.length).toBe(3);
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        expect(response.status).toBe("success");
      }
    });

    it("20. Cada respuesta success contiene caseTitle", async () => {
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        if (response.status === "success") {
          expect(response.item).toHaveProperty("caseTitle");
          expect(typeof response.item.caseTitle).toBe("string");
        } else {
          expect.fail();
        }
      }
    });

    it("21. Cada respuesta success contiene proceduralBackground neutralizado", async () => {
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        if (response.status === "success") {
          expect(response.item).toHaveProperty("proceduralBackground");
          expect(Array.isArray(response.item.proceduralBackground)).toBe(true);
        } else {
          expect.fail();
        }
      }
    });

    it("22. Cada respuesta success contiene publicWarning", async () => {
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        if (response.status === "success") {
          expect(response.item).toHaveProperty("publicWarning");
          expect(typeof response.item.publicWarning).toBe("string");
        } else {
          expect.fail();
        }
      }
    });

    it("23. Cada respuesta success conserva URLs oficiales cuando existan", async () => {
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        if (response.status === "success") {
          expect(response.item).toHaveProperty("officialHtmlUrl");
          expect(response.item).toHaveProperty("officialPdfUrl");
        } else {
          expect.fail();
        }
      }
    });

    it("24. El DTO 0090 no contiene Juan Carlos Callegari Herazo", async () => {
      const slug0090 = discoveredSlugs.find((s) => s.includes("0090"));
      if (slug0090) {
        const response =
          await getLocalVerifiedJurisprudenceBySlugAction(slug0090);
        if (response.status === "success") {
          const stringified = JSON.stringify(response.item);
          expect(stringified).not.toContain("Juan Carlos Callegari Herazo");
        } else {
          expect.fail();
        }
      } else {
        expect.fail("Slug 0090 not found");
      }
    });

    it("25. El DTO 1417 no contiene Manuel Anicama Hernández", async () => {
      const slug1417 = discoveredSlugs.find((s) => s.includes("1417"));
      if (slug1417) {
        const response =
          await getLocalVerifiedJurisprudenceBySlugAction(slug1417);
        if (response.status === "success") {
          const stringified = JSON.stringify(response.item);
          expect(stringified).not.toContain("Manuel Anicama Hernández");
        } else {
          expect.fail();
        }
      } else {
        expect.fail("Slug 1417 not found");
      }
    });

    it("26. El DTO 0008 no contiene Roberto Nesta Brero", async () => {
      const slug0008 = discoveredSlugs.find(
        (s) => s.includes("0008") || s.includes("008"),
      );
      if (slug0008) {
        const response =
          await getLocalVerifiedJurisprudenceBySlugAction(slug0008);
        if (response.status === "success") {
          const stringified = JSON.stringify(response.item);
          expect(stringified).not.toContain("Roberto Nesta Brero");
        } else {
          expect.fail();
        }
      } else {
        expect.fail("Slug 0008 not found");
      }
    });

    it("27. Ningún DTO contiene Luis Trigoso Meza ni L.T.M.", async () => {
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        if (response.status === "success") {
          const stringified = JSON.stringify(response.item);
          expect(stringified).not.toContain("Luis Trigoso Meza");
          expect(stringified).not.toContain("L.T.M.");
        } else {
          expect.fail();
        }
      }
    });

    it("28. Ningún DTO contiene campos privados internos", async () => {
      for (const slug of discoveredSlugs) {
        const response = await getLocalVerifiedJurisprudenceBySlugAction(slug);
        if (response.status === "success") {
          const item = response.item;
          expect(item).not.toHaveProperty("officialTitle");
          expect(item).not.toHaveProperty("publicCaseTitle");
          expect(item).not.toHaveProperty("publicProceduralBackground");
          expect(item).not.toHaveProperty("sourceDocumentId");
          expect(item).not.toHaveProperty("privacyReviewStatus");
          expect(item).not.toHaveProperty("approvedForPublication");
          expect(item).not.toHaveProperty("isPublic");
          expect(item).not.toHaveProperty("reviewer");
          expect(item).not.toHaveProperty("reviewedAt");
          expect(item).not.toHaveProperty("legalReviewStatus");
          expect(item).not.toHaveProperty("interpretationStatus");
        } else {
          expect.fail();
        }
      }
    });

    it("29. Un slug inexistente devuelve status 'not_found'", async () => {
      const response =
        await getLocalVerifiedJurisprudenceBySlugAction("tc-99999-9999-xx");
      expect(response.status).toBe("not_found");
    });

    it("30. Un slug vacío devuelve el estado contractual definido por la acción", async () => {
      const response = await getLocalVerifiedJurisprudenceBySlugAction("");
      expect(response.status).toBe("not_found");
    });
  });

  describe("6. Seguridad del Módulo", () => {
    const actionFilePath = path.join(
      process.cwd(),
      "lib",
      "jurisprudence",
      "local-verified-jurisprudence-public-actions.ts",
    );
    let fileContent: string;

    beforeAll(() => {
      fileContent = fs.readFileSync(actionFilePath, "utf8");
    });

    it("31. El archivo de acciones comienza con 'use server'", () => {
      expect(fileContent.trim().startsWith('"use server";')).toBe(true);
    });

    it("32. No exporta localVerifiedJurisprudenceGateway", () => {
      expect(fileContent).not.toMatch(
        /export\s+(const|let|var|function|class)\s+localVerifiedJurisprudenceGateway/,
      );
    });

    it("33. No exporta registros ni catálogo", () => {
      expect(fileContent).not.toMatch(
        /export\s+(const|let|var|function|class)\s+.*catalog/i,
      );
      expect(fileContent).not.toMatch(
        /export\s+(const|let|var|function|class)\s+.*records/i,
      );
    });

    it("34. No contiene fetch", () => {
      expect(fileContent).not.toContain(" fetch(");
      expect(fileContent).not.toContain(" fetch ");
    });

    it("35. No contiene JSON.stringify de registros", () => {
      expect(fileContent).not.toContain("JSON.stringify");
    });

    it("36. No contiene any", () => {
      expect(fileContent).not.toMatch(/:\s*any\b/);
      expect(fileContent).not.toMatch(/<\s*any\s*>/);
      expect(fileContent).not.toMatch(/\bany\b/);
    });

    it("37. No contiene @ts-ignore ni @ts-expect-error", () => {
      expect(fileContent).not.toContain("@ts-ignore");
      expect(fileContent).not.toContain("@ts-expect-error");
    });

    it("38. No contiene console.log ni console.error", () => {
      expect(fileContent).not.toContain("console.log");
      expect(fileContent).not.toContain("console.error");
    });

    it("39. Importa el gateway únicamente dentro del módulo servidor", () => {
      expect(fileContent).toContain(
        'import { localVerifiedJurisprudenceGateway } from "@/lib/jurisprudence/local-verified-jurisprudence-gateway"',
      );
    });
  });
});
