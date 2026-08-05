import type { TemplateProduct } from "@/types/catalog";
import type { ProductPackage } from "@/types/product-package";

export function getProductPublicationBlockers(product: TemplateProduct): readonly string[] {
  const blockers: string[] = [];
  if (product.priceStatus !== "approved" || product.price === null || product.currency === null) blockers.push("Precio y moneda comercial aprobados");
  if (product.licenseStatus !== "approved" || !product.usageLicense) blockers.push("Licencia de uso definitiva");
  if (!product.editorialOwnerId) blockers.push("Responsable editorial identificado");
  if (!product.publicationAuthorization.authorized || !product.publicationAuthorization.authorizedBy || !product.publicationAuthorization.authorizedAt) blockers.push("Autorización expresa de publicación");
  const allFiles = [product.masterInternalFile, ...product.commercialFiles, ...product.annexFiles];
  if (!allFiles.every((file) => file.fileRef !== null)) blockers.push("Ubicación final de todos los archivos");
  if (product.commercialPolicyStatus !== "approved") blockers.push("Política comercial aplicable");
  return blockers;
}

export function isTemplateProductPubliclyAvailable(product: TemplateProduct, productPackage?: ProductPackage): boolean {
  const publicState = product.editorialStatus === "published" || product.editorialStatus === "updated";
  const deliveryFiles = [...product.commercialFiles, ...product.annexFiles];
  const filesAuthorized = deliveryFiles.every((file) => file.fileRef !== null && file.publicDownloadAuthorized);
  const packageReady = productPackage !== undefined && (productPackage.packageStatus === "ready_for_publication" || productPackage.packageStatus === "published") && productPackage.requiredBeforePublication.every((requirement) => requirement.resolved);
  return publicState && product.availabilityStatus === "available" && product.masterInternalFile.fileRef !== null && filesAuthorized && packageReady && getProductPublicationBlockers(product).length === 0;
}

export function shouldShowEditorialPreview(environment: string | undefined): boolean {
  return environment === "development";
}
