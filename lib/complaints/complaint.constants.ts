export const COMPLAINT_CONSUMER_TYPES = ["natural_person", "legal_entity"] as const;
export const COMPLAINT_DOCUMENT_TYPES = ["dni", "foreign_resident_card", "passport", "other"] as const;
export const COMPLAINT_SUBJECT_KINDS = ["product", "service"] as const;
export const COMPLAINT_KINDS = ["claim", "complaint"] as const;
export const COMPLAINT_CHANNELS = ["website", "whatsapp", "email", "telephone", "in_person", "other"] as const;
export const COMPLAINT_RESPONSE_CHANNELS = ["email"] as const;
export const COMPLAINT_STATUSES = ["received", "under_review", "awaiting_information", "answered", "closed"] as const;
export const COMPLAINT_AMOUNT_APPLICABILITY = ["applicable", "not_applicable", "unknown"] as const;
export const COMPLAINT_REPRESENTATIVE_ROLES = ["father", "mother", "guardian", "legal_representative", "other"] as const;

export const COMPLAINT_LIMITS = {
  firstNames: 100,
  lastNames: 100,
  legalName: 200,
  documentNumber: 30,
  email: 254,
  phone: 30,
  address: 300,
  representativeRole: 100,
  subjectDescription: 500,
  referenceNumber: 100,
  facts: 4000,
  requestedResolution: 2000,
  idempotencyKey: 128,
} as const;
