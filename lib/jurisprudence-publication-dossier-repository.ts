import type {
  JurisprudencePublicationDossier,
  JurisprudencePublicationDossierRepository,
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  PublicationDossierEvent,
  PublicationGovernanceErrorCode,
  PublicationGovernanceIdempotencyEntry,
} from "@/types/jurisprudence-publication-governance";

export class JurisprudencePublicationGovernanceError extends Error {
  readonly code: PublicationGovernanceErrorCode;
  constructor(code: PublicationGovernanceErrorCode, message: string) {
    super(message);
    this.name = "JurisprudencePublicationGovernanceError";
    this.code = code;
  }
}

export function cloneGovernedSource(value: JurisprudenceSourceRecord): JurisprudenceSourceRecord { return structuredClone(value); }
export function cloneSourceBinding(value: JurisprudenceSourceBinding): JurisprudenceSourceBinding { return structuredClone(value); }
export function clonePublicationDossier(value: JurisprudencePublicationDossier): JurisprudencePublicationDossier { return structuredClone(value); }
export function clonePublicationDossierEvent(value: PublicationDossierEvent): PublicationDossierEvent { return structuredClone(value); }
export function clonePublicationGovernanceIdempotency(value: PublicationGovernanceIdempotencyEntry): PublicationGovernanceIdempotencyEntry { return structuredClone(value); }
export function assertPublicationGovernanceRepositoryOpen(closed: boolean): void {
  if (closed) throw new JurisprudencePublicationGovernanceError("RESOURCE_CLOSED", "El repositorio de gobierno de publicación está cerrado.");
}
export type { JurisprudencePublicationDossierRepository };

export const jurisprudencePublicationGovernanceSqliteMigration001 = `
CREATE TABLE IF NOT EXISTS jurisprudence_governed_sources (
  source_id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jurisprudence_source_bindings (
  binding_id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL CHECK (record_version >= 1),
  binding_status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jurisprudence_publication_dossiers (
  dossier_id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL CHECK (record_version >= 1),
  dossier_version INTEGER NOT NULL CHECK (dossier_version >= 1),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  payload_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS jurisprudence_publication_active_record_version
  ON jurisprudence_publication_dossiers(record_id, record_version) WHERE active = 1;
CREATE TABLE IF NOT EXISTS jurisprudence_publication_dossier_events (
  event_id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(dossier_id, sequence),
  FOREIGN KEY(dossier_id) REFERENCES jurisprudence_publication_dossiers(dossier_id)
);
CREATE TABLE IF NOT EXISTS jurisprudence_publication_governance_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  command_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
