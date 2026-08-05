import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { PageHero } from "@/components/page-hero";
import { CatalogEmptyState } from "@/components/catalog-empty-state";
import { ProfessionalConsultationForm } from "@/components/professional-consultation-form";
import { TemplateEditorialPreview } from "@/components/template-editorial-preview";
import { rentalHousingContract } from "@/data/template-catalog";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { TemplateCatalogExplorer } from "@/components/template-catalog-explorer";
import { TemplateProductExperience } from "@/components/template-product-experience";
import { buildTemplateMarketplaceProduct } from "@/lib/template-marketplace";
import { buildHomeHeroScenes, buildHomeViewModel } from "@/lib/home-view-model";
import { HomeExperience } from "@/components/home/home-experience";
import { DualPortal } from "@/components/portal/dual-portal";

describe("accesibilidad estructural", () => {
  it("no presenta violaciones automáticas en el encabezado de página", async () => {
    const { container } = render(
      <main>
        <PageHero eyebrow="Prueba" title="Un único título principal" description="Descripción comprensible de la página." status="En preparación" />
      </main>,
    );
    const result = await axe(container);
    expect(result.violations).toHaveLength(0);
  });

  it("mantiene un único h1 en el encabezado", () => {
    const { container } = render(<PageHero eyebrow="Prueba" title="Título" description="Descripción" />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("no presenta violaciones automáticas en el catálogo vacío", async () => {
    const { container } = render(<main><CatalogEmptyState /></main>);
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("no presenta violaciones automáticas en el formulario de consulta", async () => {
    const { container } = render(<main><ProfessionalConsultationForm /></main>);
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("no presenta violaciones automáticas en la ficha editorial", async () => {
    const { container } = render(<main><TemplateEditorialPreview product={rentalHousingContract} productPackage={rentalHousingProductPackage} /></main>);
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("no presenta violaciones automáticas en el catálogo y la ficha interactiva", async () => {
    const product = buildTemplateMarketplaceProduct(rentalHousingContract, rentalHousingProductPackage);
    const catalog = render(<main><TemplateCatalogExplorer products={[product]} /></main>);
    expect((await axe(catalog.container)).violations).toHaveLength(0);
    catalog.unmount();
    const detail = render(<main><TemplateProductExperience product={product} /></main>);
    expect((await axe(detail.container)).violations).toHaveLength(0);
  });

  it("no presenta violaciones automáticas en la portada dinámica", async () => {
    const product = buildTemplateMarketplaceProduct(rentalHousingContract, rentalHousingProductPackage);
    const home = render(<main><HomeExperience products={[product]} viewModel={buildHomeViewModel([product])} scenes={buildHomeHeroScenes(product)} /></main>);
    expect((await axe(home.container)).violations).toHaveLength(0);
  });

  it("no presenta violaciones automáticas en el portal dual y su panel", async () => {
    const portal = render(<main><DualPortal /></main>);
    expect((await axe(portal.container)).violations).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Transparencia y marco legal" }));
    expect((await axe(portal.container)).violations).toHaveLength(0);
  });
});
