import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  assertPublicationGovernanceRepositoryOpen,
  cloneGovernedSource,
  clonePublicationDossier,
  clonePublicationDossierEvent,
  clonePublicationGovernanceIdempotency,
  cloneSourceBinding,
  jurisprudencePublicationGovernanceSqliteMigration001,
  JurisprudencePublicationGovernanceError,
} from "@/lib/jurisprudence-publication-dossier-repository";
import {
  jurisprudenceSourceBindingSchema,
  jurisprudenceSourceRecordSchema,
  publicationDossierEventSchema,
  publicationDossierSchema,
  publicationGovernanceStoredResultSchema,
} from "@/lib/schemas/jurisprudence-publication-governance";
import type {
  JurisprudencePublicationDossier,
  JurisprudencePublicationDossierRepository,
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  PublicationDossierCreateCommit,
  PublicationDossierEvent,
  PublicationDossierUpdateCommit,
  PublicationGovernanceIdempotencyEntry,
} from "@/types/jurisprudence-publication-governance";

function column(row: unknown, key: string): unknown {
  if (row === null || typeof row !== "object" || Array.isArray(row)) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "La persistencia devolvió una fila inválida.");
  return Reflect.get(row, key);
}
function stringColumn(row: unknown, key: string): string { const value = column(row, key); if (typeof value !== "string") throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "La persistencia devolvió datos inválidos."); return value; }
function parseJson(value: string): unknown { try { return JSON.parse(value); } catch { throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido."); } }
function parseSource(row: unknown): JurisprudenceSourceRecord { const parsed = jurisprudenceSourceRecordSchema.safeParse(parseJson(stringColumn(row, "payload_json"))); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "La fuente persistida es inválida."); return cloneGovernedSource(parsed.data); }
function parseBinding(row: unknown): JurisprudenceSourceBinding { const parsed = jurisprudenceSourceBindingSchema.safeParse(parseJson(stringColumn(row, "payload_json"))); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El vínculo persistido es inválido."); return cloneSourceBinding(parsed.data); }
function parseDossier(row: unknown): JurisprudencePublicationDossier { const parsed = publicationDossierSchema.safeParse(parseJson(stringColumn(row, "payload_json"))); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El expediente persistido es inválido."); return clonePublicationDossier(parsed.data); }
function parseEvent(row: unknown): PublicationDossierEvent { const parsed = publicationDossierEventSchema.safeParse(parseJson(stringColumn(row, "payload_json"))); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El evento persistido es inválido."); return clonePublicationDossierEvent(parsed.data); }
function active(dossier: JurisprudencePublicationDossier): boolean { return dossier.closedAt === null && dossier.supersededAt === null; }

export class SqliteJurisprudencePublicationDossierRepository implements JurisprudencePublicationDossierRepository {
  readonly #database: DatabaseSync;
  #closed = false;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") {
      const normalized = path.resolve(databasePath).replaceAll("\\", "/").toLocaleLowerCase("en-US");
      if (["/public/", "/app/", "/components/", "/data/"].some((segment) => normalized.includes(segment))) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "La base no puede ubicarse en una superficie pública.");
    }
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (databasePath !== ":memory:") this.#database.exec("PRAGMA journal_mode = WAL;");
    this.#database.exec(jurisprudencePublicationGovernanceSqliteMigration001);
  }
  private safely<T>(operation: () => T): T { assertPublicationGovernanceRepositoryOpen(this.#closed); try { return operation(); } catch (error) { if (error instanceof JurisprudencePublicationGovernanceError) throw error; throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "No fue posible completar la persistencia de gobierno."); } }
  private transaction<T>(operation: () => T): T { this.#database.exec("BEGIN IMMEDIATE;"); try { const result = operation(); this.#database.exec("COMMIT;"); return result; } catch (error) { this.#database.exec("ROLLBACK;"); throw error; } }
  private insertIdempotency(entry: PublicationGovernanceIdempotencyEntry, createdAt: string): void { this.#database.prepare("INSERT INTO jurisprudence_publication_governance_idempotency (idempotency_key, command_fingerprint, result_json, created_at) VALUES (?, ?, ?, ?)").run(entry.idempotencyKey, entry.commandFingerprint, JSON.stringify(entry.result), createdAt); }
  private insertEvent(event: PublicationDossierEvent): void { this.#database.prepare("INSERT INTO jurisprudence_publication_dossier_events (event_id, dossier_id, sequence, event_type, payload_json) VALUES (?, ?, ?, ?, ?)").run(event.eventId, event.dossierId, event.sequence, event.type, JSON.stringify(event)); }
  async findSourceById(sourceId: string) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_governed_sources WHERE source_id = ? LIMIT 1").get(sourceId); return row === undefined ? null : parseSource(row); }); }
  async createSource(source: JurisprudenceSourceRecord, idempotency: PublicationGovernanceIdempotencyEntry) { this.safely(() => this.transaction(() => { this.#database.prepare("INSERT INTO jurisprudence_governed_sources (source_id, payload_json) VALUES (?, ?)").run(source.sourceId, JSON.stringify(source)); this.insertIdempotency(idempotency, source.createdAt); })); }
  async findBindingById(bindingId: string) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_source_bindings WHERE binding_id = ? LIMIT 1").get(bindingId); return row === undefined ? null : parseBinding(row); }); }
  async createBinding(binding: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry) { this.safely(() => this.transaction(() => { this.#database.prepare("INSERT INTO jurisprudence_source_bindings (binding_id, record_id, record_version, binding_status, payload_json) VALUES (?, ?, ?, ?, ?)").run(binding.bindingId, binding.recordId, binding.recordVersion, binding.bindingStatus, JSON.stringify(binding)); this.insertIdempotency(idempotency, binding.createdAt); })); }
  async supersedeBinding(previous: JurisprudenceSourceBinding, replacement: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry) { this.safely(() => this.transaction(() => { const result = this.#database.prepare("UPDATE jurisprudence_source_bindings SET binding_status = ?, payload_json = ? WHERE binding_id = ? AND binding_status = 'active'").run(previous.bindingStatus, JSON.stringify(previous), previous.bindingId); if (result.changes !== 1) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El vínculo anterior ya no está activo."); this.#database.prepare("INSERT INTO jurisprudence_source_bindings (binding_id, record_id, record_version, binding_status, payload_json) VALUES (?, ?, ?, ?, ?)").run(replacement.bindingId, replacement.recordId, replacement.recordVersion, replacement.bindingStatus, JSON.stringify(replacement)); this.insertIdempotency(idempotency, replacement.createdAt); })); }
  async findById(dossierId: string) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_dossiers WHERE dossier_id = ? LIMIT 1").get(dossierId); return row === undefined ? null : parseDossier(row); }); }
  async findActiveByRecordAndVersion(recordId: string, recordVersion: number) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_dossiers WHERE record_id = ? AND record_version = ? AND active = 1 LIMIT 1").get(recordId, recordVersion); return row === undefined ? null : parseDossier(row); }); }
  async create(commit: PublicationDossierCreateCommit) { this.safely(() => this.transaction(() => { this.#database.prepare("INSERT INTO jurisprudence_publication_dossiers (dossier_id, record_id, record_version, dossier_version, active, payload_json) VALUES (?, ?, ?, ?, ?, ?)").run(commit.dossier.dossierId, commit.dossier.recordId, commit.dossier.recordVersion, commit.dossier.version, active(commit.dossier) ? 1 : 0, JSON.stringify(commit.dossier)); this.insertEvent(commit.event); this.insertIdempotency(commit.idempotency, commit.event.occurredAt); })); }
  async commit(commit: PublicationDossierUpdateCommit) { this.safely(() => this.transaction(() => { const result = this.#database.prepare("UPDATE jurisprudence_publication_dossiers SET record_version = ?, dossier_version = ?, active = ?, payload_json = ? WHERE dossier_id = ? AND dossier_version = ?").run(commit.dossier.recordVersion, commit.dossier.version, active(commit.dossier) ? 1 : 0, JSON.stringify(commit.dossier), commit.dossier.dossierId, commit.expectedVersion); if (result.changes !== 1) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del expediente cambió."); this.insertEvent(commit.event); this.insertIdempotency(commit.idempotency, commit.event.occurredAt); })); }
  async listEvents(dossierId: string) { return this.safely(() => { if (this.#database.prepare("SELECT 1 FROM jurisprudence_publication_dossiers WHERE dossier_id = ?").get(dossierId) === undefined) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente."); return this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_dossier_events WHERE dossier_id = ? ORDER BY sequence ASC").all(dossierId).map(parseEvent); }); }
  async findIdempotencyResult(idempotencyKey: string) { return this.safely(() => { const row = this.#database.prepare("SELECT command_fingerprint, result_json FROM jurisprudence_publication_governance_idempotency WHERE idempotency_key = ? LIMIT 1").get(idempotencyKey); if (row === undefined) return null; const parsed = publicationGovernanceStoredResultSchema.safeParse(parseJson(stringColumn(row, "result_json"))); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El resultado idempotente es inválido."); return clonePublicationGovernanceIdempotency({ idempotencyKey, commandFingerprint: stringColumn(row, "command_fingerprint"), result: parsed.data }); }); }
  async close() { if (this.#closed) return; this.#database.close(); this.#closed = true; }
}
