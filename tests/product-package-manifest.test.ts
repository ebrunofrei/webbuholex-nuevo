import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingContract } from "@/data/template-catalog";
import { isTemplateProductPubliclyAvailable } from "@/lib/catalog-visibility";
import { validateProductPackageIntegrity } from "@/lib/product-package-integrity";
import { buildProductPackageManifest } from "@/lib/product-package-manifest";

describe("manifiesto local BL-LEG-CON-001", () => {
  const errors = validateProductPackageIntegrity(rentalHousingContract, rentalHousingProductPackage);
  const manifest = buildProductPackageManifest(rentalHousingProductPackage, "2026-07-27T00:00:00.000Z", errors);

  it("calcula conteos desde los 22 registros reales del inventario", () => {
    expect(manifest.documents).toHaveLength(22);
    expect(manifest).toMatchObject({ internalCount: 5, customerCount: 16, publicInformationCount: 1, missingCount: 0, receivedCount: 22, verifiedCount: 22, approvedCount: 0, totalByteSize: 1205027, activeBlockerCount: 7, packageStatus: "ready_for_review", integrityStatus: "valid" });
  });

  it("incorpora solo rutas privadas, tamaños y hashes calculados sin habilitar descargas", () => {
    expect(manifest.documents.every((entry) => entry.relativeReference?.startsWith("product-assets/BL-LEG-CON-001/") && entry.byteSize !== null && entry.byteSize > 0 && /^[a-f0-9]{64}$/.test(entry.sha256 ?? "") && !entry.downloadable)).toBe(true);
  });

  it("protege internos y mantiene bloqueos comerciales", () => {
    expect(manifest.documents.filter((entry) => entry.audience === "internal").every((entry) => !entry.deliverable)).toBe(true);
    expect(rentalHousingProductPackage.requiredBeforePublication.find((item) => item.code === "license_approved")?.resolved).toBe(false);
    expect(rentalHousingProductPackage.requiredBeforePublication.find((item) => item.code === "price_approved")?.resolved).toBe(false);
    expect(rentalHousingProductPackage.requiredBeforePublication.find((item) => item.code === "editorial_owner_identified")?.resolved).toBe(true);
    expect(rentalHousingProductPackage.requiredBeforePublication.find((item) => item.code === "legal_reviewer_identified")?.resolved).toBe(true);
    expect(isTemplateProductPubliclyAvailable(rentalHousingContract, rentalHousingProductPackage)).toBe(false);
  });

  it("corresponde exactamente con los 16 deliveryFiles declarados", async () => {
    const metadata = JSON.parse((await readFile(path.resolve("product-assets/BL-LEG-CON-001/metadata.json"), "utf8")).replace(/^\uFEFF/, "")) as { deliveryFiles: string[] };
    const deliveryDocuments = manifest.documents.filter((entry) => entry.audience === "customer");
    expect(deliveryDocuments).toHaveLength(16);
    expect(new Set(deliveryDocuments.map((entry) => entry.fileName))).toEqual(new Set(metadata.deliveryFiles));
  });

  it("conserva metadata editorial y comercial pendiente", async () => {
    const metadata = JSON.parse((await readFile(path.resolve("product-assets/BL-LEG-CON-001/metadata.json"), "utf8")).replace(/^\uFEFF/, "")) as {
      code: string;
      version: string;
      editorialStatus: string;
      visibility: string;
      published: boolean;
      price: number | null;
      currency: string | null;
      responsibleEditor: string | null;
      legalReviewer: string | null;
      authorshipStatus: string;
      rightsTransferStatus: string;
      reviewedAt: string;
      nextReviewAt: string;
      license: { status: string };
    };
    expect(metadata).toMatchObject({ code: "BL-LEG-CON-001", version: "0.10", editorialStatus: "approved", visibility: "editorial_preview", published: false, price: null, currency: null, responsibleEditor: "Eduardo Frei Bruno Gómez", legalReviewer: "Eduardo Frei Bruno Gómez", authorshipStatus: "formalized", rightsTransferStatus: "documented", reviewedAt: "2026-07-27", nextReviewAt: "2027-07-27", license: { status: "pending" } });
  });

  it("mantiene el respaldo corporativo fuera de los 22 documentos y de toda entrega", () => {
    const support = rentalHousingContract.intellectualProperty.supportingDocument;
    expect(support).toMatchObject({ status: "verified", signed: true, signedAt: null, customerDeliverable: false, publiclyVisible: false, downloadable: false });
    expect(support.privateFileRef).toMatch(/^legal\/intellectual-property\/BL-LEG-CON-001\//);
    expect(manifest.documents.some((entry) => entry.fileName === support.fileName)).toBe(false);
    expect(manifest.documents).toHaveLength(22);
  });

  it("verifica los metadatos del respaldo corporativo contra el PDF privado real", async () => {
    const support = rentalHousingContract.intellectualProperty.supportingDocument;
    expect(support.privateFileRef).not.toBeNull();
    if (!support.privateFileRef) return;
    const bytes = await readFile(path.resolve(support.privateFileRef));
    expect(bytes.byteLength).toBe(support.byteSize);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(support.sha256);
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("clasifica cinco internos y una ficha informativa futura", () => {
    expect(manifest.documents.filter((entry) => entry.audience === "internal" && !entry.deliverable)).toHaveLength(5);
    expect(manifest.documents.filter((entry) => entry.audience === "public_information" && entry.purpose === "technical_sheet" && !entry.deliverable && !entry.downloadable)).toHaveLength(1);
  });
});
