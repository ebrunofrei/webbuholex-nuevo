import React from "react";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateCatalogExplorer } from "@/components/template-catalog-explorer";
import { TemplateProductExperience } from "@/components/template-product-experience";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingContract, templateCatalog } from "@/data/template-catalog";
import { buildTemplateMarketplaceProduct, isMarketplaceViewModelSafe } from "@/lib/template-marketplace";

const marketplaceProduct = buildTemplateMarketplaceProduct(rentalHousingContract, rentalHousingProductPackage);

describe("catálogo interactivo", () => {
  it("usa únicamente el producto real y un modelo público seguro", () => {
    expect(templateCatalog).toHaveLength(1);
    expect(marketplaceProduct.code).toBe("BL-LEG-CON-001");
    expect(isMarketplaceViewModelSafe(marketplaceProduct)).toBe(true);
  });

  it("busca por nombre, código y materia", () => {
    render(<TemplateCatalogExplorer products={[marketplaceProduct]} />);
    const search = screen.getByRole("searchbox", { name: "Buscar plantillas" });
    for (const query of ["Arrendamiento", "BL-LEG-CON-001", "civil y contractual"]) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.getByText("1 producto")).toBeInTheDocument();
    }
    fireEvent.change(search, { target: { value: "producto ficticio" } });
    expect(screen.getByText("0 productos")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No encontramos plantillas con esos criterios" })).toBeInTheDocument();
  });

  it("aplica filtros y permite restablecerlos", () => {
    render(<TemplateCatalogExplorer products={[marketplaceProduct]} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por categoría" }), { target: { value: "contable" } });
    expect(screen.getByText("0 productos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByText("1 producto")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por materia" }), { target: { value: marketplaceProduct.matter } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por jurisdicción" }), { target: { value: marketplaceProduct.jurisdiction } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por tipo de documento" }), { target: { value: marketplaceProduct.documentType } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por disponibilidad" }), { target: { value: marketplaceProduct.availabilityStatus } });
    expect(screen.getByText("1 producto")).toBeInTheDocument();
  });
});

describe("ficha dinámica BL-LEG-CON-001", () => {
  it("cambia contenido con el selector contractual", () => {
    render(<TemplateProductExperience product={marketplaceProduct} />);
    const lawButton = screen.getByRole("button", { name: /Ley N\.° 30933/ });
    fireEvent.click(lawButton);
    expect(lawButton).toHaveAttribute("aria-pressed", "true");
    const selected = document.querySelector('[data-selected-version="law_30933"]');
    expect(selected).not.toBeNull();
    expect(within(selected as HTMLElement).getAllByText(/cuenta de abono/i).length).toBeGreaterThan(0);
  });

  it("usa acordeones accesibles y mantiene la acción comercial deshabilitada", () => {
    render(<TemplateProductExperience product={marketplaceProduct} />);
    const summary = screen.getByText("Contratos editables").closest("summary");
    expect(summary).not.toBeNull();
    if (!summary) return;
    fireEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    const action = screen.getByRole("link", { name: "Solicitar personalización" });
    expect(action).toHaveAttribute("href", expect.stringMatching(/^\/consulta-profesional\/?$/));

    expect(screen.getByText("Vista previa editorial. No disponible para compra o descarga.")).toBeInTheDocument();
    expect(screen.getByText("Sin compra activa")).toBeInTheDocument();
    expect(screen.getByText("Sin descarga pública")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /comprar|pagar|descargar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /comprar|pagar|descargar/i })).not.toBeInTheDocument();
  });

  it("no expone descarga, compra, internos, hashes, rutas o cesión", () => {
    const { container } = render(<TemplateProductExperience product={marketplaceProduct} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/sha256|product-assets|plantilla maestra|CONTRATO-CESION|Diana Xiomara|20571585902/i);
    expect(container.querySelector('[href*="download"], [href*="compra"], [download]')).toBeNull();
    expect(container.querySelector(".package-table-wrap, .package-preview")).toBeNull();
  });

  it("separa las rutas públicas del panel editorial y define adaptación móvil", () => {
    const publicCategory = readFileSync("app/plantillas/legales/page.tsx", "utf8");
    const publicProduct = readFileSync("components/template-product-experience.tsx", "utf8");
    const editorialRoute = readFileSync("app/editorial/plantillas/BL-LEG-CON-001/page.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");
    expect(publicCategory).not.toContain("TemplateEditorialPreview");
    expect(publicProduct).not.toContain("ProductPackagePreview");
    expect(editorialRoute).toContain("TemplateEditorialPreview");
    expect(editorialRoute).toContain('process.env.NODE_ENV !== "development"');
    expect(styles).toContain("@media (max-width: 560px)");
    expect(styles).toContain(".product-public-content { min-width: 0; }");
  });
});
