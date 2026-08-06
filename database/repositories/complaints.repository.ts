import { ComplaintsPersistenceAdapter, CreateComplaintRepositoryInput, CreateComplaintPersistenceResult } from "./complaints.types";
import { createComplaintPersistenceError, SanitizedDatabaseConstraintError } from "./complaints.errors";
import { mapComplaintDomainToInsert, mapInitialComplaintStatusHistoryToInsert, mapComplaintReceiptOutboxToInsert, mapComplaintCreatedAuditEventToInsert } from "../mappers/complaints";
import { formatComplaintSheetNumber } from "@/lib/complaints/complaint-identifiers";

export interface ComplaintsRepository {
  createComplaint(input: CreateComplaintRepositoryInput): Promise<CreateComplaintPersistenceResult>;
}



export function createComplaintsRepository(adapter: ComplaintsPersistenceAdapter): ComplaintsRepository {
  return {
    async createComplaint(input: CreateComplaintRepositoryInput): Promise<CreateComplaintPersistenceResult> {
      const existing = await adapter.findByIdempotencyDigest(input.idempotencyKeyHash, input.idempotencyHashKeyVersion);
      if (existing) {
        return {
          kind: "already_exists",
          complaintId: existing.id,
          sheetNumber: existing.sheetNumber,
          status: existing.status,
          submittedAt: existing.submittedAt,
          deadlineAt: existing.deadlineAt,
        };
      }

      try {
        const created = await adapter.transaction(async (tx) => {
          const seq = await tx.reserveAnnualSequence(input.sheetYear);

          if (typeof seq !== "number" || !Number.isInteger(seq) || seq <= 0 || seq >= 1000000) {
            throw createComplaintPersistenceError("complaint_sequence_exhausted");
          }

          const sheetNumber = formatComplaintSheetNumber({ year: input.sheetYear, sequence: seq });

          const complaintInsert = mapComplaintDomainToInsert({
            payloadSnapshot: input.payloadSnapshot,
            payloadHash: input.payloadHash,
            privateTokenHash: input.privateTokenHash,
            tokenHashKeyVersion: input.tokenHashKeyVersion,
            idempotencyKeyHash: input.idempotencyKeyHash,
            idempotencyHashKeyVersion: input.idempotencyHashKeyVersion,
            sheetYear: input.sheetYear,
            sheetSequence: seq,
            sheetNumber: sheetNumber,
            deadlineAt: input.deadlineAt,
            submittedAt: input.submittedAt,
          });

          const summary = await tx.insertComplaint(complaintInsert);

          const historyInsert = mapInitialComplaintStatusHistoryToInsert({
            complaintId: summary.id,
            changedBy: "system",
          });
          await tx.insertInitialStatusHistory(historyInsert);

          const auditInsert = mapComplaintCreatedAuditEventToInsert({
            complaintId: summary.id,
            createdBy: "system",
          });
          await tx.insertCreatedAuditEvent(auditInsert);

          const consumerObj = input.payloadSnapshot.consumer as Record<string, unknown> | undefined;
          let email = "";
          if (consumerObj && typeof consumerObj.email === "string") {
            email = consumerObj.email;
          }

          const outboxInsert = mapComplaintReceiptOutboxToInsert({
            complaintId: summary.id,
            email: email,
          });
          await tx.insertReceiptOutbox(outboxInsert);

          return {
            kind: "created" as const,
            complaintId: summary.id,
            sheetNumber: summary.sheetNumber,
            status: "received" as const,
            submittedAt: input.submittedAt,
            deadlineAt: input.deadlineAt,
          };
        });

        return created;
      } catch (err) {
        if (err instanceof SanitizedDatabaseConstraintError && err.code === "23505" && err.constraint === "complaints_idempotency_key_hash_unique") {
          const recovered = await adapter.findByIdempotencyDigest(input.idempotencyKeyHash, input.idempotencyHashKeyVersion);
          if (recovered) {
            return {
              kind: "already_exists",
              complaintId: recovered.id,
              sheetNumber: recovered.sheetNumber,
              status: recovered.status,
              submittedAt: recovered.submittedAt,
              deadlineAt: recovered.deadlineAt,
            };
          }
          throw createComplaintPersistenceError("complaint_existing_record_incomplete");
        }

        if (err instanceof Error && err.name === "ComplaintPersistenceError") {
          throw err;
        }

        throw createComplaintPersistenceError("complaint_transaction_failed");
      }
    }
  };
}
