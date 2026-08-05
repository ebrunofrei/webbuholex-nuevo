import { z } from "zod";
import type {
  EvaluateJurisprudencePublicationExecutionCommand,
  ExecuteJurisprudencePublicationCommand,
  JurisprudencePublicProjection,
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionEvent,
  JurisprudencePublicationExecutionHistoryQuery,
  JurisprudencePublicationExecutionQuery,
  JurisprudencePublicationExecutionView,
  SupersedeJurisprudencePublicationExecutionCommand,
  WithdrawJurisprudencePublicationCommand,
} from "@/types/jurisprudence-publication-execution";

const opaqueReferenceSchema = z.string().trim().min(3).max(180)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
  .refine((value) => !/@/.test(value), "La referencia debe ser opaca.")
  .refine((value) => !/^\d{8,12}$/.test(value), "No se permiten identificadores personales.");
const idempotencyKeySchema = z.string().trim().min(8).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const isoDateSchema = z.string().datetime();

export const jurisprudencePublicationExecutionStatusSchema = z.enum(["pending", "executed", "withdrawn", "superseded", "failed"]);
export const jurisprudencePublicProjectionStatusSchema = z.enum(["generated", "active_internal", "withdrawn", "superseded"]);
export const jurisprudencePublicationWithdrawalReasonSchema = z.enum([
  "authorization_revoked",
  "record_corrected",
  "rights_reassessment_required",
  "privacy_reassessment_required",
  "institutional_withdrawal",
]);

export const jurisprudencePublicationExecutionContextSchema = z.object({
  requestId: opaqueReferenceSchema,
  actorReference: opaqueReferenceSchema,
  requestedAt: isoDateSchema,
}).strict();

const evaluationShape = {
  context: jurisprudencePublicationExecutionContextSchema,
  recordId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  editorialCaseId: opaqueReferenceSchema,
  publicationDossierId: opaqueReferenceSchema,
  authorizationCaseId: opaqueReferenceSchema,
};

export const evaluateJurisprudencePublicationExecutionCommandSchema = z.object(evaluationShape).strict()
  .transform((value): EvaluateJurisprudencePublicationExecutionCommand => value);

export const executeJurisprudencePublicationCommandSchema = z.object({
  ...evaluationShape,
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): ExecuteJurisprudencePublicationCommand => value);

export const withdrawJurisprudencePublicationCommandSchema = z.object({
  context: jurisprudencePublicationExecutionContextSchema,
  executionId: opaqueReferenceSchema,
  expectedVersion: z.number().int().min(1),
  reason: jurisprudencePublicationWithdrawalReasonSchema,
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): WithdrawJurisprudencePublicationCommand => value);

export const supersedeJurisprudencePublicationExecutionCommandSchema = z.object({
  context: jurisprudencePublicationExecutionContextSchema,
  executionId: opaqueReferenceSchema,
  expectedVersion: z.number().int().min(1),
  newRecordVersion: z.number().int().min(1),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): SupersedeJurisprudencePublicationExecutionCommand => value);

export const jurisprudencePublicationExecutionQuerySchema = z.object({
  context: jurisprudencePublicationExecutionContextSchema,
  executionId: opaqueReferenceSchema,
}).strict().transform((value): JurisprudencePublicationExecutionQuery => value);

export const jurisprudencePublicationExecutionHistoryQuerySchema = z.object({
  context: jurisprudencePublicationExecutionContextSchema,
  recordId: opaqueReferenceSchema,
}).strict().transform((value): JurisprudencePublicationExecutionHistoryQuery => value);

export const jurisprudencePublicationExecutionSchema = z.object({
  executionId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  editorialCaseId: opaqueReferenceSchema,
  publicationDossierId: opaqueReferenceSchema,
  authorizationCaseId: opaqueReferenceSchema,
  projectionId: opaqueReferenceSchema,
  status: jurisprudencePublicationExecutionStatusSchema,
  version: z.number().int().min(1),
  executedAt: isoDateSchema,
  executedByReference: opaqueReferenceSchema,
  withdrawnAt: isoDateSchema.nullable(),
  withdrawalReason: jurisprudencePublicationWithdrawalReasonSchema.nullable(),
  supersededAt: isoDateSchema.nullable(),
  supersededByRecordVersion: z.number().int().min(1).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  publicationExecuted: z.boolean(),
  deployed: z.literal(false),
}).strict().superRefine((value, context) => {
  if ((value.status === "executed") !== value.publicationExecuted) {
    context.addIssue({ code: "custom", path: ["publicationExecuted"], message: "Solo una ejecución vigente puede indicar ejecución técnica." });
  }
  if (value.status === "withdrawn" && (value.withdrawnAt === null || value.withdrawalReason === null)) {
    context.addIssue({ code: "custom", path: ["withdrawnAt"], message: "El retiro exige fecha y razón controlada." });
  }
  if (value.status === "superseded" && (value.supersededAt === null || value.supersededByRecordVersion === null)) {
    context.addIssue({ code: "custom", path: ["supersededAt"], message: "La supersesión exige fecha y nueva versión." });
  }
}).transform((value): JurisprudencePublicationExecution => value);

export const jurisprudencePublicProjectionSchema = z.object({
  projectionId: opaqueReferenceSchema,
  executionId: opaqueReferenceSchema,
  authorizationCaseId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  status: jurisprudencePublicProjectionStatusSchema,
  slug: z.string().trim().min(1).max(180).nullable(),
  title: z.string().trim().min(1).max(300),
  caseNumber: z.string().trim().min(1).max(160),
  resolutionNumber: z.string().trim().min(1).max(160),
  resolutionType: z.string().trim().min(1).max(120),
  institutionName: z.string().trim().min(1).max(240),
  issuingBody: z.string().trim().min(1).max(240),
  matter: z.string().trim().min(1).max(240),
  issuedAt: z.string().date(),
  summary: z.string().trim().min(1).max(4000).nullable(),
  sourceName: z.string().trim().min(1).max(240),
  sourceDocumentId: z.string().trim().min(1).max(240).nullable(),
  generatedAt: isoDateSchema,
  updatedAt: isoDateSchema,
  exposedPublicly: z.literal(false),
  deployed: z.literal(false),
}).strict().transform((value): JurisprudencePublicProjection => value);

export const jurisprudencePublicationExecutionEventSchema = z.object({
  eventId: opaqueReferenceSchema,
  executionId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  executionVersion: z.number().int().min(1),
  sequence: z.number().int().min(1),
  type: z.enum(["publication_executed", "publication_withdrawn", "publication_execution_superseded"]),
  occurredAt: isoDateSchema,
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
}).strict().transform((value): JurisprudencePublicationExecutionEvent => value);

export const jurisprudencePublicationExecutionViewSchema = z.object({
  execution: jurisprudencePublicationExecutionSchema,
  projection: jurisprudencePublicProjectionSchema,
  current: z.boolean(),
  publicationExecuted: z.boolean(),
  publicProjectionExposed: z.literal(false),
  deployed: z.literal(false),
}).strict().transform((value): JurisprudencePublicationExecutionView => value);
