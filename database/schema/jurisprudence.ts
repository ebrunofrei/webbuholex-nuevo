import {
  pgSchema,
  varchar,
  integer,
  timestamp,
  date,
  jsonb,
  customType,
  index,
  uniqueIndex,
  unique,
  foreignKey,
  check,
  boolean,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const jurisprudenceInternalSchema = pgSchema("jurisprudence_internal");
export const jurisprudencePublicSchema = pgSchema("jurisprudence_public");

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const jurisprudenceRecords = jurisprudenceInternalSchema.table("jurisprudence_records", {
  id: varchar("id").primaryKey(),
  slug: varchar("slug").unique(),
  recordVersion: integer("record_version").notNull(),
  deduplicationKey: varchar("deduplication_key").notNull().unique(),
  sourceType: varchar("source_type").notNull(),
  sourceDocumentId: varchar("source_document_id"),
  normalizedCaseNumber: varchar("normalized_case_number").notNull(),
  normalizedResolutionNumber: varchar("normalized_resolution_number"),
  institutionId: varchar("institution_id").notNull(),
  normalizedMatter: varchar("normalized_matter").notNull(),
  normalizedSearchText: varchar("normalized_search_text").notNull(),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('spanish', normalized_search_text)`),
  issuedAt: date("issued_at").notNull(),
  editorialStatus: varchar("editorial_status", { enum: ["draft", "under_review", "verified", "rejected", "archived"] }).notNull(),
  publicationStatus: varchar("publication_status", { enum: ["private", "editorial_preview", "published", "unpublished", "withdrawn"] }).notNull(),
  verificationStatus: varchar("verification_status", { enum: ["unverified", "source_located", "partially_verified", "verified", "disputed"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  payloadJson: jsonb("payload_json").notNull(),
}, (table) => [
  check("record_version_positive", sql`${table.recordVersion} > 0`),
  index("jurisprudence_records_source_document_idx").on(table.sourceType, table.sourceDocumentId),
  index("jurisprudence_records_case_idx").on(table.normalizedCaseNumber),
  index("jurisprudence_records_resolution_idx").on(table.normalizedResolutionNumber),
  index("jurisprudence_records_institution_matter_date_idx").on(table.institutionId, table.normalizedMatter, table.issuedAt, table.id),
  index("jurisprudence_records_status_idx").on(table.editorialStatus, table.publicationStatus, table.verificationStatus, table.updatedAt, table.id),
  index("jurisprudence_records_fts_gin_idx").using("gin", table.searchVector)
]);

export const jurisprudenceRecordVersions = jurisprudenceInternalSchema.table("jurisprudence_record_versions", {
  recordId: varchar("record_id").notNull(),
  version: integer("version").notNull(),
  changeKind: varchar("change_kind").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  snapshotJson: jsonb("snapshot_json").notNull(),
}, (table) => [
  check("version_positive", sql`${table.version} > 0`),
  foreignKey({
    columns: [table.recordId],
    foreignColumns: [jurisprudenceRecords.id],
  }).onDelete("restrict"),
  unique("jurisprudence_record_versions_pk").on(table.recordId, table.version),
]);

export const jurisprudenceIdempotency = jurisprudenceInternalSchema.table("jurisprudence_idempotency", {
  idempotencyKey: varchar("idempotency_key").primaryKey(),
  inputJson: jsonb("input_json").notNull(),
  recordId: varchar("record_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.recordId],
    foreignColumns: [jurisprudenceRecords.id],
  }).onDelete("restrict"),
]);

export const jurisprudencePublishedRecords = jurisprudencePublicSchema.table("published_records", {
  id: varchar("id").primaryKey(),
  recordVersion: integer("record_version").notNull(),
  slug: varchar("slug").unique(),
  title: varchar("title").notNull(),
  caseTitle: varchar("case_title").notNull(),
  caseNumber: varchar("case_number").notNull(),
  resolutionNumber: varchar("resolution_number"),
  resolutionType: varchar("resolution_type").notNull(),
  institutionName: varchar("institution_name").notNull(),
  issuingBody: varchar("issuing_body").notNull(),
  matter: varchar("matter").notNull(),
  issuedAt: date("issued_at").notNull(),
  summary: varchar("summary"),
  sourceName: varchar("source_name").notNull(),
  officialHtmlUrl: varchar("official_html_url"),
  officialPdfUrl: varchar("official_pdf_url"),
  normalizedSearchText: varchar("normalized_search_text").notNull(),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('spanish', normalized_search_text)`),
}, (table) => [
  check("published_record_version_positive", sql`${table.recordVersion} > 0`),
  index("published_records_case_idx").on(table.caseNumber),
  index("published_records_resolution_idx").on(table.resolutionNumber),
  index("published_records_issued_at_idx").on(table.issuedAt),
  index("published_records_fts_gin_idx").using("gin", table.searchVector)
]);

export const jurisprudencePublicationExecutions = jurisprudenceInternalSchema.table("jurisprudence_publication_executions", {
  executionId: varchar("execution_id").primaryKey(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  editorialCaseId: varchar("editorial_case_id").notNull(),
  publicationDossierId: varchar("publication_dossier_id").notNull(),
  authorizationCaseId: varchar("authorization_case_id").notNull(),
  projectionId: varchar("projection_id").notNull(),
  status: varchar("status", { enum: ["pending", "executed", "withdrawn", "superseded", "failed"] }).notNull(),
  version: integer("version").notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
  executedByReference: varchar("executed_by_reference").notNull(),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  withdrawalReason: varchar("withdrawal_reason", { enum: ["authorization_revoked", "record_corrected", "rights_reassessment_required", "privacy_reassessment_required", "institutional_withdrawal"] }),
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
  supersededByRecordVersion: integer("superseded_by_record_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publicationExecuted: boolean("publication_executed").notNull(),
  deployed: boolean("deployed").notNull(),
}, (table) => [
  check("publication_execution_version_positive", sql`${table.version} > 0`),
  check("publication_execution_record_version_positive", sql`${table.recordVersion} > 0`),
  check("publication_execution_deployed_false", sql`${table.deployed} = false`),
  foreignKey({
    columns: [table.recordId],
    foreignColumns: [jurisprudenceRecords.id],
  }).onDelete("restrict"),
  index("jurisprudence_pub_exec_record_version_idx").on(table.recordId, table.recordVersion),
  index("jurisprudence_pub_exec_status_idx").on(table.status),
]);

export const jurisprudencePublicationExecutionEvents = jurisprudenceInternalSchema.table("jurisprudence_publication_execution_events", {
  eventId: varchar("event_id").primaryKey(),
  executionId: varchar("execution_id").notNull(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  executionVersion: integer("execution_version").notNull(),
  sequence: integer("sequence").notNull(),
  type: varchar("type", { enum: ["publication_executed", "publication_withdrawn", "publication_execution_superseded"] }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  payloadJson: jsonb("payload_json").notNull(),
}, (table) => [
  check("pub_exec_event_record_version_positive", sql`${table.recordVersion} > 0`),
  check("pub_exec_event_exec_version_positive", sql`${table.executionVersion} > 0`),
  check("pub_exec_event_sequence_positive", sql`${table.sequence} > 0`),
  foreignKey({
    columns: [table.executionId],
    foreignColumns: [jurisprudencePublicationExecutions.executionId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.recordId],
    foreignColumns: [jurisprudenceRecords.id],
  }).onDelete("restrict"),
  unique("jurisprudence_pub_exec_events_seq_unique").on(table.executionId, table.sequence),
  index("jurisprudence_pub_exec_events_record_idx").on(table.recordId),
]);

export const jurisprudencePublicationIdempotency = jurisprudenceInternalSchema.table("jurisprudence_publication_idempotency", {
  idempotencyKey: varchar("idempotency_key").primaryKey(),
  commandFingerprint: varchar("command_fingerprint").notNull(),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jurisprudencePublicationOutbox = jurisprudenceInternalSchema.table("jurisprudence_publication_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: varchar("record_id").notNull().references(() => jurisprudenceRecords.id, { onDelete: 'restrict' }),
  recordVersion: integer("record_version").notNull(),
  executionId: varchar("execution_id").notNull().references(() => jurisprudencePublicationExecutions.executionId, { onDelete: 'restrict' }),
  executionVersion: integer("execution_version").notNull(),
  eventType: varchar("event_type", { enum: ["publish_projection", "withdraw_projection"] }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { enum: ["pending", "processing", "sent", "failed", "dead_letter"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastErrorCode: varchar("last_error_code"),
  recoveryOfOutboxId: uuid("recovery_of_outbox_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("attempts_positive", sql`${table.attempts} >= 0`),
  check("valid_event_type", sql`${table.eventType} IN ('publish_projection', 'withdraw_projection')`),
  check("valid_status", sql`${table.status} IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')`),
  index("jurisprudence_publication_outbox_status_available_idx").on(table.status, table.availableAt),
  index("jurisprudence_publication_outbox_record_idx").on(table.recordId, table.recordVersion),
  foreignKey({
    columns: [table.recoveryOfOutboxId],
    foreignColumns: [table.id],
  }).onDelete("restrict"),
  // Note: the unique partial index `jurisprudence_publication_outbox_recovery_unique` is created in raw SQL migration
  // because Drizzle unique().on() doesn't currently fully support WHERE clauses cleanly across all PG versions in the type system.
]);

export const jurisprudencePublicProjectionBarriers = jurisprudencePublicSchema.table("projection_barriers", {
  recordId: varchar("record_id").primaryKey(),
  recordVersion: integer("record_version").notNull(),
  executionVersion: integer("execution_version").notNull(),
  projectionState: varchar("projection_state", { enum: ["published", "withdrawn"] }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("projection_barrier_record_version_positive", sql`${table.recordVersion} > 0`),
  check("projection_barrier_execution_version_positive", sql`${table.executionVersion} > 0`),
  check("valid_projection_state", sql`${table.projectionState} IN ('published', 'withdrawn')`),
]);


export const jurisprudenceEditorialCases = jurisprudenceInternalSchema.table("jurisprudence_editorial_cases", {
  caseId: varchar("case_id").primaryKey(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  caseVersion: integer("case_version").notNull(),
  active: boolean("active").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("editorial_case_record_version_positive", sql`${table.recordVersion} > 0`),
  check("editorial_case_version_positive", sql`${table.caseVersion} > 0`),
  uniqueIndex("jurisprudence_editorial_cases_active_idx").on(table.recordId, table.recordVersion).where(sql`active = true`),
  foreignKey({
    columns: [table.recordId, table.recordVersion],
    foreignColumns: [jurisprudenceRecordVersions.recordId, jurisprudenceRecordVersions.version],
  }).onDelete("restrict"),
]);

export const jurisprudenceEditorialEvents = jurisprudenceInternalSchema.table("jurisprudence_editorial_events", {
  eventId: varchar("event_id").primaryKey(),
  caseId: varchar("case_id").notNull(),
  sequence: integer("sequence").notNull(),
  eventType: varchar("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
}, (table) => [
  check("editorial_event_sequence_positive", sql`${table.sequence} > 0`),
  foreignKey({
    columns: [table.caseId],
    foreignColumns: [jurisprudenceEditorialCases.caseId],
  }).onDelete("restrict"),
  unique("jurisprudence_editorial_events_seq_unique").on(table.caseId, table.sequence),
]);

export const jurisprudenceEditorialIdempotency = jurisprudenceInternalSchema.table("jurisprudence_editorial_idempotency", {
  idempotencyKey: varchar("idempotency_key").primaryKey(),
  commandFingerprint: varchar("command_fingerprint").notNull(),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jurisprudenceGovernedSources = jurisprudenceInternalSchema.table("jurisprudence_governed_sources", {
  sourceId: varchar("source_id").primaryKey(),
  payloadJson: jsonb("payload_json").notNull(),
});

export const jurisprudenceSourceBindings = jurisprudenceInternalSchema.table("jurisprudence_source_bindings", {
  bindingId: varchar("binding_id").primaryKey(),
  sourceId: varchar("source_id").notNull(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  bindingStatus: varchar("binding_status").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
}, (table) => [
  check("source_binding_record_version_positive", sql`${table.recordVersion} > 0`),
  foreignKey({
    columns: [table.sourceId],
    foreignColumns: [jurisprudenceGovernedSources.sourceId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.recordId, table.recordVersion],
    foreignColumns: [jurisprudenceRecordVersions.recordId, jurisprudenceRecordVersions.version],
  }).onDelete("restrict"),
  index("jurisprudence_source_bindings_source_id_idx").on(table.sourceId),
]);

export const jurisprudencePublicationDossiers = jurisprudenceInternalSchema.table("jurisprudence_publication_dossiers", {
  dossierId: varchar("dossier_id").primaryKey(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  dossierVersion: integer("dossier_version").notNull(),
  active: boolean("active").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("publication_dossier_record_version_positive", sql`${table.recordVersion} > 0`),
  check("publication_dossier_version_positive", sql`${table.dossierVersion} > 0`),
  uniqueIndex("jurisprudence_publication_dossiers_active_idx").on(table.recordId, table.recordVersion).where(sql`active = true`),
  foreignKey({
    columns: [table.recordId, table.recordVersion],
    foreignColumns: [jurisprudenceRecordVersions.recordId, jurisprudenceRecordVersions.version],
  }).onDelete("restrict"),
]);

export const jurisprudencePublicationDossierEvents = jurisprudenceInternalSchema.table("jurisprudence_publication_dossier_events", {
  eventId: varchar("event_id").primaryKey(),
  dossierId: varchar("dossier_id").notNull(),
  sequence: integer("sequence").notNull(),
  eventType: varchar("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
}, (table) => [
  check("dossier_event_sequence_positive", sql`${table.sequence} > 0`),
  foreignKey({
    columns: [table.dossierId],
    foreignColumns: [jurisprudencePublicationDossiers.dossierId],
  }).onDelete("restrict"),
  unique("jurisprudence_pub_dossier_events_seq_unique").on(table.dossierId, table.sequence),
]);

export const jurisprudencePublicationGovernanceIdempotency = jurisprudenceInternalSchema.table("jurisprudence_publication_governance_idempotency", {
  idempotencyKey: varchar("idempotency_key").primaryKey(),
  commandFingerprint: varchar("command_fingerprint").notNull(),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jurisprudencePublicationAuthorizationCases = jurisprudenceInternalSchema.table("jurisprudence_publication_authorization_cases", {
  authorizationCaseId: varchar("authorization_case_id").primaryKey(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  authorizationVersion: integer("authorization_version").notNull(),
  status: varchar("status").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
}, (table) => [
  check("auth_case_record_version_positive", sql`${table.recordVersion} > 0`),
  check("auth_case_version_positive", sql`${table.authorizationVersion} > 0`),
  foreignKey({
    columns: [table.recordId, table.recordVersion],
    foreignColumns: [jurisprudenceRecordVersions.recordId, jurisprudenceRecordVersions.version],
  }).onDelete("restrict"),
]);

export const jurisprudencePublicationAuthorizationEvents = jurisprudenceInternalSchema.table("jurisprudence_publication_authorization_events", {
  eventId: varchar("event_id").primaryKey(),
  authorizationCaseId: varchar("authorization_case_id").notNull(),
  sequence: integer("sequence").notNull(),
  eventType: varchar("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
}, (table) => [
  check("auth_event_sequence_positive", sql`${table.sequence} > 0`),
  foreignKey({
    columns: [table.authorizationCaseId],
    foreignColumns: [jurisprudencePublicationAuthorizationCases.authorizationCaseId],
  }).onDelete("restrict"),
  unique("jurisprudence_auth_events_seq_unique").on(table.authorizationCaseId, table.sequence),
]);

export const jurisprudencePublicationAuthorizationIdempotency = jurisprudenceInternalSchema.table("jurisprudence_publication_authorization_idempotency", {
  idempotencyKey: varchar("idempotency_key").primaryKey(),
  commandFingerprint: varchar("command_fingerprint").notNull(),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jurisprudencePublicProjections = jurisprudenceInternalSchema.table("jurisprudence_public_projections", {
  projectionId: varchar("projection_id").primaryKey(),
  executionId: varchar("execution_id").notNull(),
  recordId: varchar("record_id").notNull(),
  recordVersion: integer("record_version").notNull(),
  status: varchar("status").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
}, (table) => [
  check("public_projection_record_version_positive", sql`${table.recordVersion} > 0`),
  uniqueIndex("jurisprudence_public_projections_active_idx").on(table.recordId, table.recordVersion).where(sql`status = 'active_internal'`),
  foreignKey({
    columns: [table.executionId],
    foreignColumns: [jurisprudencePublicationExecutions.executionId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.recordId, table.recordVersion],
    foreignColumns: [jurisprudenceRecordVersions.recordId, jurisprudenceRecordVersions.version],
  }).onDelete("restrict"),
]);
