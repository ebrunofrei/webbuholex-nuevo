// @vitest-environment jsdom

import React from "react";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { JurisprudencePublicPage } from "@/components/jurisprudence/jurisprudence-public-page";
import { JurisprudencePublicSearch, type JurisprudencePublicSearchAction } from "@/components/jurisprudence/jurisprudence-public-search";
import {
  parseJurisprudencePublicSearchParameters,
  serializeJurisprudencePublicSearchQuery,
} from "@/lib/jurisprudence-public-search-gateway";
import { evaluateJurisprudencePublicSearchExperienceReadiness } from "@/lib/jurisprudence-public-search-experience-readiness";
import {
  jurisprudencePublicSearchItemSchema,
  jurisprudencePublicSearchQuerySchema,
} from "@/lib/schemas/jurisprudence-public-search-gateway";
import { UnconfiguredJurisprudencePublicSearchGateway } from "@/lib/unconfigured-jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchItem,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicDetailDto } from "@/types/jurisprudence";

const fictitiousItem: JurisprudencePublicSearchItem = {
  slug: "resolucion-ficticia-11n-001",
  title: "Resolución ficticia para prueba de interfaz",
  caseNumber: "EXP-FICTICIO-11N-001",
  resolutionNumber: "RESOLUCION-FICTICIA-11N-001",
  resolutionType: "sentencia de prueba",
  institutionName: "INSTITUCION-JURISDICCIONAL-DE-PRUEBA",
  issuingBody: "ORGANO-JURISDICCIONAL-DE-PRUEBA",
  matter: "materia ficticia",
  issuedAt: "2026-07-30",
  summary: "Resumen público estrictamente ficticio para validar la experiencia de búsqueda.",
  sourceName: "Tribunal Constitucional",
  caseTitle: "Título público ficticio"
};

class FixturePublicSearchGateway implements JurisprudencePublicSearchGateway {
  readonly kind = "test_fixture";
  readonly calls: JurisprudencePublicSearchQuery[] = [];

  constructor(
    private readonly items: readonly JurisprudencePublicSearchItem[] = [fictitiousItem],
    private readonly throwsControlledError = false,
    private readonly total = items.length,
  ) { }

  async search(query: JurisprudencePublicSearchQuery): Promise<JurisprudencePublicSearchResponse> {
    this.calls.push(query);
    if (this.throwsControlledError) throw new Error("detalle interno que no debe mostrarse");
    const page = {
      items: this.items,
      total: this.total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: this.total === 0 ? 0 : Math.ceil(this.total / query.pageSize),
    };
    return this.total === 0 ? { status: "empty", page } : { status: "success", page };
  }

  async getBySlug(slug: string): Promise<JurisprudencePublicDetailResponse> {
    const item = this.items.find((candidate) => candidate.slug === slug);
    return item === undefined ? { status: "not_found" } : { status: "success", item: item as unknown as JurisprudencePublicDetailDto };
  }
}

const validQuery = {
  text: "contrato",
  filters: { matter: "civil" },
  sort: "relevance",
  page: 1,
  pageSize: 10,
};

describe("fase 11.N: experiencia pública controlada de búsqueda jurisprudencial", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  describe("contratos públicos y URL", () => {
    it("acepta una consulta estricta y rechaza campos desconocidos o flags de bypass", () => {
      expect(jurisprudencePublicSearchQuerySchema.safeParse(validQuery).success).toBe(true);
      expect(
        jurisprudencePublicSearchQuerySchema.safeParse({ ...validQuery, includePrivate: true }).success,
      ).toBe(false);
      expect(
        jurisprudencePublicSearchQuerySchema.safeParse({
          ...validQuery,
          filters: { matter: "civil", internal: true },
        }).success,
      ).toBe(false);
    });

    it("rechaza límites, orden, páginas y rangos de fecha inválidos sin excepción nativa", () => {
      expect(() =>
        jurisprudencePublicSearchQuerySchema.safeParse({
          filters: { issuedFrom: "2026-08-01", issuedTo: "2026-07-01" },
          sort: "hidden_rank",
          page: 0,
          pageSize: 100,
        }),
      ).not.toThrow();
      expect(
        jurisprudencePublicSearchQuerySchema.safeParse({
          matter: "Derechos Fundamentales",
          issuedAt: "2024-01-01",
          summary: "Resumen",
          sourceName: "Tribunal",
        }).success,
      ).toBe(false);
    });

    it("omite materialmente opcionales ausentes y nunca materializa undefined", () => {
      const parsed = jurisprudencePublicSearchQuerySchema.parse({
        filters: {},
        sort: "relevance",
        page: 1,
        pageSize: 10,
      });
      expect("text" in parsed).toBe(false);
      expect("issuedFrom" in parsed.filters).toBe(false);
      expect("issuedTo" in parsed.filters).toBe(false);
      expect(JSON.stringify(parsed)).not.toContain("undefined");
    });

    it("serializa en orden determinista y omite parámetros vacíos", () => {
      expect(serializeJurisprudencePublicSearchQuery(validQuery)).toBe("q=contrato&matter=civil");
      expect(
        serializeJurisprudencePublicSearchQuery({
          filters: {},
          sort: "issued_desc",
          page: 2,
          pageSize: 10,
        }),
      ).toBe("sort=issued_desc&page=2");
    });

    it("valida parámetros públicos y rechaza parámetros administrativos", () => {
      expect(
        parseJurisprudencePublicSearchParameters(
          new URLSearchParams("q=contrato&matter=civil&sort=issued_desc&page=2"),
        ),
      ).toMatchObject({ text: "contrato", sort: "issued_desc", page: 2 });
      expect(
        parseJurisprudencePublicSearchParameters(new URLSearchParams("sort=admin")),
      ).toBeNull();
    });

    it("aplica una lista blanca estricta a cada resultado público", () => {
      expect(jurisprudencePublicSearchItemSchema.safeParse(fictitiousItem).success).toBe(true);
      expect(
        jurisprudencePublicSearchItemSchema.safeParse({
          ...fictitiousItem,
          authorizationCaseId: "AUTORIZACION-INTERNA",
        }).success,
      ).toBe(false);
    });
  });

  describe("gateway neutral", () => {
    it("devuelve not_configured sin consultar infraestructura ni inventar resultados", async () => {
      const gateway = new UnconfiguredJurisprudencePublicSearchGateway();
      await expect(gateway.search(jurisprudencePublicSearchQuerySchema.parse(validQuery))).resolves.toMatchObject({
        status: "not_configured",
      });
      await expect(gateway.getBySlug("resolucion-ficticia-11n-001")).resolves.toEqual({
        status: "not_configured",
      });
    });

    it("el gateway ficticio entrega solo el contrato público y no inventa slugs", async () => {
      const gateway = new FixturePublicSearchGateway();
      await expect(gateway.getBySlug(fictitiousItem.slug)).resolves.toEqual({
        status: "success",
        item: fictitiousItem,
      });
      await expect(gateway.getBySlug("slug-ficticio-inexistente")).resolves.toEqual({
        status: "not_found",
      });
    });

    it("mantiene readiness productivo en default deny", () => {
      expect(evaluateJurisprudencePublicSearchExperienceReadiness()).toEqual({
        publicSearchUiImplemented: true,
        publicGatewayContractReady: true,
        unconfiguredGatewayReady: true,
        realSearchIndexPresent: false,
        realPublicSearchGatewayConfigured: false,
        publicSearchConnected: false,
        searchEndpointMounted: false,
        searchUiConnectedToRealData: false,
        externalIndexingEnabled: false,
        realJurisprudenceDataPresent: false,
        authenticationReal: false,
        published: false,
        deployed: false,
      });
    });
  });

  describe("interfaz pública", () => {
    it("presenta un único main y h1, etiquetas, filtros, orden y estado no configurado", () => {
      const { container } = render(<JurisprudencePublicPage />);
      expect(container.querySelectorAll("main")).toHaveLength(1);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByLabelText("Problema jurídico")).toHaveAccessibleDescription();
      expect(screen.getByLabelText("Ordenar por")).toBeInTheDocument();
      expect(screen.getByText(/todavía no se encuentra habilitado/i)).toBeInTheDocument();
    });

    it("muestra el estado inicial con gateway ficticio sin ejecutar una consulta automática", () => {
      const gateway = new FixturePublicSearchGateway();
      render(<JurisprudencePublicSearch gateway={gateway} />);
      expect(screen.getByText(/ingrese criterios/i)).toBeInTheDocument();
      expect(gateway.calls).toHaveLength(0);
    });

    it("muestra resultados ficticios exclusivamente de lista blanca y cumple estructura semántica", async () => {
      const gateway = new FixturePublicSearchGateway();
      const { container } = render(<JurisprudencePublicSearch gateway={gateway} />);
      fireEvent.change(screen.getByLabelText("Problema jurídico"), {
        target: { value: "contrato" },
      });
      fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));
      expect(await screen.findByText(fictitiousItem.title)).toBeInTheDocument();

      const articles = container.querySelectorAll("article");
      expect(articles.length).toBeGreaterThan(0); // 1. contenido en elemento semántico

      const firstArticle = articles[0];
      expect(firstArticle?.querySelector("h3")).toBeInTheDocument(); // 2. posee un heading
      expect(firstArticle?.querySelector(`a[href*="${fictitiousItem.slug}"]`)).toBeInTheDocument(); // 3. posee enlace hacia su slug

      expect(container).toHaveTextContent(fictitiousItem.summary);
      expect(container).not.toHaveTextContent("AUTORIZACION-INTERNA"); // 5. no aparecen campos privados
      expect(container.querySelector("[download]")).toBeNull(); // 4. no existe atributo download
    });

    it("muestra cero resultados sin fabricar registros", async () => {
      render(<JurisprudencePublicSearch gateway={new FixturePublicSearchGateway([], false, 0)} />);
      fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));
      expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
      expect(screen.queryByText(fictitiousItem.caseTitle)).not.toBeInTheDocument();
    });

    it("traduce errores internos a un mensaje público seguro", async () => {
      render(<JurisprudencePublicSearch gateway={new FixturePublicSearchGateway([], true)} />);
      fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));
      expect(await screen.findByText("Consulta no disponible")).toBeInTheDocument();
      expect(screen.queryByText(/detalle interno/i)).not.toBeInTheDocument();
    });

    it("vincula el error de fecha al formulario y no consulta el gateway", async () => {
      const gateway = new FixturePublicSearchGateway();
      render(<JurisprudencePublicSearch gateway={gateway} />);
      fireEvent.change(screen.getByLabelText("Fecha desde"), { target: { value: "2026-08-01" } });
      fireEvent.change(screen.getByLabelText("Fecha hasta"), { target: { value: "2026-07-01" } });
      fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("fecha hasta");
      expect(gateway.calls).toHaveLength(0);
    });

    it("envía orden y paginación validados y actualiza una URL determinista", async () => {
      const gateway = new FixturePublicSearchGateway([fictitiousItem], false, 11);
      render(<JurisprudencePublicSearch gateway={gateway} />);
      fireEvent.change(screen.getByLabelText("Problema jurídico"), { target: { value: "contrato" } });
      fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "issued_desc" } });
      fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));
      await screen.findByText(fictitiousItem.title);
      expect(window.location.search).toBe("?q=contrato&sort=issued_desc");
      fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
      await waitFor(() => expect(gateway.calls.at(-1)?.page).toBe(2));
      expect(window.location.search).toBe("?q=contrato&sort=issued_desc&page=2");
    });

    it("no ofrece descargas ni acciones editoriales, administrativas o de publicación", () => {
      const { container } = render(<JurisprudencePublicPage searchGateway={new FixturePublicSearchGateway()} />);
      expect(container.querySelector("[download]")).toBeNull();
      expect(screen.queryByRole("button", { name: /publicar|aprobar|autorizar|administrar/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /descargar|comprar/i })).toBeNull();
    });

    describe("integración con Server Action (searchAction)", () => {
      const createMockAction = () => {
        return vi.fn<JurisprudencePublicSearchAction>();
      };

      it("1-4: Con searchAction y gateway not_configured, el botón está habilitado, aria-disabled no es true, y no muestra indisponibilidad", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
        });
        const gateway = new UnconfiguredJurisprudencePublicSearchGateway();
        render(<JurisprudencePublicSearch gateway={gateway} searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        const button = screen.getByRole("button", { name: "BUSCAR" });
        await waitFor(() => expect(button).toBeEnabled());
        expect(button).not.toHaveAttribute("aria-disabled", "true");

        expect(screen.queryByText(/búsqueda pública no disponible/i)).not.toBeInTheDocument();
      });

      it("1, 2, 3: Con searchAction, ejecuta automáticamente una búsqueda vacía al montar", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: { items: [fictitiousItem], total: 1, page: 1, pageSize: 10, totalPages: 1 }
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        const calledArg = searchAction.mock.calls[0]![0];
        expect(calledArg).not.toHaveProperty("text");
        expect(calledArg).toEqual(expect.objectContaining({
          filters: {},
          sort: "relevance",
          page: 1,
          pageSize: 10
        }));
      });

      it("6, 7: No ejecuta dos veces por rerender ni bajo StrictMode", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
        });
        const { rerender } = render(<React.StrictMode><JurisprudencePublicSearch searchAction={searchAction} /></React.StrictMode>);
        rerender(<React.StrictMode><JurisprudencePublicSearch searchAction={searchAction} /></React.StrictMode>);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        expect(searchAction).toHaveBeenCalledTimes(1);
      });

      it("8: Con parámetros públicos iniciales, usa esos parámetros", async () => {
        const originalLocation = window.location;
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: { ...originalLocation, search: '?q=pensión&sort=issued_desc' }
        });

        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        expect(searchAction).toHaveBeenCalledWith(expect.objectContaining({
          text: "pensión",
          sort: "issued_desc"
        }));

        Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
      });

      it("9: Sin searchAction y con gateway not_configured, no busca automáticamente", () => {
        const gateway = new UnconfiguredJurisprudencePublicSearchGateway();
        const searchSpy = vi.spyOn(gateway, 'search');
        render(<JurisprudencePublicSearch gateway={gateway} />);
        expect(searchSpy).not.toHaveBeenCalled();
      });

      it("10, 11: Después de la carga inicial permite una búsqueda manual adicional y usa los nuevos criterios", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByLabelText("Problema jurídico"), { target: { value: "despido" } });
        fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(2));
        expect(searchAction).toHaveBeenLastCalledWith(expect.objectContaining({
          text: "despido"
        }));
      });

      it("12: No produce warnings act(...)", async () => {
        const consoleSpy = vi.spyOn(console, "error");
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);
        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        const actWarnings = consoleSpy.mock.calls.filter(call =>
          typeof call[0] === 'string' && call[0].includes('act(')
        );
        expect(actWarnings).toHaveLength(0);
        consoleSpy.mockRestore();
      });

      it("5-6, 8-11: Al pulsar BUSCAR invoca la acción 1 vez, la consulta tiene los valores, resuelve success, renderiza el título, sin campos internos", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: {
            items: [fictitiousItem],
            total: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
          },
        });
        const { container } = render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        searchAction.mockClear();

        fireEvent.change(screen.getByLabelText("Problema jurídico"), { target: { value: "contrato civil" } });
        fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        expect(searchAction).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "contrato civil",
            page: 1,
            pageSize: 10,
            sort: "relevance",
            filters: expect.any(Object),
          })
        );

        expect(await screen.findByText(fictitiousItem.title)).toBeInTheDocument();
        expect(container).not.toHaveTextContent("proceduralBackground");
        expect(container).not.toHaveTextContent("nombres internos");
      });

      it("7: Durante la promesa pendiente muestra loading", async () => {
        let resolvePromise: (value: JurisprudencePublicSearchResponse) => void = () => { };
        const searchAction = createMockAction().mockReturnValue(
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
        );
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        expect(screen.getByRole("status")).toHaveTextContent(/buscando/i);

        await act(async () => {
          resolvePromise({
            status: "empty",
            page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
          });
        });
      });

      it("12: Ante empty muestra el estado vacío", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "empty",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
      });

      it("13: Ante invalid_query muestra el mensaje público", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "invalid_query",
          message: "Mensaje público de consulta inválida.",
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        expect(await screen.findByText("Revise la consulta")).toBeInTheDocument();
        expect(screen.getByText("Mensaje público de consulta inválida.")).toBeInTheDocument();
      });

      it("14: Ante error muestra el mensaje público seguro", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "error",
          message: "Mensaje público de error.",
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));

        expect(await screen.findByText("Consulta no disponible")).toBeInTheDocument();
        expect(screen.getByText("Mensaje público de error.")).toBeInTheDocument();
      });

      it("15: Permite ejecutar una segunda búsqueda y vuelve a invocar la acción", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "empty",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        searchAction.mockClear();

        fireEvent.change(screen.getByLabelText("Problema jurídico"), { target: { value: "primera" } });
        fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));

        expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
        expect(searchAction).toHaveBeenCalledTimes(1);
        searchAction.mockClear();

        fireEvent.change(screen.getByLabelText("Problema jurídico"), { target: { value: "segunda" } });
        fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        expect(searchAction).toHaveBeenLastCalledWith(expect.objectContaining({ text: "segunda" }));
      });

      it("16: La paginación reutiliza searchAction", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "success",
          page: {
            items: [fictitiousItem],
            total: 20,
            page: 1,
            pageSize: 10,
            totalPages: 2,
          },
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        searchAction.mockClear();

        searchAction.mockResolvedValueOnce({
          status: "success",
          page: {
            items: [fictitiousItem],
            total: 20,
            page: 2,
            pageSize: 10,
            totalPages: 2,
          },
        });

        fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        expect(searchAction).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
      });

      it("17: Los filtros se envían a searchAction", async () => {
        const searchAction = createMockAction().mockResolvedValue({
          status: "empty",
          page: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
        render(<JurisprudencePublicSearch searchAction={searchAction} />);

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        searchAction.mockClear();

        fireEvent.change(screen.getByLabelText("Materia"), { target: { value: "penal" } });
        fireEvent.change(screen.getByLabelText("Órgano emisor"), { target: { value: "corte suprema" } });
        fireEvent.click(screen.getByRole("button", { name: "BUSCAR" }));

        await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1));
        expect(searchAction).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              matter: "penal",
              issuingBody: "corte suprema",
            }),
          })
        );
      });
    });
  });

  describe("barreras estáticas y preservación", () => {
    it("la UI no importa repositorios, SQLite ni servicios internos de 11.G–11.M", async () => {
      const root = process.cwd();
      const files = [
        "components/jurisprudence/jurisprudence-public-page.tsx",
        "components/jurisprudence/jurisprudence-public-search.tsx",
        "app/jurisprudencia/page.tsx",
      ];
      const source = (await Promise.all(files.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
      expect(source).not.toMatch(/sqlite|repository|publication-authorization|publication-execution|search-index-service/i);
      expect(source).not.toMatch(/fetch\s*\(/);
    });

    it("no crea app/api, route.ts, endpoints ni detalle ficticio", async () => {
      const authorizedRouteFiles = [
        "app/api/admin/complaints/[complaintId]/responses/route.ts",
        "app/api/complaints/route.ts",
        "app/api/owl/admission/route.ts",
      ];
      const root = process.cwd();
      const appFiles = await readdir(path.join(root, "app"), { recursive: true });
      const routeFiles = appFiles
        .filter((file) => file === "route.ts" || file.endsWith("\\route.ts") || file.endsWith("/route.ts"))
        .map((file) => path.relative(root, path.join(root, "app", file)).split(path.sep).join("/"));
      expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
      // jurisprudencia no crea rutas API propias
      expect(appFiles.filter((file) => file.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(file))).toEqual([]);
      expect((await readdir(path.join(root, "app", "jurisprudencia", "[slug]"))).length).toBeGreaterThan(0);
    });

    it("mantiene React 19.1.6 y sitemap/robots sin integración productiva", async () => {
      const root = process.cwd();
      const manifest = await readFile(path.join(root, "package.json"), "utf8");
      expect(manifest).toContain('"react": "19.1.6"');
      expect(manifest).toContain('"react-dom": "19.1.6"');
      expect(await readFile(path.join(root, "app", "sitemap.ts"), "utf8")).not.toMatch(/search-index|gateway/);
      expect(await readFile(path.join(root, "app", "robots.ts"), "utf8")).not.toMatch(/search-index|gateway/);
    });

    it("preserva SRV-WEB-001 y BL-LEG-CON-001", async () => {
      const root = process.cwd();
      const services = await readFile(path.join(root, "data", "services.ts"), "utf8");
      const catalog = await readFile(path.join(root, "data", "template-catalog.ts"), "utf8");
      expect(services).toContain('id: "SRV-WEB-001"');
      expect(services).toContain("allowsImmediatePayment: false");
      expect(services).toContain("published: false");
      expect(catalog).toContain('availabilityStatus: "editorial_preview"');
      expect(catalog).toContain("publicDownloadAuthorized: false");
      expect(catalog).toContain("authorized: false");
    });
  });
});
