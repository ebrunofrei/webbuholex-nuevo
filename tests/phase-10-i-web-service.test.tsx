import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfessionalConsultationForm } from "@/components/professional-consultation-form";
import { ServiceCatalog } from "@/components/services/service-catalog";
import { ServiceDetail } from "@/components/services/service-detail";
import { getPublicServiceBySlug, publicServices } from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import { publicServiceCatalogSchema } from "@/lib/schemas/services";

const slug = "diseno-desarrollo-paginas-web-profesionales";
const service = getPublicServiceBySlug(slug);

describe("fase 10.I: consolidación de SRV-WEB-001", () => {
  it("conserva ocho servicios válidos con códigos y slugs únicos", () => {
    expect(publicServiceCatalogSchema.safeParse(publicServices).success).toBe(true);
    expect(publicServices).toHaveLength(8);
    expect(new Set(publicServices.map((item) => item.id)).size).toBe(8);
    expect(new Set(publicServices.map((item) => item.slug)).size).toBe(8);
    expect(service).toMatchObject({
      id: "SRV-WEB-001",
      slug,
      category: "digital",
      price: null,
      currency: null,
      responsible: null,
      requiresEvaluation: true,
      allowsImmediatePayment: false,
      published: false,
    });
  });

  it("mantiene el orden y la simetría del catálogo de ocho tarjetas", () => {
    const { container } = render(<ServiceCatalog services={publicServices} />);
    expect(container.querySelectorAll("article")).toHaveLength(8);
    expect(screen.getByText("8 servicios registrados")).toBeInTheDocument();
    expect(publicServices.map((item) => item.id)).toEqual([
      "SRV-LEGAL-001", "SRV-DOC-001", "SRV-DEF-001", "SRV-CONS-001",
      "SRV-EMP-001", "SRV-ADM-001", "SRV-ING-001", "SRV-WEB-001",
    ]);
  });

  it("presenta público objetivo, tipos de sitio, módulos y alcance técnico", () => {
    expect(service).toBeDefined();
    render(<ServiceDetail service={service!} />);
    for (const heading of [
      "¿A quién está dirigido?",
      "Tipos de sitio web",
      "Módulos posibles",
      "Factores que definen el alcance y presupuesto",
      "Componentes técnicos diferenciables",
      "Información necesaria para evaluar el proyecto",
      "Entregables potenciales",
      "Exclusiones",
      "Etapas de trabajo",
      "Condiciones previas",
    ]) expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("Integración futura")).toBeInTheDocument();
    expect(screen.getByText("Responsabilidad sobre contenidos")).toBeInTheDocument();
  });

  it("diferencia módulos básicos, opcionales, evaluables y futuros", () => {
    expect(service?.moduleGroups?.map((group) => group.level)).toEqual([
      "basic", "optional", "evaluation_required", "future_integration",
    ]);
    expect(service?.moduleGroups?.find((group) => group.level === "future_integration")?.items).toEqual(expect.arrayContaining(["Pagos", "Área privada", "Automatizaciones", "Analítica"]));
    expect(service?.technicalResponsibilities?.map((item) => item.title)).toEqual(expect.arrayContaining(["Diseño visual", "Desarrollo técnico", "Dominio", "Hosting", "Correo corporativo", "SEO técnico inicial", "Mantenimiento", "Soporte"]));
  });

  it("dirige a la consulta registrada sin pago, descarga ni ruta privada", () => {
    expect(service).toBeDefined();
    const { container } = render(<ServiceDetail service={service!} />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector(`a[href="/consulta-profesional?service=${slug}"]`)).toBeInTheDocument();
    expect(container.querySelector('[download], a[href^="/app"], a[href*="checkout"], a[href*="compra"]')).toBeNull();
    expect(container.textContent).not.toMatch(/(?:S\/|US\$)\s*\d|\bQR\b|\bcuenta bancaria\b|\bCCI\b/i);
  });

  it("reconoce el servicio en el formulario sin enviar, almacenar ni aceptar archivos", () => {
    expect(service).toBeDefined();
    const { container } = render(<ProfessionalConsultationForm selectedService={{ slug, title: service!.title }} />);
    expect(container.textContent).toContain("Servicio seleccionado: Diseño y desarrollo de páginas web profesionales");
    expect(container.textContent).toContain("sin guardar datos en la web");
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.textContent).not.toMatch(/expediente creado|número de solicitud|pago confirmado/i);
  });

  it("evita promesas de resultados y conserva las exclusiones comerciales", () => {
    expect(service).toBeDefined();
    const publicClaims = [service!.summary, service!.description, service!.publicTagline, ...(service!.potentialDeliverables ?? [])].join(" ");
    expect(publicClaims).not.toMatch(/primer lugar en Google|ventas garantizadas|clientes garantizados|resultado comercial asegurado|entrega inmediata/i);
    expect(service!.exclusions).toEqual(expect.arrayContaining([
      "No existe precio fijo público",
      "No se garantiza posicionamiento determinado en buscadores",
      "No se garantiza resultado comercial",
      "La publicación depende de la aprobación del cliente y de los controles técnicos correspondientes",
    ]));
  });

  it("mantiene BL-LEG-CON-001 bloqueado editorial y comercialmente", () => {
    expect(rentalHousingContract.availabilityStatus).toBe("editorial_preview");
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.currency).toBeNull();
    expect(rentalHousingContract.licenseStatus).toBe("pending");
    expect(rentalHousingContract.publicationAuthorization.authorized).toBe(false);
  });
});
