export type ComplaintPersistenceErrorCode =
  | "complaint_persistence_failed"
  | "complaint_transaction_failed"
  | "complaint_sequence_failed"
  | "complaint_sequence_exhausted"
  | "complaint_database_constraint_failed"
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

export class SanitizedDatabaseConstraintError extends Error {
  public readonly code: string;
  public readonly constraint: string | null;

  constructor(code: unknown, constraint: unknown) {
    super("complaint_database_constraint_failed");
    this.name = "SanitizedDatabaseConstraintError";
    this.code = typeof code === "string" ? code : "unknown";
    this.constraint = typeof constraint === "string" ? constraint : null;
  }
}
