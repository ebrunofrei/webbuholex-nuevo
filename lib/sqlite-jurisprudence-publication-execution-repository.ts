import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  assertPublicationExecutionRepositoryOpen,
  clonePublicProjection,
  clonePublicationExecution,
  clonePublicationExecutionEvent,
  clonePublicationExecutionIdempotency,
  isPublicationExecutionCurrent,
  jurisprudencePublicationExecutionSqliteMigration001,
  JurisprudencePublicationExecutionError,
} from "@/lib/jurisprudence-publication-execution-repository";
import {
  jurisprudencePublicProjectionSchema,
  jurisprudencePublicationExecutionEventSchema,
  jurisprudencePublicationExecutionSchema,
  jurisprudencePublicationExecutionViewSchema,
} from "@/lib/schemas/jurisprudence-publication-execution";
import type {
  JurisprudencePublicProjection,
  JurisprudencePublicProjectionRepository,
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionCreateCommit,
  JurisprudencePublicationExecutionEvent,
  JurisprudencePublicationExecutionIdempotencyEntry,
  JurisprudencePublicationExecutionRepository,
  JurisprudencePublicationExecutionUpdateCommit,
} from "@/types/jurisprudence-publication-execution";

function column(row: unknown, key: string): unknown {
  if (row === null || typeof row !== "object" || Array.isArray(row)) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La persistencia devolvió una fila inválida.");
  return Reflect.get(row, key);
}
function stringColumn(row: unknown, key: string): string {
  const value = column(row, key);
  if (typeof value !== "string") throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La persistencia devolvió datos inválidos.");
  return value;
}
function parseJson(value: string): unknown { try { return JSON.parse(value); } catch { throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido."); } }
function parseExecution(row: unknown): JurisprudencePublicationExecution {
  const parsed = jurisprudencePublicationExecutionSchema.safeParse(parseJson(stringColumn(row, "payload_json")));
  if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La ejecución persistida es inválida.");
  return clonePublicationExecution(parsed.data);
}
function parseProjection(row: unknown): JurisprudencePublicProjection {
  const parsed = jurisprudencePublicProjectionSchema.safeParse(parseJson(stringColumn(row, "payload_json")));
  if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La proyección persistida es inválida.");
  return clonePublicProjection(parsed.data);
}
function parseEvent(row: unknown): JurisprudencePublicationExecutionEvent {
  const parsed = jurisprudencePublicationExecutionEventSchema.safeParse(parseJson(stringColumn(row, "payload_json")));
  if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "El evento persistido es inválido.");
  return clonePublicationExecutionEvent(parsed.data);
}

export class SqliteJurisprudencePublicationExecutionRepository implements JurisprudencePublicationExecutionRepository {
  readonly #database: DatabaseSync;
  #closed = false;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") {
      const normalized = path.resolve(databasePath).replaceAll("\\", "/").toLocaleLowerCase("en-US");
      if (["/public/", "/app/", "/components/", "/data/"].some((segment) => normalized.includes(segment))) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "La base no puede ubicarse en una superficie pública.");
    }
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (databasePath !== ":memory:") this.#database.exec("PRAGMA journal_mode = WAL;");
    this.#database.exec(jurisprudencePublicationExecutionSqliteMigration001);
  }
  private safely<T>(operation: () => T): T {
    assertPublicationExecutionRepositoryOpen(this.#closed);
    try { return operation(); } catch (error) {
      if (error instanceof JurisprudencePublicationExecutionError) throw error;
      throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "No fue posible completar la persistencia de ejecución.");
    }
  }
  private transaction<T>(operation: () => T): T {
    this.#database.exec("BEGIN IMMEDIATE;");
    try { const result = operation(); this.#database.exec("COMMIT;"); return result; }
    catch (error) { this.#database.exec("ROLLBACK;"); throw error; }
  }
  private insertEvent(event: JurisprudencePublicationExecutionEvent): void {
    this.#database.prepare("INSERT INTO jurisprudence_publication_execution_events (event_id, execution_id, record_id, sequence, event_type, payload_json) VALUES (?, ?, ?, ?, ?, ?)").run(event.eventId, event.executionId, event.recordId, event.sequence, event.type, JSON.stringify(event));
  }
  private insertIdempotency(entry: JurisprudencePublicationExecutionIdempotencyEntry, createdAt: string): void {
    this.#database.prepare("INSERT INTO jurisprudence_publication_execution_idempotency (idempotency_key, command_fingerprint, result_json, created_at) VALUES (?, ?, ?, ?)").run(entry.idempotencyKey, entry.commandFingerprint, JSON.stringify(entry.result), createdAt);
  }
  async findById(executionId: string) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_executions WHERE execution_id = ? LIMIT 1").get(executionId); return row === undefined ? null : parseExecution(row); }); }
  async findActiveByRecordVersion(recordId: string, recordVersion: number) {
    return this.safely(() => this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_executions WHERE record_id = ? AND record_version = ? AND status = 'executed'").all(recordId, recordVersion).map(parseExecution).find(isPublicationExecutionCurrent) ?? null);
  }
  async findLatestByRecordVersion(recordId: string, recordVersion: number) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_executions WHERE record_id = ? AND record_version = ? ORDER BY rowid DESC LIMIT 1").get(recordId, recordVersion); return row === undefined ? null : parseExecution(row); }); }
  async listHistory(recordId: string) { return this.safely(() => this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_execution_events WHERE record_id = ? ORDER BY rowid ASC").all(recordId).map(parseEvent)); }
  async findIdempotencyResult(idempotencyKey: string) {
    return this.safely(() => {
      const row = this.#database.prepare("SELECT command_fingerprint, result_json FROM jurisprudence_publication_execution_idempotency WHERE idempotency_key = ? LIMIT 1").get(idempotencyKey);
      if (row === undefined) return null;
      const parsed = jurisprudencePublicationExecutionViewSchema.safeParse(parseJson(stringColumn(row, "result_json")));
      if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "El resultado idempotente es inválido.");
      return clonePublicationExecutionIdempotency({ idempotencyKey, commandFingerprint: stringColumn(row, "command_fingerprint"), result: parsed.data });
    });
  }
  async createExecution(commit: JurisprudencePublicationExecutionCreateCommit) {
    this.safely(() => this.transaction(() => {
      const active = this.#database.prepare("SELECT payload_json FROM jurisprudence_publication_executions WHERE record_id = ? AND record_version = ? AND status = 'executed'").all(commit.execution.recordId, commit.execution.recordVersion).map(parseExecution).some(isPublicationExecutionCurrent);
      if (active) throw new JurisprudencePublicationExecutionError("EXECUTION_ALREADY_ACTIVE", "Ya existe una ejecución vigente.");
      this.#database.prepare("INSERT INTO jurisprudence_publication_executions (execution_id, record_id, record_version, execution_version, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)").run(commit.execution.executionId, commit.execution.recordId, commit.execution.recordVersion, commit.execution.version, commit.execution.status, JSON.stringify(commit.execution));
      this.#database.prepare("INSERT INTO jurisprudence_public_projections (projection_id, execution_id, record_id, record_version, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)").run(commit.projection.projectionId, commit.projection.executionId, commit.projection.recordId, commit.projection.recordVersion, commit.projection.status, JSON.stringify(commit.projection));
      this.insertEvent(commit.event);
      this.insertIdempotency(commit.idempotency, commit.event.occurredAt);
    }));
  }
  async updateExecution(commit: JurisprudencePublicationExecutionUpdateCommit) {
    this.safely(() => this.transaction(() => {
      const result = this.#database.prepare("UPDATE jurisprudence_publication_executions SET execution_version = ?, status = ?, payload_json = ? WHERE execution_id = ? AND execution_version = ?").run(commit.execution.version, commit.execution.status, JSON.stringify(commit.execution), commit.execution.executionId, commit.expectedVersion);
      if (result.changes !== 1) throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "La versión de ejecución cambió.");
      const projection = this.#database.prepare("UPDATE jurisprudence_public_projections SET status = ?, payload_json = ? WHERE projection_id = ? AND execution_id = ?").run(commit.projection.status, JSON.stringify(commit.projection), commit.projection.projectionId, commit.execution.executionId);
      if (projection.changes !== 1) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La proyección vinculada no existe.");
      this.insertEvent(commit.event);
      this.insertIdempotency(commit.idempotency, commit.event.occurredAt);
    }));
  }
  async findProjectionById(projectionId: string) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_public_projections WHERE projection_id = ? LIMIT 1").get(projectionId); return row === undefined ? null : parseProjection(row); }); }
  async findActiveProjectionByRecordVersion(recordId: string, recordVersion: number) { return this.safely(() => { const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_public_projections WHERE record_id = ? AND record_version = ? AND status = 'active_internal' LIMIT 1").get(recordId, recordVersion); return row === undefined ? null : parseProjection(row); }); }
  async listProjectionsByRecord(recordId: string) { return this.safely(() => this.#database.prepare("SELECT payload_json FROM jurisprudence_public_projections WHERE record_id = ? ORDER BY rowid ASC").all(recordId).map(parseProjection)); }
  async close() { if (this.#closed) return; this.#database.close(); this.#closed = true; }
}

export class SqliteJurisprudencePublicProjectionRepository implements JurisprudencePublicProjectionRepository {
  readonly #source: SqliteJurisprudencePublicationExecutionRepository;
  constructor(source: SqliteJurisprudencePublicationExecutionRepository) { this.#source = source; }
  findById(projectionId: string) { return this.#source.findProjectionById(projectionId); }
  findActiveByRecordVersion(recordId: string, recordVersion: number) { return this.#source.findActiveProjectionByRecordVersion(recordId, recordVersion); }
  listByRecord(recordId: string) { return this.#source.listProjectionsByRecord(recordId); }
  async close() { /* lifecycle owned by the transactional execution repository */ }
}
