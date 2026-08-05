import React from "react";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeExperience } from "@/components/home/home-experience";
import { HomeHeroSlider } from "@/components/home/home-hero-slider";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingContract, templateCatalog } from "@/data/template-catalog";
import { isTemplateProductPubliclyAvailable } from "@/lib/catalog-visibility";
import { buildHomeHeroScenes, buildHomeViewModel, isHomeViewModelSafe } from "@/lib/home-view-model";
import { buildTemplateMarketplaceProduct } from "@/lib/template-marketplace";

const product = buildTemplateMarketplaceProduct(rentalHousingContract, rentalHousingProductPackage);
const viewModel = buildHomeViewModel([product]);
const scenes = buildHomeHeroScenes(product);

describe("dirección artística de la portada", () => {
  it("define exactamente cuatro escenas reales y una sola escena inicial accesible", () => {
    render(<HomeHeroSlider scenes={scenes} />);
    expect(scenes).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 1, name: "Ordene su problema antes de actuar" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByLabelText("Principales rutas de BúhoLex")).toHaveAttribute("aria-roledescription", "carrusel");
  });

  it("permite avanzar y retroceder con controles", () => {
    render(<HomeHeroSlider scenes={scenes} />);
    fireEvent.click(screen.getByRole("button", { name: "Escena siguiente" }));
    expect(screen.getByRole("heading", { level: 1, name: "Contratos con contexto, versión y control" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Escena anterior" }));
    expect(screen.getByRole("heading", { level: 1, name: "Ordene su problema antes de actuar" })).toBeInTheDocument();
  });

  it("responde a flechas, Home, End e indicadores", () => {
    render(<HomeHeroSlider scenes={scenes} />);
    const carousel = screen.getByLabelText("Principales rutas de BúhoLex");
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByText("DOCUMENTOS JURÍDICOS")).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    expect(screen.getByText("ORIENTACIÓN JURÍDICA")).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: "End" });
    expect(screen.getByText("DEFENSA Y ESTRATEGIA")).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: "Home" });
    expect(screen.getByText("ORIENTACIÓN JURÍDICA")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ir a la escena 03" }));
    expect(screen.getByText("PRODUCTO EN VISTA PREVIA")).toBeInTheDocument();
  });

  it("utiliza CTA con rutas existentes", () => {
    render(<HomeHeroSlider scenes={scenes} />);
    expect(screen.getByRole("link", { name: /Consultar al Asistente Legal/ })).toHaveAttribute("href", "/asistente");
    fireEvent.click(screen.getByRole("button", { name: "Ir a la escena 02" }));
    expect(screen.getByRole("link", { name: /Explorar plantillas/ })).toHaveAttribute("href", "/plantillas");
    fireEvent.click(screen.getByRole("button", { name: "Ir a la escena 03" }));
    expect(screen.getByRole("link", { name: /Ver el producto/ })).toHaveAttribute("href", product.href.replace(/\/$/, ""));
  });
});

describe("contenido editorial de la portada", () => {
  it("muestra BL-LEG-CON-001 y ninguna entidad ficticia", () => {
    render(<HomeExperience products={[product]} viewModel={viewModel} scenes={scenes} />);
    expect(templateCatalog).toHaveLength(1);
    expect(screen.getAllByText("BL-LEG-CON-001").length).toBeGreaterThan(0);
    expect(screen.getByText("Próximamente disponible")).toBeInTheDocument();
    expect(rentalHousingContract.editorialStatus).toBe("approved");
    expect(rentalHousingContract.availabilityStatus).toBe("editorial_preview");
    expect(isTemplateProductPubliclyAvailable(rentalHousingContract, rentalHousingProductPackage)).toBe(false);
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.currency).toBeNull();
    expect(rentalHousingContract.licenseStatus).toBe("pending");
  });

  it("busca por nombre, código y materia", () => {
    render(<HomeExperience products={[product]} viewModel={viewModel} scenes={scenes} />);
    const search = screen.getByRole("searchbox", { name: "Buscar plantillas" });
    for (const query of ["Arrendamiento", "BL-LEG-CON-001", "civil y contractual"]) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.getByText("1 coincidencia")).toBeInTheDocument();
    }
    fireEvent.change(search, { target: { value: "producto inexistente" } });
    expect(screen.getByText("0 coincidencias")).toBeInTheDocument();
  });

  it("permite explorar las tres versiones sin abandonar la portada", () => {
    render(<HomeExperience products={[product]} viewModel={viewModel} scenes={scenes} />);
    const version = screen.getByRole("button", { name: /Ley N\.° 30933/ });
    fireEvent.click(version);
    expect(version).toHaveAttribute("aria-pressed", "true");
  });

  it("no expone compra, descarga ni información privada", () => {
    const { container } = render(<HomeExperience products={[product]} viewModel={viewModel} scenes={scenes} />);
    const text = container.textContent ?? "";
    expect(isHomeViewModelSafe(viewModel)).toBe(true);
    expect(text).not.toMatch(/comprar|descargar|sha256|product-assets|plantilla maestra|CONTRATO-CESION|Diana Xiomara|20571585902/i);
    expect(container.querySelector("[download], [href*='download'], [href*='compra']")).toBeNull();
  });

  it("encapsula estilos, respeta reduced motion y evita overflow horizontal", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const globalStyles = readFileSync("app/globals.css", "utf8");
    const heroStyles = readFileSync("components/home/home-hero-slider.module.css", "utf8");
    expect(page).toContain("<CommercialHome />");
    expect(globalStyles).toContain("overflow-x: clip");
    expect(heroStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(heroStyles).toContain("@media (max-width: 720px)");
    expect(heroStyles).not.toContain("100vw");
  });
});
