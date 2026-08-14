// @vitest-environment jsdom

import React from "react";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JurisprudencePublicDetail } from "@/components/jurisprudence/jurisprudence-public-detail";
import { jurisprudencePublicSlugSchema } from "@/lib/schemas/jurisprudence-public-search-gateway";
import { UnconfiguredJurisprudencePublicSearchGateway } from "@/lib/unconfigured-jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicDetailDto } from "@/types/jurisprudence";

type ProspectiveRuleDetailDto = Extract<
  JurisprudencePublicDetailDto,
  { kind: "prospective_rule" }
>;

type GetBySlugAction = NonNullable<
  React.ComponentProps<
    typeof JurisprudencePublicDetail
  >["getBySlugAction"]
>;

const fictitiousItem = {
  kind: "prospective_rule",

  slug: "resolucion-ficticia-11o-001",
  title: "Resolución ficticia para prueba de detalle 11.O",
  caseNumber: "EXP-FICTICIO-11O-001",
  resolutionNumber: "RESOLUCION-FICTICIA-11O-001",
  resolutionType: "sentencia de prueba",
  institutionName: "INSTITUCION-JURISDICCIONAL-DE-PRUEBA",
  issuingBody: "ORGANO-JURISDICCIONAL-DE-PRUEBA",
  matter: "materia ficticia",
  issuedAt: "2026-07-30",
  summary:
    "Resumen público estrictamente ficticio para validar el detalle de jurisprudencia.",
  sourceName: "Tribunal Constitucional",

  caseTitle: "Título público ficticio 11.O",
  editorialTitle:
    "Criterio jurisprudencial ficticio para prueba pública",
  processType: "Proceso constitucional de prueba",
  court: "TRIBUNAL-JURISDICCIONAL-DE-PRUEBA",
  chamber: "SALA-JURISDICCIONAL-DE-PRUEBA",
  decisionDate: "2026-07-30",
  publicationDate: "2026-07-31",
  jurisdiction: "Perú",
  specialty: "Derecho constitucional",
  matterArray: ["materia ficticia"],

  officialHtmlUrl:
    "https://example.test/resolucion-ficticia-11o-001",
  officialPdfUrl:
    "https://example.test/resolucion-ficticia-11o-001.pdf",

  relevantFacts: [
    "Hecho público ficticio destinado exclusivamente a probar el componente.",
  ],

  proceduralBackground: [
    "Un antecedente procesal público ficticio sin datos sensibles.",
  ],

  legalIssue:
    "Determinar el alcance jurídico de una regla ficticia dentro de una prueba de interfaz.",

  subIssues: [
    "Precisar los límites públicos de la regla ficticia.",
  ],

  decision:
    "La pretensión ficticia fue resuelta conforme al criterio público de prueba.",

  operativeOrders: [
    "Disposición pública ficticia destinada a la validación del componente.",
  ],

  caseSpecificRatio:
    "La decisión ficticia se sustenta en una razón jurídica pública utilizada únicamente para pruebas.",

  caseSpecificRatioSupportingParagraphs: [1],

  decisiveGrounds: [
    {
      ground:
        "Fundamento decisivo público ficticio para validar el contrato de detalle.",
      officialParagraphs: [1],
      sourceType: "fundamento",
    },
  ],

  interpretedRules: [
    {
      rule:
        "Norma pública ficticia interpretada en el escenario de prueba.",
      article: "Artículo ficticio 1",
      roleInDecision:
        "Sustenta la regla prospectiva utilizada exclusivamente en la prueba.",
      officialParagraphs: [1],
    },
  ],

  citedPrecedents: [
    {
      caseNumber: "EXP-FICTICIO-PRECEDENTE-001",
      role:
        "Precedente de referencia utilizado exclusivamente para la prueba.",
    },
  ],

  dissentingOrSeparateOpinions: [],

  applicability: [
    "Aplicable únicamente al supuesto público ficticio descrito.",
  ],

  limits: [
    "No resulta trasladable automáticamente a situaciones distintas.",
  ],

  nonHoldingObservations: [
    "Observación pública ficticia que no integra la razón decisoria.",
  ],

  editorialSummary:
    "Síntesis editorial pública ficticia para probar la presentación estructurada.",

  keywords: [
    "jurisprudencia",
    "prueba",
    "regla prospectiva",
  ],

  publicWarning:
    "Contenido ficticio de prueba. No constituye asesoría jurídica ni reproduce una resolución real.",

  prospectiveJurisprudentialRule:
    "La regla ficticia tendrá efectos prospectivos únicamente dentro del escenario de prueba.",

  prospectiveRuleSupportingParagraphs: [1],
} satisfies JurisprudencePublicDetailDto;

const forbiddenPublicDomTerms = [
  "recordId",
  "recordVersion",
  "projectionId",
  "authorizationCaseId",
  "internalNotes",
  "actorReference",
  "sqlQuery",
  "officialTitle",
  "publicCaseTitle",
  "publicProceduralBackground",
  "sourceDocumentId",
  "privacyReviewStatus",
  "approvedForPublication",
  "isPublic",
  "reviewer",
  "reviewedAt",
  "legalReviewStatus",
  "interpretationStatus",
  "Juan Carlos Callegari Herazo",
  "Manuel Anicama Hernández",
  "Roberto Nesta Brero",
  "Luis Trigoso Meza",
  "L.T.M.",
] as const;

class FixturePublicDetailGateway
  implements JurisprudencePublicSearchGateway
{
  readonly kind = "test_fixture";
  readonly getBySlugCalls: string[] = [];

  constructor(
    private readonly responseMode:
      | "success"
      | "not_found"
      | "not_configured"
      | "error"
      | "reject" = "success",
    private readonly item: JurisprudencePublicDetailDto = fictitiousItem,
  ) {}

  async search(
    query: JurisprudencePublicSearchQuery,
  ): Promise<JurisprudencePublicSearchResponse> {
    void query;

    return {
      status: "not_configured",
      message: "Búsqueda deshabilitada en pruebas de detalle.",
    };
  }

  async getBySlug(
    slug: string,
  ): Promise<JurisprudencePublicDetailResponse> {
    this.getBySlugCalls.push(slug);

    if (this.responseMode === "reject") {
      throw new Error(
        "fallo interno simulado de infraestructura que no debe filtrarse",
      );
    }

    if (this.responseMode === "not_found") {
      return { status: "not_found" };
    }

    if (this.responseMode === "not_configured") {
      return { status: "not_configured" };
    }

    if (this.responseMode === "error") {
      return { status: "error" };
    }

    return {
      status: "success",
      item: this.item,
    };
  }
}

describe(
  "fase 11.O: ruta pública contractual de detalle jurisprudencial",
  () => {
    describe("esquema y validación de slug", () => {
      it(
        "1. acepta slugs válidos que cumplen jurisprudencePublicSlugSchema",
        () => {
          expect(
            jurisprudencePublicSlugSchema.safeParse(
              "resolucion-ficticia-11o-001",
            ).success,
          ).toBe(true);

          expect(
            jurisprudencePublicSlugSchema.safeParse(
              "exp-1234-2026-tc",
            ).success,
          ).toBe(true);
        },
      );

      it(
        "2. rechaza slugs inválidos sin invocar al gateway",
        async () => {
          const gateway = new FixturePublicDetailGateway("success");

          render(
            <JurisprudencePublicDetail
              slug="SLUG_INVALIDO_CON_MAYUSCULAS!"
              searchGateway={gateway}
            />,
          );

          expect(
            await screen.findByText("Identificador no válido"),
          ).toBeInTheDocument();

          expect(gateway.getBySlugCalls).toHaveLength(0);
        },
      );
    });

    describe("estados obligatorios y lista blanca", () => {
      it(
        "3. renderiza success únicamente con campos del contrato público",
        async () => {
          const gateway = new FixturePublicDetailGateway(
            "success",
            fictitiousItem,
          );

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          expect(
            await screen.findByText(fictitiousItem.caseTitle),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.caseNumber),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.resolutionNumber),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.summary),
          ).toBeInTheDocument();

          for (const forbidden of forbiddenPublicDomTerms) {
            expect(container).not.toHaveTextContent(forbidden);
          }
        },
      );

      it(
        "4. renderiza not_found cuando el gateway no encuentra la resolución",
        async () => {
          const gateway = new FixturePublicDetailGateway(
            "not_found",
          );

          render(
            <JurisprudencePublicDetail
              slug="slug-inexistente-11o"
              searchGateway={gateway}
            />,
          );

          expect(
            await screen.findByText(
              "Resolución no encontrada",
            ),
          ).toBeInTheDocument();
        },
      );

      it(
        "5. renderiza not_configured cuando el gateway no está habilitado",
        () => {
          const gateway =
            new UnconfiguredJurisprudencePublicSearchGateway();

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          expect(
            screen.getByText("Detalle público no disponible"),
          ).toBeInTheDocument();
        },
      );

      it(
        "6. renderiza el error controlado cuando el gateway devuelve error",
        async () => {
          const gateway = new FixturePublicDetailGateway("error");

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          expect(
            await screen.findByText("Consulta no disponible"),
          ).toBeInTheDocument();
        },
      );

      it(
        "7. responde de forma segura ante una promesa rechazada",
        async () => {
          const gateway = new FixturePublicDetailGateway("reject");

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          expect(
            await screen.findByText("Consulta no disponible"),
          ).toBeInTheDocument();

          expect(container).not.toHaveTextContent(
            "fallo interno simulado",
          );
        },
      );
    });

    describe("semántica, accesibilidad y navegación", () => {
      it(
        "8 y 9. garantiza un único main y un único h1",
        async () => {
          const gateway = new FixturePublicDetailGateway(
            "success",
          );

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          await screen.findByText(fictitiousItem.caseTitle);

          expect(
            container.querySelectorAll("main"),
          ).toHaveLength(1);

          expect(
            container.querySelectorAll("h1"),
          ).toHaveLength(1);
        },
      );

      it(
        "10 y 11. ofrece retorno accesible conservando únicamente parámetros públicos",
        async () => {
          const gateway = new FixturePublicDetailGateway(
            "success",
          );

          const rawParams = {
            q: "contrato",
            matter: "civil",
            adminBypass: "true",
            secretToken: "xyz123",
            sort: "issued_desc",
            page: "2",
          };

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
              rawSearchParams={rawParams}
            />,
          );

          await screen.findByText(fictitiousItem.caseTitle);

          const link = screen.getByRole("link", {
            name: /volver a los resultados de búsqueda/i,
          });

          expect(link).toHaveAttribute(
            "href",
            "/jurisprudencia?q=contrato&matter=civil&sort=issued_desc&page=2",
          );

          expect(link.getAttribute("href")).not.toContain(
            "adminBypass",
          );

          expect(link.getAttribute("href")).not.toContain(
            "secretToken",
          );
        },
      );

      it(
        "12. garantiza ausencia de campos internos y privados en el DOM",
        async () => {
          const gateway = new FixturePublicDetailGateway(
            "success",
          );

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          await screen.findByText(fictitiousItem.caseTitle);

          for (const forbidden of forbiddenPublicDomTerms) {
            expect(container).not.toHaveTextContent(forbidden);
          }
        },
      );

      it(
        "13. no ofrece descargas ni acciones editoriales o administrativas",
        async () => {
          const gateway = new FixturePublicDetailGateway(
            "success",
          );

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          await screen.findByText(fictitiousItem.caseTitle);

          expect(
            container.querySelector("[download]"),
          ).toBeNull();

          expect(
            screen.queryByRole("button", {
              name: /publicar|aprobar|autorizar|editar|administrar/i,
            }),
          ).toBeNull();

          expect(
            screen.queryByRole("link", {
              name: /descargar|comprar/i,
            }),
          ).toBeNull();
        },
      );

      it(
        "86-91. renderiza caseTitle y antecedentes en lista accesible sin datos sensibles",
        async () => {
          const itemWithBackground: ProspectiveRuleDetailDto = {
            ...fictitiousItem,
            proceduralBackground: [
              "Antecedente neutralizado de prueba",
            ],
          };

          const gateway = new FixturePublicDetailGateway(
            "success",
            itemWithBackground,
          );

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          expect(
            await screen.findByText(fictitiousItem.caseTitle),
          ).toBeInTheDocument();

          expect(
            screen.getByRole("heading", {
              name: /Antecedentes procesales/i,
            }),
          ).toBeInTheDocument();

          const list = screen.getByRole("list");

          expect(list).toBeInTheDocument();
          expect(
            screen.getAllByRole("listitem").length,
          ).toBeGreaterThan(0);

          expect(list).toHaveTextContent(
            "Antecedente neutralizado de prueba",
          );

          for (const forbidden of forbiddenPublicDomTerms) {
            expect(container).not.toHaveTextContent(forbidden);
          }
        },
      );
    });

    describe(
      "barreras estáticas, seguridad e infraestructura",
      () => {
        it(
          "14. la UI no importa repositorios, SQLite ni servicios internos",
          async () => {
            const root = process.cwd();

            const files = [
              "app/jurisprudencia/[slug]/page.tsx",
              "components/jurisprudence/jurisprudence-public-detail.tsx",
              "components/jurisprudence/jurisprudence-public-search.tsx",
            ];

            const source = (
              await Promise.all(
                files.map((file) =>
                  readFile(path.join(root, file), "utf8"),
                ),
              )
            ).join("\n");

            expect(source).not.toMatch(
              /sqlite|repository|publication-authorization|publication-execution|search-index-service/i,
            );

            expect(source).not.toMatch(/fetch\s*\(/);
          },
        );

        it(
          "15. no existen directorios app/api ni archivos route.ts",
          async () => {
            const authorizedRouteFiles = [
    "app/api/admin/complaints/[complaintId]/responses/route.ts",
    "app/api/admin/complaints/[complaintId]/review/route.ts",
    "app/api/admin/complaints/[complaintId]/route.ts",
    "app/api/admin/complaints/route.ts",
    "app/api/admin/complaints/[complaintId]/request-information/route.ts",
    "app/api/admin/complaints/[complaintId]/resume-review/route.ts",
    "app/api/complaints/route.ts",
    "app/api/owl/admission/route.ts",
];
            const root = process.cwd();

            const appFiles = await readdir(
              path.join(root, "app"),
              { recursive: true },
            );

            const routeFiles = appFiles
              .filter(
                (file) =>
                  file === "route.ts" ||
                  file.endsWith("\\route.ts") ||
                  file.endsWith("/route.ts"),
              )
              .map((file) => path.relative(root, path.join(root, "app", file)).split(path.sep).join("/"));

            expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
            // jurisprudencia no crea rutas API propias
            expect(
              appFiles.filter((file) => file.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(file)),
            ).toEqual([]);
          },
        );

        it(
          "16. el gateway por defecto es not_configured",
          () => {
            const gateway =
              new UnconfiguredJurisprudencePublicSearchGateway();

            expect(gateway.kind).toBe("not_configured");
          },
        );

        it(
          "17. el gateway neutral no contiene datos ficticios de esta suite",
          async () => {
            const root = process.cwd();

            const gatewaySource = await readFile(
              path.join(
                root,
                "lib",
                "unconfigured-jurisprudence-public-search-gateway.ts",
              ),
              "utf8",
            );

            expect(gatewaySource).not.toContain(
              "resolucion-ficticia",
            );

            expect(gatewaySource).not.toContain(
              "EXP-FICTICIO",
            );
          },
        );

        it(
          "18. preserva intactos SRV-WEB-001 y BL-LEG-CON-001",
          async () => {
            const root = process.cwd();

            const services = await readFile(
              path.join(root, "data", "services.ts"),
              "utf8",
            );

            const catalog = await readFile(
              path.join(root, "data", "template-catalog.ts"),
              "utf8",
            );

            expect(services).toContain('id: "SRV-WEB-001"');
            expect(services).toContain(
              "allowsImmediatePayment: false",
            );
            expect(services).toContain("published: false");

            expect(catalog).toContain(
              'availabilityStatus: "editorial_preview"',
            );
            expect(catalog).toContain(
              "publicDownloadAuthorized: false",
            );
          },
        );

        it(
          "19. sitemap y robots permanecen desconectados de las rutas de detalle",
          async () => {
            const root = process.cwd();

            const sitemap = await readFile(
              path.join(root, "app", "sitemap.ts"),
              "utf8",
            );

            const robots = await readFile(
              path.join(root, "app", "robots.ts"),
              "utf8",
            );

            expect(sitemap).not.toContain("[slug]");
            expect(sitemap).not.toContain("getBySlug");
            expect(robots).toContain('disallow: "/"');
          },
        );

        it(
          "20. cumple el contrato visual sin desbordamiento estructural",
          async () => {
            const gateway = new FixturePublicDetailGateway(
              "success",
            );

            const { container } = render(
              <JurisprudencePublicDetail
                slug={fictitiousItem.slug}
                searchGateway={gateway}
              />,
            );

            await screen.findByText(fictitiousItem.caseTitle);

            const main = container.querySelector("main");

            expect(main).toBeInTheDocument();
            expect(main).toHaveClass(/page/);
          },
        );
      },
    );

    describe("integración con getBySlugAction", () => {
      it(
        "1-3 y 5-11. carga, consulta y renderiza los campos públicos permitidos",
        async () => {
          const calls: string[] = [];

          const action: GetBySlugAction = async (slug) => {
            calls.push(slug);

            return {
              status: "success",
              item: fictitiousItem,
            };
          };

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              getBySlugAction={action}
            />,
          );

          expect(
            screen.queryByText(
              "Detalle público no disponible",
            ),
          ).not.toBeInTheDocument();

          await waitFor(() => {
            expect(calls).toEqual([fictitiousItem.slug]);
          });

          expect(
            await screen.findByText(fictitiousItem.caseTitle),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.caseNumber),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.institutionName),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.issuingBody),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.matter),
          ).toBeInTheDocument();

          expect(
            screen.getByText(fictitiousItem.summary),
          ).toBeInTheDocument();

          expect(
            screen.getByRole("heading", {
              name: /Antecedentes procesales/i,
            }),
          ).toBeInTheDocument();

          const list = screen.getByRole("list");

          expect(list).toBeInTheDocument();

          expect(list).toHaveTextContent(
            "Un antecedente procesal público ficticio",
          );
        },
      );

      it(
        "4. mientras la promesa está pendiente muestra loading y resuelve limpiamente",
        async () => {
          let releasePendingAction = () => {};

          const pendingGate = new Promise<void>((resolve) => {
            releasePendingAction = resolve;
          });

          const action: GetBySlugAction = async () => {
            await pendingGate;

            return {
              status: "success",
              item: fictitiousItem,
            };
          };

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              getBySlugAction={action}
            />,
          );

          expect(
            screen.getByText("Cargando detalle de la resolución…"),
          ).toBeInTheDocument();

          await act(async () => {
            releasePendingAction();
            await pendingGate;
          });

          expect(
            await screen.findByText(fictitiousItem.caseTitle),
          ).toBeInTheDocument();
        },
      );

      it(
        "12-14. no muestra campos privados ni nombres personales internos",
        async () => {
          const action: GetBySlugAction = async () => ({
            status: "success",
            item: fictitiousItem,
          });

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              getBySlugAction={action}
            />,
          );

          await screen.findByText(fictitiousItem.caseTitle);

          for (const forbidden of forbiddenPublicDomTerms) {
            expect(container).not.toHaveTextContent(forbidden);
          }
        },
      );

      it(
        "15. muestra not_found cuando la acción no encuentra el slug",
        async () => {
          const action: GetBySlugAction = async () => ({
            status: "not_found",
          });

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              getBySlugAction={action}
            />,
          );

          expect(
            await screen.findByText(
              "Resolución no encontrada",
            ),
          ).toBeInTheDocument();
        },
      );

      it(
        "16 y 17. muestra error público y neutraliza la excepción interna",
        async () => {
          const action: GetBySlugAction = async () => {
            throw new Error(
              "Database connection timeout at 10.0.0.1:5432",
            );
          };

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              getBySlugAction={action}
            />,
          );

          expect(
            await screen.findByText("Consulta no disponible"),
          ).toBeInTheDocument();

          expect(container).not.toHaveTextContent(
            "Database connection timeout",
          );

          expect(container).not.toHaveTextContent("10.0.0.1");
        },
      );

      it(
        "18. sin getBySlugAction conserva el fallback not_configured",
        () => {
          const gateway =
            new UnconfiguredJurisprudencePublicSearchGateway();

          render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              searchGateway={gateway}
            />,
          );

          expect(
            screen.getByText("Detalle público no disponible"),
          ).toBeInTheDocument();
        },
      );

      it(
        "19. un cambio real de slug provoca una nueva consulta",
        async () => {
          const calls: string[] = [];

          const action: GetBySlugAction = async (slug) => {
            calls.push(slug);

            return {
              status: "success",
              item: {
                ...fictitiousItem,
                slug,
              },
            };
          };

          const { rerender } = render(
            <JurisprudencePublicDetail
              slug="slug-inicial"
              getBySlugAction={action}
            />,
          );

          await screen.findByText("slug-inicial");

          rerender(
            <JurisprudencePublicDetail
              slug="slug-nuevo"
              getBySlugAction={action}
            />,
          );

          await screen.findByText("slug-nuevo");

          expect(calls).toEqual([
            "slug-inicial",
            "slug-nuevo",
          ]);
        },
      );

      it(
        "20. no ofrece publicar, aprobar, editar, autorizar ni descargar contenido interno",
        async () => {
          const action: GetBySlugAction = async () => ({
            status: "success",
            item: fictitiousItem,
          });

          const { container } = render(
            <JurisprudencePublicDetail
              slug={fictitiousItem.slug}
              getBySlugAction={action}
            />,
          );

          await screen.findByText(fictitiousItem.caseTitle);

          expect(
            container.querySelector("[download]"),
          ).toBeNull();

          expect(
            screen.queryByRole("button", {
              name: /publicar|aprobar|autorizar|editar|administrar/i,
            }),
          ).toBeNull();

          expect(
            screen.queryByRole("link", {
              name: /descargar|comprar/i,
            }),
          ).toBeNull();
        },
      );
    });
  },
);
