import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateEditorialPreview } from "@/components/template-editorial-preview";
import { rentalHousingContract } from "@/data/template-catalog";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { getProductPublicationBlockers, isTemplateProductPubliclyAvailable } from "@/lib/catalog-visibility";

describe("BL-LEG-CON-001", () => {
  it("registra tres versiones comerciales y ocho anexos", () => {
    expect(rentalHousingContract.commercialFiles).toHaveLength(3);
    expect(rentalHousingContract.annexFiles).toHaveLength(8);
  });

  it("mantiene la plantilla maestra exclusivamente interna", () => {
    expect(rentalHousingContract.masterInternalFile.role).toBe("master_internal");
    expect(rentalHousingContract.masterInternalFile.fileRef).toBeNull();
    expect(rentalHousingContract.masterInternalFile.publicDownloadAuthorized).toBe(false);
  });

  it("no contiene precio ni licencia inventados y usa responsables formalizados", () => {
    expect(rentalHousingContract.priceStatus).toBe("pending");
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.currency).toBeNull();
    expect(rentalHousingContract.licenseStatus).toBe("pending");
    expect(rentalHousingContract.usageLicense).toBeNull();
    expect(rentalHousingContract.editorialOwnerId).toBe("Eduardo Frei Bruno Gómez");
    expect(rentalHousingContract.versionHistory.at(-1)?.reviewerId).toBe("Eduardo Frei Bruno Gómez");
  });

  it("no es públicamente disponible y conserva todos los bloqueos", () => {
    expect(isTemplateProductPubliclyAvailable(rentalHousingContract)).toBe(false);
    expect(getProductPublicationBlockers(rentalHousingContract)).toEqual([
      "Precio y moneda comercial aprobados",
      "Licencia de uso definitiva",
      "Autorización expresa de publicación",
      "Ubicación final de todos los archivos",
      "Política comercial aplicable",
    ]);
  });

  it("muestra la ficha editorial sin enlaces de descarga ni solicitud", () => {
    render(<TemplateEditorialPreview product={rentalHousingContract} productPackage={rentalHousingProductPackage} />);
    expect(screen.getByRole("heading", { name: rentalHousingContract.commercialTitle })).toBeInTheDocument();
    expect(screen.getByText("Precio aprobado")).toBeInTheDocument();
    expect(screen.getByText("Autor institucional")).toBeInTheDocument();
    expect(screen.getAllByText("Eduardo Frei Bruno Gómez").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Empresa Constructora, Consultora, Bienes y Servicios en General Julita S.A.C.")).toBeInTheDocument();
    expect(screen.queryByText("20571585902")).not.toBeInTheDocument();
    expect(screen.queryByText("Diana Xiomara Bazán Bruno")).not.toBeInTheDocument();
    expect(screen.queryByText("CONTRATO-CESION-DERECHOS-BL-LEG-CON-001.pdf")).not.toBeInTheDocument();
    expect(screen.getByTestId("contracts-count")).toHaveTextContent("3");
    expect(screen.getByTestId("annexes-count")).toHaveTextContent("8");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
