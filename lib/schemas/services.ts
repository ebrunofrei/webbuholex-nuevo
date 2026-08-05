import { z } from "zod";

export const publicServiceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(3),
  category: z.enum(["legal", "documentary", "defense", "professional_consultation", "business", "administrative", "civil_engineering", "digital"]),
  summary: z.string().min(20),
  description: z.string().min(30),
  scope: z.array(z.string().min(3)).min(1),
  exclusions: z.array(z.string().min(3)).min(1),
  modalities: z.array(z.string().min(3)).min(1),
  availability: z.enum(["available", "evaluation_required", "coming_soon", "suspended"]),
  availabilityLabel: z.string().min(3),
  pricingMode: z.enum(["fixed_future", "quote_required", "not_defined"]),
  price: z.null(),
  currency: z.null(),
  requiresConflictCheck: z.boolean(),
  requiresEvaluation: z.boolean(),
  allowsImmediatePayment: z.literal(false),
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
  budgetFactors: z.array(z.string().min(3)).min(1).optional(),
  technicalResponsibilities: z.array(z.object({ title: z.string().min(3), description: z.string().min(10) })).min(1).optional(),
  evaluationInputs: z.array(z.string().min(3)).min(1).optional(),
  potentialDeliverables: z.array(z.string().min(3)).min(1).optional(),
  stages: z.array(z.string().min(3)).min(1).optional(),
  prerequisites: z.array(z.string().min(3)).min(1).optional(),
  clientContentNotice: z.string().min(20).optional(),
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
