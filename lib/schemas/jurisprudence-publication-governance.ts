import { z } from "zod";
import type {
  AssessIntegrityCommand,
  AssessPrivacyCommand,
  AssessProvenanceCommand,
  AssessPublicProjectionCommand,
  AssessRightsCommand,
  BindJurisprudenceSourceCommand,
  ClosePublicationDossierCommand,
  EvaluatePublicationDossierCommand,
  JurisprudencePublicationDossier,
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  OpenPublicationDossierCommand,
  PublicationDossierEvent,
  PublicationDossierQuery,
  RegisterJurisprudenceSourceCommand,
  SynchronizePublicationDossierCommand,
  SupersedeJurisprudenceSourceBindingCommand,
} from "@/types/jurisprudence-publication-governance";

const opaqueReferenceSchema = z.string().trim().min(3).max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
  .refine((value) => !/^\d{8,12}$/.test(value), "La referencia debe ser opaca.");
const controlledTextSchema = z.string().trim().min(2).max(240)
  .refine((value) => !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value), "No se permiten correos.")
  .refine((value) => !/\b\d{8,12}\b/.test(value), "No se permiten identificadores personales.");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}, "La fecha debe ser válida.");
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const idempotencyKeySchema = z.string().trim().min(8).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const safeUrlSchema = z.string().trim().max(2_048).superRefine((value, context) => {
  if (!URL.canParse(value)) {
    context.addIssue({ code: "custom", message: "La URL debe ser válida." });
    return;
  }
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    context.addIssue({ code: "custom", message: "La URL debe ser HTTPS y no contener credenciales, query o fragmento." });
  }
});

export const governedSourceKindSchema = z.enum([
  "official_judicial_portal", "official_publication", "court_issued_copy", "certified_copy",
  "institutional_archive", "authorized_private_submission", "secondary_reference",
]);
export const sourceOriginTypeSchema = z.enum([
  "primary_official_online", "primary_official_document", "certified_copy", "simple_copy",
  "third_party_submission", "secondary_source",
]);
export const sourceProvenanceStatusSchema = z.enum(["unverified", "documented", "verified", "disputed"]);
export const sourceIntegrityStatusSchema = z.enum(["not_checked", "checksum_verified", "certified_copy_verified", "integrity_conflict"]);
export const sourceRightsStatusSchema = z.enum(["unknown", "review_required", "internal_use_only", "public_display_permitted", "public_reference_only", "restricted", "prohibited"]);
export const privacyReviewStatusSchema = z.enum(["not_started", "in_review", "requires_redaction", "approved_for_internal_use", "approved_for_public_projection", "rejected"]);
export const privacyRiskCategorySchema = z.enum(["personal_identifiers", "minors", "health_data", "family_information", "victim_information", "criminal_record", "financial_information", "precise_location", "confidential_proceeding", "other_restricted_information"]);
export const publicationDossierBlockerSchema = z.enum(["editorial_case_missing", "editorial_case_not_verified", "record_version_mismatch", "source_binding_missing", "source_provenance_unverified", "source_integrity_unverified", "source_integrity_conflict", "source_rights_unknown", "source_rights_restricted", "privacy_review_missing", "privacy_redaction_required", "public_projection_not_approved", "blocking_observations_present", "institutional_owner_missing", "dossier_superseded", "publication_authority_not_defined"]);

export const publicationGovernanceContextSchema = z.object({
  requestId: opaqueReferenceSchema,
  actorReference: opaqueReferenceSchema,
  requestedAt: z.string().datetime(),
}).strict();

const sourceInputSchema = z.object({
  sourceKind: governedSourceKindSchema,
  originType: sourceOriginTypeSchema,
  institutionalOrigin: controlledTextSchema,
  jurisdiction: controlledTextSchema.max(100),
  documentReference: opaqueReferenceSchema,
  sourceUrl: safeUrlSchema.nullable(),
  sourceDate: isoDateSchema,
  retrievedAt: z.string().datetime(),
  custodyStatus: z.enum(["documented", "controlled_internal", "custody_gap", "disputed"]),
  provenanceStatus: sourceProvenanceStatusSchema,
  integrityStatus: sourceIntegrityStatusSchema,
  rightsStatus: sourceRightsStatusSchema,
  privacyStatus: privacyReviewStatusSchema,
  availabilityStatus: z.enum(["available_internal", "reference_only", "unavailable"]),
  verificationStatus: z.enum(["unverified", "under_review", "verified", "disputed"]),
  sourceChecksum: sha256Schema,
  sourceChecksumAlgorithm: z.literal("sha256"),
  sourceFingerprint: sha256Schema,
}).strict();

export const registerJurisprudenceSourceCommandSchema = z.object({
  context: publicationGovernanceContextSchema,
  source: sourceInputSchema,
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): RegisterJurisprudenceSourceCommand => value);

export const bindJurisprudenceSourceCommandSchema = z.object({
  context: publicationGovernanceContextSchema,
  sourceId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  bindingKind: z.enum(["official_basis", "supporting_evidence", "secondary_context"]),
  isPrimarySource: z.boolean(),
  secondarySourceJustificationReference: opaqueReferenceSchema.nullable(),
  idempotencyKey: idempotencyKeySchema,
}).strict().superRefine((value, context) => {
  if (!value.isPrimarySource && value.secondarySourceJustificationReference === null) {
    context.addIssue({ code: "custom", path: ["secondarySourceJustificationReference"], message: "La fuente secundaria exige justificación." });
  }
}).transform((value): BindJurisprudenceSourceCommand => value);

export const supersedeJurisprudenceSourceBindingCommandSchema = z.object({
  context: publicationGovernanceContextSchema,
  bindingId: opaqueReferenceSchema,
  replacementSourceId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  bindingKind: z.enum(["official_basis", "supporting_evidence", "secondary_context"]),
  isPrimarySource: z.boolean(),
  secondarySourceJustificationReference: opaqueReferenceSchema.nullable(),
  idempotencyKey: idempotencyKeySchema,
}).strict().superRefine((value, context) => {
  if (!value.isPrimarySource && value.secondarySourceJustificationReference === null) context.addIssue({ code: "custom", path: ["secondarySourceJustificationReference"], message: "La fuente secundaria exige justificación." });
}).transform((value): SupersedeJurisprudenceSourceBindingCommand => value);

export const openPublicationDossierCommandSchema = z.object({
  context: publicationGovernanceContextSchema,
  recordId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  editorialCaseId: opaqueReferenceSchema,
  expectedEditorialCaseVersion: z.number().int().min(1),
  sourceBindingIds: z.array(opaqueReferenceSchema).min(1).max(20).readonly(),
  institutionalOwnerReference: opaqueReferenceSchema.nullable(),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): OpenPublicationDossierCommand => value);

const mutationBase = {
  context: publicationGovernanceContextSchema,
  dossierId: opaqueReferenceSchema,
  expectedRecordVersion: z.number().int().min(1),
  expectedDossierVersion: z.number().int().min(1),
  idempotencyKey: idempotencyKeySchema,
};
export const assessProvenanceCommandSchema = z.object({ ...mutationBase, status: sourceProvenanceStatusSchema }).strict().transform((value): AssessProvenanceCommand => value);
export const assessIntegrityCommandSchema = z.object({ ...mutationBase, status: sourceIntegrityStatusSchema }).strict().transform((value): AssessIntegrityCommand => value);
export const assessRightsCommandSchema = z.object({ ...mutationBase, status: sourceRightsStatusSchema }).strict().transform((value): AssessRightsCommand => value);
export const assessPrivacyCommandSchema = z.object({
  ...mutationBase,
  status: privacyReviewStatusSchema,
  riskCategories: z.array(privacyRiskCategorySchema).max(10).readonly(),
  otherRiskReference: opaqueReferenceSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.riskCategories.includes("other_restricted_information") && value.otherRiskReference === null) {
    context.addIssue({ code: "custom", path: ["otherRiskReference"], message: "La categoría other exige referencia interna." });
  }
}).transform((value): AssessPrivacyCommand => value);
export const assessPublicProjectionCommandSchema = z.object({ ...mutationBase, status: z.enum(["not_started", "in_review", "approved", "rejected"]) }).strict().transform((value): AssessPublicProjectionCommand => value);
export const evaluatePublicationDossierCommandSchema = z.object({ ...mutationBase }).strict().transform((value): EvaluatePublicationDossierCommand => value);
export const closePublicationDossierCommandSchema = z.object({ ...mutationBase }).strict().transform((value): ClosePublicationDossierCommand => value);
export const synchronizePublicationDossierCommandSchema = z.object({
  context: publicationGovernanceContextSchema,
  dossierId: opaqueReferenceSchema,
  expectedDossierVersion: z.number().int().min(1),
  idempotencyKey: idempotencyKeySchema,
}).strict().transform((value): SynchronizePublicationDossierCommand => value);
export const publicationDossierQuerySchema = z.object({ context: publicationGovernanceContextSchema, dossierId: opaqueReferenceSchema }).strict().transform((value): PublicationDossierQuery => value);

export const jurisprudenceSourceRecordSchema = sourceInputSchema.extend({
  sourceId: opaqueReferenceSchema,
  metadataVersion: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().transform((value): JurisprudenceSourceRecord => value);

export const jurisprudenceSourceBindingSchema = z.object({
  bindingId: opaqueReferenceSchema,
  sourceId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  bindingKind: z.enum(["official_basis", "supporting_evidence", "secondary_context"]),
  isPrimarySource: z.boolean(),
  secondarySourceJustificationReference: opaqueReferenceSchema.nullable(),
  bindingStatus: z.enum(["active", "superseded", "disputed"]),
  createdAt: z.string().datetime(),
  supersededAt: z.string().datetime().nullable(),
  supersededByBindingId: opaqueReferenceSchema.nullable(),
}).strict().transform((value): JurisprudenceSourceBinding => value);

const assessmentBase = { assessmentId: opaqueReferenceSchema, assessedAt: z.string().datetime() };
export const publicationDossierSchema = z.object({
  dossierId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  editorialCaseId: opaqueReferenceSchema,
  editorialCaseVersion: z.number().int().min(1),
  sourceBindingIds: z.array(opaqueReferenceSchema).min(1).max(20).readonly(),
  provenanceAssessment: z.object({ ...assessmentBase, status: sourceProvenanceStatusSchema }).strict().nullable(),
  integrityAssessment: z.object({ ...assessmentBase, status: sourceIntegrityStatusSchema }).strict().nullable(),
  rightsAssessment: z.object({ ...assessmentBase, status: sourceRightsStatusSchema }).strict().nullable(),
  privacyAssessment: z.object({ ...assessmentBase, status: privacyReviewStatusSchema, riskCategories: z.array(privacyRiskCategorySchema).max(10).readonly(), otherRiskReference: opaqueReferenceSchema.nullable() }).strict().nullable(),
  publicProjectionAssessment: z.object({ ...assessmentBase, status: z.enum(["not_started", "in_review", "approved", "rejected"]) }).strict().nullable(),
  institutionalOwnerReference: opaqueReferenceSchema.nullable(),
  status: z.enum(["draft", "under_review", "blocked", "complete_for_authorization_evaluation", "superseded", "closed"]),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  supersededAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
}).strict().transform((value): JurisprudencePublicationDossier => value);

const eventPayloadValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string()).readonly()]);
export const publicationDossierEventSchema = z.object({
  eventId: opaqueReferenceSchema,
  dossierId: opaqueReferenceSchema,
  sequence: z.number().int().min(1),
  type: z.enum(["dossier_opened", "source_bound", "source_superseded", "provenance_assessed", "integrity_assessed", "rights_assessed", "privacy_assessed", "projection_assessed", "dossier_blocked", "dossier_completed", "dossier_superseded", "dossier_closed"]),
  occurredAt: z.string().datetime(),
  recordVersion: z.number().int().min(1),
  dossierVersion: z.number().int().min(1),
  payload: z.record(z.string(), eventPayloadValueSchema),
}).strict().transform((value): PublicationDossierEvent => value);

const publicationAuthorizationEvaluationSchema = z.union([
  z.object({ decision: z.literal("incomplete"), blockers: z.array(publicationDossierBlockerSchema).readonly(), publicationAuthorizationGranted: z.literal(false), publicationExecuted: z.literal(false) }).strict(),
  z.object({ decision: z.literal("ready_for_authorization_evaluation"), conditions: z.array(z.enum(["institutional_authorization_required", "publication_must_be_executed_separately", "record_version_must_remain_unchanged"])).readonly(), publicationAuthorizationGranted: z.literal(false), publicationExecuted: z.literal(false) }).strict(),
  z.object({ decision: z.literal("rejected"), reasons: z.array(z.string().min(1).max(240)).readonly(), publicationAuthorizationGranted: z.literal(false), publicationExecuted: z.literal(false) }).strict(),
]);

export const publicationGovernanceStoredResultSchema = z.union([
  z.object({ source: jurisprudenceSourceRecordSchema }).strict(),
  z.object({ binding: jurisprudenceSourceBindingSchema }).strict(),
  z.object({ dossier: publicationDossierSchema, evaluation: publicationAuthorizationEvaluationSchema }).strict(),
]);
