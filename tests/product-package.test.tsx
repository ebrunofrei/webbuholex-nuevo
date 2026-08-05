import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductPackagePreview } from "@/components/product-package-preview";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingContract } from "@/data/template-catalog";
import { isTemplateProductPubliclyAvailable, shouldShowEditorialPreview } from "@/lib/catalog-visibility";
import { getPackageDocuments, validateProductPackageIntegrity } from "@/lib/product-package-integrity";
import { manualProductDeliverySchema, productDocumentSchema, productPackageSchema } from "@/lib/schemas/product-package";
import type { ManualProductDelivery } from "@/types/product-package";

const documents = getPackageDocuments(rentalHousingProductPackage);

describe("paquete documental BL-LEG-CON-001", () => {
  it("valida el inventario completo contra el esquema", () => {
    expect(productPackageSchema.safeParse(rentalHousingProductPackage).success).toBe(true);
    expect(documents.every((document) => productDocumentSchema.safeParse(document).success)).toBe(true);
  });

  it("protege la plantilla maestra y la guía Word como documentos internos", () => {
    expect(rentalHousingProductPackage.internalFiles).toHaveLength(5);
    expect(rentalHousingProductPackage.internalFiles.find((document) => document.purpose === "master_source")).toMatchObject({ audience: "internal", deliverable: false, downloadable: false, publishable: false });
    expect(rentalHousingProductPackage.internalFiles.find((document) => document.purpose === "guide_source")).toMatchObject({ audience: "internal", deliverable: false, downloadable: false });
    expect(rentalHousingProductPackage.internalFiles.filter((document) => ["guide_source", "license_source", "technical_sheet_source", "readme_source"].includes(document.purpose))).toHaveLength(4);
    expect(rentalHousingProductPackage.internalFiles.filter((document) => ["license_source", "technical_sheet_source", "readme_source"].includes(document.purpose)).every((document) => !document.intendedForDelivery && !document.deliverable)).toBe(true);
    expect(documents.find((document) => document.id === "bl-leg-con-001-checklist-docx")).toMatchObject({ audience: "customer", intendedForDelivery: true });
  });

  it("clasifica tres contratos y ocho anexos como entregables al cliente", () => {
    expect(documents.filter((document) => document.purpose === "contract" && document.audience === "customer" && document.deliverable)).toHaveLength(3);
    expect(documents.filter((document) => document.purpose === "annex" && document.audience === "customer" && document.deliverable)).toHaveLength(8);
  });

  it("registra la guía PDF verificada como entregable sin descarga", () => {
    expect(documents.find((document) => document.purpose === "guide" && document.format === "pdf")).toMatchObject({ audience: "customer", deliverable: true, downloadable: false, status: "verified" });
  });

  it("verifica checklist, licencia, ficha y Léeme sin aprobarlos", () => {
    const auxiliary = documents.filter((document) => ["checklist", "license", "technical_sheet", "readme"].includes(document.purpose));
    expect(auxiliary).toHaveLength(5);
    expect(auxiliary.every((document) => document.status === "verified" && !document.downloadable && !document.publicAuthorized)).toBe(true);
  });

  it("mantiene la licencia como bloqueo y el paquete en revisión", () => {
    expect(rentalHousingProductPackage.requiredBeforePublication.find((requirement) => requirement.code === "license_approved")?.resolved).toBe(false);
    expect(rentalHousingProductPackage.packageStatus).toBe("ready_for_review");
    expect(productPackageSchema.safeParse({ ...rentalHousingProductPackage, packageStatus: "ready_for_publication" }).success).toBe(false);
  });

  it("excluye internos del paquete del cliente y conserva identificadores únicos", () => {
    expect([...rentalHousingProductPackage.customerEditableFiles, ...rentalHousingProductPackage.customerPdfFiles].every((document) => document.audience !== "internal")).toBe(true);
    expect(new Set(documents.map((document) => document.id)).size).toBe(documents.length);
  });

  it("vincula y verifica los 22 archivos físicos sin aprobarlos", () => {
    expect(documents).toHaveLength(22);
    expect(documents.every((document) => document.status === "verified" && document.fileRef !== null && document.fileMetadata?.readable && document.fileMetadata.errors.length === 0)).toBe(true);
    expect(documents.filter((document) => document.status === "approved")).toHaveLength(0);
    expect(rentalHousingProductPackage.requiredBeforePublication.filter((requirement) => !requirement.resolved)).toHaveLength(7);
  });

  it("rechaza documentos retirados entregables y descargas sin control completo", () => {
    const contract = rentalHousingProductPackage.customerEditableFiles[0];
    expect(contract).toBeDefined();
    if (!contract) return;
    expect(productDocumentSchema.safeParse({ ...contract, status: "withdrawn", deliverable: true }).success).toBe(false);
    expect(productDocumentSchema.safeParse({ ...contract, status: "replaced", deliverable: true }).success).toBe(false);
    expect(productDocumentSchema.safeParse({ ...contract, downloadable: true }).success).toBe(false);
  });

  it("detecta identificadores duplicados mediante errores estructurados", () => {
    const firstPdf = rentalHousingProductPackage.customerPdfFiles[0];
    const firstEditable = rentalHousingProductPackage.customerEditableFiles[0];
    expect(firstPdf).toBeDefined();
    expect(firstEditable).toBeDefined();
    if (!firstPdf || !firstEditable) return;
    const invalidPackage = { ...rentalHousingProductPackage, customerPdfFiles: [...rentalHousingProductPackage.customerPdfFiles, { ...firstPdf, id: firstEditable.id }] };
    expect(validateProductPackageIntegrity(rentalHousingContract, invalidPackage).some((error) => error.code === "duplicate_document_id")).toBe(true);
  });

  it("impide incluir la plantilla maestra en una entrega manual", () => {
    const master = rentalHousingProductPackage.internalFiles.find((document) => document.purpose === "master_source");
    expect(master).toBeDefined();
    if (!master) return;
    const delivery: ManualProductDelivery = {
      orderId: "11111111-1111-4111-8111-111111111111",
      productCode: rentalHousingContract.code,
      packageVersion: rentalHousingProductPackage.packageVersion,
      deliveredDocumentIds: [master.id],
      deliveredAt: null,
      deliveredBy: null,
      evidenceReference: null,
      customerConfirmationAt: null,
    };
    const codes = validateProductPackageIntegrity(rentalHousingContract, rentalHousingProductPackage, delivery).map((error) => error.code);
    expect(codes).toContain("delivery_contains_internal_document");
    expect(codes).toContain("delivery_contains_unavailable_document");
  });

  it("exige responsable y evidencia cuando se registra una entrega", () => {
    const incompleteDelivery = {
      orderId: "11111111-1111-4111-8111-111111111111",
      productCode: rentalHousingContract.code,
      packageVersion: rentalHousingProductPackage.packageVersion,
      deliveredDocumentIds: ["bl-leg-con-001-contract-1"],
      deliveredAt: "2026-07-27T12:00:00.000Z",
      deliveredBy: null,
      evidenceReference: null,
      customerConfirmationAt: null,
    };
    expect(manualProductDeliverySchema.safeParse(incompleteDelivery).success).toBe(false);
  });

  it("detecta versión de paquete distinta y autorización pública ausente", () => {
    const technicalSheet = rentalHousingProductPackage.publicInformationFiles[0];
    expect(technicalSheet).toBeDefined();
    if (!technicalSheet) return;
    const invalidPackage = {
      ...rentalHousingProductPackage,
      packageVersion: "different-version",
      publicInformationFiles: [{ ...technicalSheet, status: "approved" as const, publicAuthorized: false }],
    };
    const codes = validateProductPackageIntegrity(rentalHousingContract, invalidPackage).map((error) => error.code);
    expect(codes).toContain("package_version_mismatch");
    expect(codes).toContain("public_document_without_authorization");
  });

  it("mantiene el producto fuera del catálogo y limita la vista a desarrollo", () => {
    expect(isTemplateProductPubliclyAvailable(rentalHousingContract, rentalHousingProductPackage)).toBe(false);
    expect(shouldShowEditorialPreview("development")).toBe(true);
    expect(shouldShowEditorialPreview("production")).toBe(false);
    expect(shouldShowEditorialPreview("test")).toBe(false);
  });

  it("calcula indicadores desde el inventario y no presenta enlaces", () => {
    render(<ProductPackagePreview product={rentalHousingContract} productPackage={rentalHousingProductPackage} />);
    expect(screen.getByTestId("contracts-count")).toHaveTextContent("3");
    expect(screen.getByTestId("annexes-count")).toHaveTextContent("8");
    expect(screen.getByTestId("guide-pdf-count")).toHaveTextContent("1");
    expect(screen.getByTestId("guide-source-count")).toHaveTextContent("1");
    expect(screen.getByTestId("auxiliary-count")).toHaveTextContent("0");
    expect(screen.getByTestId("downloads-count")).toHaveTextContent("0");
    expect(screen.getByTestId("public-routes-count")).toHaveTextContent("0");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
