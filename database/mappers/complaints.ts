import { complaints, complaintStatusHistory, complaintOutbox, complaintAuditEvents, complaintProviderResponses, complaintInformationRequests } from "../schema/complaints";

export interface ComplaintPayloadSnapshotV1 {
  readonly schemaVersion: "1.0";
  readonly consumer: unknown;
  readonly subject: unknown;
  readonly complaint: unknown;
  readonly confirmation: unknown;
}

export interface ComplaintPayloadSnapshotV2 {
  readonly schemaVersion: "2.0";
  readonly consumer: unknown;
  readonly subject: unknown;
  readonly complaint: unknown;
  readonly declarations: {
    readonly truthfulnessConfirmed: true;
    readonly emailDeliveryRequested: boolean;
  };
  readonly legalContext: {
    readonly privacyNoticePresented: true;
    readonly privacyPolicyVersion: string;
    readonly privacyPolicyPublishedAt: string | null;
    readonly privacyPolicyEffectiveAt: string | null;
    readonly privacyPolicyPath: "/privacidad";
  };
}

export type ComplaintPayloadSnapshot = ComplaintPayloadSnapshotV1 | ComplaintPayloadSnapshotV2;

export interface LegalContextInputV2 {
  readonly privacyPolicyVersion: string;
  readonly privacyPolicyPublishedAt: string | null;
  readonly privacyPolicyEffectiveAt: string | null;
  readonly privacyPolicyPath: "/privacidad";
}

export function createComplaintPayloadSnapshot(
  normalized: unknown,
  legalContext?: LegalContextInputV2
): ComplaintPayloadSnapshot {
  assertPlainObject(normalized);

  const schemaVersion = normalized.schemaVersion;
  if (schemaVersion === "2.0" || ("declarations" in normalized && !("confirmation" in normalized))) {
    if (!legalContext) {
      throw new Error("complaint_mapper_legal_context_required");
    }
    return createComplaintPayloadSnapshotV2(normalized, legalContext);
  }

  return createComplaintPayloadSnapshotV1(normalized);
}

export function createComplaintPayloadSnapshotV1(
  normalized: unknown
): ComplaintPayloadSnapshotV1 {
  assertPlainObject(normalized);

  return {
    schemaVersion: "1.0",
    consumer: buildConsumer(normalized.consumer),
    subject: buildSubject(normalized.subject),
    complaint: buildComplaint(normalized.complaint),
    confirmation: buildConfirmation(normalized.confirmation),
  };
}

export function createComplaintPayloadSnapshotV2(
  normalized: unknown,
  legalContext: LegalContextInputV2
): ComplaintPayloadSnapshotV2 {
  assertPlainObject(normalized);

  return {
    schemaVersion: "2.0",
    consumer: buildConsumer(normalized.consumer),
    subject: buildSubject(normalized.subject),
    complaint: buildComplaint(normalized.complaint),
    declarations: buildDeclarationsV2(normalized.declarations),
    legalContext: buildLegalContextV2(legalContext),
  };
}

function buildConsumer(input: unknown): unknown {
  assertPlainObject(input);
  const result: Record<string, unknown> = {};

  copyProp(input, result, "consumerType");
  copyProp(input, result, "firstNames");
  copyProp(input, result, "lastNames");
  copyProp(input, result, "documentType");
  copyProp(input, result, "documentNumber");
  copyProp(input, result, "email");
  copyProp(input, result, "phone");
  copyProp(input, result, "address");
  copyProp(input, result, "isMinor");

  if (Object.prototype.hasOwnProperty.call(input, "representative") && input.representative !== undefined) {
    if (input.representative === null) {
      result.representative = null;
    } else {
      assertPlainObject(input.representative);
      const repResult: Record<string, unknown> = {};
      copyProp(input.representative, repResult, "firstNames");
      copyProp(input.representative, repResult, "lastNames");
      copyProp(input.representative, repResult, "documentType");
      copyProp(input.representative, repResult, "documentNumber");
      copyProp(input.representative, repResult, "relationship");
      result.representative = repResult;
    }
  }

  copyProp(input, result, "legalName");
  copyProp(input, result, "ruc");
  copyProp(input, result, "representativeFirstNames");
  copyProp(input, result, "representativeLastNames");
  copyProp(input, result, "representativeDocumentType");
  copyProp(input, result, "representativeDocumentNumber");
  copyProp(input, result, "representativeRole");

  return result;
}

function buildSubject(input: unknown): unknown {
  assertPlainObject(input);
  const result: Record<string, unknown> = {};

  copyProp(input, result, "kind");
  copyProp(input, result, "description");
  copyProp(input, result, "amountApplicability");
  copyProp(input, result, "amount");
  copyProp(input, result, "currency");
  copyProp(input, result, "transactionDate");
  copyProp(input, result, "referenceNumber");
  copyProp(input, result, "channel");

  return result;
}

function buildComplaint(input: unknown): unknown {
  assertPlainObject(input);
  const result: Record<string, unknown> = {};

  copyProp(input, result, "kind");
  copyProp(input, result, "facts");
  copyProp(input, result, "requestedResolution");

  return result;
}

function buildConfirmation(input: unknown): unknown {
  assertPlainObject(input);
  const result: Record<string, unknown> = {};

  copyProp(input, result, "truthfulnessConfirmed");
  copyProp(input, result, "submissionConfirmed");
  copyProp(input, result, "emailDeliveryRequested");

  return result;
}

function buildDeclarationsV2(input: unknown): {
  readonly truthfulnessConfirmed: true;
  readonly emailDeliveryRequested: boolean;
} {
  assertPlainObject(input);
  const result: Record<string, unknown> = {};

  copyProp(input, result, "truthfulnessConfirmed");
  copyProp(input, result, "emailDeliveryRequested");

  if (result.truthfulnessConfirmed !== true || typeof result.emailDeliveryRequested !== "boolean") {
    throw new Error("complaint_mapper_input_invalid");
  }

  return {
    truthfulnessConfirmed: true,
    emailDeliveryRequested: result.emailDeliveryRequested,
  };
}

function buildLegalContextV2(input: unknown): ComplaintPayloadSnapshotV2["legalContext"] {
  assertPlainObject(input);

  const version = input.privacyPolicyVersion;
  const publishedAt = input.privacyPolicyPublishedAt;
  const effectiveAt = input.privacyPolicyEffectiveAt;
  const path = input.privacyPolicyPath;

  if (
    typeof version !== "string" ||
    (publishedAt !== null && typeof publishedAt !== "string") ||
    (effectiveAt !== null && typeof effectiveAt !== "string") ||
    path !== "/privacidad"
  ) {
    throw new Error("complaint_mapper_input_invalid");
  }

  return {
    privacyNoticePresented: true,
    privacyPolicyVersion: version,
    privacyPolicyPublishedAt: publishedAt,
    privacyPolicyEffectiveAt: effectiveAt,
    privacyPolicyPath: "/privacidad",
  };
}

function copyProp(source: Record<string, unknown>, target: Record<string, unknown>, key: string) {
  const desc = Object.getOwnPropertyDescriptor(source, key);
  if (!desc) return;
  if (desc.get || desc.set) throw new Error("complaint_mapper_input_invalid");

  if (desc.value !== undefined) {
    target[key] = desc.value;
  }
}

function assertPlainObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("complaint_mapper_input_invalid");
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype) {
    throw new Error("complaint_mapper_input_invalid");
  }

  if (Object.prototype.hasOwnProperty.call(value, "toJSON")) {
    throw new Error("complaint_mapper_input_invalid");
  }
}

export interface MapComplaintDomainToInsertInput {
  readonly payloadSnapshot: ComplaintPayloadSnapshot;
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
  validateMapComplaintDomainToInsertInput(input);

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

function validateMapComplaintDomainToInsertInput(input: unknown): asserts input is MapComplaintDomainToInsertInput {
  assertPlainObject(input);
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
  readonly snapshotVersion?: string;
}): typeof complaintAuditEvents.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "createdBy", "snapshotVersion"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "created",
    createdBy: input.createdBy,
    metadata: { snapshotVersion: input.snapshotVersion ?? "1.0" },
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

export function mapInformationRequestToInsert(input: {
  readonly complaintId: string;
  readonly requestSequence: number;
  readonly requestText: string;
  readonly requestedAt: Date;
  readonly requestedBy: string;
}): typeof complaintInformationRequests.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "requestSequence", "requestText", "requestedAt", "requestedBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    requestSequence: input.requestSequence,
    requestText: input.requestText,
    requestedAt: input.requestedAt,
    requestedBy: input.requestedBy,
    status: "open",
  };
}

export function mapAwaitingInformationComplaintStatusHistoryToInsert(input: {
  readonly complaintId: string;
  readonly changedBy: string;
}): typeof complaintStatusHistory.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "changedBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    fromStatus: "under_review",
    toStatus: "awaiting_information",
    changedBy: input.changedBy,
  };
}

export function mapInformationRequestedAuditEventToInsert(input: {
  readonly complaintId: string;
  readonly createdBy: string;
}): typeof complaintAuditEvents.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "createdBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "information_requested",
    createdBy: input.createdBy,
    metadata: { fromStatus: "under_review", toStatus: "awaiting_information" },
  };
}

export function mapReviewResumedComplaintStatusHistoryToInsert(input: {
  readonly complaintId: string;
  readonly changedBy: string;
}): typeof complaintStatusHistory.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "changedBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    fromStatus: "awaiting_information",
    toStatus: "under_review",
    changedBy: input.changedBy,
  };
}

export function mapReviewResumedAuditEventToInsert(input: {
  readonly complaintId: string;
  readonly createdBy: string;
}): typeof complaintAuditEvents.$inferInsert {
  if (Object.keys(input).some(k => !["complaintId", "createdBy"].includes(k))) {
     throw new Error("complaint_mapper_input_invalid");
  }
  return {
    complaintId: input.complaintId,
    eventType: "review_resumed",
    createdBy: input.createdBy,
    metadata: { fromStatus: "awaiting_information", toStatus: "under_review" },
  };
}
