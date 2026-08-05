import { z } from "zod";

export const productCategorySchema = z.enum(["legal", "empresarial", "contable"]);
export const templateDeliveryFormatSchema = z.enum(["docx", "pdf", "xlsx", "bundle"]);
export const personalizationLevelSchema = z.enum(["none", "guided", "professional"]);
export const priceStatusSchema = z.enum(["pending", "approved"]);
export const licenseStatusSchema = z.enum(["pending", "approved"]);
export const commercialPolicyStatusSchema = z.enum(["pending", "approved"]);
export const productAvailabilityStatusSchema = z.enum(["editorial_preview", "available", "withdrawn"]);
export const authorshipStatusSchema = z.enum(["pending", "formalized"]);
export const rightsTransferStatusSchema = z.enum(["pending", "documented"]);
export const editorialStatusSchema = z.enum([
  "inventoried",
  "anonymized",
  "legal_review",
  "regulatory_review",
  "commercial_preparation",
  "approved",
  "published",
  "updated",
  "withdrawn",
]);
export const manualOrderStatusSchema = z.enum([
  "requested",
  "reviewing",
  "awaiting_payment",
  "paid",
  "preparing",
  "delivered",
  "cancelled",
  "refunded",
]);

const isoDateSchema = z.string().date();
const nonEmptyListSchema = z.array(z.string().trim().min(2).max(500)).min(1);
export const productIdentifierSchema = z.union([
  z.string().uuid(),
  z.string().regex(/^[A-Z]{2,10}(?:-[A-Z0-9]{2,10}){2,5}$/),
]);
const productCodeSchema = z.string().regex(/^[A-Z]{2,10}(?:-[A-Z0-9]{2,10}){2,5}$/);
const associatedFileSchema = z.object({
  role: z.enum(["master_internal", "commercial", "annex"]),
  fileName: z.string().trim().regex(/\.docx$/i, "El archivo asociado debe conservar su nombre DOCX."),
  fileRef: z.string().trim().min(3).max(500).nullable(),
  publicDownloadAuthorized: z.boolean(),
});

const contractVersionSchema = z.object({
  id: z.enum(["ordinary", "future_eviction", "law_30933"]),
  name: z.string().trim().min(3).max(160),
  shortName: z.string().trim().min(3).max(80),
  description: z.string().trim().min(20).max(1000),
  formalities: nonEmptyListSchema,
  useCases: nonEmptyListSchema,
  warnings: nonEmptyListSchema,
  linkedDocuments: nonEmptyListSchema,
  recommendedAnnexes: nonEmptyListSchema,
});

const frequentlyAskedQuestionSchema = z.object({
  question: z.string().trim().min(8).max(240),
  answer: z.string().trim().min(20).max(1000),
});

const productIntellectualPropertySchema = z.object({
  institutionalAuthor: z.string().trim().min(2).max(160),
  coauthor: z.string().trim().min(2).max(160),
  legalDrafter: z.string().trim().min(2).max(160),
  rightsHolder: z.string().trim().min(2).max(240),
  rightsHolderTaxId: z.string().regex(/^\d{11}$/, "El RUC debe contener once dígitos.").nullable(),
  brand: z.string().trim().min(2).max(160),
  legalRepresentative: z.string().trim().min(2).max(160).nullable(),
  authorshipStatus: authorshipStatusSchema,
  rightsTransferStatus: rightsTransferStatusSchema,
  supportingDocument: z.object({
    fileName: z.string().trim().regex(/\.pdf$/i, "El respaldo corporativo debe conservar su nombre PDF."),
    privateFileRef: z.string().trim().min(3).max(500).nullable(),
    status: z.enum(["pending", "verified"]),
    signed: z.boolean(),
    signedAt: isoDateSchema.nullable(),
    byteSize: z.number().int().positive().nullable(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    customerDeliverable: z.literal(false),
    publiclyVisible: z.literal(false),
    downloadable: z.literal(false),
  }),
}).superRefine((property, context) => {
  const document = property.supportingDocument;
  if (document.status === "verified" && (!document.privateFileRef || !document.signed || document.byteSize === null || document.sha256 === null)) {
    context.addIssue({ code: "custom", path: ["supportingDocument"], message: "Un respaldo verificado requiere referencia privada, firma y metadatos calculados." });
  }
  if (document.privateFileRef && (!document.privateFileRef.startsWith("legal/intellectual-property/") || /^[A-Za-z]:[\\/]/.test(document.privateFileRef) || /^https?:\/\//i.test(document.privateFileRef))) {
    context.addIssue({ code: "custom", path: ["supportingDocument", "privateFileRef"], message: "El respaldo debe usar una referencia privada y relativa." });
  }
});

export const templateVersionRecordSchema = z.object({
  version: z.string().trim().min(1).max(40),
  reviewedAt: isoDateSchema.nullable(),
  changes: nonEmptyListSchema,
  reviewedRules: z.array(z.string().trim().min(2).max(500)),
  reviewerId: z.string().trim().min(2).max(120).nullable(),
  publicationAuthorizedBy: z.string().trim().min(2).max(120).nullable(),
});

export const templateProductSchema = z.object({
  id: productIdentifierSchema,
  code: productCodeSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  commercialTitle: z.string().trim().min(3).max(160),
  category: productCategorySchema,
  matter: z.string().trim().min(2).max(120),
  jurisdiction: z.string().trim().min(2).max(120),
  deliveryFormat: templateDeliveryFormatSchema,
  version: z.string().trim().min(1).max(40),
  reviewedAt: isoDateSchema,
  nextReviewAt: isoDateSchema,
  shortDescription: z.string().trim().min(20).max(280),
  fullDescription: z.string().trim().min(40).max(3000),
  publicAudience: nonEmptyListSchema,
  scope: nonEmptyListSchema,
  formalRequirements: nonEmptyListSchema,
  documentType: z.string().trim().min(3).max(120),
  contractVersions: z.array(contractVersionSchema).length(3),
  frequentlyAskedQuestions: z.array(frequentlyAskedQuestionSchema).min(1),
  includedItems: nonEmptyListSchema,
  useCases: nonEmptyListSchema,
  exclusions: nonEmptyListSchema,
  warnings: nonEmptyListSchema,
  personalizationCases: nonEmptyListSchema,
  personalizationLevel: personalizationLevelSchema,
  editorialOwnerId: z.string().trim().min(2).max(120).nullable(),
  intellectualProperty: productIntellectualPropertySchema,
  editorialStatus: editorialStatusSchema,
  availabilityStatus: productAvailabilityStatusSchema,
  priceStatus: priceStatusSchema,
  price: z.number().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use un código de moneda ISO 4217.").nullable(),
  licenseStatus: licenseStatusSchema,
  licenseSummary: z.string().trim().min(20).max(1000),
  usageLicense: z.string().trim().min(20).max(3000).nullable(),
  commercialPolicyStatus: commercialPolicyStatusSchema,
  commercialPolicySummary: z.string().trim().min(20).max(2000).nullable(),
  deliveryFileRef: z.string().trim().min(3).max(500).nullable(),
  masterInternalFile: associatedFileSchema.extend({ role: z.literal("master_internal"), publicDownloadAuthorized: z.literal(false) }),
  commercialFiles: z.array(associatedFileSchema.extend({ role: z.literal("commercial") })).min(1),
  annexFiles: z.array(associatedFileSchema.extend({ role: z.literal("annex") })),
  publicationAuthorization: z.object({
    authorized: z.boolean(),
    authorizedBy: z.string().trim().min(2).max(120).nullable(),
    authorizedAt: isoDateSchema.nullable(),
  }),
  versionHistory: z.array(templateVersionRecordSchema).min(1),
}).superRefine((product, context) => {
  const publishable = product.editorialStatus === "published" || product.editorialStatus === "updated";
  if (product.priceStatus === "pending" && (product.price !== null || product.currency !== null)) {
    context.addIssue({ code: "custom", path: ["price"], message: "Un precio pendiente no puede contener importe ni moneda." });
  }
  if (product.priceStatus === "approved" && (product.price === null || product.currency === null)) {
    context.addIssue({ code: "custom", path: ["price"], message: "Un precio aprobado requiere importe y moneda." });
  }
  if (product.licenseStatus === "pending" && product.usageLicense !== null) {
    context.addIssue({ code: "custom", path: ["usageLicense"], message: "Una licencia pendiente no puede contener una licencia definitiva." });
  }
  if (product.licenseStatus === "approved" && !product.usageLicense) {
    context.addIssue({ code: "custom", path: ["usageLicense"], message: "Una licencia aprobada requiere texto definitivo." });
  }
  if (new Set(product.contractVersions.map((version) => version.id)).size !== product.contractVersions.length) {
    context.addIssue({ code: "custom", path: ["contractVersions"], message: "Las versiones contractuales deben tener identificadores únicos." });
  }
  if (!publishable) return;
  if (!product.editorialOwnerId) context.addIssue({ code: "custom", path: ["editorialOwnerId"], message: "Una plantilla publicable requiere responsable editorial." });
  if (product.priceStatus !== "approved") context.addIssue({ code: "custom", path: ["priceStatus"], message: "Una plantilla publicable requiere precio aprobado." });
  if (product.licenseStatus !== "approved") context.addIssue({ code: "custom", path: ["licenseStatus"], message: "Una plantilla publicable requiere licencia aprobada." });
  if (product.commercialPolicyStatus !== "approved") context.addIssue({ code: "custom", path: ["commercialPolicyStatus"], message: "Una plantilla publicable requiere política comercial aprobada." });
  if (!product.publicationAuthorization.authorized || !product.publicationAuthorization.authorizedBy || !product.publicationAuthorization.authorizedAt) {
    context.addIssue({ code: "custom", path: ["publicationAuthorization"], message: "Una plantilla publicable requiere autorización expresa." });
  }
  if (!product.versionHistory.some((version) => Boolean(version.publicationAuthorizedBy))) {
    context.addIssue({ code: "custom", path: ["versionHistory"], message: "Una plantilla publicable requiere autorización registrada en su historial." });
  }
  const deliveryFiles = [...product.commercialFiles, ...product.annexFiles];
  if (!product.masterInternalFile.fileRef || !deliveryFiles.every((file) => file.fileRef && file.publicDownloadAuthorized)) {
    context.addIssue({ code: "custom", path: ["commercialFiles"], message: "Una plantilla publicable requiere todos sus archivos ubicados y los entregables autorizados." });
  }
});

export const templateCatalogSchema = z.array(templateProductSchema).superRefine((products, context) => {
  for (const field of ["id", "code", "slug"] as const) {
    const seen = new Set<string>();
    products.forEach((product, index) => {
      const value = product[field];
      if (seen.has(value)) context.addIssue({ code: "custom", path: [index, field], message: `${field} debe ser único en el catálogo.` });
      seen.add(value);
    });
  }
});

export const editorialReviewEntrySchema = z.object({
  id: z.string().uuid(),
  productId: productIdentifierSchema,
  status: editorialStatusSchema,
  sourceFileRef: z.string().trim().min(3).max(500),
  reviewerId: z.string().trim().min(2).max(120),
  reviewedAt: isoDateSchema,
  changes: nonEmptyListSchema,
  publicVersion: z.string().trim().min(1).max(40),
  reviewedRules: nonEmptyListSchema,
  observations: z.string().trim().max(2000),
  publicationAuthorization: z.object({
    authorized: z.boolean(),
    authorizedBy: z.string().trim().min(2).max(120).nullable(),
    authorizedAt: isoDateSchema.nullable(),
  }),
}).superRefine((entry, context) => {
  const publishable = ["published", "updated"].includes(entry.status);
  if (publishable && (!entry.publicationAuthorization.authorized || !entry.publicationAuthorization.authorizedBy || !entry.publicationAuthorization.authorizedAt)) {
    context.addIssue({ code: "custom", path: ["publicationAuthorization"], message: "Los estados publicables requieren autorización completa." });
  }
});

export const templateRequestSchema = z.object({
  templateProductId: productIdentifierSchema,
  requesterName: z.string().trim().min(2).max(140),
  requesterEmail: z.string().trim().email().max(254),
  requestedPersonalization: personalizationLevelSchema,
  notes: z.string().trim().max(2000),
  privacyAccepted: z.literal(true),
  contactAuthorized: z.literal(true),
});

export const manualOrderSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  productId: productIdentifierSchema,
  status: manualOrderStatusSchema,
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use un código de moneda ISO 4217."),
  paymentReference: z.string().trim().min(2).max(200).nullable(),
  administrativeConfirmationBy: z.string().trim().min(2).max(120).nullable(),
  deliveryEvidenceRef: z.string().trim().min(3).max(500).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine((order, context) => {
  const paymentRecorded = ["paid", "preparing", "delivered", "refunded"].includes(order.status);
  if (paymentRecorded && !order.paymentReference) {
    context.addIssue({ code: "custom", path: ["paymentReference"], message: "El estado requiere una referencia de pago verificada." });
  }
  if (order.status === "delivered" && (!order.administrativeConfirmationBy || !order.deliveryEvidenceRef)) {
    context.addIssue({ code: "custom", path: ["deliveryEvidenceRef"], message: "La entrega requiere confirmación administrativa y evidencia documental." });
  }
});
