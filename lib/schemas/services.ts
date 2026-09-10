import { z } from "zod";

export const serviceSubOfferSchema = z.object({
  title: z.string().min(3),
  pricingMode: z.enum(["fixed", "from", "quote_required", "not_defined"]),
  price: z.number().positive().nullable(),
  currency: z.string().nullable(),
  professionalLevel: z.enum(["standard", "professional", "senior"]).optional(),
  requiresEvaluation: z.boolean(),
  allowsImmediatePayment: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.pricingMode === "from" && data.allowsImmediatePayment) {
    ctx.addIssue({ code: "custom", path: ["allowsImmediatePayment"], message: "Pricing mode 'from' cannot allow immediate payment." });
  }
});

export const publicServiceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(3),
  category: z.enum(["legal", "buhodoc", "thesis", "accounting", "government", "engineering", "corporate", "digital"]),
  summary: z.string().min(20),
  description: z.string().min(30),
  scope: z.array(z.string().min(3)).min(1),
  exclusions: z.array(z.string().min(3)).min(1),
  modalities: z.array(z.string().min(3)).min(1),
  availability: z.enum(["available", "evaluation_required", "coming_soon", "suspended"]),
  availabilityLabel: z.string().min(3),
  pricingMode: z.enum(["fixed", "from", "quote_required", "not_defined"]),
  price: z.number().positive().nullable(),
  currency: z.string().nullable(),
  professionalLevel: z.enum(["standard", "professional", "senior"]).optional(),
  requiresConflictCheck: z.boolean(),
  requiresEvaluation: z.boolean(),
  allowsImmediatePayment: z.boolean(),
  responsible: z.null(),
  ctaLabel: z.string().min(3),
  status: z.enum(["active", "preparation"]),
  warning: z.string().nullable(),
  published: z.literal(false).optional(),
  publicTagline: z.string().min(10).optional(),
  targetAudience: z.array(z.string().min(3)).min(1).optional(),
  siteTypes: z.array(z.string().min(3)).min(1).optional(),
  needs: z.array(z.string().min(3)).min(1).optional(),
  scopeGroups: z.array(z.object({ title: z.string().min(3), items: z.array(z.string().min(3)).min(1) })).min(1).optional(),
  moduleGroups: z.array(z.object({
    title: z.string().min(3),
    level: z.enum(["basic", "optional", "evaluation_required", "future_integration"]),
    levelLabel: z.string().min(3),
    items: z.array(z.string().min(3)).min(1),
  })).min(1).optional(),
  subOffers: z.array(serviceSubOfferSchema).min(1).optional(),
  budgetFactors: z.array(z.string().min(3)).min(1).optional(),
  technicalResponsibilities: z.array(z.object({ title: z.string().min(3), description: z.string().min(10) })).min(1).optional(),
  evaluationInputs: z.array(z.string().min(3)).min(1).optional(),
  potentialDeliverables: z.array(z.string().min(3)).min(1).optional(),
  stages: z.array(z.string().min(3)).min(1).optional(),
  prerequisites: z.array(z.string().min(3)).min(1).optional(),
  clientContentNotice: z.string().min(20).optional(),
}).superRefine((data, ctx) => {
  if (data.requiresEvaluation && data.allowsImmediatePayment) {
    ctx.addIssue({ code: "custom", path: ["allowsImmediatePayment"], message: "Service requires evaluation, cannot allow immediate payment." });
  }
  if (!data.requiresEvaluation && !data.allowsImmediatePayment && data.pricingMode === "fixed") {
    // Optionally alert, but the prompt says: "DIRECT_PURCHASE: requiresEvaluation = false, allowsImmediatePayment = true"
    // "EVALUATION_FIRST: requiresEvaluation = true, allowsImmediatePayment = false"
  }
  if (data.allowsImmediatePayment && data.requiresEvaluation) {
    ctx.addIssue({ code: "custom", path: ["allowsImmediatePayment"], message: "Incompatible evaluation and payment flags" });
  }
  if (data.pricingMode === "from" && data.allowsImmediatePayment) {
    ctx.addIssue({ code: "custom", path: ["allowsImmediatePayment"], message: "Pricing mode 'from' cannot allow immediate payment." });
  }
  if (data.pricingMode === "fixed" || data.pricingMode === "from") {
    if (data.price === null || data.price <= 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Price must be a valid positive amount for fixed or from pricing modes" });
    }
  } else {
    if (data.price !== null) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Price must be null for quote_required or not_defined pricing modes" });
    }
  }
});

export const publicServiceCatalogSchema = z.array(publicServiceSchema).superRefine((services, context) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  services.forEach((service, index) => {
    if (ids.has(service.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "Identificador de servicio duplicado." });
    if (slugs.has(service.slug)) context.addIssue({ code: "custom", path: [index, "slug"], message: "Slug de servicio duplicado." });
    ids.add(service.id);
    slugs.add(service.slug);
  });
});
