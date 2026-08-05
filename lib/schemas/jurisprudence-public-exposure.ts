import { z } from "zod";
import type {
  EvaluateJurisprudencePublicExposureCommand,
  ExposeJurisprudencePublicReadModelCommand,
  JurisprudencePublicExposure,
  JurisprudencePublicExposureEvent,
  JurisprudencePublicExposureHistoryQuery,
  JurisprudencePublicExposureQuery,
  JurisprudencePublicExposureView,
  JurisprudencePublicReadModel,
  PrepareJurisprudencePublicReadModelCommand,
  SupersedeJurisprudencePublicExposureCommand,
  WithdrawJurisprudencePublicExposureCommand,
} from "@/types/jurisprudence-public-exposure";

const opaqueReferenceSchema = z.string().trim().min(3).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/).refine((value) => !/@/.test(value), "La referencia debe ser opaca.");
const idempotencyKeySchema = z.string().trim().min(8).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const isoDateTimeSchema = z.string().datetime();
const slugSchema = z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const jurisprudencePublicReadModelStatusSchema = z.enum(["prepared_internal", "exposure_pending", "exposed", "withdrawn", "superseded", "rejected"]);
export const jurisprudencePublicExposureContextSchema = z.object({ requestId: opaqueReferenceSchema, actorReference: opaqueReferenceSchema, requestedAt: isoDateTimeSchema }).strict();
const evaluationShape = { context: jurisprudencePublicExposureContextSchema, executionId: opaqueReferenceSchema, expectedRecordVersion: z.number().int().min(1) };

export const evaluateJurisprudencePublicExposureCommandSchema = z.object(evaluationShape).strict().transform((value): EvaluateJurisprudencePublicExposureCommand => value);
export const prepareJurisprudencePublicReadModelCommandSchema = z.object({ ...evaluationShape, idempotencyKey: idempotencyKeySchema }).strict().transform((value): PrepareJurisprudencePublicReadModelCommand => value);
export const exposeJurisprudencePublicReadModelCommandSchema = z.object({ context: jurisprudencePublicExposureContextSchema, publicRecordId: opaqueReferenceSchema, expectedRevision: z.number().int().min(1), idempotencyKey: idempotencyKeySchema }).strict().transform((value): ExposeJurisprudencePublicReadModelCommand => value);
export const withdrawJurisprudencePublicExposureCommandSchema = z.object({ context: jurisprudencePublicExposureContextSchema, publicRecordId: opaqueReferenceSchema, expectedRevision: z.number().int().min(1), reason: z.enum(["authorization_changed", "rights_review_required", "privacy_review_required", "institutional_withdrawal"]), idempotencyKey: idempotencyKeySchema }).strict().transform((value): WithdrawJurisprudencePublicExposureCommand => value);
export const supersedeJurisprudencePublicExposureCommandSchema = z.object({ context: jurisprudencePublicExposureContextSchema, publicRecordId: opaqueReferenceSchema, expectedRevision: z.number().int().min(1), newRecordVersion: z.number().int().min(1), idempotencyKey: idempotencyKeySchema }).strict().transform((value): SupersedeJurisprudencePublicExposureCommand => value);
export const jurisprudencePublicExposureQuerySchema = z.object({ context: jurisprudencePublicExposureContextSchema, publicRecordId: opaqueReferenceSchema }).strict().transform((value): JurisprudencePublicExposureQuery => value);
export const jurisprudencePublicExposureHistoryQuerySchema = z.object({ context: jurisprudencePublicExposureContextSchema, recordId: opaqueReferenceSchema }).strict().transform((value): JurisprudencePublicExposureHistoryQuery => value);

export const jurisprudencePublicReadModelSchema = z.object({
  publicRecordId: opaqueReferenceSchema,
  projectionId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  caseNumber: z.string().trim().min(1).max(160),
  resolutionNumber: z.string().trim().min(1).max(160),
  resolutionType: z.string().trim().min(1).max(120),
  institutionName: z.string().trim().min(1).max(240),
  issuingBody: z.string().trim().min(1).max(240),
  matter: z.string().trim().min(1).max(240),
  issuedAt: z.string().date(),
  summary: z.string().trim().min(1).max(4000),
  sourceName: z.string().trim().min(1).max(240),
  sourceDocumentId: z.string().trim().min(1).max(240).nullable(),
  publicStatus: jurisprudencePublicReadModelStatusSchema,
  preparedAt: isoDateTimeSchema,
  exposedAt: isoDateTimeSchema.nullable(),
  withdrawnAt: isoDateTimeSchema.nullable(),
  supersededAt: isoDateTimeSchema.nullable(),
  publicRevision: z.number().int().min(1),
  exposedPublicly: z.boolean(),
  indexed: z.literal(false),
  deployed: z.literal(false),
}).strict().superRefine((value, context) => {
  if ((value.publicStatus === "exposed") !== value.exposedPublicly) context.addIssue({ code: "custom", path: ["exposedPublicly"], message: "Solo una exposición ficticia activa puede marcarse expuesta." });
}).transform((value): JurisprudencePublicReadModel => value);

export const jurisprudencePublicExposureSchema = z.object({
  exposureId: opaqueReferenceSchema,
  publicRecordId: opaqueReferenceSchema,
  executionId: opaqueReferenceSchema,
  authorizationCaseId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  status: jurisprudencePublicReadModelStatusSchema,
  revision: z.number().int().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  exposedAt: isoDateTimeSchema.nullable(),
  withdrawnAt: isoDateTimeSchema.nullable(),
  supersededAt: isoDateTimeSchema.nullable(),
  supersededByRecordVersion: z.number().int().min(1).nullable(),
  realPublicExposure: z.literal(false),
  indexed: z.literal(false),
  deployed: z.literal(false),
}).strict().transform((value): JurisprudencePublicExposure => value);

export const jurisprudencePublicExposureEventSchema = z.object({
  eventId: opaqueReferenceSchema, exposureId: opaqueReferenceSchema, publicRecordId: opaqueReferenceSchema, recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1), publicRevision: z.number().int().min(1), sequence: z.number().int().min(1),
  type: z.enum(["public_read_model_prepared", "public_exposure_activated", "public_exposure_withdrawn", "public_exposure_superseded"]),
  occurredAt: isoDateTimeSchema, payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
}).strict().transform((value): JurisprudencePublicExposureEvent => value);

export const jurisprudencePublicExposureViewSchema = z.object({ readModel: jurisprudencePublicReadModelSchema, exposure: jurisprudencePublicExposureSchema, activeForTests: z.boolean(), realPublicExposure: z.literal(false), publicSearchConnected: z.literal(false), indexed: z.literal(false), deployed: z.literal(false) }).strict().transform((value): JurisprudencePublicExposureView => value);
