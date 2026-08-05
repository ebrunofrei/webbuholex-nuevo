import { jurisprudenceRecordSchema } from "@/lib/schemas/jurisprudence";
import { buildJurisprudenceDeduplicationKey, getJurisprudenceExternalIdentity, normalizeJurisprudenceExternalIdentity } from "@/lib/jurisprudence-identity";
import { JurisprudenceRepositoryError } from "@/lib/jurisprudence-repository-error";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type { JurisprudencePersistedRecordRow, JurisprudencePersistedVersionRow, JurisprudenceVersionChangeKind } from "@/types/jurisprudence-repository";

export const JURISPRUDENCE_PERSISTENCE_MODEL_VERSION = 1 as const;

export const jurisprudencePersistenceIndexes = [
  { name: "jurisprudence_records_slug_uq", columns: ["slug"], unique: true, nullable: true },
  { name: "jurisprudence_records_dedup_uq", columns: ["deduplication_key"], unique: true, nullable: false },
  { name: "jurisprudence_records_source_document_idx", columns: ["source_type", "source_document_id"], unique: false, nullable: true },
  { name: "jurisprudence_records_case_idx", columns: ["normalized_case_number"], unique: false, nullable: false },
  { name: "jurisprudence_records_resolution_idx", columns: ["normalized_resolution_number"], unique: false, nullable: false },
  { name: "jurisprudence_records_institution_matter_date_idx", columns: ["institution_id", "normalized_matter", "issued_at", "id"], unique: false, nullable: false },
  { name: "jurisprudence_records_status_idx", columns: ["editorial_status", "publication_status", "verification_status", "updated_at", "id"], unique: false, nullable: false },
] as const;

export const jurisprudenceSqliteMigration001 = `
CREATE TABLE IF NOT EXISTS jurisprudence_records (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  record_version INTEGER NOT NULL CHECK (record_version > 0),
  deduplication_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_document_id TEXT,
  normalized_case_number TEXT NOT NULL,
  normalized_resolution_number TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  normalized_matter TEXT NOT NULL,
  normalized_search_text TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  editorial_status TEXT NOT NULL,
  publication_status TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jurisprudence_record_versions (
  record_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  change_kind TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (record_id, version),
  FOREIGN KEY (record_id) REFERENCES jurisprudence_records(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS jurisprudence_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  input_json TEXT NOT NULL,
  record_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (record_id) REFERENCES jurisprudence_records(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS jurisprudence_records_source_document_idx ON jurisprudence_records(source_type, source_document_id);
CREATE INDEX IF NOT EXISTS jurisprudence_records_case_idx ON jurisprudence_records(normalized_case_number);
CREATE INDEX IF NOT EXISTS jurisprudence_records_resolution_idx ON jurisprudence_records(normalized_resolution_number);
CREATE INDEX IF NOT EXISTS jurisprudence_records_institution_matter_date_idx ON jurisprudence_records(institution_id, normalized_matter, issued_at, id);
CREATE INDEX IF NOT EXISTS jurisprudence_records_status_idx ON jurisprudence_records(editorial_status, publication_status, verification_status, updated_at, id);
`;

export function toJurisprudencePersistedRow(record: JurisprudenceRecord): JurisprudencePersistedRecordRow {
  const validRecord = jurisprudenceRecordSchema.parse(record) as JurisprudenceRecord;
  const identity = getJurisprudenceExternalIdentity(validRecord);
  const normalized = normalizeJurisprudenceExternalIdentity(identity);
  return {
    id: validRecord.id,
    slug: validRecord.slug,
    recordVersion: validRecord.recordVersion,
    deduplicationKey: buildJurisprudenceDeduplicationKey(identity),
    sourceType: validRecord.source.type,
    sourceDocumentId: normalized.sourceDocumentId,
    normalizedCaseNumber: normalized.caseNumber,
    normalizedResolutionNumber: normalized.resolutionNumber,
    institutionId: normalized.institutionId,
    normalizedMatter: validRecord.matter.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE"),
    normalizedSearchText: validRecord.search.normalizedSearchText.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE"),
    issuedAt: validRecord.issuedAt,
    editorialStatus: validRecord.editorialStatus,
    publicationStatus: validRecord.publicationStatus,
    verificationStatus: validRecord.source.verificationStatus,
    createdAt: validRecord.createdAt,
    updatedAt: validRecord.updatedAt,
    payloadJson: JSON.stringify(validRecord),
  };
}

export function fromJurisprudencePersistedRow(row: JurisprudencePersistedRecordRow): JurisprudenceRecord {
  let payload: unknown;
  try {
    payload = JSON.parse(row.payloadJson);
  } catch {
    throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "El registro persistido contiene JSON inválido.", { recordId: row.id });
  }
  const parsed = jurisprudenceRecordSchema.safeParse(payload);
  if (!parsed.success) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "El registro persistido no cumple el contrato canónico.", { recordId: row.id });
  const record = parsed.data as JurisprudenceRecord;
  const remapped = toJurisprudencePersistedRow(record);
  const envelopeMatches = row.id === remapped.id
    && row.slug === remapped.slug
    && row.recordVersion === remapped.recordVersion
    && row.deduplicationKey === remapped.deduplicationKey
    && row.sourceType === remapped.sourceType
    && row.sourceDocumentId === remapped.sourceDocumentId
    && row.normalizedCaseNumber === remapped.normalizedCaseNumber
    && row.normalizedResolutionNumber === remapped.normalizedResolutionNumber
    && row.institutionId === remapped.institutionId
    && row.normalizedMatter === remapped.normalizedMatter
    && row.normalizedSearchText === remapped.normalizedSearchText
    && row.issuedAt === remapped.issuedAt
    && row.editorialStatus === remapped.editorialStatus
    && row.publicationStatus === remapped.publicationStatus
    && row.verificationStatus === remapped.verificationStatus
    && row.createdAt === remapped.createdAt
    && row.updatedAt === remapped.updatedAt;
  if (!envelopeMatches) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "Los campos indexados no coinciden con el registro canónico persistido.", { recordId: row.id });
  return record;
}

export function toJurisprudencePersistedVersionRow(record: JurisprudenceRecord, changeKind: JurisprudenceVersionChangeKind): JurisprudencePersistedVersionRow {
  return { recordId: record.id, version: record.recordVersion, changeKind, recordedAt: record.updatedAt, snapshotJson: JSON.stringify(record) };
}
