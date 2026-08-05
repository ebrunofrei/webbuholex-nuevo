import { describe, expect, it } from "vitest";
import { rentalHousingContract, templateCatalog } from "@/data/template-catalog";
import { editorialReviewEntrySchema, templateCatalogSchema, templateProductSchema } from "@/lib/schemas/catalog";

describe("esquemas editoriales", () => {
  it("valida el primer producto jurídico real", () => {
    expect(templateProductSchema.safeParse(rentalHousingContract).success).toBe(true);
  });

  it("valida la formalización patrimonial sin aceptar rutas públicas o absolutas", () => {
    expect(rentalHousingContract.intellectualProperty).toMatchObject({ authorshipStatus: "formalized", rightsTransferStatus: "documented" });
    const invalid = {
      ...rentalHousingContract,
      intellectualProperty: {
        ...rentalHousingContract.intellectualProperty,
        supportingDocument: {
          ...rentalHousingContract.intellectualProperty.supportingDocument,
          privateFileRef: "C:\\public\\CONTRATO-CESION-DERECHOS-BL-LEG-CON-001.pdf",
        },
      },
    };
    expect(templateProductSchema.safeParse(invalid).success).toBe(false);
  });

  it("rechaza una plantilla sin exclusiones", () => {
    expect(templateProductSchema.safeParse({ ...rentalHousingContract, exclusions: [] }).success).toBe(false);
  });

  it("mantiene únicos código y slug", () => {
    expect(templateCatalogSchema.safeParse(templateCatalog).success).toBe(true);
    expect(templateCatalogSchema.safeParse([...templateCatalog, { ...rentalHousingContract, id: "BL-LEG-CON-002" }]).success).toBe(false);
  });

  it("permite aprobación interna sin autorización de publicación", () => {
    const result = editorialReviewEntrySchema.safeParse({
      id: "22222222-2222-4222-8222-222222222222",
      productId: rentalHousingContract.id,
      status: "approved",
      sourceFileRef: "internal-record-pending-location",
      reviewerId: "reviewer-test",
      reviewedAt: "2026-07-27",
      changes: ["Revisión de prueba"],
      publicVersion: "0.10",
      reviewedRules: ["Regla de prueba"],
      observations: "",
      publicationAuthorization: { authorized: false, authorizedBy: null, authorizedAt: null },
    });
    expect(result.success).toBe(true);
  });

  it("impide publicar sin autorización completa", () => {
    expect(templateProductSchema.safeParse({ ...rentalHousingContract, editorialStatus: "published", availabilityStatus: "available" }).success).toBe(false);
  });
});
