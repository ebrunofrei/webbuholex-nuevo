import { randomUUID } from "node:crypto";
import { buildJurisprudenceDeduplicationKey, getJurisprudenceExternalIdentity } from "@/lib/jurisprudence-identity";
import { JurisprudenceRepositoryError, toJurisprudencePersistenceError } from "@/lib/jurisprudence-repository-error";
import {
  cloneJurisprudenceNewRecord,
  cloneJurisprudenceRecord,
  nextRepositoryTimestamp,
  normalizeJurisprudenceRepositoryQuery,
  paginateJurisprudenceRecords,
  recordMatchesDeterministicQuery,
  recordMatchesJurisprudenceFilters,
  sortJurisprudenceRecords,
  validateJurisprudenceRecordForPersistence,
} from "@/lib/jurisprudence-repository-utils";
import { jurisprudenceCreateInputSchema, jurisprudenceUpdateInputSchema } from "@/lib/schemas/jurisprudence-repository";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type {
  JurisprudenceCreateInput,
  JurisprudenceExternalIdentity,
  JurisprudenceRepository,
  JurisprudenceRepositoryDependencies,
  JurisprudenceRepositoryFilters,
  JurisprudenceRepositoryListInput,
  JurisprudenceRepositoryPage,
  JurisprudenceRepositorySearchInput,
  JurisprudenceUpdateInput,
  JurisprudenceVersionEntry,
} from "@/types/jurisprudence-repository";

const defaultDependencies: JurisprudenceRepositoryDependencies = {
  now: () => new Date().toISOString(),
  generateId: () => randomUUID(),
};

interface IdempotencyEntry {
  inputJson: string;
  recordId: string;
}

export class InMemoryJurisprudenceRepository implements JurisprudenceRepository {
  private readonly records = new Map<string, JurisprudenceRecord>();
  private readonly history = new Map<string, JurisprudenceVersionEntry[]>();
  private readonly idempotency = new Map<string, IdempotencyEntry>();
  private closed = false;

  constructor(private readonly dependencies: JurisprudenceRepositoryDependencies = defaultDependencies) {}

  private assertOpen(): void {
    if (this.closed) throw new JurisprudenceRepositoryError("RESOURCE_CLOSED", "El repositorio en memoria está cerrado.");
  }

  private safely<T>(operation: () => T): T {
    this.assertOpen();
    try { return operation(); } catch (error) { throw toJurisprudencePersistenceError(error); }
  }

  private findStoredByDeduplicationKey(key: string, excludeId: string | null = null): JurisprudenceRecord | null {
    return [...this.records.values()].find((record) => record.id !== excludeId && buildJurisprudenceDeduplicationKey(getJurisprudenceExternalIdentity(record)) === key) ?? null;
  }

  private findStoredBySlug(slug: string, excludeId: string | null = null): JurisprudenceRecord | null {
    return [...this.records.values()].find((record) => record.id !== excludeId && record.slug === slug) ?? null;
  }

  async findById(id: string): Promise<JurisprudenceRecord | null> {
    this.assertOpen();
    const record = this.records.get(id);
    return record ? cloneJurisprudenceRecord(record) : null;
  }

  async findBySlug(slug: string): Promise<JurisprudenceRecord | null> {
    this.assertOpen();
    const record = this.findStoredBySlug(slug);
    return record ? cloneJurisprudenceRecord(record) : null;
  }

  async findByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<JurisprudenceRecord | null> {
    return this.safely(() => {
      const record = this.findStoredByDeduplicationKey(buildJurisprudenceDeduplicationKey(identity));
      return record ? cloneJurisprudenceRecord(record) : null;
    });
  }

  async create(input: JurisprudenceCreateInput): Promise<JurisprudenceRecord> {
    return this.safely(() => {
    const parsed = jurisprudenceCreateInputSchema.parse(input);
    const recordInput = cloneJurisprudenceNewRecord(parsed.record);
    const inputJson = JSON.stringify(recordInput);
    const previousAttempt = this.idempotency.get(parsed.idempotencyKey);
    if (previousAttempt) {
      if (previousAttempt.inputJson !== inputJson) throw new JurisprudenceRepositoryError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue usada con otro contenido.", { recordId: previousAttempt.recordId });
      const existing = this.records.get(previousAttempt.recordId);
      if (!existing) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "La referencia de idempotencia no conserva su registro.", { recordId: previousAttempt.recordId });
      return cloneJurisprudenceRecord(existing);
    }

    const timestamp = nextRepositoryTimestamp(this.dependencies.now());
    const candidate = validateJurisprudenceRecordForPersistence({ ...recordInput, id: this.dependencies.generateId(), recordVersion: 1, createdAt: timestamp, updatedAt: timestamp });
    const deduplicationKey = buildJurisprudenceDeduplicationKey(getJurisprudenceExternalIdentity(candidate));
    if (this.findStoredByDeduplicationKey(deduplicationKey)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "Ya existe un registro con la misma identidad externa.", { deduplicationKey });
    if (candidate.slug && this.findStoredBySlug(candidate.slug)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "Ya existe un registro con el mismo slug.");

    const stored = cloneJurisprudenceRecord(candidate);
    this.records.set(stored.id, stored);
    this.history.set(stored.id, [{ recordId: stored.id, version: 1, changeKind: "created", recordedAt: stored.updatedAt, snapshot: cloneJurisprudenceRecord(stored) }]);
    this.idempotency.set(parsed.idempotencyKey, { inputJson, recordId: stored.id });
    return cloneJurisprudenceRecord(stored);
    });
  }

  async update(input: JurisprudenceUpdateInput): Promise<JurisprudenceRecord> {
    return this.safely(() => {
    const parsed = jurisprudenceUpdateInputSchema.parse(input);
    const current = this.records.get(parsed.id);
    if (!current) throw new JurisprudenceRepositoryError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { recordId: parsed.id });
    if (current.recordVersion !== parsed.expectedVersion) throw new JurisprudenceRepositoryError("VERSION_CONFLICT", "La versión esperada no coincide con la versión persistida.", { recordId: parsed.id, expectedVersion: parsed.expectedVersion, actualVersion: current.recordVersion });

    const candidate = validateJurisprudenceRecordForPersistence({
      ...cloneJurisprudenceNewRecord(parsed.record),
      id: current.id,
      recordVersion: current.recordVersion + 1,
      createdAt: current.createdAt,
      updatedAt: nextRepositoryTimestamp(this.dependencies.now(), current.updatedAt),
    });
    const deduplicationKey = buildJurisprudenceDeduplicationKey(getJurisprudenceExternalIdentity(candidate));
    if (this.findStoredByDeduplicationKey(deduplicationKey, current.id)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "La actualización colisiona con otra identidad externa.", { recordId: current.id, deduplicationKey });
    if (candidate.slug && this.findStoredBySlug(candidate.slug, current.id)) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "La actualización colisiona con otro slug.", { recordId: current.id });

    const stored = cloneJurisprudenceRecord(candidate);
    this.records.set(stored.id, stored);
    const versions = this.history.get(stored.id) ?? [];
    versions.push({ recordId: stored.id, version: stored.recordVersion, changeKind: parsed.changeKind, recordedAt: stored.updatedAt, snapshot: cloneJurisprudenceRecord(stored) });
    this.history.set(stored.id, versions);
    return cloneJurisprudenceRecord(stored);
    });
  }

  private executeQuery(input: JurisprudenceRepositoryListInput | JurisprudenceRepositorySearchInput): JurisprudenceRepositoryPage {
    const query = normalizeJurisprudenceRepositoryQuery(input);
    const matches = [...this.records.values()].filter((record) => recordMatchesJurisprudenceFilters(record, query.filters) && recordMatchesDeterministicQuery(record, query.q));
    return paginateJurisprudenceRecords(sortJurisprudenceRecords(matches, query), query);
  }

  async list(input: JurisprudenceRepositoryListInput = {}): Promise<JurisprudenceRepositoryPage> {
    return this.safely(() => this.executeQuery(input));
  }

  async search(input: JurisprudenceRepositorySearchInput): Promise<JurisprudenceRepositoryPage> {
    return this.safely(() => this.executeQuery(input));
  }

  async count(filters: JurisprudenceRepositoryFilters = {}): Promise<number> {
    return this.safely(() => {
      const query = normalizeJurisprudenceRepositoryQuery({ filters, page: 1, pageSize: 1 });
      return [...this.records.values()].filter((record) => recordMatchesJurisprudenceFilters(record, query.filters)).length;
    });
  }

  async existsByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<boolean> {
    return (await this.findByExternalIdentity(identity)) !== null;
  }

  async getVersionHistory(id: string): Promise<readonly JurisprudenceVersionEntry[]> {
    this.assertOpen();
    if (!this.records.has(id)) throw new JurisprudenceRepositoryError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { recordId: id });
    return (this.history.get(id) ?? []).map((entry) => ({ ...entry, snapshot: cloneJurisprudenceRecord(entry.snapshot) }));
  }

  clearForTests(): void {
    this.assertOpen();
    this.records.clear();
    this.history.clear();
    this.idempotency.clear();
  }

  async close(): Promise<void> {
    this.records.clear();
    this.history.clear();
    this.idempotency.clear();
    this.closed = true;
  }
}
