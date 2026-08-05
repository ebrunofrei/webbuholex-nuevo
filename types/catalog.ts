export type ProductCategory = "legal" | "empresarial" | "contable";

export type TemplateDeliveryFormat = "docx" | "pdf" | "xlsx" | "bundle";

export type PersonalizationLevel = "none" | "guided" | "professional";

export type PriceStatus = "pending" | "approved";

export type LicenseStatus = "pending" | "approved";

export type CommercialPolicyStatus = "pending" | "approved";

export type ProductAvailabilityStatus = "editorial_preview" | "available" | "withdrawn";

export type AuthorshipStatus = "pending" | "formalized";

export type RightsTransferStatus = "pending" | "documented";

export type ContractVersionId = "ordinary" | "future_eviction" | "law_30933";

export interface ContractVersionProfile {
  id: ContractVersionId;
  name: string;
  shortName: string;
  description: string;
  formalities: readonly string[];
  useCases: readonly string[];
  warnings: readonly string[];
  linkedDocuments: readonly string[];
  recommendedAnnexes: readonly string[];
}

export interface TemplateFrequentlyAskedQuestion {
  question: string;
  answer: string;
}

export interface ProductRightsSupportingDocument {
  fileName: string;
  privateFileRef: string | null;
  status: "pending" | "verified";
  signed: boolean;
  signedAt: string | null;
  byteSize: number | null;
  sha256: string | null;
  customerDeliverable: false;
  publiclyVisible: false;
  downloadable: false;
}

export interface ProductIntellectualProperty {
  institutionalAuthor: string;
  coauthor: string;
  legalDrafter: string;
  rightsHolder: string;
  rightsHolderTaxId: string | null;
  brand: string;
  legalRepresentative: string | null;
  authorshipStatus: AuthorshipStatus;
  rightsTransferStatus: RightsTransferStatus;
  supportingDocument: ProductRightsSupportingDocument;
}

export type EditorialStatus =
  | "inventoried"
  | "anonymized"
  | "legal_review"
  | "regulatory_review"
  | "commercial_preparation"
  | "approved"
  | "published"
  | "updated"
  | "withdrawn";

export type ManualOrderStatus =
  | "requested"
  | "reviewing"
  | "awaiting_payment"
  | "paid"
  | "preparing"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface TemplateVersionRecord {
  version: string;
  reviewedAt: string | null;
  changes: readonly string[];
  reviewedRules: readonly string[];
  reviewerId: string | null;
  publicationAuthorizedBy: string | null;
}

export interface TemplateAssociatedFile {
  role: "master_internal" | "commercial" | "annex";
  fileName: string;
  fileRef: string | null;
  publicDownloadAuthorized: boolean;
}

export interface TemplateProduct {
  id: string;
  code: string;
  slug: string;
  commercialTitle: string;
  category: ProductCategory;
  matter: string;
  jurisdiction: string;
  deliveryFormat: TemplateDeliveryFormat;
  version: string;
  reviewedAt: string;
  nextReviewAt: string;
  shortDescription: string;
  fullDescription: string;
  publicAudience: readonly string[];
  scope: readonly string[];
  formalRequirements: readonly string[];
  documentType: string;
  contractVersions: readonly ContractVersionProfile[];
  frequentlyAskedQuestions: readonly TemplateFrequentlyAskedQuestion[];
  includedItems: readonly string[];
  useCases: readonly string[];
  exclusions: readonly string[];
  warnings: readonly string[];
  personalizationCases: readonly string[];
  personalizationLevel: PersonalizationLevel;
  editorialOwnerId: string | null;
  intellectualProperty: ProductIntellectualProperty;
  editorialStatus: EditorialStatus;
  availabilityStatus: ProductAvailabilityStatus;
  priceStatus: PriceStatus;
  price: number | null;
  currency: string | null;
  licenseStatus: LicenseStatus;
  licenseSummary: string;
  usageLicense: string | null;
  commercialPolicyStatus: CommercialPolicyStatus;
  commercialPolicySummary: string | null;
  deliveryFileRef: string | null;
  masterInternalFile: TemplateAssociatedFile;
  commercialFiles: readonly TemplateAssociatedFile[];
  annexFiles: readonly TemplateAssociatedFile[];
  publicationAuthorization: {
    authorized: boolean;
    authorizedBy: string | null;
    authorizedAt: string | null;
  };
  versionHistory: readonly TemplateVersionRecord[];
}

export interface EditorialReviewEntry {
  id: string;
  productId: string;
  status: EditorialStatus;
  sourceFileRef: string;
  reviewerId: string;
  reviewedAt: string;
  changes: readonly string[];
  publicVersion: string;
  reviewedRules: readonly string[];
  observations: string;
  publicationAuthorization: {
    authorized: boolean;
    authorizedBy: string | null;
    authorizedAt: string | null;
  };
}

export interface TemplateRequest {
  id: string;
  templateProductId: string;
  requesterName: string;
  requesterEmail: string;
  requestedPersonalization: PersonalizationLevel;
  notes: string;
  privacyAccepted: boolean;
  contactAuthorized: boolean;
  createdAt: string;
}

export interface ManualOrder {
  id: string;
  requestId: string;
  productId: string;
  status: ManualOrderStatus;
  priceMinor: number;
  currency: string;
  paymentReference: string | null;
  administrativeConfirmationBy: string | null;
  deliveryEvidenceRef: string | null;
  createdAt: string;
  updatedAt: string;
}
