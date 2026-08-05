export type ProductDocumentAudience = "internal" | "customer" | "public_information";

export type ProductDocumentPurpose =
  | "contract"
  | "annex"
  | "guide"
  | "guide_source"
  | "license_source"
  | "technical_sheet_source"
  | "readme_source"
  | "checklist"
  | "license"
  | "technical_sheet"
  | "readme"
  | "master_source";

export type ProductDocumentStatus = "planned" | "received" | "verified" | "approved" | "replaced" | "withdrawn";

export type ProductDocumentFormat = "docx" | "pdf";

export interface ProductFileMetadata {
  fileName: string;
  physicalFileName: string;
  extension: ProductDocumentFormat;
  byteSize: number;
  sha256: string;
  verifiedAt: string | null;
  exists: boolean;
  readable: boolean;
  nameMatches: boolean;
  duplicateName: boolean;
  duplicateHash: boolean;
  warnings: readonly string[];
  errors: readonly string[];
}

export interface ProductFileInspection {
  documentId: string;
  openedSuccessfully: boolean;
  formatConfirmed: boolean;
  productConfirmed: boolean;
  classificationConfirmed: boolean;
  inspectedAt: string;
}

export type ProductPackageStatus =
  | "draft"
  | "incomplete"
  | "ready_for_review"
  | "approved_for_packaging"
  | "ready_for_publication"
  | "published"
  | "withdrawn";

export interface ProductDocument {
  id: string;
  productCode: string;
  fileName: string;
  audience: ProductDocumentAudience;
  purpose: ProductDocumentPurpose;
  format: ProductDocumentFormat;
  status: ProductDocumentStatus;
  intendedForDelivery: boolean;
  deliverable: boolean;
  downloadable: boolean;
  publishable: boolean;
  publicAuthorized: boolean;
  fileRef: string | null;
  fileMetadata: ProductFileMetadata | null;
  requiredBeforePublication: boolean;
  observations: string;
}

export interface ProductDocumentRequirement {
  code: string;
  label: string;
  description: string;
  blocking: true;
  resolved: boolean;
}

export interface ProductPackageInventory {
  productCode: string;
  packageVersion: string;
  deliveryChannelStatus: "pending" | "approved";
  refundRulesStatus: "pending" | "approved";
  internalFiles: readonly ProductDocument[];
  customerEditableFiles: readonly ProductDocument[];
  customerPdfFiles: readonly ProductDocument[];
  publicInformationFiles: readonly ProductDocument[];
}

export interface ProductPackage extends ProductPackageInventory {
  requiredBeforePublication: readonly ProductDocumentRequirement[];
  packageStatus: ProductPackageStatus;
}

export interface ProductPackageManifestEntry {
  documentId: string;
  fileName: string;
  audience: ProductDocumentAudience;
  purpose: ProductDocumentPurpose;
  status: ProductDocumentStatus;
  relativeReference: string | null;
  extension: ProductDocumentFormat;
  byteSize: number | null;
  sha256: string | null;
  verifiedAt: string | null;
  deliverable: boolean;
  downloadable: boolean;
}

export interface ProductPackageManifest {
  productCode: string;
  packageVersion: string;
  generatedAt: string;
  documents: readonly ProductPackageManifestEntry[];
  internalCount: number;
  customerCount: number;
  publicInformationCount: number;
  missingCount: number;
  receivedCount: number;
  verifiedCount: number;
  approvedCount: number;
  totalByteSize: number;
  activeBlockerCount: number;
  packageStatus: ProductPackageStatus;
  integrityErrors: readonly ProductPackageIntegrityError[];
  integrityStatus: "valid" | "invalid" | "incomplete";
}

export interface ManualProductDelivery {
  orderId: string;
  productCode: string;
  packageVersion: string;
  deliveredDocumentIds: readonly string[];
  deliveredAt: string | null;
  deliveredBy: string | null;
  evidenceReference: string | null;
  customerConfirmationAt: string | null;
}

export type ProductPackageIntegrityErrorCode =
  | "duplicate_document_id"
  | "duplicate_file_name"
  | "master_in_customer_package"
  | "internal_document_in_customer_package"
  | "download_without_verified_file"
  | "public_document_without_authorization"
  | "withdrawn_document_deliverable"
  | "package_version_mismatch"
  | "license_missing_before_publication"
  | "publication_blockers_active"
  | "delivery_contains_internal_document"
  | "delivery_contains_unknown_document"
  | "delivery_contains_unavailable_document"
  | "delivery_product_mismatch"
  | "missing_file_marked_received"
  | "unverified_file_marked_approved"
  | "unsafe_private_reference"
  | "metadata_without_file"
  | "duplicate_file_content"
  | "duplicate_file_reference"
  | "unreadable_verified_file"
  | "physical_name_mismatch"
  | "replaced_document_deliverable"
  | "manifest_mismatch";

export interface ProductPackageIntegrityError {
  code: ProductPackageIntegrityErrorCode;
  documentId: string | null;
  message: string;
}
