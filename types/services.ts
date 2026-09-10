export type ServiceAvailability = "available" | "evaluation_required" | "coming_soon" | "suspended";
export type ServicePricingMode = "fixed" | "from" | "quote_required" | "not_defined";
export type ServiceCategory = "legal" | "buhodoc" | "thesis" | "accounting" | "government" | "engineering" | "corporate" | "digital";

export interface ServiceScopeGroup {
  title: string;
  items: readonly string[];
}

export type ServiceModuleLevel = "basic" | "optional" | "evaluation_required" | "future_integration";

export interface ServiceModuleGroup {
  title: string;
  level: ServiceModuleLevel;
  levelLabel: string;
  items: readonly string[];
}

export interface ServiceTechnicalResponsibility {
  title: string;
  description: string;
}

export interface ServiceSubOffer {
  title: string;
  pricingMode: ServicePricingMode;
  price: number | null;
  currency: string | null;
  professionalLevel?: "standard" | "professional" | "senior";
  requiresEvaluation: boolean;
  allowsImmediatePayment: boolean;
}

export interface PublicService {
  id: string;
  slug: string;
  title: string;
  category: ServiceCategory;
  summary: string;
  description: string;
  scope: readonly string[];
  exclusions: readonly string[];
  modalities: readonly string[];
  availability: ServiceAvailability;
  availabilityLabel: string;
  pricingMode: ServicePricingMode;
  price: number | null;
  currency: string | null;
  professionalLevel?: "standard" | "professional" | "senior";
  requiresConflictCheck: boolean;
  requiresEvaluation: boolean;
  allowsImmediatePayment: boolean;
  responsible: null;
  ctaLabel: string;
  status: "active" | "preparation";
  warning: string | null;
  published?: false;
  publicTagline?: string;
  targetAudience?: readonly string[];
  siteTypes?: readonly string[];
  needs?: readonly string[];
  scopeGroups?: readonly ServiceScopeGroup[];
  moduleGroups?: readonly ServiceModuleGroup[];
  subOffers?: readonly ServiceSubOffer[];
  budgetFactors?: readonly string[];
  technicalResponsibilities?: readonly ServiceTechnicalResponsibility[];
  evaluationInputs?: readonly string[];
  potentialDeliverables?: readonly string[];
  stages?: readonly string[];
  prerequisites?: readonly string[];
  clientContentNotice?: string;
}
