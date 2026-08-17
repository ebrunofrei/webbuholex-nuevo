import {
  pgSchema,
  varchar,
  integer,
  timestamp,
  date,
  jsonb,
  customType,
  index,
  unique,
  foreignKey,
  check
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
  normalizedResolutionNumber: varchar("normalized_resolution_number").notNull(),
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
  resolutionNumber: varchar("resolution_number").notNull(),
  resolutionType: varchar("resolution_type").notNull(),
  institutionName: varchar("institution_name").notNull(),
  issuingBody: varchar("issuing_body").notNull(),
  matter: varchar("matter").notNull(),
  issuedAt: date("issued_at").notNull(),
  summary: varchar("summary"),
  sourceName: varchar("source_name").notNull(),
  normalizedSearchText: varchar("normalized_search_text").notNull(),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('spanish', normalized_search_text)`),
}, (table) => [
  check("published_record_version_positive", sql`${table.recordVersion} > 0`),
  index("published_records_case_idx").on(table.caseNumber),
  index("published_records_resolution_idx").on(table.resolutionNumber),
  index("published_records_issued_at_idx").on(table.issuedAt),
  index("published_records_fts_gin_idx").using("gin", table.searchVector)
]);
