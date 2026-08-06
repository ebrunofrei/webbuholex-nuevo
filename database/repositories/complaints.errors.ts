export type ComplaintPersistenceErrorCode =
  | "complaint_persistence_failed"
  | "complaint_transaction_failed"
  | "complaint_sequence_failed"
  | "complaint_sequence_exhausted"
  | "complaint_existing_record_incomplete";

export class ComplaintPersistenceError extends Error {
  public readonly code: ComplaintPersistenceErrorCode;

  constructor(code: ComplaintPersistenceErrorCode) {
    super(code);
    this.name = "ComplaintPersistenceError";
    this.code = code;
  }
}

export function createComplaintPersistenceError(code: ComplaintPersistenceErrorCode): ComplaintPersistenceError {
  return new ComplaintPersistenceError(code);
}
