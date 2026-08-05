import { rentalHousingContract } from "@/data/template-catalog";
import { getVerifiedProductDocumentState } from "@/data/product-file-inventory";
import { calculateProductPackageStatus, getProductPublicationRequirements } from "@/lib/product-package-integrity";
import type { ManualProductDelivery, ProductDocument, ProductPackage, ProductPackageInventory } from "@/types/product-package";

const commonDocumentState = {
  productCode: rentalHousingContract.code,
  status: "planned" as const,
  downloadable: false,
  publicAuthorized: false,
  fileRef: null,
  fileMetadata: null,
};

const internalFiles: readonly ProductDocument[] = [
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-master-source",
    fileName: rentalHousingContract.masterInternalFile.fileName,
    audience: "internal",
    purpose: "master_source",
    format: "docx",
    intendedForDelivery: false,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: true,
    observations: "Plantilla maestra exclusivamente interna; pendiente de incorporación técnica.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-guide-source",
    fileName: "GUIA-DE-USO-Y-PERSONALIZACION-BL-LEG-CON-001.docx",
    audience: "internal",
    purpose: "guide_source",
    format: "docx",
    intendedForDelivery: false,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: false,
    observations: "Fuente editorial interna de la guía; no incorporada al proyecto.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-license-source",
    fileName: "LICENCIA-DE-USO-BL-LEG-CON-001.docx",
    audience: "internal",
    purpose: "license_source",
    format: "docx",
    intendedForDelivery: false,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: false,
    observations: "Fuente editorial interna de la licencia; no incorporada al proyecto.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-technical-sheet-source",
    fileName: "FICHA-TECNICA-Y-COMERCIAL-BL-LEG-CON-001.docx",
    audience: "internal",
    purpose: "technical_sheet_source",
    format: "docx",
    intendedForDelivery: false,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: false,
    observations: "Fuente editorial interna de la ficha técnica; no incorporada al proyecto.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-readme-source",
    fileName: "LEEME-BL-LEG-CON-001.docx",
    audience: "internal",
    purpose: "readme_source",
    format: "docx",
    intendedForDelivery: false,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: false,
    observations: "Fuente editorial interna del documento Léeme; no incorporada al proyecto.",
  },
];

const contractDocuments: readonly ProductDocument[] = rentalHousingContract.commercialFiles.map<ProductDocument>((file, index) => ({
  ...commonDocumentState,
  id: `bl-leg-con-001-contract-${index + 1}`,
  fileName: file.fileName,
  audience: "customer",
  purpose: "contract",
  format: "docx",
  intendedForDelivery: true,
  deliverable: true,
  publishable: false,
  requiredBeforePublication: true,
  observations: "Versión comercial registrada; archivo real pendiente de incorporación y verificación.",
}));

const annexDocuments: readonly ProductDocument[] = rentalHousingContract.annexFiles.map<ProductDocument>((file, index) => ({
  ...commonDocumentState,
  id: `bl-leg-con-001-annex-${index + 1}`,
  fileName: file.fileName,
  audience: "customer",
  purpose: "annex",
  format: "docx",
  intendedForDelivery: true,
  deliverable: true,
  publishable: false,
  requiredBeforePublication: true,
  observations: "Anexo editable registrado; archivo real pendiente de incorporación y verificación.",
}));

const checklistWord: ProductDocument = {
  ...commonDocumentState,
  id: "bl-leg-con-001-checklist-docx",
  fileName: "CHECKLIST-PREVIO-A-LA-FIRMA-BL-LEG-CON-001.docx",
  audience: "customer",
  purpose: "checklist",
  format: "docx",
  intendedForDelivery: true,
  deliverable: false,
  publishable: false,
  requiredBeforePublication: true,
  observations: "Documento pendiente de elaboración o aprobación; no existe archivo incorporado.",
};

const customerEditableFiles: readonly ProductDocument[] = [...contractDocuments, ...annexDocuments, checklistWord];

const customerPdfFiles: readonly ProductDocument[] = [
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-guide-pdf",
    fileName: "GUIA-DE-USO-Y-PERSONALIZACION-BL-LEG-CON-001.pdf",
    audience: "customer",
    purpose: "guide",
    format: "pdf",
    intendedForDelivery: true,
    deliverable: true,
    publishable: false,
    requiredBeforePublication: true,
    observations: "Documento informado como preparado; pendiente de incorporación y verificación dentro del proyecto.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-checklist-pdf",
    fileName: "CHECKLIST-PREVIO-A-LA-FIRMA-BL-LEG-CON-001.pdf",
    audience: "customer",
    purpose: "checklist",
    format: "pdf",
    intendedForDelivery: true,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: true,
    observations: "Documento pendiente de elaboración o aprobación; no existe archivo incorporado.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-license-pdf",
    fileName: "LICENCIA-DE-USO-BL-LEG-CON-001.pdf",
    audience: "customer",
    purpose: "license",
    format: "pdf",
    intendedForDelivery: true,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: true,
    observations: "Licencia pendiente de contenido y aprobación; bloqueo obligatorio de publicación.",
  },
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-readme-pdf",
    fileName: "LEEME-BL-LEG-CON-001.pdf",
    audience: "customer",
    purpose: "readme",
    format: "pdf",
    intendedForDelivery: true,
    deliverable: false,
    publishable: false,
    requiredBeforePublication: true,
    observations: "Documento pendiente; no existe archivo incorporado.",
  },
];

const publicInformationFiles: readonly ProductDocument[] = [
  {
    ...commonDocumentState,
    id: "bl-leg-con-001-technical-sheet-pdf",
    fileName: "FICHA-TECNICA-Y-COMERCIAL-BL-LEG-CON-001.pdf",
    audience: "public_information",
    purpose: "technical_sheet",
    format: "pdf",
    intendedForDelivery: false,
    deliverable: false,
    publishable: true,
    requiredBeforePublication: false,
    observations: "Documento informativo público opcional o posterior; pendiente de elaboración o aprobación.",
  },
];

function applyVerifiedFileState(document: ProductDocument): ProductDocument {
  const pendingApproval = document.purpose === "license"
    ? " Archivo físico verificado; la aprobación editorial y comercial de la licencia continúa pendiente."
    : " Archivo físico localizado, legible y verificado; no implica aprobación editorial, publicación ni descarga.";
  return { ...document, ...getVerifiedProductDocumentState(document.id), observations: pendingApproval.trim() };
}

const rentalHousingPackageInventory: ProductPackageInventory = {
  productCode: rentalHousingContract.code,
  packageVersion: rentalHousingContract.version,
  deliveryChannelStatus: "pending",
  refundRulesStatus: "pending",
  internalFiles: internalFiles.map(applyVerifiedFileState),
  customerEditableFiles: customerEditableFiles.map(applyVerifiedFileState),
  customerPdfFiles: customerPdfFiles.map(applyVerifiedFileState),
  publicInformationFiles: publicInformationFiles.map(applyVerifiedFileState),
};

const requiredBeforePublication = getProductPublicationRequirements(rentalHousingContract, rentalHousingPackageInventory);

export const rentalHousingProductPackage: ProductPackage = {
  ...rentalHousingPackageInventory,
  requiredBeforePublication,
  packageStatus: calculateProductPackageStatus(rentalHousingContract, rentalHousingPackageInventory, requiredBeforePublication),
};

export const productPackages: readonly ProductPackage[] = [rentalHousingProductPackage];
export const manualProductDeliveries: readonly ManualProductDelivery[] = [];

export function getProductPackageByCode(productCode: string): ProductPackage | undefined {
  return productPackages.find((productPackage) => productPackage.productCode === productCode);
}
