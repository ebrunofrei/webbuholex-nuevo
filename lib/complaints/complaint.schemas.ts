import { z } from "zod";
import {
  COMPLAINT_CONSUMER_TYPES,
  COMPLAINT_DOCUMENT_TYPES,
  COMPLAINT_SUBJECT_KINDS,
  COMPLAINT_KINDS,
  COMPLAINT_CHANNELS,
  COMPLAINT_AMOUNT_APPLICABILITY,
  COMPLAINT_REPRESENTATIVE_ROLES,
  COMPLAINT_LIMITS,
  COMPLAINT_RESPONSE_CHANNELS,
} from "./complaint.constants";

const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const ComplaintIdempotencyKeySchema = z
  .string()
  .min(8)
  .max(COMPLAINT_LIMITS.idempotencyKey)
  .regex(/^[-_a-zA-Z0-9]+$/, "Caracteres inválidos en idempotency key");

const NaturalConsumerSchema = z.object({
  consumerType: z.literal(COMPLAINT_CONSUMER_TYPES[0]),
  firstNames: trimmedString(COMPLAINT_LIMITS.firstNames),
  lastNames: trimmedString(COMPLAINT_LIMITS.lastNames),
  documentType: z.enum(COMPLAINT_DOCUMENT_TYPES),
  documentNumber: trimmedString(COMPLAINT_LIMITS.documentNumber),
  email: z.string().email().max(COMPLAINT_LIMITS.email),
  phone: z.string().max(COMPLAINT_LIMITS.phone).optional(),
  address: trimmedString(COMPLAINT_LIMITS.address),
  isMinor: z.boolean(),
  representative: z
    .object({
      firstNames: trimmedString(COMPLAINT_LIMITS.firstNames),
      lastNames: trimmedString(COMPLAINT_LIMITS.lastNames),
      documentType: z.enum(COMPLAINT_DOCUMENT_TYPES),
      documentNumber: trimmedString(COMPLAINT_LIMITS.documentNumber),
      relationship: z.enum(COMPLAINT_REPRESENTATIVE_ROLES),
    })
    .optional(),
}).strict().superRefine((data, ctx) => {
  if (data.isMinor) {
    if (data.representative === undefined || data.representative === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El representante es obligatorio para menores de edad",
        path: ["representative"],
      });
    }
  } else {
    if (data.representative !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El representante no debe enviarse para adultos",
        path: ["representative"],
      });
    }
  }
});

const LegalEntityConsumerSchema = z.object({
  consumerType: z.literal(COMPLAINT_CONSUMER_TYPES[1]),
  legalName: trimmedString(COMPLAINT_LIMITS.legalName),
  ruc: z.string().regex(/^\d{11}$/, "RUC debe tener 11 dígitos"),
  representativeFirstNames: trimmedString(COMPLAINT_LIMITS.firstNames),
  representativeLastNames: trimmedString(COMPLAINT_LIMITS.lastNames),
  representativeDocumentType: z.enum(COMPLAINT_DOCUMENT_TYPES),
  representativeDocumentNumber: trimmedString(COMPLAINT_LIMITS.documentNumber),
  representativeRole: trimmedString(COMPLAINT_LIMITS.representativeRole),
  email: z.string().email().max(COMPLAINT_LIMITS.email),
  phone: z.string().max(COMPLAINT_LIMITS.phone).optional(),
  address: trimmedString(COMPLAINT_LIMITS.address),
}).strict();

export const ComplaintConsumerSchema = z.discriminatedUnion("consumerType", [
  NaturalConsumerSchema,
  LegalEntityConsumerSchema,
]);

export const ComplaintSubjectSchema = z.object({
  kind: z.enum(COMPLAINT_SUBJECT_KINDS),
  description: trimmedString(COMPLAINT_LIMITS.subjectDescription),
  amountApplicability: z.enum(COMPLAINT_AMOUNT_APPLICABILITY),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido").nullable(),
  currency: z.literal("PEN").optional().default("PEN"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida YYYY-MM-DD").optional(),
  referenceNumber: trimmedString(COMPLAINT_LIMITS.referenceNumber).optional(),
  channel: z.enum(COMPLAINT_CHANNELS).optional(),
}).strict().refine(
  (data) => (data.amountApplicability === "applicable" ? data.amount !== null : true),
  { message: "El monto es obligatorio cuando es aplicable", path: ["amount"] }
).refine(
  (data) => (data.amountApplicability !== "applicable" ? data.amount === null : true),
  { message: "El monto debe ser nulo si no es aplicable", path: ["amount"] }
);

export const ComplaintDetailsSchema = z.object({
  kind: z.enum(COMPLAINT_KINDS),
  facts: trimmedString(COMPLAINT_LIMITS.facts),
  requestedResolution: trimmedString(COMPLAINT_LIMITS.requestedResolution),
}).strict();

export const ComplaintConfirmationSchema = z.object({
  truthfulnessConfirmed: z.literal(true),
  submissionConfirmed: z.literal(true),
  emailDeliveryRequested: z.boolean(),
}).strict();

export const ComplaintSubmissionSchema = z.object({
  schemaVersion: z.literal("1.0"),
  consumer: ComplaintConsumerSchema,
  subject: ComplaintSubjectSchema,
  complaint: ComplaintDetailsSchema,
  confirmation: ComplaintConfirmationSchema,
  idempotencyKey: ComplaintIdempotencyKeySchema,
}).strict();

export const ComplaintProviderResponseSchema = z.object({
  responseText: trimmedString(COMPLAINT_LIMITS.facts).optional(),
  actionsTaken: trimmedString(COMPLAINT_LIMITS.facts).optional(),
  respondedAt: z.string().datetime(),
  responseChannel: z.enum(COMPLAINT_RESPONSE_CHANNELS),
  responderName: trimmedString(COMPLAINT_LIMITS.firstNames),
  responderRole: trimmedString(COMPLAINT_LIMITS.representativeRole),
  deliveryEvidenceReference: trimmedString(COMPLAINT_LIMITS.referenceNumber).optional(),
}).strict().refine(
  (data) => !!data.responseText || !!data.actionsTaken,
  { message: "La respuesta debe contener texto o acciones", path: ["responseText"] }
);

export type ComplaintIdempotencyKey = z.infer<typeof ComplaintIdempotencyKeySchema>;
export type ComplaintConsumerInput = z.infer<typeof ComplaintConsumerSchema>;
export type ComplaintNaturalConsumerInput = z.infer<typeof NaturalConsumerSchema>;
export type ComplaintLegalEntityConsumerInput = z.infer<typeof LegalEntityConsumerSchema>;
export type ComplaintSubjectInput = z.infer<typeof ComplaintSubjectSchema>;
export type ComplaintDetailsInput = z.infer<typeof ComplaintDetailsSchema>;
export type ComplaintConfirmationInput = z.infer<typeof ComplaintConfirmationSchema>;
export type ComplaintSubmissionInput = z.infer<typeof ComplaintSubmissionSchema>;
