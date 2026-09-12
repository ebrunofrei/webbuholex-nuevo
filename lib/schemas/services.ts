import { z } from "zod";

const serviceAvailabilitySchema = z.enum([
  "available",
  "evaluation_required",
  "coming_soon",
  "suspended",
]);

const servicePricingModeSchema = z.enum([
  "fixed",
  "from",
  "quote_required",
  "not_defined",
]);

const serviceCategorySchema = z.enum([
  "legal",
  "buhodoc",
  "thesis",
  "accounting",
  "government",
  "engineering",
  "corporate",
  "digital",
]);

const serviceProfessionalLevelSchema = z.enum([
  "standard",
  "professional",
  "senior",
]);

const serviceModuleLevelSchema = z.enum([
  "basic",
  "optional",
  "evaluation_required",
  "future_integration",
]);

export const serviceSubOfferSchema = z
  .object({
    title: z.string().min(3),

    description: z
      .string()
      .min(20)
      .optional(),

    usefulWhen: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    reviewBeforeAssuming: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    workMayInclude: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    notice: z
      .string()
      .min(20)
      .optional(),

    pricingMode: servicePricingModeSchema,

    price: z
      .number()
      .positive()
      .nullable(),

    currency: z
      .string()
      .nullable(),

    professionalLevel: serviceProfessionalLevelSchema
      .optional(),

    requiresEvaluation: z.boolean(),

    allowsImmediatePayment: z.boolean(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.requiresEvaluation &&
      data.allowsImmediatePayment
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["allowsImmediatePayment"],
        message:
          "A service requiring evaluation cannot allow immediate payment.",
      });
    }

    if (
      data.pricingMode === "from" &&
      data.allowsImmediatePayment
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["allowsImmediatePayment"],
        message:
          "Pricing mode 'from' cannot allow immediate payment.",
      });
    }

    if (
      data.pricingMode === "fixed" ||
      data.pricingMode === "from"
    ) {
      if (
        data.price === null ||
        data.price <= 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["price"],
          message:
            "Price must be a valid positive amount for fixed or from pricing modes.",
        });
      }

      return;
    }

    if (data.price !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message:
          "Price must be null for quote_required or not_defined pricing modes.",
      });
    }
  });

export const serviceDetailImageSchema = z
  .object({
    src: z
      .string()
      .regex(
        /^\/services\/details\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/,
        "Service detail image must use /services/details/<file>.webp.",
      ),

    alt: z
      .string()
      .trim()
      .min(10)
      .max(180),
  })
  .strict();

const serviceScopeGroupSchema = z
  .object({
    title: z.string().min(3),

    items: z
      .array(z.string().min(3))
      .min(1),
  })
  .strict();

const serviceModuleGroupSchema = z
  .object({
    title: z.string().min(3),

    level: serviceModuleLevelSchema,

    levelLabel: z.string().min(3),

    items: z
      .array(z.string().min(3))
      .min(1),
  })
  .strict();

const serviceTechnicalResponsibilitySchema = z
  .object({
    title: z.string().min(3),

    description: z
      .string()
      .min(10),
  })
  .strict();

export const publicServiceSchema = z
  .object({
    id: z
      .string()
      .min(1),

    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Service slug must use lowercase letters, numbers and hyphens only.",
      ),

    title: z
      .string()
      .min(3),

    category: serviceCategorySchema,

    summary: z
      .string()
      .min(20),

    description: z
      .string()
      .min(30),

    detailImage: serviceDetailImageSchema,

    scope: z
      .array(z.string().min(3))
      .min(1),

    exclusions: z
      .array(z.string().min(3))
      .min(1),

    modalities: z
      .array(z.string().min(3))
      .min(1),

    availability: serviceAvailabilitySchema,

    availabilityLabel: z
      .string()
      .min(3),

    pricingMode: servicePricingModeSchema,

    price: z
      .number()
      .positive()
      .nullable(),

    currency: z
      .string()
      .nullable(),

    professionalLevel: serviceProfessionalLevelSchema
      .optional(),

    requiresConflictCheck: z.boolean(),

    requiresEvaluation: z.boolean(),

    allowsImmediatePayment: z.boolean(),

    responsible: z.null(),

    ctaLabel: z
      .string()
      .min(3),

    status: z.enum([
      "active",
      "preparation",
    ]),

    warning: z
      .string()
      .nullable(),

    published: z
      .literal(false)
      .optional(),

    publicTagline: z
      .string()
      .min(10)
      .optional(),

    targetAudience: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    siteTypes: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    needs: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    scopeGroups: z
      .array(serviceScopeGroupSchema)
      .min(1)
      .optional(),

    moduleGroups: z
      .array(serviceModuleGroupSchema)
      .min(1)
      .optional(),

    subOffers: z
      .array(serviceSubOfferSchema)
      .min(1)
      .optional(),

    budgetFactors: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    technicalResponsibilities: z
      .array(serviceTechnicalResponsibilitySchema)
      .min(1)
      .optional(),

    evaluationInputs: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    potentialDeliverables: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    stages: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    prerequisites: z
      .array(z.string().min(3))
      .min(1)
      .optional(),

    clientContentNotice: z
      .string()
      .min(20)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.requiresEvaluation &&
      data.allowsImmediatePayment
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["allowsImmediatePayment"],
        message:
          "A service that requires evaluation cannot allow immediate payment.",
      });
    }

    if (
      data.pricingMode === "from" &&
      data.allowsImmediatePayment
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["allowsImmediatePayment"],
        message:
          "Pricing mode 'from' cannot allow immediate payment.",
      });
    }

    if (
      data.pricingMode === "fixed" ||
      data.pricingMode === "from"
    ) {
      if (
        data.price === null ||
        data.price <= 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["price"],
          message:
            "Price must be a valid positive amount for fixed or from pricing modes.",
        });
      }

      return;
    }

    if (data.price !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message:
          "Price must be null for quote_required or not_defined pricing modes.",
      });
    }
  });

export const publicServiceCatalogSchema = z
  .array(publicServiceSchema)
  .superRefine((services, context) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();

    services.forEach((service, index) => {
      if (ids.has(service.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message:
            "Identificador de servicio duplicado.",
        });
      }

      if (slugs.has(service.slug)) {
        context.addIssue({
          code: "custom",
          path: [index, "slug"],
          message:
            "Slug de servicio duplicado.",
        });
      }

      ids.add(service.id);
      slugs.add(service.slug);
    });
  });