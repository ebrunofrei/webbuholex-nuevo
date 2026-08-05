import { z } from "zod";
import {
  jurisprudenceEditorialStatusSchema,
  jurisprudencePublicationStatusSchema,
  jurisprudenceRecordSourceTypeSchema,
  jurisprudenceVerificationStatusSchema,
  jurisprudenceRecordSchema,
} from "@/lib/schemas/jurisprudence";

const normalizedOptionalText = (maximum: number) => z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1).max(maximum).optional());

export const jurisprudenceExternalIdentitySchema = z.object({
  sourceType: jurisprudenceRecordSourceTypeSchema,
  sourceDocumentId: z.string().trim().min(1).max(300).nullable(),
  caseNumber: z.string().trim().min(1).max(200),
  resolutionNumber: z.string().trim().min(1).max(200),
  institutionId: z.string().trim().min(1).max(160),
  issuedAt: z.string().date(),
}).strict();

export const jurisprudenceRepositoryFiltersSchema = z.object({
  caseNumber: normalizedOptionalText(200),
  resolutionNumber: normalizedOptionalText(200),
  institutionId: normalizedOptionalText(160),
  matter: normalizedOptionalText(200),
  editorialStatus: jurisprudenceEditorialStatusSchema.optional(),
  publicationStatus: jurisprudencePublicationStatusSchema.optional(),
  verificationStatus: jurisprudenceVerificationStatusSchema.optional(),
  issuedFrom: normalizedOptionalText(10).pipe(z.string().date().optional()),
  issuedTo: normalizedOptionalText(10).pipe(z.string().date().optional()),
}).strict().superRefine((filters, context) => {
  if (filters.issuedFrom && filters.issuedTo && filters.issuedFrom > filters.issuedTo) context.addIssue({ code: "custom", path: ["issuedTo"], message: "La fecha final no puede preceder a la inicial." });
});

export const jurisprudenceRepositoryQuerySchema = z.object({
  q: normalizedOptionalText(500),
  filters: jurisprudenceRepositoryFiltersSchema.default({}),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["issued_at_asc", "issued_at_desc", "updated_at_asc", "updated_at_desc"]).default("updated_at_desc"),
}).strict();

export const jurisprudenceNewRecordSchema = jurisprudenceRecordSchema.omit({
  id: true,
  recordVersion: true,
  createdAt: true,
  updatedAt: true,
});

export const jurisprudenceCreateInputSchema = z.object({
  record: jurisprudenceNewRecordSchema,
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict();

export const jurisprudenceUpdateInputSchema = z.object({
  id: z.string().trim().min(1).max(160),
  expectedVersion: z.number().int().positive(),
  changeKind: z.enum(["editorial_update", "source_update"]),
  record: jurisprudenceNewRecordSchema,
}).strict();
