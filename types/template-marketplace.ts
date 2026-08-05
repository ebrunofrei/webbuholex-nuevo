import type { ContractVersionId, ProductAvailabilityStatus, ProductCategory } from "@/types/catalog";

export interface MarketplaceContractVersion {
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

export interface MarketplaceFrequentlyAskedQuestion {
  question: string;
  answer: string;
}

export interface TemplateMarketplaceProduct {
  id: string;
  code: string;
  slug: string;
  href: string;
  commercialTitle: string;
  category: ProductCategory;
  categoryLabel: string;
  matter: string;
  jurisdiction: string;
  documentType: string;
  deliveryFormatLabel: string;
  version: string;
  reviewedAt: string;
  nextReviewAt: string;
  shortDescription: string;
  fullDescription: string;
  publicAudience: readonly string[];
  scope: readonly string[];
  useCases: readonly string[];
  exclusions: readonly string[];
  warnings: readonly string[];
  formalRequirements: readonly string[];
  institutionalAuthor: string;
  coauthor: string;
  availabilityStatus: ProductAvailabilityStatus;
  availabilityLabel: string;
  contractVersions: readonly MarketplaceContractVersion[];
  contracts: readonly string[];
  annexes: readonly string[];
  auxiliaryDocuments: readonly string[];
  frequentlyAskedQuestions: readonly MarketplaceFrequentlyAskedQuestion[];
  packageCounts: {
    contracts: number;
    annexes: number;
    auxiliary: number;
    customerDocuments: number;
  };
}
