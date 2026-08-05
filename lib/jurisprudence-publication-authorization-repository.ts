import type {
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationErrorCode,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationIdempotencyEntry,
  JurisprudencePublicationAuthorizationRepository,
  JurisprudencePublicationAuthorizationView,
} from "@/types/jurisprudence-publication-authorization";

export class JurisprudencePublicationAuthorizationError extends Error {
  readonly code: JurisprudencePublicationAuthorizationErrorCode;
  constructor(code: JurisprudencePublicationAuthorizationErrorCode, message: string) {
    super(message);
    this.name = "JurisprudencePublicationAuthorizationError";
    this.code = code;
  }
}

export function clonePublicationAuthorizationCase(value: JurisprudencePublicationAuthorizationCase): JurisprudencePublicationAuthorizationCase { return structuredClone(value); }
export function clonePublicationAuthorizationEvent(value: JurisprudencePublicationAuthorizationEvent): JurisprudencePublicationAuthorizationEvent { return structuredClone(value); }
export function clonePublicationAuthorizationView(value: JurisprudencePublicationAuthorizationView): JurisprudencePublicationAuthorizationView { return structuredClone(value); }
export function clonePublicationAuthorizationIdempotency(value: JurisprudencePublicationAuthorizationIdempotencyEntry): JurisprudencePublicationAuthorizationIdempotencyEntry { return structuredClone(value); }
export function assertPublicationAuthorizationRepositoryOpen(closed: boolean): void {
  if (closed) throw new JurisprudencePublicationAuthorizationError("RESOURCE_CLOSED", "El repositorio de autorizaciones está cerrado.");
}
export function isPublicationAuthorizationCurrent(value: JurisprudencePublicationAuthorizationCase, evaluatedAt: string): boolean {
  const evaluated = new Date(evaluatedAt).valueOf();
  return isPublicationAuthorizationActive(value, evaluatedAt)
    && new Date(value.effectiveFrom).valueOf() <= evaluated;
}
export function isPublicationAuthorizationActive(value: JurisprudencePublicationAuthorizationCase, evaluatedAt: string): boolean {
  const evaluated = new Date(evaluatedAt).valueOf();
  return value.status === "authorized"
    && value.publicationAuthorizationGranted
    && value.revokedAt === null
    && value.supersededAt === null
    && (value.expiresAt === undefined || new Date(value.expiresAt).valueOf() > evaluated);
}
export type { JurisprudencePublicationAuthorizationRepository };

export const jurisprudencePublicationAuthorizationSqliteMigration001 = `
CREATE TABLE IF NOT EXISTS jurisprudence_publication_authorization_cases (
  authorization_case_id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL CHECK (record_version >= 1),
  authorization_version INTEGER NOT NULL CHECK (authorization_version >= 1),
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jurisprudence_publication_authorization_record_version
  ON jurisprudence_publication_authorization_cases(record_id, record_version);
CREATE TABLE IF NOT EXISTS jurisprudence_publication_authorization_events (
  event_id TEXT PRIMARY KEY,
  authorization_case_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(authorization_case_id, sequence),
  FOREIGN KEY(authorization_case_id) REFERENCES jurisprudence_publication_authorization_cases(authorization_case_id)
);
CREATE TABLE IF NOT EXISTS jurisprudence_publication_authorization_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  command_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
