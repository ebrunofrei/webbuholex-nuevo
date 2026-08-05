import { z } from "zod";
import { productIdentifierSchema } from "@/lib/schemas/catalog";

export const productDocumentAudienceSchema = z.enum(["internal", "customer", "public_information"]);
export const productDocumentPurposeSchema = z.enum(["contract", "annex", "guide", "guide_source", "license_source", "technical_sheet_source", "readme_source", "checklist", "license", "technical_sheet", "readme", "master_source"]);
export const productDocumentStatusSchema = z.enum(["planned", "received", "verified", "approved", "replaced", "withdrawn"]);
export const productDocumentFormatSchema = z.enum(["docx", "pdf"]);
export const productPackageStatusSchema = z.enum(["draft", "incomplete", "ready_for_review", "approved_for_packaging", "ready_for_publication", "published", "withdrawn"]);
export const productFileMetadataSchema = z.object({
  fileName: z.string().trim().regex(/\.(docx|pdf)$/i),
  physicalFileName: z.string().trim().regex(/\.(docx|pdf)$/i),
  extension: productDocumentFormatSchema,
  byteSize: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  verifiedAt: z.string().datetime().nullable(),
  exists: z.boolean(),
  readable: z.boolean(),
  nameMatches: z.boolean(),
  duplicateName: z.boolean(),
  duplicateHash: z.boolean(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export const productDocumentSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  productCode: productIdentifierSchema,
  fileName: z.string().trim().regex(/\.(docx|pdf)$/i),
  audience: productDocumentAudienceSchema,
  purpose: productDocumentPurposeSchema,
  format: productDocumentFormatSchema,
  status: productDocumentStatusSchema,
  intendedForDelivery: z.boolean(),
  deliverable: z.boolean(),
  downloadable: z.boolean(),
  publishable: z.boolean(),
  publicAuthorized: z.boolean(),
  fileRef: z.string().trim().min(3).max(500).nullable(),
  fileMetadata: productFileMetadataSchema.nullable(),
  requiredBeforePublication: z.boolean(),
  observations: z.string().trim().min(3).max(1000),
}).superRefine((document, context) => {
  if (document.audience === "internal" && (document.deliverable || document.downloadable || document.publishable)) {
    context.addIssue({ code: "custom", path: ["audience"], message: "Un documento interno no puede ser entregable, descargable ni publicable." });
  }
  if (document.downloadable && (!document.fileRef || document.status !== "approved" || !document.publicAuthorized)) {
    context.addIssue({ code: "custom", path: ["downloadable"], message: "Una descarga exige ruta, aprobación y autorización." });
  }
  if (document.status === "planned" && (document.fileRef !== null || document.fileMetadata !== null)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Un documento ausente debe permanecer sin referencia ni metadatos." });
  }
  if (["received", "verified", "approved"].includes(document.status) && (!document.fileRef || !document.fileMetadata)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Un documento incorporado requiere referencia y metadatos calculados." });
  }
  if ((document.status === "verified" || document.status === "approved") && !document.fileMetadata?.verifiedAt) {
    context.addIssue({ code: "custom", path: ["fileMetadata", "verifiedAt"], message: "Un documento verificado requiere fecha de inspección." });
  }
  if ((document.status === "verified" || document.status === "approved") && document.fileMetadata && (!document.fileMetadata.exists || !document.fileMetadata.readable || !document.fileMetadata.nameMatches || document.fileMetadata.errors.length > 0)) {
    context.addIssue({ code: "custom", path: ["fileMetadata"], message: "Un documento verificado debe existir, ser legible, coincidir por nombre y carecer de errores." });
  }
  if (document.status === "withdrawn" && (document.deliverable || document.downloadable)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Un documento retirado no puede entregarse ni descargarse." });
  }
  if (document.status === "replaced" && (document.deliverable || document.downloadable)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Un documento reemplazado no puede entregarse como vigente." });
  }
  if (document.format === "docx" && !document.fileName.toLowerCase().endsWith(".docx")) {
    context.addIssue({ code: "custom", path: ["fileName"], message: "El nombre no coincide con el formato DOCX." });
  }
  if (document.format === "pdf" && !document.fileName.toLowerCase().endsWith(".pdf")) {
    context.addIssue({ code: "custom", path: ["fileName"], message: "El nombre no coincide con el formato PDF." });
  }
});

export const productDocumentRequirementSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  label: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(1000),
  blocking: z.literal(true),
  resolved: z.boolean(),
});

const packageInventoryShape = {
  productCode: productIdentifierSchema,
  packageVersion: z.string().trim().min(1).max(40),
  deliveryChannelStatus: z.enum(["pending", "approved"]),
  refundRulesStatus: z.enum(["pending", "approved"]),
  internalFiles: z.array(productDocumentSchema),
  customerEditableFiles: z.array(productDocumentSchema),
  customerPdfFiles: z.array(productDocumentSchema),
  publicInformationFiles: z.array(productDocumentSchema),
};

export const productPackageInventorySchema = z.object(packageInventoryShape);
export const productPackageSchema = z.object({
  ...packageInventoryShape,
  requiredBeforePublication: z.array(productDocumentRequirementSchema),
  packageStatus: productPackageStatusSchema,
}).superRefine((productPackage, context) => {
  const claimsPublicationReadiness = productPackage.packageStatus === "ready_for_publication" || productPackage.packageStatus === "published";
  if (claimsPublicationReadiness && productPackage.requiredBeforePublication.some((requirement) => !requirement.resolved)) {
    context.addIssue({ code: "custom", path: ["packageStatus"], message: "Un paquete con bloqueos no puede declararse listo ni publicado." });
  }
});

export const manualProductDeliverySchema = z.object({
  orderId: z.string().uuid(),
  productCode: productIdentifierSchema,
  packageVersion: z.string().trim().min(1).max(40),
  deliveredDocumentIds: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).superRefine((documentIds, context) => {
    if (new Set(documentIds).size !== documentIds.length) context.addIssue({ code: "custom", message: "Una entrega no puede repetir identificadores documentales." });
  }),
  deliveredAt: z.string().datetime().nullable(),
  deliveredBy: z.string().trim().min(2).max(120).nullable(),
  evidenceReference: z.string().trim().min(3).max(500).nullable(),
  customerConfirmationAt: z.string().datetime().nullable(),
}).superRefine((delivery, context) => {
  if (delivery.deliveredAt && (delivery.deliveredDocumentIds.length === 0 || !delivery.deliveredBy || !delivery.evidenceReference)) {
    context.addIssue({ code: "custom", path: ["deliveredAt"], message: "Una entrega registrada requiere documentos, responsable y evidencia." });
  }
  if (delivery.customerConfirmationAt && !delivery.deliveredAt) {
    context.addIssue({ code: "custom", path: ["customerConfirmationAt"], message: "La confirmación del cliente requiere una entrega previa." });
  }
});
