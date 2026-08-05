import { z } from "zod";
import type {
  AssignJurisprudenceEditorialReviewCommand,
  CloseJurisprudenceEditorialCaseCommand,
  EvaluateJurisprudenceEditorialPublicationCommand,
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCaseQuery,
  JurisprudenceEditorialEvent,
  OpenJurisprudenceEditorialCaseCommand,
  RecordJurisprudenceEditorialDecisionCommand,
  RecordJurisprudenceEditorialObservationCommand,
  ResolveJurisprudenceEditorialObservationCommand,
  SynchronizeJurisprudenceEditorialCaseCommand,
} from "@/types/jurisprudence-editorial-workflow";

const opaqueReferenceSchema = z.string().trim().min(3).max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
  .refine((value) => !/^\d{8,12}$/.test(value), "La referencia debe ser opaca y no un documento personal.");

const safeTextSchema = z.string().trim().min(3).max(1_000)
  .refine((value) => !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value), "El texto no debe contener correos.")
  .refine((value) => !/\b\d{8,12}\b/.test(value), "El texto no debe contener identificadores personales numéricos.");

export const jurisprudenceEditorialWorkflowContextSchema = z.object({
  requestId: z.string().trim().min(8).max(200),
  actorReference: opaqueReferenceSchema,
  requestedAt: z.string().datetime(),
}).strict();

export const jurisprudenceEditorialReviewKindSchema = z.enum(["editorial_review", "legal_verification"]);
export const jurisprudenceEditorialObservationCategorySchema = z.enum([
  "metadata_incomplete",
  "source_unverified",
  "citation_incomplete",
  "legal_text_inconsistent",
  "identity_conflict",
  "duplicate_requires_review",
  "publication_requirement_missing",
  "other_editorial_issue",
]);
export const jurisprudenceEditorialObservationSeveritySchema = z.enum(["blocking", "non_blocking"]);
export const jurisprudenceEditorialDecisionSchema = z.enum([
  "request_changes",
  "editorial_approved",
  "legal_verification_rejected",
  "legal_verification_approved",
  "close_without_approval",
]);

const mutationBase = {
  context: jurisprudenceEditorialWorkflowContextSchema,
  caseId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  expectedCaseVersion: z.number().int().min(1),
  idempotencyKey: z.string().trim().min(8).max(200),
};

export const openJurisprudenceEditorialCaseCommandSchema = z.object({
  context: jurisprudenceEditorialWorkflowContextSchema,
  recordId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  purpose: safeTextSchema.max(300),
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict().transform((value): OpenJurisprudenceEditorialCaseCommand => value);

export const assignJurisprudenceEditorialReviewCommandSchema = z.object({
  ...mutationBase,
  reviewKind: jurisprudenceEditorialReviewKindSchema,
  assigneeReference: opaqueReferenceSchema,
}).strict().transform((value): AssignJurisprudenceEditorialReviewCommand => value);

export const recordJurisprudenceEditorialObservationCommandSchema = z.object({
  ...mutationBase,
  category: jurisprudenceEditorialObservationCategorySchema,
  severity: jurisprudenceEditorialObservationSeveritySchema,
  note: safeTextSchema,
}).strict().transform((value): RecordJurisprudenceEditorialObservationCommand => value);

export const resolveJurisprudenceEditorialObservationCommandSchema = z.object({
  ...mutationBase,
  observationId: opaqueReferenceSchema,
}).strict().transform((value): ResolveJurisprudenceEditorialObservationCommand => value);

export const recordJurisprudenceEditorialDecisionCommandSchema = z.object({
  ...mutationBase,
  decision: jurisprudenceEditorialDecisionSchema,
}).strict().transform((value): RecordJurisprudenceEditorialDecisionCommand => value);

export const evaluateJurisprudenceEditorialPublicationCommandSchema = z.object({
  ...mutationBase,
}).strict().transform((value): EvaluateJurisprudenceEditorialPublicationCommand => value);

export const synchronizeJurisprudenceEditorialCaseCommandSchema = z.object({
  context: jurisprudenceEditorialWorkflowContextSchema,
  caseId: opaqueReferenceSchema,
  expectedCaseVersion: z.number().int().min(1),
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict().transform((value): SynchronizeJurisprudenceEditorialCaseCommand => value);

export const closeJurisprudenceEditorialCaseCommandSchema = z.object({
  ...mutationBase,
  reason: safeTextSchema.max(300),
}).strict().transform((value): CloseJurisprudenceEditorialCaseCommand => value);

export const jurisprudenceEditorialCaseQuerySchema = z.object({
  context: jurisprudenceEditorialWorkflowContextSchema,
  caseId: opaqueReferenceSchema,
}).strict().transform((value): JurisprudenceEditorialCaseQuery => value);

const assignmentSchema = z.object({
  reviewKind: jurisprudenceEditorialReviewKindSchema,
  assigneeReference: opaqueReferenceSchema,
  assignedByReference: opaqueReferenceSchema,
  assignedAt: z.string().datetime(),
}).strict();

const observationSchema = z.object({
  observationId: opaqueReferenceSchema,
  category: jurisprudenceEditorialObservationCategorySchema,
  severity: jurisprudenceEditorialObservationSeveritySchema,
  note: safeTextSchema,
  recordedByReference: opaqueReferenceSchema,
  recordedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedByReference: opaqueReferenceSchema.nullable(),
}).strict();

const decisionRecordSchema = z.object({
  decision: jurisprudenceEditorialDecisionSchema,
  actorReference: opaqueReferenceSchema,
  decidedAt: z.string().datetime(),
  recordVersion: z.number().int().min(1),
}).strict();

const publicationEvaluationSchema = z.object({
  evaluatedAt: z.string().datetime(),
  evaluatedByReference: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  domainPublicable: z.boolean(),
  blockers: z.array(z.string().min(1)).readonly(),
  publicationAuthorizationGranted: z.literal(false),
  publicationExecuted: z.literal(false),
}).strict();

export const jurisprudenceEditorialCaseSchema = z.object({
  caseId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  caseVersion: z.number().int().min(1),
  purpose: safeTextSchema.max(300),
  openedAt: z.string().datetime(),
  openedByReference: opaqueReferenceSchema,
  expiresAt: z.string().datetime(),
  editorialAssignment: assignmentSchema.nullable(),
  legalAssignment: assignmentSchema.nullable(),
  observations: z.array(observationSchema).readonly(),
  editorialDecision: decisionRecordSchema.nullable(),
  legalDecision: decisionRecordSchema.nullable(),
  publicationEvaluation: publicationEvaluationSchema.nullable(),
  supersededAt: z.string().datetime().nullable(),
  supersededByRecordVersion: z.number().int().min(1).nullable(),
  closedAt: z.string().datetime().nullable(),
  closedByReference: opaqueReferenceSchema.nullable(),
  updatedAt: z.string().datetime(),
}).strict().transform((value): JurisprudenceEditorialCase => value);

const eventPayloadValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()).readonly(),
]);

export const jurisprudenceEditorialEventSchema = z.object({
  eventId: opaqueReferenceSchema,
  caseId: opaqueReferenceSchema,
  sequence: z.number().int().min(1),
  type: z.enum([
    "editorial_case_opened",
    "review_assigned",
    "observation_recorded",
    "observation_resolved",
    "editorial_decision_recorded",
    "legal_decision_recorded",
    "publication_evaluation_recorded",
    "case_superseded",
    "case_closed",
  ]),
  occurredAt: z.string().datetime(),
  actorReference: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  caseVersion: z.number().int().min(1),
  payload: z.record(z.string(), eventPayloadValueSchema),
}).strict().transform((value): JurisprudenceEditorialEvent => value);

export const jurisprudenceEditorialCaseStatusSchema = z.enum([
  "open",
  "changes_requested",
  "editorially_approved",
  "legally_rejected",
  "legally_verified",
  "verified_for_publication_evaluation",
  "superseded",
  "closed_without_approval",
]);

export const jurisprudenceEditorialCaseViewSchema = z.object({
  case: jurisprudenceEditorialCaseSchema,
  status: jurisprudenceEditorialCaseStatusSchema,
  openBlockingObservations: z.number().int().min(0),
  publicationAuthorizationGranted: z.literal(false),
  publicationExecuted: z.literal(false),
}).strict();

export const jurisprudenceEditorialStoredResultSchema = z.union([
  jurisprudenceEditorialCaseViewSchema,
  jurisprudenceEditorialCaseViewSchema.extend({
    eligibleForPublicationEvaluation: z.boolean(),
    blockers: z.array(z.string().min(1)).readonly(),
  }).strict(),
]);
