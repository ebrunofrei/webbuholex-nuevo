import type {
  JurisprudencePublicProjection,
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionErrorCode,
  JurisprudencePublicationExecutionEvent,
  JurisprudencePublicationExecutionIdempotencyEntry,
  JurisprudencePublicationExecutionRepository,
  JurisprudencePublicationExecutionView,
} from "@/types/jurisprudence-publication-execution";

export class JurisprudencePublicationExecutionError extends Error {
  readonly code: JurisprudencePublicationExecutionErrorCode;
  constructor(code: JurisprudencePublicationExecutionErrorCode, message: string) {
    super(message);
    this.name = "JurisprudencePublicationExecutionError";
    this.code = code;
  }
}

export function assertPublicationExecutionRepositoryOpen(closed: boolean): void {
  if (closed) throw new JurisprudencePublicationExecutionError("RESOURCE_CLOSED", "El repositorio de ejecución está cerrado.");
}
export function clonePublicationExecution(value: JurisprudencePublicationExecution): JurisprudencePublicationExecution { return structuredClone(value); }
export function clonePublicProjection(value: JurisprudencePublicProjection): JurisprudencePublicProjection { return structuredClone(value); }
export function clonePublicationExecutionEvent(value: JurisprudencePublicationExecutionEvent): JurisprudencePublicationExecutionEvent { return structuredClone(value); }
export function clonePublicationExecutionView(value: JurisprudencePublicationExecutionView): JurisprudencePublicationExecutionView { return structuredClone(value); }
export function clonePublicationExecutionIdempotency(value: JurisprudencePublicationExecutionIdempotencyEntry): JurisprudencePublicationExecutionIdempotencyEntry { return structuredClone(value); }

export function isPublicationExecutionCurrent(value: JurisprudencePublicationExecution): boolean {
  return value.status === "executed" && value.publicationExecuted && value.withdrawnAt === null && value.supersededAt === null;
}

export type { JurisprudencePublicationExecutionRepository };

export const jurisprudencePublicationExecutionSqliteMigration001 = `
CREATE TABLE IF NOT EXISTS jurisprudence_publication_executions (
  execution_id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL CHECK (record_version >= 1),
  execution_version INTEGER NOT NULL CHECK (execution_version >= 1),
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jurisprudence_publication_execution_record_version
  ON jurisprudence_publication_executions(record_id, record_version);
CREATE TABLE IF NOT EXISTS jurisprudence_public_projections (
  projection_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL UNIQUE,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL CHECK (record_version >= 1),
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  FOREIGN KEY(execution_id) REFERENCES jurisprudence_publication_executions(execution_id)
);
CREATE INDEX IF NOT EXISTS jurisprudence_public_projection_record_version
  ON jurisprudence_public_projections(record_id, record_version);
CREATE TABLE IF NOT EXISTS jurisprudence_publication_execution_events (
  event_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(execution_id, sequence),
  FOREIGN KEY(execution_id) REFERENCES jurisprudence_publication_executions(execution_id)
);
CREATE TABLE IF NOT EXISTS jurisprudence_publication_execution_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  command_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
