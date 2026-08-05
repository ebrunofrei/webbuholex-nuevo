import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceCatalog } from "@/components/services/service-catalog";
import { ServiceDetail } from "@/components/services/service-detail";
import { getPublicServiceBySlug, publicServices } from "@/data/services";
import { publicServiceCatalogSchema } from "@/lib/schemas/services";

describe("catálogo público de servicios", () => {
  it("valida ocho servicios reales con identificadores y slugs únicos", () => {
    expect(publicServiceCatalogSchema.safeParse(publicServices).success).toBe(true);
    expect(publicServices).toHaveLength(8);
    expect(new Set(publicServices.map((service) => service.id)).size).toBe(8);
    expect(new Set(publicServices.map((service) => service.slug)).size).toBe(8);
  });

  it("renderiza fichas navegables sin compra ni pago inmediato", () => {
    const { container } = render(<ServiceCatalog services={publicServices} />);
    expect(screen.getByText("Ingeniería civil para saneamiento inmobiliario")).toBeInTheDocument();
    expect(container.querySelectorAll('a[href^="/servicios/"]')).toHaveLength(8);
    expect(container.querySelector("[download], [href*='checkout'], [href*='compra']")).toBeNull();
    expect(publicServices.every((service) => service.allowsImmediatePayment === false && service.price === null && service.currency === null)).toBe(true);
  });

  it("protege la evaluación técnica y no inventa responsable", () => {
    const engineering = getPublicServiceBySlug("ingenieria-civil-saneamiento-inmobiliario");
    expect(engineering).toBeDefined();
    expect(engineering).toMatchObject({ availability: "evaluation_required", requiresEvaluation: true, responsible: null, price: null });
    const { container } = render(<ServiceDetail service={engineering!} />);
    expect(screen.getAllByText("Evaluación técnica previa obligatoria").length).toBeGreaterThan(0);
    expect(screen.getByText(/La viabilidad depende de la documentación existente/)).toBeInTheDocument();
    expect(container.querySelector('a[href^="/consulta-profesional?service=ingenieria-civil-saneamiento-inmobiliario"]')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/colegiatura inventada|inscripción garantizada|plazo garantizado|S\/\//i);
  });
});
