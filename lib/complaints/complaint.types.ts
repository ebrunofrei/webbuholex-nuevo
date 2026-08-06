import { z } from "zod";
import { ComplaintSubmissionSchema, ComplaintProviderResponseSchema } from "./complaint.schemas";
import { COMPLAINT_STATUSES } from "./complaint.constants";
import { PublicError } from "./complaint.errors";

export type NormalizedComplaintSubmission = z.infer<typeof ComplaintSubmissionSchema>;
export type ComplaintProviderResponse = z.infer<typeof ComplaintProviderResponseSchema>;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export type ComplaintSheetNumber = `LR-${string}-${string}`;
export type ComplaintPrivateToken = string;

export interface ComplaintRecord {
  id: string;
  schemaVersion: "1.0";
  sheetNumber: ComplaintSheetNumber;
  privateTokenHash: string; // Token secreto, solo su hash
  consumer: NormalizedComplaintSubmission["consumer"];
  subject: NormalizedComplaintSubmission["subject"];
  complaint: NormalizedComplaintSubmission["complaint"];
  status: ComplaintStatus;
  submittedAt: string;
  deadlineAt: string;
  responseChannel: NormalizedComplaintSubmission["confirmation"]["emailDeliveryRequested"] extends true ? "email" : "email" | "other";
  providerResponse?: ComplaintProviderResponse;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintReceipt {
  provider: {
    legalName: string;
    ruc: string;
    address: string;
  };
  sheetNumber: ComplaintSheetNumber;
  submittedAt: string;
  complaintKind: NormalizedComplaintSubmission["complaint"]["kind"];
  subjectSummary: string;
  facts: string;
  requestedResolution: string;
  consumerSummary: string;
  responseChannel: string;
  deadlineNotice: string;
  privacyNotice: string;
  contact: string;
}

export type BuildComplaintResult =
  | { ok: true; value: NormalizedComplaintSubmission }
  | { ok: false; error: PublicError };
