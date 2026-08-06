import { ComplaintSubmissionSchema } from "./complaint.schemas";
import { BuildComplaintResult } from "./complaint.types";
import { COMPLAINT_VALIDATION_FAILED } from "./complaint.errors";
import {
  normalizeComplaintText,
  normalizePersonName,
  normalizeEmail,
  normalizePhone,
  normalizeDocumentNumber,
} from "./complaint.normalization";

export function buildComplaintSubmission(input: unknown): BuildComplaintResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: COMPLAINT_VALIDATION_FAILED };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = input as any;

  // Clone to avoid mutating input
  const normalized = {
    ...raw,
    consumer: raw.consumer ? {
      ...raw.consumer,
      firstNames: raw.consumer.firstNames ? normalizePersonName(raw.consumer.firstNames) : undefined,
      lastNames: raw.consumer.lastNames ? normalizePersonName(raw.consumer.lastNames) : undefined,
      documentNumber: raw.consumer.documentNumber ? normalizeDocumentNumber(raw.consumer.documentNumber) : undefined,
      email: raw.consumer.email ? normalizeEmail(raw.consumer.email) : undefined,
      phone: raw.consumer.phone ? normalizePhone(raw.consumer.phone) : undefined,
      legalName: raw.consumer.legalName ? normalizePersonName(raw.consumer.legalName) : undefined,
      representativeFirstNames: raw.consumer.representativeFirstNames ? normalizePersonName(raw.consumer.representativeFirstNames) : undefined,
      representativeLastNames: raw.consumer.representativeLastNames ? normalizePersonName(raw.consumer.representativeLastNames) : undefined,
      representativeDocumentNumber: raw.consumer.representativeDocumentNumber ? normalizeDocumentNumber(raw.consumer.representativeDocumentNumber) : undefined,
      representative: raw.consumer.representative ? {
        ...raw.consumer.representative,
        firstNames: raw.consumer.representative.firstNames ? normalizePersonName(raw.consumer.representative.firstNames) : undefined,
        lastNames: raw.consumer.representative.lastNames ? normalizePersonName(raw.consumer.representative.lastNames) : undefined,
        documentNumber: raw.consumer.representative.documentNumber ? normalizeDocumentNumber(raw.consumer.representative.documentNumber) : undefined,
      } : undefined,
    } : undefined,
    subject: raw.subject ? {
      ...raw.subject,
      description: raw.subject.description ? normalizeComplaintText(raw.subject.description) : undefined,
    } : undefined,
    complaint: raw.complaint ? {
      ...raw.complaint,
      facts: raw.complaint.facts ? normalizeComplaintText(raw.complaint.facts) : undefined,
      requestedResolution: raw.complaint.requestedResolution ? normalizeComplaintText(raw.complaint.requestedResolution) : undefined,
    } : undefined,
  };

  const parsed = ComplaintSubmissionSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: COMPLAINT_VALIDATION_FAILED };
  }

  return { ok: true, value: parsed.data };
}
