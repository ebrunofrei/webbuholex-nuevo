import { z } from "zod";
import { JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS } from "@/types/jurisprudence-publication-authorization";
import type {
  AuthorizeJurisprudencePublicationCommand,
  DeferJurisprudencePublicationAuthorizationCommand,
  EvaluateJurisprudencePublicationAuthorizationCommand,
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationHistoryQuery,
  JurisprudencePublicationAuthorizationQuery,
  RejectJurisprudencePublicationAuthorizationCommand,
  RevokeJurisprudencePublicationAuthorizationCommand,
  SupersedeJurisprudencePublicationAuthorizationCommand,
} from "@/types/jurisprudence-publication-authorization";

const opaqueReferenceSchema = z.string().trim().min(3).max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
  .refine((value) => !/^\d{8,12}$/.test(value), "La referencia debe ser opaca.")
  .refine((value) => !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value), "No se permiten direcciones IP.")
  .refine((value) => !/^\d{3}[-.]\d{3}[-.]\d{3,4}$/.test(value), "No se permiten teléfonos.");
const idempotencyKeySchema = z.string().trim().min(8).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const reasonSchema = z.string().trim().min(3).max(240)
  .refine((value) => !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value), "No se permiten correos.")
  .refine((value) => !/\b\d{8,12}\b/.test(value), "No se permiten identificadores personales.");

export const jurisprudencePublicationAuthorizationDecisionSchema = z.enum(["authorize", "reject", "defer", "revoke"]);
export const jurisprudencePublicationAuthorizationStatusSchema = z.enum(["not_evaluated", "deferred", "rejected", "authorized", "revoked", "superseded"]);
export const jurisprudencePublicationAuthorizationConditionSchema = z.enum([
  "source_governance_complete", "editorial_review_current", "legal_verification_current",
  "rights_assessment_accepted", "privacy_assessment_accepted", "public_projection_assessed",
  "institutional_owner_confirmed", "publication_scope_defined", "validity_period_defined",
  "revocation_procedure_defined",
]);
export const jurisprudencePublicationAuthorizationBlockerSchema = z.enum([
  "publication_dossier_incomplete", "editorial_case_missing", "editorial_case_superseded",
  "legal_verification_missing", "record_version_mismatch", "source_governance_incomplete",
  "rights_not_cleared", "privacy_not_cleared", "public_projection_not_assessed",
  "institutional_authority_missing", "institutional_decision_missing", "authorization_scope_missing",
  "authorization_validity_missing", "authorization_revocation_policy_missing", "existing_active_authorization",
]);

export const jurisprudencePublicationAuthorizationContextSchema = z.object({
  requestId: opaqueReferenceSchema,
  actorReference: opaqueReferenceSchema,
  requestedAt: z.string().datetime(),
}).strict();

const evaluateShape = {
  context: jurisprudencePublicationAuthorizationContextSchema,
  publicationDossierId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
};

function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }
function allRequiredConditions(values: readonly string[]): boolean {
  return values.length === JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS.length
    && JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS.every((condition) => values.includes(condition));
}
function validPeriod(effectiveFrom: string, expiresAt: string | undefined): boolean {
  return expiresAt === undefined || new Date(expiresAt).valueOf() > new Date(effectiveFrom).valueOf();
}

export const evaluateJurisprudencePublicationAuthorizationCommandSchema = z.object(evaluateShape).strict()
  .transform((value): EvaluateJurisprudencePublicationAuthorizationCommand => value);

export const authorizeJurisprudencePublicationCommandSchema = z.object({
  ...evaluateShape,
  institutionalAuthorityRef: opaqueReferenceSchema,
  decisionRef: opaqueReferenceSchema,
  authorizationScopeRef: opaqueReferenceSchema,
  effectiveFrom: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  reasons: z.array(reasonSchema).max(10).refine(unique).readonly(),
  conditions: z.array(jurisprudencePublicationAuthorizationConditionSchema).min(1).max(10).refine(unique).readonly(),
  idempotencyKey: idempotencyKeySchema,
}).strict().superRefine((value, context) => {
  if (!allRequiredConditions(value.conditions)) context.addIssue({ code: "custom", path: ["conditions"], message: "La autorización exige todas las condiciones obligatorias." });
  if (!validPeriod(value.effectiveFrom, value.expiresAt)) context.addIssue({ code: "custom", path: ["expiresAt"], message: "La expiración debe ser posterior a la vigencia." });
}).transform((value): AuthorizeJurisprudencePublicationCommand => ({
  context: value.context,
  publicationDossierId: value.publicationDossierId,
  expectedRecordVersion: value.expectedRecordVersion,
  institutionalAuthorityRef: value.institutionalAuthorityRef,
  decisionRef: value.decisionRef,
  authorizationScopeRef: value.authorizationScopeRef,
  effectiveFrom: value.effectiveFrom,
  ...(value.expiresAt === undefined ? {} : { expiresAt: value.expiresAt }),
  reasons: value.reasons,
  conditions: value.conditions,
  idempotencyKey: value.idempotencyKey,
}));

export const rejectJurisprudencePublicationAuthorizationCommandSchema = z.object({
  ...evaluateShape,
  institutionalAuthorityRef: opaqueReferenceSchema,
  decisionRef: opaqueReferenceSchema,
  authorizationScopeRef: opaqueReferenceSchema,
  reasons: z.array(reasonSchema).min(1).max(10).refine(unique).readonly(),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): RejectJurisprudencePublicationAuthorizationCommand => value);

export const deferJurisprudencePublicationAuthorizationCommandSchema = z.object({
  ...evaluateShape,
  institutionalAuthorityRef: opaqueReferenceSchema,
  decisionRef: opaqueReferenceSchema,
  authorizationScopeRef: opaqueReferenceSchema,
  blockers: z.array(jurisprudencePublicationAuthorizationBlockerSchema).min(1).max(15).refine(unique).readonly(),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): DeferJurisprudencePublicationAuthorizationCommand => value);

export const revokeJurisprudencePublicationAuthorizationCommandSchema = z.object({
  context: jurisprudencePublicationAuthorizationContextSchema,
  authorizationCaseId: opaqueReferenceSchema,
  expectedVersion: z.number().int().min(1),
  institutionalAuthorityRef: opaqueReferenceSchema,
  decisionRef: opaqueReferenceSchema,
  reasons: z.array(reasonSchema).min(1).max(10).refine(unique).readonly(),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): RevokeJurisprudencePublicationAuthorizationCommand => value);

export const supersedeJurisprudencePublicationAuthorizationCommandSchema = z.object({
  context: jurisprudencePublicationAuthorizationContextSchema,
  authorizationCaseId: opaqueReferenceSchema,
  expectedVersion: z.number().int().min(1),
  newRecordVersion: z.number().int().min(1),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): SupersedeJurisprudencePublicationAuthorizationCommand => value);

export const jurisprudencePublicationAuthorizationQuerySchema = z.object({
  context: jurisprudencePublicationAuthorizationContextSchema,
  authorizationCaseId: opaqueReferenceSchema,
}).strict().transform((value): JurisprudencePublicationAuthorizationQuery => value);

export const jurisprudencePublicationAuthorizationHistoryQuerySchema = z.object({
  context: jurisprudencePublicationAuthorizationContextSchema,
  recordId: opaqueReferenceSchema,
}).strict().transform((value): JurisprudencePublicationAuthorizationHistoryQuery => value);

const authorizationCaseBaseSchema = z.object({
  authorizationCaseId: opaqueReferenceSchema,
  publicationDossierId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  decision: jurisprudencePublicationAuthorizationDecisionSchema,
  status: jurisprudencePublicationAuthorizationStatusSchema.exclude(["not_evaluated"]),
  institutionalAuthorityRef: opaqueReferenceSchema,
  decisionRef: opaqueReferenceSchema,
  authorizationScopeRef: opaqueReferenceSchema,
  decidedAt: z.string().datetime(),
  effectiveFrom: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  reasons: z.array(reasonSchema).max(10).readonly(),
  blockers: z.array(jurisprudencePublicationAuthorizationBlockerSchema).max(15).refine(unique).readonly(),
  conditions: z.array(jurisprudencePublicationAuthorizationConditionSchema).max(10).refine(unique).readonly(),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
  supersededAt: z.string().datetime().nullable(),
  publicationAuthorizationGranted: z.boolean(),
  publicationExecuted: z.literal(false),
}).strict().superRefine((value, context) => {
  const expectedStatus = value.decision === "authorize" ? "authorized" : value.decision === "reject" ? "rejected" : value.decision === "defer" ? "deferred" : "revoked";
  if (value.status !== expectedStatus && value.status !== "revoked" && value.status !== "superseded") context.addIssue({ code: "custom", path: ["status"], message: "El estado no corresponde a la decisión." });
  if (value.status === "authorized" && (!allRequiredConditions(value.conditions) || !value.publicationAuthorizationGranted)) context.addIssue({ code: "custom", path: ["conditions"], message: "La autorización persistida está incompleta." });
  if (value.status !== "authorized" && value.publicationAuthorizationGranted) context.addIssue({ code: "custom", path: ["publicationAuthorizationGranted"], message: "Solo una autorización vigente puede estar concedida." });
  if (!validPeriod(value.effectiveFrom, value.expiresAt)) context.addIssue({ code: "custom", path: ["expiresAt"], message: "La expiración debe ser posterior a la vigencia." });
});

export const jurisprudencePublicationAuthorizationCaseSchema = authorizationCaseBaseSchema.transform((value): JurisprudencePublicationAuthorizationCase => ({
  authorizationCaseId: value.authorizationCaseId,
  publicationDossierId: value.publicationDossierId,
  recordId: value.recordId,
  recordVersion: value.recordVersion,
  decision: value.decision,
  status: value.status,
  institutionalAuthorityRef: value.institutionalAuthorityRef,
  decisionRef: value.decisionRef,
  authorizationScopeRef: value.authorizationScopeRef,
  decidedAt: value.decidedAt,
  effectiveFrom: value.effectiveFrom,
  ...(value.expiresAt === undefined ? {} : { expiresAt: value.expiresAt }),
  reasons: value.reasons,
  blockers: value.blockers,
  conditions: value.conditions,
  version: value.version,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
  revokedAt: value.revokedAt,
  supersededAt: value.supersededAt,
  publicationAuthorizationGranted: value.publicationAuthorizationGranted,
  publicationExecuted: false,
}));

export const jurisprudencePublicationAuthorizationEventSchema = z.object({
  eventId: opaqueReferenceSchema,
  authorizationCaseId: opaqueReferenceSchema,
  sequence: z.number().int().min(1),
  type: z.enum(["authorization_granted", "authorization_rejected", "authorization_deferred", "authorization_revoked", "authorization_superseded"]),
  occurredAt: z.string().datetime(),
  recordVersion: z.number().int().min(1),
  authorizationVersion: z.number().int().min(1),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()).readonly()])),
}).strict().transform((value): JurisprudencePublicationAuthorizationEvent => value);

export const jurisprudencePublicationAuthorizationViewSchema = z.object({
  authorizationCase: jurisprudencePublicationAuthorizationCaseSchema,
  authorizationCurrent: z.boolean(),
  publicationAuthorizationGranted: z.boolean(),
  publicationExecuted: z.literal(false),
}).strict();
