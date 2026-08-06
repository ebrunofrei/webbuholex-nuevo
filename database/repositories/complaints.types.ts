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

import type { complaints, complaintStatusHistory, complaintOutbox, complaintAuditEvents } from "../schema/complaints";

export type ComplaintInsertInput = typeof complaints.$inferInsert;
export type ComplaintStatusHistoryInsertInput = typeof complaintStatusHistory.$inferInsert;
export type ComplaintAuditInsertInput = typeof complaintAuditEvents.$inferInsert;
export type ComplaintOutboxInsertInput = typeof complaintOutbox.$inferInsert;

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
