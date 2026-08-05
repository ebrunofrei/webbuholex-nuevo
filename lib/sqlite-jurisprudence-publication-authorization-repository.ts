import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  assertPublicationAuthorizationRepositoryOpen,
  clonePublicationAuthorizationCase,
  clonePublicationAuthorizationEvent,
  clonePublicationAuthorizationIdempotency,
  isPublicationAuthorizationActive,
  jurisprudencePublicationAuthorizationSqliteMigration001,
  JurisprudencePublicationAuthorizationError,
} from "@/lib/jurisprudence-publication-authorization-repository";
import {
  jurisprudencePublicationAuthorizationCaseSchema,
  jurisprudencePublicationAuthorizationEventSchema,
  jurisprudencePublicationAuthorizationViewSchema,
} from "@/lib/schemas/jurisprudence-publication-authorization";
import type {
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationCreateCommit,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationIdempotencyEntry,
  JurisprudencePublicationAuthorizationRepository,
  JurisprudencePublicationAuthorizationUpdateCommit,
} from "@/types/jurisprudence-publication-authorization";

function column(row: unknown, key: string): unknown {
  if (row === null || typeof row !== "object" || Array.isArray(row)) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "La persistencia devolvió una fila inválida.");
  return Reflect.get(row, key);
}
function stringColumn(row: unknown, key: string): string { const value = column(row, key); if (typeof value !== "string") throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "La persistencia devolvió datos inválidos."); return value; }
function parseJson(value: string): unknown { try { return JSON.parse(value); } catch { throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido."); } }
function parseCase(row: unknown): JurisprudencePublicationAuthorizationCase { const parsed = jurisprudencePublicationAuthorizationCaseSchema.safeParse(parseJson(stringColumn(row, "payload_json"))); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "La autorización persistida es inválida."); return clonePublicationAuthorizationCase(parsed.data); }
function parseEvent(row: unknown): JurisprudencePublicationAuthorizationEvent { const parsed = jurisprudencePublicationAuthorizationEventSchema.safeParse(parseJson(stringColumn(row, "payload_json"))); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "El evento persistido es inválido."); return clonePublicationAuthorizationEvent(parsed.data); }

export class SqliteJurisprudencePublicationAuthorizationRepository implements JurisprudencePublicationAuthorizationRepository {
  readonly #database: DatabaseSync;
  #closed = false;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") {
      const normalized = path.resolve(databasePath).replaceAll("\\", "/").toLocaleLowerCase("en-US");
      if (["/public/", "/app/", "/components/", "/data/"].some((segment) => normalized.includes(segment))) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La base no puede ubicarse en una superficie pública.");
    }
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (databasePath !== ":memory:") this.#database.exec("PRAGMA journal_mode = WAL;");
    this.#database.exec(jurisprudencePublicationAuthorizationSqliteMigration001);
  }
  private safely<T>(operation: () => T): T { assertPublicationAuthorizationRepositoryOpen(this.#closed); try { return operation(); } catch (error) { if (error instanceof JurisprudencePublicationAuthorizationError) throw error; throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "No fue posible completar la persistencia de autorizaciones."); } }
  private transaction<T>(operation: () => T): T { this.#database.exec("BEGIN IMMEDIATE;"); try { const result = operation(); this.#database.exec("COMMIT;"); return result; } catch (error) { this.#database.exec("ROLLBACK;"); throw error; } }
  private insertEvent(event: JurisprudencePublicationAuthorizationEvent, recordId: string): void { this.#database.prepare("INSERT INTO jurisprudence_publication_authorization_events (event_id, authorization_case_id, record_id, sequence, event_type, payload_json) VALUES (?, ?, ?, ?, ?, ?)").run(event.eventId, event.authorizationCaseId, recordId, event.sequence, event.type, JSON.stringify(event)); }
  private insertIdempotency(entry: JurisprudencePublicationAuthorizationIdempotencyEntry, createdAt: string): void { this.#database.prepare("INSERT INTO jurisprudence_publication_authorization_idempotency (idempotency_key, command_fingerprint, result_json, created_at) VALUES (?, ?, ?, ?)").run(entry.idempotencyKey, entry.commandFingerprint, JSON.stringify(entry.result), createdAt); }
  async findById(authorizationCaseId: string) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_authorization_cases WHERE authorization_case_id = ? LIMIT 1").get(authorizationCaseId); return row === undefined ? null : parseCase(row); }); }
  async findActiveByRecordVersion(recordId: string, recordVersion: number, evaluatedAt: string) { return this.safely(() => { const rows = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_authorization_cases WHERE record_id = ? AND record_version = ? AND status = 'authorized'").all(recordId, recordVersion); return rows.map(parseCase).find((item) => isPublicationAuthorizationActive(item, evaluatedAt)) ?? null; }); }
  async listHistoryByRecord(recordId: string) { return this.safely(() => this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_authorization_events WHERE record_id = ? ORDER BY rowid ASC").all(recordId).map(parseEvent)); }
  async createDecision(commit: JurisprudencePublicationAuthorizationCreateCommit) {
    this.safely(() => this.transaction(() => {
      if (commit.authorizationCase.status === "authorized") {
        const existing = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_authorization_cases WHERE record_id = ? AND record_version = ? AND status = 'authorized'").all(commit.authorizationCase.recordId, commit.authorizationCase.recordVersion).map(parseCase).some((item) => isPublicationAuthorizationActive(item, commit.authorizationCase.decidedAt));
        if (existing) throw new JurisprudencePublicationAuthorizationError("EXISTING_ACTIVE_AUTHORIZATION", "Ya existe una autorización vigente.");
      }
      this.#database.prepare("INSERT INTO jurisprudence_publication_authorization_cases (authorization_case_id, record_id, record_version, authorization_version, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)").run(commit.authorizationCase.authorizationCaseId, commit.authorizationCase.recordId, commit.authorizationCase.recordVersion, commit.authorizationCase.version, commit.authorizationCase.status, JSON.stringify(commit.authorizationCase));
      this.insertEvent(commit.event, commit.authorizationCase.recordId);
      this.insertIdempotency(commit.idempotency, commit.event.occurredAt);
    }));
  }
  private update(commit: JurisprudencePublicationAuthorizationUpdateCommit): void {
    this.safely(() => this.transaction(() => {
      const result = this.#database.prepare("UPDATE jurisprudence_publication_authorization_cases SET authorization_version = ?, status = ?, payload_json = ? WHERE authorization_case_id = ? AND authorization_version = ?").run(commit.authorizationCase.version, commit.authorizationCase.status, JSON.stringify(commit.authorizationCase), commit.authorizationCase.authorizationCaseId, commit.expectedVersion);
      if (result.changes !== 1) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión de autorización cambió.");
      this.insertEvent(commit.event, commit.authorizationCase.recordId);
      this.insertIdempotency(commit.idempotency, commit.event.occurredAt);
    }));
  }
  async revokeAuthorization(commit: JurisprudencePublicationAuthorizationUpdateCommit) { this.update(commit); }
  async supersedeByRecordVersion(commit: JurisprudencePublicationAuthorizationUpdateCommit) { this.update(commit); }
  async findIdempotencyResult(idempotencyKey: string) { return this.safely(() => { const row = this.#database.prepare("SELECT command_fingerprint, result_json FROM jurisprudence_publication_authorization_idempotency WHERE idempotency_key = ? LIMIT 1").get(idempotencyKey); if (row === undefined) return null; const parsed = jurisprudencePublicationAuthorizationViewSchema.safeParse(parseJson(stringColumn(row, "result_json"))); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "El resultado idempotente es inválido."); return clonePublicationAuthorizationIdempotency({ idempotencyKey, commandFingerprint: stringColumn(row, "command_fingerprint"), result: parsed.data }); }); }
  async close() { if (this.#closed) return; this.#database.close(); this.#closed = true; }
}
