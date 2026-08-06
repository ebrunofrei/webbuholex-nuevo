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

function readOwnDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (descriptor.get || descriptor.set) {
    throw new Error("invalid");
  }
  return descriptor.value;
}

function assertOrdinaryObject(value: unknown): asserts value is object {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid");
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype) {
    throw new Error("invalid");
  }
}

export function buildComplaintSubmission(input: unknown): BuildComplaintResult {
  try {
    assertOrdinaryObject(input);

    const normalized: Record<string, unknown> = {};

    const schemaVersion = readOwnDataProperty(input, "schemaVersion");
    if (schemaVersion !== undefined) normalized.schemaVersion = schemaVersion;

    const idempotencyKey = readOwnDataProperty(input, "idempotencyKey");
    if (idempotencyKey !== undefined) normalized.idempotencyKey = idempotencyKey;

    const consumerRaw = readOwnDataProperty(input, "consumer");
    if (consumerRaw !== undefined) {
      assertOrdinaryObject(consumerRaw);
      const cObj: Record<string, unknown> = {};
      const consumerType = readOwnDataProperty(consumerRaw, "consumerType");
      if (consumerType !== undefined) cObj.consumerType = consumerType;

      const email = readOwnDataProperty(consumerRaw, "email");
      if (typeof email === "string") cObj.email = normalizeEmail(email);
      else if (email !== undefined) cObj.email = email;

      const phone = readOwnDataProperty(consumerRaw, "phone");
      if (typeof phone === "string") cObj.phone = normalizePhone(phone);
      else if (phone !== undefined) cObj.phone = phone;

      const address = readOwnDataProperty(consumerRaw, "address");
      if (address !== undefined) cObj.address = address;

      if (consumerType === "natural_person") {
        const firstNames = readOwnDataProperty(consumerRaw, "firstNames");
        if (typeof firstNames === "string") cObj.firstNames = normalizePersonName(firstNames);
        else if (firstNames !== undefined) cObj.firstNames = firstNames;

        const lastNames = readOwnDataProperty(consumerRaw, "lastNames");
        if (typeof lastNames === "string") cObj.lastNames = normalizePersonName(lastNames);
        else if (lastNames !== undefined) cObj.lastNames = lastNames;

        const documentType = readOwnDataProperty(consumerRaw, "documentType");
        if (documentType !== undefined) cObj.documentType = documentType;

        const documentNumber = readOwnDataProperty(consumerRaw, "documentNumber");
        if (typeof documentNumber === "string") cObj.documentNumber = normalizeDocumentNumber(documentNumber);
        else if (documentNumber !== undefined) cObj.documentNumber = documentNumber;

        const isMinor = readOwnDataProperty(consumerRaw, "isMinor");
        if (isMinor !== undefined) cObj.isMinor = isMinor;

        const representativeRaw = readOwnDataProperty(consumerRaw, "representative");
        if (representativeRaw !== undefined) {
          assertOrdinaryObject(representativeRaw);
          const rObj: Record<string, unknown> = {};

          const rFirstNames = readOwnDataProperty(representativeRaw, "firstNames");
          if (typeof rFirstNames === "string") rObj.firstNames = normalizePersonName(rFirstNames);
          else if (rFirstNames !== undefined) rObj.firstNames = rFirstNames;

          const rLastNames = readOwnDataProperty(representativeRaw, "lastNames");
          if (typeof rLastNames === "string") rObj.lastNames = normalizePersonName(rLastNames);
          else if (rLastNames !== undefined) rObj.lastNames = rLastNames;

          const rDocumentType = readOwnDataProperty(representativeRaw, "documentType");
          if (rDocumentType !== undefined) rObj.documentType = rDocumentType;

          const rDocumentNumber = readOwnDataProperty(representativeRaw, "documentNumber");
          if (typeof rDocumentNumber === "string") rObj.documentNumber = normalizeDocumentNumber(rDocumentNumber);
          else if (rDocumentNumber !== undefined) rObj.documentNumber = rDocumentNumber;

          const rRelationship = readOwnDataProperty(representativeRaw, "relationship");
          if (rRelationship !== undefined) rObj.relationship = rRelationship;

          cObj.representative = rObj;
        }
      } else if (consumerType === "legal_entity") {
        const legalName = readOwnDataProperty(consumerRaw, "legalName");
        if (typeof legalName === "string") cObj.legalName = normalizePersonName(legalName);
        else if (legalName !== undefined) cObj.legalName = legalName;

        const ruc = readOwnDataProperty(consumerRaw, "ruc");
        if (ruc !== undefined) cObj.ruc = ruc;

        const rFirstNames = readOwnDataProperty(consumerRaw, "representativeFirstNames");
        if (typeof rFirstNames === "string") cObj.representativeFirstNames = normalizePersonName(rFirstNames);
        else if (rFirstNames !== undefined) cObj.representativeFirstNames = rFirstNames;

        const rLastNames = readOwnDataProperty(consumerRaw, "representativeLastNames");
        if (typeof rLastNames === "string") cObj.representativeLastNames = normalizePersonName(rLastNames);
        else if (rLastNames !== undefined) cObj.representativeLastNames = rLastNames;

        const rDocType = readOwnDataProperty(consumerRaw, "representativeDocumentType");
        if (rDocType !== undefined) cObj.representativeDocumentType = rDocType;

        const rDocNumber = readOwnDataProperty(consumerRaw, "representativeDocumentNumber");
        if (typeof rDocNumber === "string") cObj.representativeDocumentNumber = normalizeDocumentNumber(rDocNumber);
        else if (rDocNumber !== undefined) cObj.representativeDocumentNumber = rDocNumber;

        const rRole = readOwnDataProperty(consumerRaw, "representativeRole");
        if (rRole !== undefined) cObj.representativeRole = rRole;
      }

      normalized.consumer = cObj;
    }

    const subjectRaw = readOwnDataProperty(input, "subject");
    if (subjectRaw !== undefined) {
      assertOrdinaryObject(subjectRaw);
      const sObj: Record<string, unknown> = {};

      const kind = readOwnDataProperty(subjectRaw, "kind");
      if (kind !== undefined) sObj.kind = kind;

      const description = readOwnDataProperty(subjectRaw, "description");
      if (typeof description === "string") sObj.description = normalizeComplaintText(description);
      else if (description !== undefined) sObj.description = description;

      const amountApplicability = readOwnDataProperty(subjectRaw, "amountApplicability");
      if (amountApplicability !== undefined) sObj.amountApplicability = amountApplicability;

      const amount = readOwnDataProperty(subjectRaw, "amount");
      if (amount !== undefined) sObj.amount = amount;

      const currency = readOwnDataProperty(subjectRaw, "currency");
      if (currency !== undefined) sObj.currency = currency;

      const specificGoodsOrService = readOwnDataProperty(subjectRaw, "specificGoodsOrService");
      if (specificGoodsOrService !== undefined) sObj.specificGoodsOrService = specificGoodsOrService;

      normalized.subject = sObj;
    }

    const complaintRaw = readOwnDataProperty(input, "complaint");
    if (complaintRaw !== undefined) {
      assertOrdinaryObject(complaintRaw);
      const cpObj: Record<string, unknown> = {};

      const kind = readOwnDataProperty(complaintRaw, "kind");
      if (kind !== undefined) cpObj.kind = kind;

      const facts = readOwnDataProperty(complaintRaw, "facts");
      if (typeof facts === "string") cpObj.facts = normalizeComplaintText(facts);
      else if (facts !== undefined) cpObj.facts = facts;

      const requestedResolution = readOwnDataProperty(complaintRaw, "requestedResolution");
      if (typeof requestedResolution === "string") cpObj.requestedResolution = normalizeComplaintText(requestedResolution);
      else if (requestedResolution !== undefined) cpObj.requestedResolution = requestedResolution;

      normalized.complaint = cpObj;
    }

    const confirmationRaw = readOwnDataProperty(input, "confirmation");
    if (confirmationRaw !== undefined) {
      assertOrdinaryObject(confirmationRaw);
      const cfObj: Record<string, unknown> = {};

      const truthfulnessConfirmed = readOwnDataProperty(confirmationRaw, "truthfulnessConfirmed");
      if (truthfulnessConfirmed !== undefined) cfObj.truthfulnessConfirmed = truthfulnessConfirmed;

      const submissionConfirmed = readOwnDataProperty(confirmationRaw, "submissionConfirmed");
      if (submissionConfirmed !== undefined) cfObj.submissionConfirmed = submissionConfirmed;

      const emailDeliveryRequested = readOwnDataProperty(confirmationRaw, "emailDeliveryRequested");
      if (emailDeliveryRequested !== undefined) cfObj.emailDeliveryRequested = emailDeliveryRequested;

      normalized.confirmation = cfObj;
    }

    const parsed = ComplaintSubmissionSchema.safeParse(normalized);
    if (!parsed.success) {
      return { ok: false, error: COMPLAINT_VALIDATION_FAILED };
    }

    return { ok: true, value: parsed.data };
  } catch {
    return { ok: false, error: COMPLAINT_VALIDATION_FAILED };
  }
}
