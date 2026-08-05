import { randomUUID } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { buildJurisprudenceDeduplicationKey, getJurisprudenceExternalIdentity } from "@/lib/jurisprudence-identity";
import {
  fromJurisprudencePersistedRow,
  jurisprudenceSqliteMigration001,
  toJurisprudencePersistedRow,
  toJurisprudencePersistedVersionRow,
} from "@/lib/jurisprudence-persistence-model";
import { JurisprudenceRepositoryError, toJurisprudencePersistenceError } from "@/lib/jurisprudence-repository-error";
import {
  cloneJurisprudenceNewRecord,
  cloneJurisprudenceRecord,
  nextRepositoryTimestamp,
  normalizeJurisprudenceRepositoryQuery,
  validateJurisprudenceRecordForPersistence,
} from "@/lib/jurisprudence-repository-utils";
import { jurisprudenceCreateInputSchema, jurisprudenceUpdateInputSchema } from "@/lib/schemas/jurisprudence-repository";
import { jurisprudenceRecordSchema } from "@/lib/schemas/jurisprudence";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type {
  JurisprudenceCreateInput,
  JurisprudenceExternalIdentity,
  JurisprudencePersistedRecordRow,
  JurisprudenceRepository,
  JurisprudenceRepositoryDependencies,
  JurisprudenceRepositoryFilters,
  JurisprudenceRepositoryListInput,
  JurisprudenceRepositoryPage,
  JurisprudenceRepositorySearchInput,
  JurisprudenceUpdateInput,
  JurisprudenceVersionChangeKind,
  JurisprudenceVersionEntry,
  NormalizedJurisprudenceRepositoryQuery,
} from "@/types/jurisprudence-repository";

type SqlParameter = string | number | null;
type UnknownRow = Record<string, unknown>;

const defaultDependencies: JurisprudenceRepositoryDependencies = {
  now: () => new Date().toISOString(),
  generateId: () => randomUUID(),
};

function requireRow(row: unknown, context: string): UnknownRow {
  if (row === null || typeof row !== "object" || Array.isArray(row)) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", `La consulta ${context} devolvió una fila inválida.`);
  return row as UnknownRow;
}

function stringValue(row: UnknownRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", `La columna ${key} no contiene texto válido.`);
  return value;
}

function nullableStringValue(row: UnknownRow, key: string): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "string") throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", `La columna ${key} no contiene texto anulable válido.`);
  return value;
}

function numberValue(row: UnknownRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", `La columna ${key} no contiene un número válido.`);
  return value;
}

function databaseRowToPersistedRow(raw: unknown): JurisprudencePersistedRecordRow {
  const row = requireRow(raw, "de registro");
  return {
    id: stringValue(row, "id"),
    slug: nullableStringValue(row, "slug"),
    recordVersion: numberValue(row, "record_version"),
    deduplicationKey: stringValue(row, "deduplication_key"),
    sourceType: stringValue(row, "source_type") as JurisprudencePersistedRecordRow["sourceType"],
    sourceDocumentId: nullableStringValue(row, "source_document_id"),
    normalizedCaseNumber: stringValue(row, "normalized_case_number"),
    normalizedResolutionNumber: stringValue(row, "normalized_resolution_number"),
    institutionId: stringValue(row, "institution_id"),
    normalizedMatter: stringValue(row, "normalized_matter"),
    normalizedSearchText: stringValue(row, "normalized_search_text"),
    issuedAt: stringValue(row, "issued_at"),
    editorialStatus: stringValue(row, "editorial_status") as JurisprudencePersistedRecordRow["editorialStatus"],
    publicationStatus: stringValue(row, "publication_status") as JurisprudencePersistedRecordRow["publicationStatus"],
    verificationStatus: stringValue(row, "verification_status") as JurisprudencePersistedRecordRow["verificationStatus"],
    createdAt: stringValue(row, "created_at"),
    updatedAt: stringValue(row, "updated_at"),
    payloadJson: stringValue(row, "payload_json"),
  };
}

function normalizeSqlText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export class SqliteJurisprudenceRepository implements JurisprudenceRepository {
  private readonly database: DatabaseSync;
  private closed = false;

  constructor(databasePath: string, private readonly dependencies: JurisprudenceRepositoryDependencies = defaultDependencies) {
    if (databasePath !== ":memory:") {
      const normalized = path.resolve(databasePath).replace(/\\/g, "/").toLocaleLowerCase("en-US");
      if (normalized.includes("/public/")) throw new JurisprudenceRepositoryError("VALIDATION_ERROR", "La base jurisprudencial no puede ubicarse dentro de public/.");
    }
    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (databasePath !== ":memory:") this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec(jurisprudenceSqliteMigration001);
  }

  private assertOpen(): void {
    if (this.closed) throw new JurisprudenceRepositoryError("RESOURCE_CLOSED", "El repositorio SQLite está cerrado.");
  }

  private safely<T>(operation: () => T): T {
    this.assertOpen();
    try {
      return operation();
    } catch (error) {
      throw toJurisprudencePersistenceError(error);
    }
  }

  private transaction<T>(operation: () => T): T {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const result = operation();
      this.database.exec("COMMIT;");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  private selectBy(column: "id" | "slug" | "deduplication_key", value: string): JurisprudenceRecord | null {
    const row = this.database.prepare(`SELECT * FROM jurisprudence_records WHERE ${column} = ? LIMIT 1`).get(value);
    return row ? fromJurisprudencePersistedRow(databaseRowToPersistedRow(row)) : null;
  }

  private insertRecord(record: JurisprudenceRecord): void {
    const row = toJurisprudencePersistedRow(record);
    this.database.prepare(`INSERT INTO jurisprudence_records (
      id, slug, record_version, deduplication_key, source_type, source_document_id,
      normalized_case_number, normalized_resolution_number, institution_id, normalized_matter,
      normalized_search_text, issued_at, editorial_status, publication_status, verification_status,
      created_at, updated_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      row.id, row.slug, row.recordVersion, row.deduplicationKey, row.sourceType, row.sourceDocumentId,
      row.normalizedCaseNumber, row.normalizedResolutionNumber, row.institutionId, row.normalizedMatter,
      row.normalizedSearchText, row.issuedAt, row.editorialStatus, row.publicationStatus, row.verificationStatus,
      row.createdAt, row.updatedAt, row.payloadJson,
    );
  }

  private insertVersion(record: JurisprudenceRecord, changeKind: JurisprudenceVersionChangeKind): void {
    const version = toJurisprudencePersistedVersionRow(record, changeKind);
    this.database.prepare("INSERT INTO jurisprudence_record_versions (record_id, version, change_kind, recorded_at, snapshot_json) VALUES (?, ?, ?, ?, ?)")
      .run(version.recordId, version.version, version.changeKind, version.recordedAt, version.snapshotJson);
  }

  async findById(id: string): Promise<JurisprudenceRecord | null> {
    return this.safely(() => this.selectBy("id", id));
  }

  async findBySlug(slug: string): Promise<JurisprudenceRecord | null> {
    return this.safely(() => this.selectBy("slug", slug));
  }

  async findByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<JurisprudenceRecord | null> {
    return this.safely(() => this.selectBy("deduplication_key", buildJurisprudenceDeduplicationKey(identity)));
  }

  async create(input: JurisprudenceCreateInput): Promise<JurisprudenceRecord> {
    return this.safely(() => {
      const parsed = jurisprudenceCreateInputSchema.parse(input);
      const recordInput = cloneJurisprudenceNewRecord(parsed.record);
      const inputJson = JSON.stringify(recordInput);
      return this.transaction(() => {
        const idempotencyRaw = this.database.prepare("SELECT input_json, record_id FROM jurisprudence_idempotency WHERE idempotency_key = ?").get(parsed.idempotencyKey);
        if (idempotencyRaw) {
          const idempotency = requireRow(idempotencyRaw, "de idempotencia");
          const recordId = stringValue(idempotency, "record_id");
          if (stringValue(idempotency, "input_json") !== inputJson) throw new JurisprudenceRepositoryError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue usada con otro contenido.", { recordId });
          const existing = this.selectBy("id", recordId);
          if (!existing) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "La referencia de idempotencia no conserva su registro.", { recordId });
          return existing;
        }

        const timestamp = nextRepositoryTimestamp(this.dependencies.now());
        const candidate = validateJurisprudenceRecordForPersistence({ ...recordInput, id: this.dependencies.generateId(), recordVersion: 1, createdAt: timestamp, updatedAt: timestamp });
        const key = buildJurisprudenceDeduplicationKey(getJurisprudenceExternalIdentity(candidate));
        if (this.selectBy("deduplication_key", key)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "Ya existe un registro con la misma identidad externa.", { deduplicationKey: key });
        if (candidate.slug && this.selectBy("slug", candidate.slug)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "Ya existe un registro con el mismo slug.");
        this.insertRecord(candidate);
        this.insertVersion(candidate, "created");
        this.database.prepare("INSERT INTO jurisprudence_idempotency (idempotency_key, input_json, record_id, created_at) VALUES (?, ?, ?, ?)")
          .run(parsed.idempotencyKey, inputJson, candidate.id, candidate.createdAt);
        return cloneJurisprudenceRecord(candidate);
      });
    });
  }

  async update(input: JurisprudenceUpdateInput): Promise<JurisprudenceRecord> {
    return this.safely(() => {
      const parsed = jurisprudenceUpdateInputSchema.parse(input);
      return this.transaction(() => {
        const current = this.selectBy("id", parsed.id);
        if (!current) throw new JurisprudenceRepositoryError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { recordId: parsed.id });
        if (current.recordVersion !== parsed.expectedVersion) throw new JurisprudenceRepositoryError("VERSION_CONFLICT", "La versión esperada no coincide con la versión persistida.", { recordId: parsed.id, expectedVersion: parsed.expectedVersion, actualVersion: current.recordVersion });
        const candidate = validateJurisprudenceRecordForPersistence({
          ...cloneJurisprudenceNewRecord(parsed.record),
          id: current.id,
          recordVersion: current.recordVersion + 1,
          createdAt: current.createdAt,
          updatedAt: nextRepositoryTimestamp(this.dependencies.now(), current.updatedAt),
        });
        const row = toJurisprudencePersistedRow(candidate);
        const duplicate = this.database.prepare("SELECT id FROM jurisprudence_records WHERE deduplication_key = ? AND id <> ? LIMIT 1").get(row.deduplicationKey, candidate.id);
        if (duplicate) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "La actualización colisiona con otra identidad externa.", { recordId: candidate.id, deduplicationKey: row.deduplicationKey });
        if (candidate.slug && this.database.prepare("SELECT id FROM jurisprudence_records WHERE slug = ? AND id <> ? LIMIT 1").get(candidate.slug, candidate.id)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "La actualización colisiona con otro slug.", { recordId: candidate.id });
        const result = this.database.prepare(`UPDATE jurisprudence_records SET
          slug = ?, record_version = ?, deduplication_key = ?, source_type = ?, source_document_id = ?,
          normalized_case_number = ?, normalized_resolution_number = ?, institution_id = ?, normalized_matter = ?,
          normalized_search_text = ?, issued_at = ?, editorial_status = ?, publication_status = ?, verification_status = ?,
          updated_at = ?, payload_json = ? WHERE id = ? AND record_version = ?`).run(
          row.slug, row.recordVersion, row.deduplicationKey, row.sourceType, row.sourceDocumentId,
          row.normalizedCaseNumber, row.normalizedResolutionNumber, row.institutionId, row.normalizedMatter,
          row.normalizedSearchText, row.issuedAt, row.editorialStatus, row.publicationStatus, row.verificationStatus,
          row.updatedAt, row.payloadJson, row.id, parsed.expectedVersion,
        );
        if (result.changes !== 1) throw new JurisprudenceRepositoryError("VERSION_CONFLICT", "La versión cambió durante la actualización.", { recordId: row.id, expectedVersion: parsed.expectedVersion });
        this.insertVersion(candidate, parsed.changeKind);
        return cloneJurisprudenceRecord(candidate);
      });
    });
  }

  private buildWhere(query: NormalizedJurisprudenceRepositoryQuery): { clause: string; parameters: SqlParameter[] } {
    const clauses: string[] = [];
    const parameters: SqlParameter[] = [];
    const addExact = (column: string, value: string | undefined) => {
      if (value === undefined) return;
      clauses.push(`${column} = ?`);
      parameters.push(normalizeSqlText(value));
    };
    addExact("normalized_case_number", query.filters.caseNumber);
    addExact("normalized_resolution_number", query.filters.resolutionNumber);
    addExact("institution_id", query.filters.institutionId);
    addExact("normalized_matter", query.filters.matter);
    if (query.filters.editorialStatus) { clauses.push("editorial_status = ?"); parameters.push(query.filters.editorialStatus); }
    if (query.filters.publicationStatus) { clauses.push("publication_status = ?"); parameters.push(query.filters.publicationStatus); }
    if (query.filters.verificationStatus) { clauses.push("verification_status = ?"); parameters.push(query.filters.verificationStatus); }
    if (query.filters.issuedFrom) { clauses.push("issued_at >= ?"); parameters.push(query.filters.issuedFrom); }
    if (query.filters.issuedTo) { clauses.push("issued_at <= ?"); parameters.push(query.filters.issuedTo); }
    if (query.q) { clauses.push("normalized_search_text LIKE ? ESCAPE '\\'"); parameters.push(`%${escapeLike(query.q)}%`); }
    return { clause: clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`, parameters };
  }

  private executeQuery(input: JurisprudenceRepositoryListInput | JurisprudenceRepositorySearchInput): JurisprudenceRepositoryPage {
    const query = normalizeJurisprudenceRepositoryQuery(input);
    const where = this.buildWhere(query);
    const order = {
      issued_at_asc: "issued_at ASC, id ASC",
      issued_at_desc: "issued_at DESC, id ASC",
      updated_at_asc: "updated_at ASC, id ASC",
      updated_at_desc: "updated_at DESC, id ASC",
    }[query.sort];
    const totalRaw = this.database.prepare(`SELECT COUNT(*) AS total FROM jurisprudence_records${where.clause}`).get(...where.parameters);
    const total = numberValue(requireRow(totalRaw, "de conteo"), "total");
    const offset = (query.page - 1) * query.pageSize;
    const rows = this.database.prepare(`SELECT * FROM jurisprudence_records${where.clause} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...where.parameters, query.pageSize, offset);
    return {
      items: rows.map((row) => fromJurisprudencePersistedRow(databaseRowToPersistedRow(row))),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      sort: query.sort,
    };
  }

  async list(input: JurisprudenceRepositoryListInput = {}): Promise<JurisprudenceRepositoryPage> {
    return this.safely(() => this.executeQuery(input));
  }

  async search(input: JurisprudenceRepositorySearchInput): Promise<JurisprudenceRepositoryPage> {
    return this.safely(() => this.executeQuery(input));
  }

  async count(filters: JurisprudenceRepositoryFilters = {}): Promise<number> {
    return this.safely(() => this.executeQuery({ filters, page: 1, pageSize: 1 }).total);
  }

  async existsByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<boolean> {
    return (await this.findByExternalIdentity(identity)) !== null;
  }

  async getVersionHistory(id: string): Promise<readonly JurisprudenceVersionEntry[]> {
    return this.safely(() => {
      if (!this.selectBy("id", id)) throw new JurisprudenceRepositoryError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { recordId: id });
      const rows = this.database.prepare("SELECT record_id, version, change_kind, recorded_at, snapshot_json FROM jurisprudence_record_versions WHERE record_id = ? ORDER BY version ASC").all(id);
      return rows.map((raw) => {
        const row = requireRow(raw, "de historial");
        let snapshot: unknown;
        try { snapshot = JSON.parse(stringValue(row, "snapshot_json")); } catch { throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "El historial contiene JSON inválido.", { recordId: id }); }
        const parsed = jurisprudenceRecordSchema.safeParse(snapshot);
        if (!parsed.success) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "El historial no cumple el contrato canónico.", { recordId: id });
        return {
          recordId: stringValue(row, "record_id"),
          version: numberValue(row, "version"),
          changeKind: stringValue(row, "change_kind") as JurisprudenceVersionChangeKind,
          recordedAt: stringValue(row, "recorded_at"),
          snapshot: cloneJurisprudenceRecord(parsed.data as JurisprudenceRecord),
        };
      });
    });
  }

  clearForTests(): void {
    this.safely(() => this.transaction(() => {
      this.database.exec("DELETE FROM jurisprudence_idempotency; DELETE FROM jurisprudence_record_versions; DELETE FROM jurisprudence_records;");
    }));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.database.close();
    this.closed = true;
  }
}
