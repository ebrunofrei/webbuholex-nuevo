import type {
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCaseRepository,
  JurisprudenceEditorialEvent,
  JurisprudenceEditorialIdempotencyEntry,
  JurisprudenceEditorialWorkflowErrorCode,
} from "@/types/jurisprudence-editorial-workflow";

export class JurisprudenceEditorialWorkflowError extends Error {
  readonly code: JurisprudenceEditorialWorkflowErrorCode;

  constructor(code: JurisprudenceEditorialWorkflowErrorCode, message: string) {
    super(message);
    this.name = "JurisprudenceEditorialWorkflowError";
    this.code = code;
  }
}

export function cloneEditorialCase(value: JurisprudenceEditorialCase): JurisprudenceEditorialCase {
  return structuredClone(value);
}

export function cloneEditorialEvent(value: JurisprudenceEditorialEvent): JurisprudenceEditorialEvent {
  return structuredClone(value);
}

export function cloneEditorialIdempotency(value: JurisprudenceEditorialIdempotencyEntry): JurisprudenceEditorialIdempotencyEntry {
  return structuredClone(value);
}

export function assertEditorialRepositoryOpen(closed: boolean): void {
  if (closed) throw new JurisprudenceEditorialWorkflowError("RESOURCE_CLOSED", "El repositorio editorial está cerrado.");
}

export type { JurisprudenceEditorialCaseRepository };

export const jurisprudenceEditorialSqliteMigration001 = `
CREATE TABLE IF NOT EXISTS jurisprudence_editorial_cases (
  case_id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL CHECK (record_version >= 1),
  case_version INTEGER NOT NULL CHECK (case_version >= 1),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS jurisprudence_editorial_active_record_version
  ON jurisprudence_editorial_cases(record_id, record_version) WHERE active = 1;
CREATE TABLE IF NOT EXISTS jurisprudence_editorial_events (
  event_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  occurred_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(case_id, sequence),
  FOREIGN KEY(case_id) REFERENCES jurisprudence_editorial_cases(case_id)
);
CREATE TABLE IF NOT EXISTS jurisprudence_editorial_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  command_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
