import { ComplaintsPersistenceAdapter, CreateComplaintRepositoryInput, CreateComplaintPersistenceResult } from "./complaints.types";
import { createComplaintPersistenceError, SanitizedDatabaseConstraintError } from "./complaints.errors";
import { formatComplaintSheetNumber } from "@/lib/complaints/complaint-identifiers";
import { mapComplaintDomainToInsert, mapInitialComplaintStatusHistoryToInsert, mapComplaintReceiptOutboxToInsert, mapComplaintCreatedAuditEventToInsert, mapProviderResponseToInsert, mapAnsweredComplaintStatusHistoryToInsert, mapProviderResponseCreatedAuditEventToInsert, mapProviderResponseDeliveryOutboxToInsert, mapUnderReviewComplaintStatusHistoryToInsert, mapComplaintStatusChangedAuditEventToInsert, mapInformationRequestToInsert, mapAwaitingInformationComplaintStatusHistoryToInsert, mapInformationRequestedAuditEventToInsert } from "../mappers/complaints";
import { Clock, ComplaintsAdminPersistenceAdapter, IssueInitialProviderResponseInput, IssueInitialProviderResponseResult, StartComplaintReviewInput, StartComplaintReviewResult, RequestComplaintInformationInput, RequestComplaintInformationResult } from "./complaints.types";

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

export interface ComplaintsAdminRepository {
  issueInitialProviderResponse(input: IssueInitialProviderResponseInput): Promise<IssueInitialProviderResponseResult>;
  startComplaintReview(input: StartComplaintReviewInput): Promise<StartComplaintReviewResult>;
  requestComplaintInformation(input: RequestComplaintInformationInput): Promise<RequestComplaintInformationResult>;
}

export function createComplaintsAdminRepository(adapter: ComplaintsAdminPersistenceAdapter, clock: Clock): ComplaintsAdminRepository {
  return {
    async issueInitialProviderResponse(input: IssueInitialProviderResponseInput): Promise<IssueInitialProviderResponseResult> {
      if (input.expectedCurrentStatus !== "under_review" && input.expectedCurrentStatus !== "awaiting_information") {
        return { kind: "complaint_response_invalid_status" };
      }

      try {
        return await adapter.transaction(async (tx) => {
          const complaint = await tx.getComplaintForUpdate(input.complaintId);
          if (!complaint) {
            return { kind: "complaint_not_found" };
          }

          if (complaint.status !== input.expectedCurrentStatus) {
            return { kind: "complaint_stale_status" };
          }

          const exists = await tx.checkInitialResponseExists(input.complaintId);
          if (exists) {
            return { kind: "complaint_initial_response_already_exists" };
          }

          const responseInsert = mapProviderResponseToInsert({
            complaintId: input.complaintId,
            version: 1,
            responseText: input.responseText,
            actionsTaken: input.actionsTaken,
            respondedAt: input.respondedAt,
            responseChannel: input.responseChannel,
            responderName: input.responderName,
            responderRole: input.responderRole,
          });

          await tx.insertProviderResponse(responseInsert);

          const updatedRows = await tx.updateComplaintStatusToAnswered(input.complaintId, input.expectedCurrentStatus, clock.now());
          if (updatedRows === 0) {
            throw createComplaintPersistenceError("complaint_stale_status");
          }

          const historyInsert = mapAnsweredComplaintStatusHistoryToInsert({
            complaintId: input.complaintId,
            fromStatus: input.expectedCurrentStatus,
            changedBy: input.operatorId,
          });
          await tx.insertResponseStatusHistory(historyInsert);

          const auditInsert = mapProviderResponseCreatedAuditEventToInsert({
            complaintId: input.complaintId,
            createdBy: input.operatorId,
            metadata: { version: 1 },
          });
          await tx.insertResponseAuditEvent(auditInsert);

          const outboxInsert = mapProviderResponseDeliveryOutboxToInsert({
            complaintId: input.complaintId,
            version: 1,
          });
          await tx.insertResponseOutbox(outboxInsert);

          return { kind: "success" };
        });
      } catch (err) {
        if (err instanceof SanitizedDatabaseConstraintError && err.code === "23505" && err.constraint === "complaint_provider_responses_comp_ver_idx") {
          return { kind: "complaint_initial_response_already_exists" };
        }
        if (err instanceof SanitizedDatabaseConstraintError && err.code === "23503") {
          throw createComplaintPersistenceError("complaint_fk_violation");
        }
        if (err instanceof Error && err.name === "ComplaintPersistenceError") {
          throw err;
        }

        throw createComplaintPersistenceError("complaint_transaction_failed");
      }
    },
    async startComplaintReview(input: StartComplaintReviewInput): Promise<StartComplaintReviewResult> {
      if (input.expectedCurrentStatus !== "received") {
        return { kind: "complaint_stale_status" };
      }

      try {
        return await adapter.transaction(async (tx) => {
          const complaint = await tx.getComplaintForUpdate(input.complaintId);
          if (!complaint) {
            return { kind: "complaint_not_found" };
          }

          if (complaint.status !== input.expectedCurrentStatus) {
            return { kind: "complaint_stale_status" };
          }

          const updatedRows = await tx.updateComplaintStatusToUnderReview(input.complaintId, clock.now());
          if (updatedRows === 0) {
            throw createComplaintPersistenceError("complaint_stale_status");
          }

          const historyInsert = mapUnderReviewComplaintStatusHistoryToInsert({
            complaintId: input.complaintId,
            changedBy: input.operatorId,
          });
          await tx.insertResponseStatusHistory(historyInsert);

          const auditInsert = mapComplaintStatusChangedAuditEventToInsert({
            complaintId: input.complaintId,
            createdBy: input.operatorId,
            fromStatus: "received",
            toStatus: "under_review",
          });
          await tx.insertResponseAuditEvent(auditInsert);

          return { kind: "success" };
        });
      } catch (err) {
        if (err instanceof Error && err.name === "ComplaintPersistenceError") {
          throw err;
        }

        throw createComplaintPersistenceError("complaint_transaction_failed");
      }
    },
    async requestComplaintInformation(input: RequestComplaintInformationInput): Promise<RequestComplaintInformationResult> {
      if (input.expectedCurrentStatus !== "under_review") {
        return { kind: "complaint_stale_status" };
      }

      try {
        return await adapter.transaction(async (tx) => {
          const complaint = await tx.getComplaintForUpdate(input.complaintId);
          if (!complaint) {
            return { kind: "complaint_not_found" };
          }

          if (complaint.status !== input.expectedCurrentStatus) {
            return { kind: "complaint_stale_status" };
          }

          const hasOpenRequest = await tx.checkOpenInformationRequestExists(input.complaintId);
          if (hasOpenRequest) {
            return { kind: "complaint_open_information_request_exists" };
          }

          const nextSequence = await tx.getNextInformationRequestSequence(input.complaintId);

          const requestInsert = mapInformationRequestToInsert({
            complaintId: input.complaintId,
            requestSequence: nextSequence,
            requestText: input.requestText,
            requestedAt: clock.now(),
            requestedBy: input.operatorId,
          });

          await tx.insertInformationRequest(requestInsert);

          const updatedRows = await tx.updateComplaintStatusToAwaitingInformation(input.complaintId, clock.now());
          if (updatedRows === 0) {
            throw createComplaintPersistenceError("complaint_stale_status");
          }

          const historyInsert = mapAwaitingInformationComplaintStatusHistoryToInsert({
            complaintId: input.complaintId,
            changedBy: input.operatorId,
          });
          await tx.insertResponseStatusHistory(historyInsert);

          const auditInsert = mapInformationRequestedAuditEventToInsert({
            complaintId: input.complaintId,
            createdBy: input.operatorId,
          });
          await tx.insertResponseAuditEvent(auditInsert);

          return { kind: "success" };
        });
      } catch (err) {
        if (err instanceof SanitizedDatabaseConstraintError && err.code === "23505") {
          if (err.constraint === "complaint_information_requests_comp_open_idx") {
            return { kind: "complaint_open_information_request_exists" };
          }
          if (err.constraint === "complaint_information_requests_comp_seq_idx") {
            return { kind: "complaint_information_request_sequence_conflict" };
          }
        }
        if (err instanceof Error && err.name === "ComplaintPersistenceError") {
          throw err;
        }

        throw createComplaintPersistenceError("complaint_transaction_failed");
      }
    }
  };
}
