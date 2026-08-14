import type { ComplaintStatus } from "@/lib/complaints/complaint.types";
import type { ComplaintPayloadSnapshotV1 } from "../mappers/complaints";

export interface Clock {
  now(): Date;
}

export interface VersionedHmacSecret {
  readonly version: number;
  readonly secret: string;
}

export type CreateComplaintPersistenceResult =
  | {
      readonly kind: "created";
      readonly complaintId: string;
      readonly sheetNumber: string;
      readonly status: "received";
      readonly submittedAt: Date;
      readonly deadlineAt: string;
    }
  | {
      readonly kind: "already_exists";
      readonly complaintId: string;
      readonly sheetNumber: string;
      readonly status: ComplaintStatus;
      readonly submittedAt: Date;
      readonly deadlineAt: string;
    };

export type CreateComplaintResult =
  | {
      readonly kind: "created";
      readonly complaintId: string;
      readonly sheetNumber: string;
      readonly status: "received";
      readonly submittedAt: Date;
      readonly deadlineAt: string;
      readonly privateToken: string;
    }
  | {
      readonly kind: "already_exists";
      readonly complaintId: string;
      readonly sheetNumber: string;
      readonly status: ComplaintStatus;
      readonly submittedAt: Date;
      readonly deadlineAt: string;
    };

import type { complaints, complaintStatusHistory, complaintOutbox, complaintAuditEvents, complaintProviderResponses, complaintInformationRequests } from "../schema/complaints";

export type ComplaintInsertInput = typeof complaints.$inferInsert;
export type ComplaintStatusHistoryInsertInput = typeof complaintStatusHistory.$inferInsert;
export type ComplaintAuditInsertInput = typeof complaintAuditEvents.$inferInsert;
export type ComplaintOutboxInsertInput = typeof complaintOutbox.$inferInsert;
export type ComplaintProviderResponseInsertInput = typeof complaintProviderResponses.$inferInsert;
export type ComplaintInformationRequestInsertInput = typeof complaintInformationRequests.$inferInsert;

export interface InsertedComplaintSummary {
  readonly id: string;
  readonly sheetNumber: string;
}



export interface ExistingComplaintSummary {
  readonly id: string;
  readonly sheetNumber: string;
  readonly status: ComplaintStatus;
  readonly submittedAt: Date;
  readonly deadlineAt: string;
}

export interface ComplaintTransactionExecutor {
  reserveAnnualSequence(year: number): Promise<number>;
  insertComplaint(input: ComplaintInsertInput): Promise<InsertedComplaintSummary>;
  insertInitialStatusHistory(input: ComplaintStatusHistoryInsertInput): Promise<void>;
  insertCreatedAuditEvent(input: ComplaintAuditInsertInput): Promise<void>;
  insertReceiptOutbox(input: ComplaintOutboxInsertInput): Promise<void>;
}

export interface ComplaintsPersistenceAdapter {
  findByIdempotencyDigest(
    digest: string,
    keyVersion: number
  ): Promise<ExistingComplaintSummary | null>;

  transaction<T>(operation: (tx: ComplaintTransactionExecutor) => Promise<T>): Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ComplaintsOutboxWorkerPersistenceAdapter {
  // Interface segregated for Worker boundary.
  // Currently empty as no outbox processing methods are implemented yet.
  // Future methods must respect the SELECT and UPDATE (limited) capabilities on complaint_outbox.
}

export interface CreateComplaintRepositoryInput {
  readonly payloadSnapshot: ComplaintPayloadSnapshotV1;
  readonly payloadHash: string;
  readonly privateTokenHash: string;
  readonly tokenHashKeyVersion: number;
  readonly idempotencyKeyHash: string;
  readonly idempotencyHashKeyVersion: number;
  readonly sheetYear: number;
  readonly submittedAt: Date;
  readonly deadlineAt: string;
}

export interface IssueInitialProviderResponseInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "under_review" | "awaiting_information";
  readonly responseText: string;
  readonly actionsTaken: string | null;
  readonly respondedAt: Date;
  readonly responseChannel: "email";
  readonly responderName: string;
  readonly responderRole: string;
  readonly operatorId: string;
}

export type IssueInitialProviderResponseResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" }
  | { readonly kind: "complaint_response_invalid_status" }
  | { readonly kind: "complaint_initial_response_already_exists" };

export interface StartComplaintReviewInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "received";
  readonly operatorId: string;
}

export type StartComplaintReviewResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" };

export interface RequestComplaintInformationInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "under_review";
  readonly requestText: string;
  readonly operatorId: string;
}

export type RequestComplaintInformationResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" }
  | { readonly kind: "complaint_open_information_request_exists" }
  | { readonly kind: "complaint_information_request_sequence_conflict" };

export interface ComplaintAdminTransactionExecutor {
  getComplaintForUpdate(complaintId: string): Promise<{ id: string; status: ComplaintStatus } | null>;
  checkInitialResponseExists(complaintId: string): Promise<boolean>;
  checkOpenInformationRequestExists(complaintId: string): Promise<boolean>;
  getNextInformationRequestSequence(complaintId: string): Promise<number>;
  insertProviderResponse(input: ComplaintProviderResponseInsertInput): Promise<void>;
  insertInformationRequest(input: ComplaintInformationRequestInsertInput): Promise<void>;
  updateComplaintStatusToAnswered(complaintId: string, expectedStatus: ComplaintStatus, updatedAt: Date): Promise<number>;
  updateComplaintStatusToUnderReview(complaintId: string, updatedAt: Date): Promise<number>;
  updateComplaintStatusToAwaitingInformation(complaintId: string, updatedAt: Date): Promise<number>;
  insertResponseStatusHistory(input: ComplaintStatusHistoryInsertInput): Promise<void>;
  insertResponseAuditEvent(input: ComplaintAuditInsertInput): Promise<void>;
  insertResponseOutbox(input: ComplaintOutboxInsertInput): Promise<void>;
}

export interface ComplaintsAdminPersistenceAdapter {
  transaction<T>(operation: (tx: ComplaintAdminTransactionExecutor) => Promise<T>): Promise<T>;
}
