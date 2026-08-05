import { getPackageDocuments } from "@/lib/product-package-integrity";
import type { ProductPackage, ProductPackageIntegrityError, ProductPackageManifest } from "@/types/product-package";

export function buildProductPackageManifest(
  productPackage: ProductPackage,
  generatedAt: string,
  integrityErrors: readonly ProductPackageIntegrityError[] = [],
): ProductPackageManifest {
  const documents = getPackageDocuments(productPackage);
  const entries = documents.map((document) => ({
    documentId: document.id,
    fileName: document.fileName,
    audience: document.audience,
    purpose: document.purpose,
    status: document.status,
    relativeReference: document.fileRef,
    extension: document.format,
    byteSize: document.fileMetadata?.byteSize ?? null,
    sha256: document.fileMetadata?.sha256 ?? null,
    verifiedAt: document.fileMetadata?.verifiedAt ?? null,
    deliverable: document.deliverable,
    downloadable: document.downloadable,
  }));
  const missingCount = entries.filter((entry) => entry.status === "planned").length;
  return {
    productCode: productPackage.productCode,
    packageVersion: productPackage.packageVersion,
    generatedAt,
    documents: entries,
    internalCount: entries.filter((entry) => entry.audience === "internal").length,
    customerCount: entries.filter((entry) => entry.audience === "customer").length,
    publicInformationCount: entries.filter((entry) => entry.audience === "public_information").length,
    missingCount,
    receivedCount: entries.filter((entry) => ["received", "verified", "approved"].includes(entry.status)).length,
    verifiedCount: entries.filter((entry) => ["verified", "approved"].includes(entry.status)).length,
    approvedCount: entries.filter((entry) => entry.status === "approved").length,
    totalByteSize: entries.reduce((total, entry) => total + (entry.byteSize ?? 0), 0),
    activeBlockerCount: productPackage.requiredBeforePublication.filter((requirement) => !requirement.resolved).length,
    packageStatus: productPackage.packageStatus,
    integrityErrors,
    integrityStatus: integrityErrors.length > 0 ? "invalid" : missingCount > 0 ? "incomplete" : "valid",
  };
}
