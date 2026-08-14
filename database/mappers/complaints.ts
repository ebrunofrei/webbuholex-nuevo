import { complaints, complaintStatusHistory, complaintOutbox, complaintAuditEvents, complaintProviderResponses } from "../schema/complaints";

export interface ComplaintPayloadSnapshotV1 {
  readonly schemaVersion: "1.0";
  readonly consumer: unknown;
  readonly subject: unknown;
  readonly complaint: unknown;
  readonly confirmation: unknown;
}

export function createComplaintPayloadSnapshot(
  normalized: Record<string, unknown>
): ComplaintPayloadSnapshotV1 {
  validateSnapshotRoot(normalized);

  return {
    schemaVersion: "1.0",
    consumer: buildConsumer(normalized.consumer),
    subject: buildSubject(normalized.subject),
    complaint: buildComplaint(normalized.complaint),
    confirmation: buildConfirmation(normalized.confirmation),
  };
}

function buildConsumer(input: unknown): unknown {
  const obj = validateAndCastObject(input);
  const result: Record<string, unknown> = {};

  copyProp(obj, result, "consumerType");
  copyProp(obj, result, "firstNames");
  copyProp(obj, result, "lastNames");
  copyProp(obj, result, "documentType");
  copyProp(obj, result, "documentNumber");
  copyProp(obj, result, "email");
  copyProp(obj, result, "phone");
  copyProp(obj, result, "address");
  copyProp(obj, result, "isMinor");

  if (Object.prototype.hasOwnProperty.call(obj, "representative") && obj.representative !== undefined) {
    if (obj.representative === null) {
      result.representative = null;
    } else {
      const repObj = validateAndCastObject(obj.representative);
      const repResult: Record<string, unknown> = {};
      copyProp(repObj, repResult, "firstNames");
      copyProp(repObj, repResult, "lastNames");
      copyProp(repObj, repResult, "documentType");
      copyProp(repObj, repResult, "documentNumber");
      copyProp(repObj, repResult, "relationship");
      result.representative = repResult;
    }
  }

  copyProp(obj, result, "legalName");
  copyProp(obj, result, "ruc");
  copyProp(obj, result, "representativeFirstNames");
  copyProp(obj, result, "representativeLastNames");
  copyProp(obj, result, "representativeDocumentType");
  copyProp(obj, result, "representativeDocumentNumber");
  copyProp(obj, result, "representativeRole");

  return result;
}

function buildSubject(input: unknown): unknown {
  const obj = validateAndCastObject(input);
  const result: Record<string, unknown> = {};

  copyProp(obj, result, "kind");
  copyProp(obj, result, "description");
  copyProp(obj, result, "amountApplicability");
  copyProp(obj, result, "amount");
  copyProp(obj, result, "currency");
  copyProp(obj, result, "transactionDate");
  copyProp(obj, result, "referenceNumber");
  copyProp(obj, result, "channel");

  return result;
}

function buildComplaint(input: unknown): unknown {
  const obj = validateAndCastObject(input);
  const result: Record<string, unknown> = {};

  copyProp(obj, result, "kind");
  copyProp(obj, result, "facts");
  copyProp(obj, result, "requestedResolution");

  return result;
}

function buildConfirmation(input: unknown): unknown {
  const obj = validateAndCastObject(input);
  const result: Record<string, unknown> = {};

  copyProp(obj, result, "truthfulnessConfirmed");
  copyProp(obj, result, "submissionConfirmed");
  copyProp(obj, result, "emailDeliveryRequested");

  return result;
}

function copyProp(source: Record<string, unknown>, target: Record<string, unknown>, key: string) {
  const desc = Object.getOwnPropertyDescriptor(source, key);
  if (!desc) return;
  if (desc.get || desc.set) throw new Error("complaint_mapper_input_invalid");

  if (desc.value !== undefined) {
    target[key] = desc.value;
  }
}

function validateAndCastObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("complaint_mapper_input_invalid");
  }

  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype) {
    throw new Error("complaint_mapper_input_invalid");
  }

  if (Object.prototype.hasOwnProperty.call(input, "toJSON")) {
    throw new Error("complaint_mapper_input_invalid");
  }

  return input as Record<string, unknown>;
}

function validateSnapshotRoot(input: Record<string, unknown>) {
  validateAndCastObject(input);
}

export interface MapComplaintDomainToInsertInput {
  readonly payloadSnapshot: ComplaintPayloadSnapshotV1;
  readonly payloadHash: string;

  readonly privateTokenHash: string;
  readonly tokenHashKeyVersion: number;

  readonly idempotencyKeyHash: string;
  readonly idempotencyHashKeyVersion: number;

  readonly sheetYear: number;
  readonly sheetSequence: number;
  readonly sheetNumber: string;

  readonly deadlineAt: (typeof complaints.$inferInsert)["deadlineAt"];
  readonly submittedAt: (typeof complaints.$inferInsert)["submittedAt"];
}

export function mapComplaintDomainToInsert(
  input: MapComplaintDomainToInsertInput
): typeof complaints.$inferInsert {
  validateMapComplaintDomainToInsertInput(input as unknown as Record<string, unknown>);

  return {
    schemaVersion: input.payloadSnapshot.schemaVersion,
    sheetYear: input.sheetYear,
    sheetSequence: input.sheetSequence,
    sheetNumber: input.sheetNumber,
    privateTokenHash: input.privateTokenHash,
    tokenHashKeyVersion: input.tokenHashKeyVersion,
    idempotencyKeyHash: input.idempotencyKeyHash,
    idempotencyHashKeyVersion: input.idempotencyHashKeyVersion,
    payloadHash: input.payloadHash,
    status: "received",
    submittedAt: input.submittedAt,
    deadlineAt: input.deadlineAt,
    version: 1,
    payloadSnapshot: input.payloadSnapshot,
  };
}

function validateMapComplaintDomainToInsertInput(input: Record<string, unknown>) {
  const allowedKeys = [
    "payloadSnapshot", "payloadHash", "privateTokenHash", "tokenHashKeyVersion",
    "idempotencyKeyHash", "idempotencyHashKeyVersion", "sheetYear", "sheetSequence",
    "sheetNumber", "deadlineAt", "submittedAt"
  ];

  for (const key of Object.keys(input)) {
    if (!allowedKeys.includes(key)) {
      throw new Error("complaint_mapper_input_invalid");
    }
  }

  const hashRegex = /^[0-9a-f]{64}$/;
  if (typeof input.payloadHash !== "string" || !hashRegex.test(input.payloadHash)) throw new Error("complaint_mapper_input_invalid");
  if (typeof input.privateTokenHash !== "string" || !hashRegex.test(input.privateTokenHash)) throw new Error("complaint_mapper_input_invalid");
  if (typeof input.idempotencyKeyHash !== "string" || !hashRegex.test(input.idempotencyKeyHash)) throw new Error("complaint_mapper_input_invalid");

  if (typeof input.tokenHashKeyVersion !== "number" || !Number.isInteger(input.tokenHashKeyVersion) || input.tokenHashKeyVersion <= 0) {
    throw new Error("complaint_mapper_input_invalid");
  }
  if (typeof input.idempotencyHashKeyVersion !== "number" || !Number.isInteger(input.idempotencyHashKeyVersion) || input.idempotencyHashKeyVersion <= 0) {
    throw new Error("complaint_mapper_input_invalid");
  }

  if (typeof input.sheetYear !== "number" || !Number.isInteger(input.sheetYear) || input.sheetYear < 2000 || input.sheetYear > 2100) {
    throw new Error("complaint_mapper_input_invalid");
  }
  if (typeof input.sheetSequence !== "number" || !Number.isInteger(input.sheetSequence) || input.sheetSequence <= 0) {
    throw new Error("complaint_mapper_input_invalid");
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof input.deadlineAt !== "string" || !dateRegex.test(input.deadlineAt)) {
    throw new Error("complaint_mapper_input_invalid");
  }

  if (!(input.submittedAt instanceof Date) || isNaN(input.submittedAt.getTime())) {
    throw new Error("complaint_mapper_input_invalid");
  }
}

export function mapInitialComplaintStatusHistoryToInsert(input: {
  readonly complaintId: string;
  readonly changedBy: string;
}): typeof complaintStatusHistory.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "changedBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    fromStatus: null,
    toStatus: "received",
    changedBy: input.changedBy,
  };
}

export function mapComplaintReceiptOutboxToInsert(input: {
  readonly complaintId: string;
  readonly email: string;
}): typeof complaintOutbox.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "email"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "complaint_receipt_requested",
    payload: { email: input.email },
    status: "pending",
  };
}

export function mapComplaintCreatedAuditEventToInsert(input: {
  readonly complaintId: string;
  readonly createdBy: string;
}): typeof complaintAuditEvents.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "createdBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "created",
    createdBy: input.createdBy,
    metadata: { snapshotVersion: "1.0" },
  };
}

export interface ProviderResponseIssuePlanInsert {
  readonly complaintId: string;
  readonly version: number;
  readonly responseText: string;
  readonly actionsTaken: string | null;
  readonly respondedAt: Date;
  readonly responseChannel: "email";
  readonly responderName: string;
  readonly responderRole: string;
}

export function mapProviderResponseToInsert(
  input: ProviderResponseIssuePlanInsert
): typeof complaintProviderResponses.$inferInsert {
  const allowedKeys = ["complaintId", "version", "responseText", "actionsTaken", "respondedAt", "responseChannel", "responderName", "responderRole"];
  if (Object.keys(input).some(k => !allowedKeys.includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    version: input.version,
    responseText: input.responseText,
    actionsTaken: input.actionsTaken,
    respondedAt: input.respondedAt,
    responseChannel: input.responseChannel,
    responderName: input.responderName,
    responderRole: input.responderRole,
  };
}

export function mapAnsweredComplaintStatusHistoryToInsert(input: {
  readonly complaintId: string;
  readonly fromStatus: "under_review" | "awaiting_information";
  readonly changedBy: string;
}): typeof complaintStatusHistory.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "fromStatus", "changedBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    fromStatus: input.fromStatus,
    toStatus: "answered",
    changedBy: input.changedBy,
  };
}

export function mapProviderResponseCreatedAuditEventToInsert(input: {
  readonly complaintId: string;
  readonly createdBy: string;
  readonly metadata: Record<string, unknown>;
}): typeof complaintAuditEvents.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "createdBy", "metadata"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "response_created",
    createdBy: input.createdBy,
    metadata: input.metadata,
  };
}

export function mapProviderResponseDeliveryOutboxToInsert(input: {
  readonly complaintId: string;
  readonly version: number;
}): typeof complaintOutbox.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "version"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "complaint_response_delivery_requested",
    payload: { complaintId: input.complaintId, version: input.version },
    status: "pending",
  };
}

export function mapUnderReviewComplaintStatusHistoryToInsert(input: {
  readonly complaintId: string;
  readonly changedBy: string;
}): typeof complaintStatusHistory.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "changedBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    fromStatus: "received",
    toStatus: "under_review",
    changedBy: input.changedBy,
  };
}

export function mapComplaintStatusChangedAuditEventToInsert(input: {
  readonly complaintId: string;
  readonly createdBy: string;
  readonly fromStatus: string;
  readonly toStatus: string;
}): typeof complaintAuditEvents.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "createdBy", "fromStatus", "toStatus"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "status_changed",
    createdBy: input.createdBy,
    metadata: { fromStatus: input.fromStatus, toStatus: input.toStatus },
  };
}
