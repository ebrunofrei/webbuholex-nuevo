import React from "react";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceCatalog } from "@/components/services/service-catalog";
import { ServiceDetail } from "@/components/services/service-detail";
import { getPublicServiceBySlug, publicServices } from "@/data/services";

describe("catálogo público de servicios", () => {
  it("posee exactamente 11 servicios principales con slug y ID únicos", () => {
    expect(publicServices).toHaveLength(11);
    expect(new Set(publicServices.map((item) => item.id)).size).toBe(11);
    expect(new Set(publicServices.map((item) => item.slug)).size).toBe(11);
  });

  it("renderiza fichas navegables sin compra ni pago inmediato", () => {
    const { container } = render(
      <ServiceCatalog services={publicServices} />,
    );

    const serviceRail = screen.getByRole("navigation", {
      name: /lista de servicios/i,
    });

    for (const service of publicServices) {
      const serviceTitle = within(serviceRail).getByText(
        service.title,
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
      ).toBe(`/servicios/${service.slug}`);
    }

    expect(
      container.querySelector(
        '[download], [href*="checkout"], [href*="compra"]',
      ),
    ).toBeNull();

    expect(
      publicServices.every(
        (service) =>
          service.allowsImmediatePayment === false &&
          service.price === null &&
          service.currency === null,
      ),
    ).toBe(true);
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
