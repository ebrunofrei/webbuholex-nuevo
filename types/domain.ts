export type {
  EditorialReviewEntry,
  EditorialStatus,
  ManualOrder,
  ManualOrderStatus,
  CommercialPolicyStatus,
  LicenseStatus,
  PersonalizationLevel,
  PriceStatus,
  ProductCategory,
  ProductAvailabilityStatus,
  TemplateAssociatedFile,
  TemplateDeliveryFormat,
  TemplateProduct,
  TemplateRequest,
  TemplateVersionRecord,
} from "@/types/catalog";
export type { ProfessionalAttentionType, ProfessionalConsultation, ProfessionalConsultationInput } from "@/types/consultation";
export type {
  AssistantCitation,
  AssistantConfidenceLevel,
  AssistantConsultation,
  AssistantMessage,
  AssistantReferral,
  AssistantResult,
  AssistantRiskLevel,
  AssistantSession,
  AssistantSource,
  TemplateRecommendation,
} from "@/types/assistant";
export type {
  JurisprudenceAnalysisRequest,
  JurisprudenceAnalysisResult,
  JurisprudenceDocumentIdentity,
  JurisprudenceOpinion,
} from "@/types/jurisprudence-analysis";
export type * from "@/types/jurisprudence";
export type {
  ManualProductDelivery,
  ProductDocument,
  ProductDocumentAudience,
  ProductDocumentFormat,
  ProductFileInspection,
  ProductFileMetadata,
  ProductDocumentPurpose,
  ProductDocumentRequirement,
  ProductDocumentStatus,
  ProductPackage,
  ProductPackageIntegrityError,
  ProductPackageIntegrityErrorCode,
  ProductPackageInventory,
  ProductPackageManifest,
  ProductPackageManifestEntry,
  ProductPackageStatus,
} from "@/types/product-package";

export interface LegalService {
  id: string;
  slug: string;
  name: string;
  summary: string;
  engagement: "orientacion" | "revision" | "redaccion" | "patrocinio" | "defensa";
  status: "available" | "preparation";
}

export interface LegalInquiry {
  id: string;
  matter: string;
  jurisdiction: string;
  urgency: "standard" | "urgent";
  summary: string;
  sensitiveDataConsent: boolean;
  createdAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  status: "draft" | "published";
}

export interface SiteNavigationItem {
  label: string;
  href: `/${string}`;
  description?: string;
}
