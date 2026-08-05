import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateCatalog } from "@/components/template-catalog";
import { rentalHousingContract, templateCatalog } from "@/data/template-catalog";

describe("estado del catálogo público", () => {
  it("contiene únicamente el producto real proporcionado", () => {
    expect(templateCatalog).toHaveLength(1);
    expect(templateCatalog[0]?.code).toBe("BL-LEG-CON-001");
  });

  it("muestra el único producto real en la vista previa editorial del catálogo", () => {
    render(<TemplateCatalog category="legal" includeEditorialPreview />);
    expect(screen.getByRole("heading", { name: rentalHousingContract.commercialTitle })).toBeInTheDocument();
    expect(screen.getByText("BL-LEG-CON-001")).toBeInTheDocument();
  });

  it("mantiene el producto excluido cuando no se permite la vista previa", () => {
    render(<TemplateCatalog category="legal" includeEditorialPreview={false} />);
    expect(screen.getByText("0 productos")).toBeInTheDocument();
    expect(screen.queryByText(rentalHousingContract.commercialTitle)).not.toBeInTheDocument();
  });
});
