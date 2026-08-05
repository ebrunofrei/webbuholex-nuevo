import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingVerifiedFileInventory } from "@/data/product-file-inventory";
import { calculateFileMetadata, getExpectedPrivateReference, inspectLocalProductFile } from "@/lib/product-file-verification";

const contract = rentalHousingProductPackage.customerEditableFiles[0];

describe("verificación privada de archivos de producto", () => {
  it("recalcula tamaño y SHA-256 de los 22 archivos físicos", async () => {
    const records = Object.values(rentalHousingVerifiedFileInventory);
    expect(records).toHaveLength(22);
    for (const record of records) {
      const contents = await readFile(path.resolve(record.relativeReference));
      const document = [
        ...rentalHousingProductPackage.internalFiles,
        ...rentalHousingProductPackage.customerEditableFiles,
        ...rentalHousingProductPackage.customerPdfFiles,
        ...rentalHousingProductPackage.publicInformationFiles,
      ].find((candidate) => candidate.id === record.documentId);
      expect(document).toBeDefined();
      if (!document) continue;
      const calculated = calculateFileMetadata(document, contents, record.metadata.verifiedAt);
      expect(calculated.byteSize).toBe(record.metadata.byteSize);
      expect(calculated.sha256).toBe(record.metadata.sha256);
      expect(calculated.physicalFileName).toBe(document.fileName);
    }
  });

  it("mantiene planned cuando el archivo físico no existe", async () => {
    expect(contract).toBeDefined();
    if (!contract) return;
    const projectRoot = await mkdtemp(path.join(tmpdir(), "buholex-missing-"));
    await expect(inspectLocalProductFile(projectRoot, contract)).resolves.toMatchObject({ status: "planned", fileRef: null, fileMetadata: null, downloadable: false });
  });

  it("solo marca received al encontrar un DOCX coherente y no lo aprueba", async () => {
    expect(contract).toBeDefined();
    if (!contract) return;
    const projectRoot = await mkdtemp(path.join(tmpdir(), "buholex-received-"));
    const relativeReference = getExpectedPrivateReference(contract);
    const absoluteReference = path.join(projectRoot, ...relativeReference.split("/"));
    await mkdir(path.dirname(absoluteReference), { recursive: true });
    await writeFile(absoluteReference, Buffer.from([0x50, 0x4b, 0x03, 0x04, 1]));
    const result = await inspectLocalProductFile(projectRoot, contract);
    expect(result).toMatchObject({ status: "received", fileRef: relativeReference, downloadable: false, publicAuthorized: false });
    expect(result.fileMetadata?.byteSize).toBe(5);
    expect(result.fileMetadata?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.fileMetadata?.verifiedAt).toBeNull();
  });

  it("solo pasa a verified con una inspección explícita completa", async () => {
    expect(contract).toBeDefined();
    if (!contract) return;
    const projectRoot = await mkdtemp(path.join(tmpdir(), "buholex-verified-"));
    const relativeReference = getExpectedPrivateReference(contract);
    const absoluteReference = path.join(projectRoot, ...relativeReference.split("/"));
    await mkdir(path.dirname(absoluteReference), { recursive: true });
    await writeFile(absoluteReference, Buffer.from([0x50, 0x4b, 0x03, 0x04, 2]));
    const inspectedAt = "2026-07-27T12:00:00.000Z";
    const result = await inspectLocalProductFile(projectRoot, contract, {
      documentId: contract.id,
      openedSuccessfully: true,
      formatConfirmed: true,
      productConfirmed: true,
      classificationConfirmed: true,
      inspectedAt,
    });
    expect(result.status).toBe("verified");
    expect(result.fileMetadata?.verifiedAt).toBe(inspectedAt);
  });

  it("calcula tamaño y hash desde bytes y no desde constantes del inventario", () => {
    expect(contract).toBeDefined();
    if (!contract) return;
    const metadata = calculateFileMetadata(contract, new Uint8Array([1, 2, 3]), null);
    expect(metadata.byteSize).toBe(3);
    expect(metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("mantiene referencias previstas relativas y fuera de public", () => {
    const allDocuments = [
      ...rentalHousingProductPackage.internalFiles,
      ...rentalHousingProductPackage.customerEditableFiles,
      ...rentalHousingProductPackage.customerPdfFiles,
      ...rentalHousingProductPackage.publicInformationFiles,
    ];
    const references = allDocuments.map(getExpectedPrivateReference);
    expect(references.every((reference) => reference.startsWith("product-assets/BL-LEG-CON-001/") && !reference.includes("/public/") && !/^[A-Za-z]:[\\/]/.test(reference))).toBe(true);
  });

  it("no contiene nombres, referencias ni hashes duplicados", () => {
    const records = Object.values(rentalHousingVerifiedFileInventory);
    expect(new Set(records.map((record) => record.metadata.physicalFileName.toLowerCase())).size).toBe(22);
    expect(new Set(records.map((record) => record.relativeReference)).size).toBe(22);
    expect(new Set(records.map((record) => record.metadata.sha256)).size).toBe(22);
  });

  it("no confunde la recepción física de la licencia con su aprobación", async () => {
    const license = rentalHousingProductPackage.customerPdfFiles.find((document) => document.purpose === "license");
    expect(license).toBeDefined();
    if (!license) return;
    const projectRoot = await mkdtemp(path.join(tmpdir(), "buholex-license-"));
    const relativeReference = getExpectedPrivateReference(license);
    const absoluteReference = path.join(projectRoot, ...relativeReference.split("/"));
    await mkdir(path.dirname(absoluteReference), { recursive: true });
    await writeFile(absoluteReference, Buffer.from("%PDF-1.7\n"));
    await expect(inspectLocalProductFile(projectRoot, license)).resolves.toMatchObject({ status: "received", publicAuthorized: false, downloadable: false });
  });
});
