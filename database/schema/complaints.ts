import {
  pgSchema,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  jsonb,
  unique,
  check,
  index,
  foreignKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const complaintsPrivateSchema = pgSchema("complaints_private");

export const complaintSequences = complaintsPrivateSchema.table("complaint_sequences", {
  year: integer("year").primaryKey(),
  lastValue: integer("last_value").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("year_range", sql`${table.year} >= 2000 AND ${table.year} <= 2100`),
  check("last_value_positive", sql`${table.lastValue} >= 0`),
]);

export const complaints = complaintsPrivateSchema.table("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  schemaVersion: varchar("schema_version").notNull(),
  sheetYear: integer("sheet_year").notNull(),
  sheetSequence: integer("sheet_sequence").notNull(),
  sheetNumber: varchar("sheet_number").notNull().unique(),
  privateTokenHash: varchar("private_token_hash").notNull(),
  tokenHashKeyVersion: integer("token_hash_key_version").notNull(),
  idempotencyKeyHash: varchar("idempotency_key_hash").notNull().unique(),
  idempotencyHashKeyVersion: integer("idempotency_hash_key_version").notNull(),
  payloadHash: varchar("payload_hash").notNull(),
  status: varchar("status", { enum: ["received", "under_review", "awaiting_information", "answered", "closed"] }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  deadlineAt: date("deadline_at").notNull(),
  version: integer("version").notNull().default(1),
  payloadSnapshot: jsonb("payload_snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (table) => [
  unique("complaints_year_seq_idx").on(table.sheetYear, table.sheetSequence),
  check("token_hash_key_version_positive", sql`${table.tokenHashKeyVersion} > 0`),
  check("idempotency_hash_key_version_positive", sql`${table.idempotencyHashKeyVersion} > 0`),
  check("version_positive", sql`${table.version} > 0`),
]);

export const complaintStatusHistory = complaintsPrivateSchema.table("complaint_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").notNull().references(() => complaints.id, { onDelete: 'restrict' }),
  fromStatus: varchar("from_status", { enum: ["received", "under_review", "awaiting_information", "answered", "closed"] }),
  toStatus: varchar("to_status", { enum: ["received", "under_review", "awaiting_information", "answered", "closed"] }).notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  changedBy: varchar("changed_by").notNull(),
  reason: varchar("reason"),
  metadata: jsonb("metadata"),
}, (table) => [
  index("complaint_status_history_comp_changed_idx").on(table.complaintId, table.changedAt),
]);

export const complaintProviderResponses = complaintsPrivateSchema.table("complaint_provider_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").notNull().references(() => complaints.id, { onDelete: 'restrict' }),
  version: integer("version").notNull(),
  supersedesResponseId: uuid("supersedes_response_id"),
  correctionReason: varchar("correction_reason"),
  responseText: varchar("response_text"),
  actionsTaken: varchar("actions_taken"),
  respondedAt: timestamp("responded_at", { withTimezone: true }).notNull(),
  responseChannel: varchar("response_channel", { enum: ["email"] }).notNull(),
  responderName: varchar("responder_name").notNull(),
  responderRole: varchar("responder_role").notNull(),
  deliveryEvidenceReference: varchar("delivery_evidence_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("complaint_provider_responses_comp_ver_idx").on(table.complaintId, table.version),
  index("complaint_provider_responses_comp_created_idx").on(table.complaintId, table.createdAt),
  check("version_positive", sql`${table.version} > 0`),
  foreignKey({
    columns: [table.supersedesResponseId],
    foreignColumns: [table.id],
  }).onDelete("restrict"),
]);

export const complaintInternalNotes = complaintsPrivateSchema.table("complaint_internal_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").notNull().references(() => complaints.id, { onDelete: 'restrict' }),
  body: varchar("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: varchar("created_by").notNull(),
  supersedesNoteId: uuid("supersedes_note_id"),
  correctionReason: varchar("correction_reason"),
}, (table) => [
  index("complaint_internal_notes_comp_created_idx").on(table.complaintId, table.createdAt),
  check("body_not_empty", sql`length(trim(${table.body})) > 0`),
  foreignKey({
    columns: [table.supersedesNoteId],
    foreignColumns: [table.id],
  }).onDelete("restrict"),
]);

export const complaintOutbox = complaintsPrivateSchema.table("complaint_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").notNull().references(() => complaints.id, { onDelete: 'restrict' }),
  eventType: varchar("event_type", { enum: ["complaint_receipt_requested", "complaint_internal_notification_requested", "complaint_response_delivery_requested"] }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { enum: ["pending", "processing", "sent", "failed", "dead_letter"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastErrorCode: varchar("last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("attempts_positive", sql`${table.attempts} >= 0`),
  index("complaint_outbox_status_available_idx").on(table.status, table.availableAt),
]);

export const complaintAuditEvents = complaintsPrivateSchema.table("complaint_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").notNull().references(() => complaints.id, { onDelete: 'restrict' }),
  eventType: varchar("event_type", { enum: ["created", "status_changed", "response_created", "response_corrected", "receipt_generated", "notification_attempted", "notification_sent", "notification_failed", "exported", "viewed_by_staff"] }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: varchar("created_by").notNull(),
}, (table) => [
  index("complaint_audit_events_comp_created_idx").on(table.complaintId, table.createdAt),
]);
