import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { rentalHousingVerifiedFileInventory } from "@/data/product-file-inventory";
import type { ProductDocument, ProductFileInspection, ProductFileMetadata } from "@/types/product-package";

const PRIVATE_ROOT_NAME = "product-assets";

function documentFolder(document: ProductDocument): string {
  if (document.audience === "internal") return document.purpose === "master_source" ? "internal/master" : "internal/sources";
  if (document.audience === "public_information") return "public-information";
  if (document.purpose === "contract") return "customer/contracts";
  if (document.purpose === "annex") return "customer/annexes";
  if (document.purpose === "guide") return "customer/guides";
  if (document.purpose === "checklist") return "customer/checklists";
  return "customer/information";
}

export function getExpectedPrivateReference(document: ProductDocument): string {
  const configuredReference = rentalHousingVerifiedFileInventory[document.id]?.relativeReference;
  if (configuredReference) return configuredReference;
  return [PRIVATE_ROOT_NAME, document.productCode, documentFolder(document), document.fileName].join("/");
}

export function calculateFileMetadata(
  document: ProductDocument,
  contents: Uint8Array,
  verifiedAt: string | null,
): ProductFileMetadata {
  return {
    fileName: document.fileName,
    physicalFileName: document.fileName,
    extension: document.format,
    byteSize: contents.byteLength,
    sha256: createHash("sha256").update(contents).digest("hex"),
    verifiedAt,
    exists: true,
    readable: true,
    nameMatches: true,
    duplicateName: false,
    duplicateHash: false,
    warnings: [],
    errors: [],
  };
}

function hasExpectedSignature(document: ProductDocument, contents: Uint8Array): boolean {
  if (document.format === "pdf") return Buffer.from(contents.subarray(0, 5)).toString("ascii") === "%PDF-";
  return contents[0] === 0x50 && contents[1] === 0x4b;
}

function inspectionAccepts(document: ProductDocument, inspection: ProductFileInspection | undefined): inspection is ProductFileInspection {
  return Boolean(
    inspection?.documentId === document.id
      && inspection.openedSuccessfully
      && inspection.formatConfirmed
      && inspection.productConfirmed
      && inspection.classificationConfirmed,
  );
}

export async function inspectLocalProductFile(
  projectRoot: string,
  document: ProductDocument,
  inspection?: ProductFileInspection,
): Promise<ProductDocument> {
  const relativeReference = getExpectedPrivateReference(document);
  const absoluteReference = path.resolve(projectRoot, ...relativeReference.split("/"));
  const privateRoot = path.resolve(projectRoot, PRIVATE_ROOT_NAME);
  if (!absoluteReference.startsWith(`${privateRoot}${path.sep}`)) throw new Error("Referencia privada fuera del directorio permitido.");

  try {
    const fileStat = await stat(absoluteReference);
    if (!fileStat.isFile() || fileStat.size === 0) return { ...document, status: "planned", fileRef: null, fileMetadata: null, downloadable: false };
    const contents = await readFile(absoluteReference);
    if (!hasExpectedSignature(document, contents)) return { ...document, status: "planned", fileRef: null, fileMetadata: null, downloadable: false };
    const accepted = inspectionAccepts(document, inspection);
    return {
      ...document,
      status: accepted ? "verified" : "received",
      fileRef: relativeReference,
      fileMetadata: calculateFileMetadata(document, contents, accepted ? inspection.inspectedAt : null),
      downloadable: false,
      publicAuthorized: false,
    };
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { ...document, status: "planned", fileRef: null, fileMetadata: null, downloadable: false };
    }
    throw error;
  }
}
