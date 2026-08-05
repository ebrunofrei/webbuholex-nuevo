import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  assertEditorialRepositoryOpen,
  cloneEditorialCase,
  cloneEditorialEvent,
  cloneEditorialIdempotency,
  jurisprudenceEditorialSqliteMigration001,
  JurisprudenceEditorialWorkflowError,
} from "@/lib/jurisprudence-editorial-case-repository";
import {
  jurisprudenceEditorialCaseSchema,
  jurisprudenceEditorialEventSchema,
  jurisprudenceEditorialStoredResultSchema,
} from "@/lib/schemas/jurisprudence-editorial-workflow";
import type {
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCaseRepository,
  JurisprudenceEditorialCreateCommit,
  JurisprudenceEditorialEvent,
  JurisprudenceEditorialIdempotencyEntry,
  JurisprudenceEditorialUpdateCommit,
} from "@/types/jurisprudence-editorial-workflow";

function column(row: unknown, key: string): unknown {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "La persistencia editorial devolvió una fila inválida.");
  }
  return Reflect.get(row, key);
}

function stringColumn(row: unknown, key: string): string {
  const value = column(row, key);
  if (typeof value !== "string") throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "La persistencia editorial devolvió datos inválidos.");
  return value;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "La persistencia editorial contiene JSON inválido.");
  }
}

function parseCase(row: unknown): JurisprudenceEditorialCase {
  const parsed = jurisprudenceEditorialCaseSchema.safeParse(parseJson(stringColumn(row, "payload_json")));
  if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "El expediente persistido no cumple el contrato.");
  return cloneEditorialCase(parsed.data);
}

function parseEvent(row: unknown): JurisprudenceEditorialEvent {
  const parsed = jurisprudenceEditorialEventSchema.safeParse(parseJson(stringColumn(row, "payload_json")));
  if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "El evento persistido no cumple el contrato.");
  return cloneEditorialEvent(parsed.data);
}

function isActive(editorialCase: JurisprudenceEditorialCase): boolean {
  return editorialCase.closedAt === null && editorialCase.supersededAt === null;
}

export class SqliteJurisprudenceEditorialCaseRepository implements JurisprudenceEditorialCaseRepository {
  readonly #database: DatabaseSync;
  #closed = false;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") {
      const normalized = path.resolve(databasePath).replaceAll("\\", "/").toLocaleLowerCase("en-US");
      if (["/public/", "/app/", "/components/", "/data/"].some((segment) => normalized.includes(segment))) {
        throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La base editorial no puede ubicarse en una superficie pública o de aplicación.");
      }
    }
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (databasePath !== ":memory:") this.#database.exec("PRAGMA journal_mode = WAL;");
    this.#database.exec(jurisprudenceEditorialSqliteMigration001);
  }

  private safely<T>(operation: () => T): T {
    assertEditorialRepositoryOpen(this.#closed);
    try {
      return operation();
    } catch (error) {
      if (error instanceof JurisprudenceEditorialWorkflowError) throw error;
      throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "No fue posible completar la operación de persistencia editorial.");
    }
  }

  private transaction<T>(operation: () => T): T {
    this.#database.exec("BEGIN IMMEDIATE;");
    try {
      const value = operation();
      this.#database.exec("COMMIT;");
      return value;
    } catch (error) {
      this.#database.exec("ROLLBACK;");
      throw error;
    }
  }

  async findById(caseId: string): Promise<JurisprudenceEditorialCase | null> {
    return this.safely(() => {
      const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_editorial_cases WHERE case_id = ? LIMIT 1").get(caseId);
      return row === undefined ? null : parseCase(row);
    });
  }

  async findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudenceEditorialCase | null> {
    return this.safely(() => {
      const row = this.#database.prepare("SELECT payload_json FROM jurisprudence_editorial_cases WHERE record_id = ? AND record_version = ? AND active = 1 LIMIT 1").get(recordId, recordVersion);
      return row === undefined ? null : parseCase(row);
    });
  }

  async findIdempotency(idempotencyKey: string): Promise<JurisprudenceEditorialIdempotencyEntry | null> {
    return this.safely(() => {
      const row = this.#database.prepare("SELECT command_fingerprint, result_json FROM jurisprudence_editorial_idempotency WHERE idempotency_key = ? LIMIT 1").get(idempotencyKey);
      if (row === undefined) return null;
      const parsed = jurisprudenceEditorialStoredResultSchema.safeParse(parseJson(stringColumn(row, "result_json")));
      if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "El resultado idempotente persistido es inválido.");
      return cloneEditorialIdempotency({
        idempotencyKey,
        commandFingerprint: stringColumn(row, "command_fingerprint"),
        result: parsed.data,
      });
    });
  }

  private insertEvent(event: JurisprudenceEditorialEvent): void {
    this.#database.prepare("INSERT INTO jurisprudence_editorial_events (event_id, case_id, sequence, occurred_at, event_type, payload_json) VALUES (?, ?, ?, ?, ?, ?)")
      .run(event.eventId, event.caseId, event.sequence, event.occurredAt, event.type, JSON.stringify(event));
  }

  private insertIdempotency(entry: JurisprudenceEditorialIdempotencyEntry, createdAt: string): void {
    this.#database.prepare("INSERT INTO jurisprudence_editorial_idempotency (idempotency_key, command_fingerprint, result_json, created_at) VALUES (?, ?, ?, ?)")
      .run(entry.idempotencyKey, entry.commandFingerprint, JSON.stringify(entry.result), createdAt);
  }

  async create(commit: JurisprudenceEditorialCreateCommit): Promise<void> {
    this.safely(() => this.transaction(() => {
      if (this.#database.prepare("SELECT 1 FROM jurisprudence_editorial_idempotency WHERE idempotency_key = ?").get(commit.idempotency.idempotencyKey) !== undefined) {
        throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
      }
      if (this.#database.prepare("SELECT 1 FROM jurisprudence_editorial_cases WHERE record_id = ? AND record_version = ? AND active = 1").get(commit.editorialCase.recordId, commit.editorialCase.recordVersion) !== undefined) {
        throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "Ya existe un expediente activo para el registro y versión.");
      }
      this.#database.prepare("INSERT INTO jurisprudence_editorial_cases (case_id, record_id, record_version, case_version, active, updated_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(commit.editorialCase.caseId, commit.editorialCase.recordId, commit.editorialCase.recordVersion, commit.editorialCase.caseVersion, isActive(commit.editorialCase) ? 1 : 0, commit.editorialCase.updatedAt, JSON.stringify(commit.editorialCase));
      this.insertEvent(commit.event);
      this.insertIdempotency(commit.idempotency, commit.event.occurredAt);
    }));
  }

  async update(commit: JurisprudenceEditorialUpdateCommit): Promise<void> {
    this.safely(() => this.transaction(() => {
      if (this.#database.prepare("SELECT 1 FROM jurisprudence_editorial_idempotency WHERE idempotency_key = ?").get(commit.idempotency.idempotencyKey) !== undefined) {
        throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
      }
      const result = this.#database.prepare("UPDATE jurisprudence_editorial_cases SET record_version = ?, case_version = ?, active = ?, updated_at = ?, payload_json = ? WHERE case_id = ? AND case_version = ?")
        .run(commit.editorialCase.recordVersion, commit.editorialCase.caseVersion, isActive(commit.editorialCase) ? 1 : 0, commit.editorialCase.updatedAt, JSON.stringify(commit.editorialCase), commit.editorialCase.caseId, commit.expectedCaseVersion);
      if (result.changes !== 1) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión del expediente cambió durante la operación.");
      this.insertEvent(commit.event);
      this.insertIdempotency(commit.idempotency, commit.event.occurredAt);
    }));
  }

  async getHistory(caseId: string): Promise<readonly JurisprudenceEditorialEvent[]> {
    return this.safely(() => {
      const exists = this.#database.prepare("SELECT 1 FROM jurisprudence_editorial_cases WHERE case_id = ?").get(caseId);
      if (exists === undefined) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
      return this.#database.prepare("SELECT payload_json FROM jurisprudence_editorial_events WHERE case_id = ? ORDER BY sequence ASC").all(caseId).map(parseEvent);
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#database.close();
    this.#closed = true;
  }
}
