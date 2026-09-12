import React from "react";

import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

import { describe, expect, it } from "vitest";

import { ProfessionalConsultationForm } from "@/components/professional-consultation-form";
import { ServiceCatalog } from "@/components/services/service-catalog";
import { ServiceDetail } from "@/components/services/service-detail";
import {
  getPublicServiceBySlug,
  publicServices,
} from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import { publicServiceCatalogSchema } from "@/lib/schemas/services";

const slug = "diseno-desarrollo-paginas-web-profesionales";
const service = getPublicServiceBySlug(slug);

describe("fase 10.I: consolidación de SRV-WEB-001", () => {
  it("conserva once servicios válidos con códigos y slugs únicos", () => {
    expect(
      publicServiceCatalogSchema.safeParse(publicServices).success,
    ).toBe(true);

    expect(publicServices).toHaveLength(11);

    expect(
      new Set(publicServices.map((item) => item.id)).size,
    ).toBe(11);

    expect(
      new Set(publicServices.map((item) => item.slug)).size,
    ).toBe(11);

    expect(service).toMatchObject({
      id: "SRV-WEB-001",
      slug,
      category: "digital",
      pricingMode: "quote_required",
      price: null,
      currency: null,
      responsible: null,
      professionalLevel: "professional",
      requiresEvaluation: true,
      allowsImmediatePayment: false,
      published: false,
      status: "active",
    });
  });

  it("mantiene el orden declarado y permite navegar los once servicios", () => {
    const { container } = render(
      <ServiceCatalog services={publicServices} />,
    );

    expect(publicServices.map((item) => item.id)).toEqual([
      "SRV-LEGAL-001",
      "SRV-BUHODOC-001",
      "SRV-TESIS-001",
      "SRV-ARB-001",
      "SRV-DEF-001",
      "SRV-CONS-001",
      "SRV-EMP-001",
      "SRV-ACC-001",
      "SRV-GOV-001",
      "SRV-ING-001",
      "SRV-WEB-001",
    ]);

    const serviceRail = screen.getByRole("navigation", {
      name: /lista de servicios/i,
    });

    for (const catalogService of publicServices) {
      const serviceTitle = within(serviceRail).getByText(
        catalogService.title,
        {
          selector: "strong",
          exact: true,
        },
      );

      const selector = serviceTitle.closest("button");

      expect(selector).not.toBeNull();

      fireEvent.click(selector!);

      const serviceLink = screen.getByRole("link", {
        name: /explorar servicio/i,
      });

      expect(
        serviceLink.getAttribute("href")?.replace(/\/$/, ""),
      ).toBe(`/servicios/${catalogService.slug}`);
    }

    expect(
      container.querySelector(
        '[download], [href*="checkout"], [href*="compra"]',
      ),
    ).toBeNull();
  });

  it("presenta público objetivo, tipos de sitio, módulos y alcance técnico", () => {
    expect(service).toBeDefined();

    render(<ServiceDetail service={service!} />);

    for (const heading of [
      "¿A quién está dirigido?",
      "Tipos de sitio web",
      "Necesidades que puede resolver",
      "Alcance posible",
      "Módulos posibles",
      "Factores que definen el alcance y presupuesto",
      "Componentes técnicos diferenciables",
      "Información necesaria para evaluar tu consulta",
      "Entregables potenciales",
      "Exclusiones",
      "Etapas de trabajo",
      "Condiciones previas",
    ]) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }

    expect(
      screen.getByText("Posible ampliación"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Responsabilidad sobre contenidos"),
    ).toBeInTheDocument();
  });

  it("diferencia módulos básicos, opcionales, evaluables y ampliables", () => {
    expect(
      service?.moduleGroups?.map((group) => group.level),
    ).toEqual([
      "basic",
      "optional",
      "evaluation_required",
      "future_integration",
    ]);

    expect(
      service?.moduleGroups?.find(
        (group) => group.level === "future_integration",
      )?.items,
    ).toEqual(
      expect.arrayContaining([
        "Pagos",
        "Área privada",
        "Automatizaciones",
        "Analítica",
        "Asistentes especializados",
      ]),
    );

    expect(
      service?.technicalResponsibilities?.map(
        (item) => item.title,
      ),
    ).toEqual(
      expect.arrayContaining([
        "Diseño visual",
        "Desarrollo técnico",
        "Dominio",
        "Hosting",
        "Correo corporativo",
        "SEO técnico inicial",
        "Propiedad y accesos",
        "Servicios de terceros",
        "Mantenimiento",
        "Soporte",
        "Integraciones adicionales",
      ]),
    );
  });

  it("exige evaluación previa y no habilita contratación inmediata", () => {
    expect(service).toBeDefined();

    expect(service).toMatchObject({
      availability: "evaluation_required",
      pricingMode: "quote_required",
      price: null,
      currency: null,
      requiresEvaluation: true,
      allowsImmediatePayment: false,
      responsible: null,
    });

    expect(service?.modalities).toContain(
      "Evaluación técnica y comercial previa",
    );
  });

  it("dirige a la consulta registrada sin pago, descarga ni ruta privada", () => {
    expect(service).toBeDefined();

    const { container } = render(
      <ServiceDetail service={service!} />,
    );

    expect(
      container.querySelectorAll("h1"),
    ).toHaveLength(1);

    expect(
      container.querySelector(
        `a[href="/consulta-profesional?service=${slug}"]`,
      ),
    ).toBeInTheDocument();

    expect(
      container.querySelector(
        '[download], a[href^="/app"], a[href*="checkout"], a[href*="compra"]',
      ),
    ).toBeNull();

    expect(container.textContent).not.toMatch(
      /(?:S\/|US\$)\s*\d|\bQR\b|\bcuenta bancaria\b|\bCCI\b/i,
    );
  });

  it("reconoce el servicio en el formulario sin enviar, almacenar ni aceptar archivos", () => {
    expect(service).toBeDefined();

    const { container } = render(
      <ProfessionalConsultationForm
        selectedService={{
          slug,
          title: service!.title,
        }}
      />,
    );

    expect(container.textContent).toContain(
      "Servicio seleccionado: Diseño y desarrollo de páginas web profesionales",
    );

    expect(container.textContent).toContain(
      "sin guardar datos en la web",
    );

    expect(
      container.querySelector('input[type="file"]'),
    ).toBeNull();

    expect(container.textContent).not.toMatch(
      /expediente creado|número de solicitud|pago confirmado/i,
    );
  });

  it("evita promesas de resultados y conserva límites comerciales explícitos", () => {
    expect(service).toBeDefined();

    const publicClaims = [
      service!.summary,
      service!.description,
      service!.publicTagline,
      ...(service!.potentialDeliverables ?? []),
    ].join(" ");

    expect(publicClaims).not.toMatch(
      /primer lugar en Google|ventas garantizadas|clientes garantizados|resultado comercial asegurado|entrega inmediata/i,
    );

    expect(service!.exclusions).toEqual(
      expect.arrayContaining([
        "El precio y el plazo se determinan después de evaluar el alcance real del proyecto.",
        "Pagos, áreas privadas, automatizaciones e integraciones requieren evaluación técnica específica.",
        "El SEO técnico inicial no constituye garantía de una posición determinada en buscadores.",
        "El servicio no implica garantía de ventas, captación de clientes o resultado comercial.",
        "Las modificaciones posteriores que excedan el alcance aprobado se cotizan separadamente.",
        "La publicación se realiza después de la validación del cliente y de los controles técnicos correspondientes.",
      ]),
    );
  });

  it("protege contenidos, propiedad y servicios de terceros", () => {
    expect(service).toBeDefined();

    expect(service?.clientContentNotice).toMatch(
      /autorización.*marcas.*fotografías.*textos.*logotipos/i,
    );

    expect(
      service?.technicalResponsibilities?.find(
        (item) => item.title === "Propiedad y accesos",
      ),
    ).toBeDefined();

    expect(
      service?.technicalResponsibilities?.find(
        (item) => item.title === "Servicios de terceros",
      ),
    ).toBeDefined();
  });

  it("mantiene BL-LEG-CON-001 bloqueado editorial y comercialmente", () => {
    expect(
      rentalHousingContract.availabilityStatus,
    ).toBe("editorial_preview");

    expect(rentalHousingContract.price).toBeNull();

    expect(rentalHousingContract.currency).toBeNull();

    expect(
      rentalHousingContract.licenseStatus,
    ).toBe("pending");

    expect(
      rentalHousingContract.publicationAuthorization.authorized,
    ).toBe(false);
  });
});