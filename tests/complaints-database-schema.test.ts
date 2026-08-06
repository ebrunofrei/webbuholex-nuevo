import { describe, expect, it } from "vitest";
import {
  complaintsPrivateSchema,
  complaints,
  complaintSequences,
  complaintStatusHistory,
  complaintProviderResponses,
  complaintInternalNotes,
  complaintOutbox,
  complaintAuditEvents
} from "../database/schema/complaints";

describe("Complaints Database Schema", () => {
  it("should define schema 'complaints_private'", () => {
    expect(complaintsPrivateSchema.schemaName).toBe("complaints_private");
  });

  it("should define all exactly 7 required tables", () => {
    expect(complaints).toBeDefined();
    expect(complaintSequences).toBeDefined();
    expect(complaintStatusHistory).toBeDefined();
    expect(complaintProviderResponses).toBeDefined();
    expect(complaintInternalNotes).toBeDefined();
    expect(complaintOutbox).toBeDefined();
    expect(complaintAuditEvents).toBeDefined();
  });

  describe("Table: complaints", () => {
    it("should have correct essential columns", () => {
      const cols = complaints;
      expect(cols.id).toBeDefined();
      expect(cols.schemaVersion).toBeDefined();
      expect(cols.sheetYear).toBeDefined();
      expect(cols.sheetSequence).toBeDefined();
      expect(cols.sheetNumber).toBeDefined();
      expect(cols.privateTokenHash).toBeDefined();
      expect(cols.tokenHashKeyVersion).toBeDefined();
      expect(cols.idempotencyKeyHash).toBeDefined();
      expect(cols.idempotencyHashKeyVersion).toBeDefined();
      expect(cols.payloadHash).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.submittedAt).toBeDefined();
      expect(cols.deadlineAt).toBeDefined();
      expect(cols.version).toBeDefined();
      expect(cols.payloadSnapshot).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
      expect(cols.closedAt).toBeDefined();

      expect(cols.deadlineAt.columnType).toBe("PgDateString");
      expect(cols.submittedAt.columnType).toBe("PgTimestamp");
      expect(cols.payloadSnapshot.columnType).toBe("PgJsonb");
    });
  });

  describe("Table: complaint_provider_responses", () => {
    it("should have correct essential columns including supersedes and correction reason", () => {
      const cols = complaintProviderResponses;
      expect(cols.id).toBeDefined();
      expect(cols.complaintId).toBeDefined();
      expect(cols.version).toBeDefined();
      expect(cols.supersedesResponseId).toBeDefined();
      expect(cols.correctionReason).toBeDefined();
      expect(cols.responseText).toBeDefined();
      expect(cols.actionsTaken).toBeDefined();
      expect(cols.respondedAt).toBeDefined();
      expect(cols.responseChannel).toBeDefined();
      expect(cols.responderName).toBeDefined();
      expect(cols.responderRole).toBeDefined();
      expect(cols.deliveryEvidenceReference).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });
  });

  describe("Table: complaint_outbox", () => {
    it("should define complete outbox", () => {
      const cols = complaintOutbox;
      expect(cols.id).toBeDefined();
      expect(cols.complaintId).toBeDefined();
      expect(cols.eventType).toBeDefined();
      expect(cols.payload).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.attempts).toBeDefined();
      expect(cols.availableAt).toBeDefined();
      expect(cols.processingStartedAt).toBeDefined();
      expect(cols.processedAt).toBeDefined();
      expect(cols.lastErrorCode).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
      expect(cols.payload.columnType).toBe("PgJsonb");
    });
  });

  describe("Table: complaint_internal_notes", () => {
    it("should have correction fields", () => {
      const cols = complaintInternalNotes;
      expect(cols.supersedesNoteId).toBeDefined();
      expect(cols.correctionReason).toBeDefined();
      expect(cols.body).toBeDefined();
      expect(cols.createdBy).toBeDefined();
    });
  });
});
