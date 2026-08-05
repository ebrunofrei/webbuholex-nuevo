import {
  assertPublicationExecutionRepositoryOpen,
  clonePublicProjection,
  clonePublicationExecution,
  clonePublicationExecutionEvent,
  clonePublicationExecutionIdempotency,
  isPublicationExecutionCurrent,
  JurisprudencePublicationExecutionError,
} from "@/lib/jurisprudence-publication-execution-repository";
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

export class InMemoryJurisprudencePublicationExecutionRepository
implements JurisprudencePublicationExecutionRepository {
  readonly #executions = new Map<string, JurisprudencePublicationExecution>();
  readonly #projections = new Map<string, JurisprudencePublicProjection>();
  readonly #events = new Map<string, JurisprudencePublicationExecutionEvent[]>();
  readonly #idempotency = new Map<string, JurisprudencePublicationExecutionIdempotencyEntry>();
  #closed = false;

  private assertOpen(): void { assertPublicationExecutionRepositoryOpen(this.#closed); }
  async findById(executionId: string) { this.assertOpen(); const value = this.#executions.get(executionId); return value === undefined ? null : clonePublicationExecution(value); }
  async findActiveByRecordVersion(recordId: string, recordVersion: number) {
    this.assertOpen();
    const value = [...this.#executions.values()].find((entry) => entry.recordId === recordId && entry.recordVersion === recordVersion && isPublicationExecutionCurrent(entry));
    return value === undefined ? null : clonePublicationExecution(value);
  }
  async findLatestByRecordVersion(recordId: string, recordVersion: number) {
    this.assertOpen();
    const value = [...this.#executions.values()].filter((entry) => entry.recordId === recordId && entry.recordVersion === recordVersion).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    return value === undefined ? null : clonePublicationExecution(value);
  }
  async listHistory(recordId: string) {
    this.assertOpen();
    return [...this.#events.values()].flat().filter((event) => event.recordId === recordId).map(clonePublicationExecutionEvent);
  }
  async findIdempotencyResult(idempotencyKey: string) { this.assertOpen(); const value = this.#idempotency.get(idempotencyKey); return value === undefined ? null : clonePublicationExecutionIdempotency(value); }
  async createExecution(commit: JurisprudencePublicationExecutionCreateCommit) {
    this.assertOpen();
    if (this.#executions.has(commit.execution.executionId) || this.#projections.has(commit.projection.projectionId)) throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "El identificador ya existe.");
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) throw new JurisprudencePublicationExecutionError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    if ([...this.#executions.values()].some((entry) => entry.recordId === commit.execution.recordId && entry.recordVersion === commit.execution.recordVersion && isPublicationExecutionCurrent(entry))) throw new JurisprudencePublicationExecutionError("EXECUTION_ALREADY_ACTIVE", "Ya existe una ejecución vigente.");
    this.#executions.set(commit.execution.executionId, clonePublicationExecution(commit.execution));
    this.#projections.set(commit.projection.projectionId, clonePublicProjection(commit.projection));
    this.#events.set(commit.execution.executionId, [clonePublicationExecutionEvent(commit.event)]);
    this.#idempotency.set(commit.idempotency.idempotencyKey, clonePublicationExecutionIdempotency(commit.idempotency));
  }
  async updateExecution(commit: JurisprudencePublicationExecutionUpdateCommit) {
    this.assertOpen();
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) throw new JurisprudencePublicationExecutionError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    const current = this.#executions.get(commit.execution.executionId);
    if (current === undefined) throw new JurisprudencePublicationExecutionError("NOT_FOUND", "No existe la ejecución.");
    if (current.version !== commit.expectedVersion) throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "La versión de ejecución cambió.");
    const events = this.#events.get(commit.execution.executionId);
    if (events === undefined || commit.event.sequence !== events.length + 1) throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "La secuencia del historial es inválida.");
    this.#executions.set(commit.execution.executionId, clonePublicationExecution(commit.execution));
    this.#projections.set(commit.projection.projectionId, clonePublicProjection(commit.projection));
    events.push(clonePublicationExecutionEvent(commit.event));
    this.#idempotency.set(commit.idempotency.idempotencyKey, clonePublicationExecutionIdempotency(commit.idempotency));
  }
  async findProjectionById(projectionId: string) { this.assertOpen(); const value = this.#projections.get(projectionId); return value === undefined ? null : clonePublicProjection(value); }
  async findActiveProjectionByRecordVersion(recordId: string, recordVersion: number) {
    this.assertOpen();
    const value = [...this.#projections.values()].find((entry) => entry.recordId === recordId && entry.recordVersion === recordVersion && entry.status === "active_internal");
    return value === undefined ? null : clonePublicProjection(value);
  }
  async listProjectionsByRecord(recordId: string) { this.assertOpen(); return [...this.#projections.values()].filter((entry) => entry.recordId === recordId).map(clonePublicProjection); }
  async close() { this.#closed = true; }
}

export class InMemoryJurisprudencePublicProjectionRepository implements JurisprudencePublicProjectionRepository {
  readonly #source: InMemoryJurisprudencePublicationExecutionRepository;
  constructor(source: InMemoryJurisprudencePublicationExecutionRepository) { this.#source = source; }
  findById(projectionId: string) { return this.#source.findProjectionById(projectionId); }
  findActiveByRecordVersion(recordId: string, recordVersion: number) { return this.#source.findActiveProjectionByRecordVersion(recordId, recordVersion); }
  listByRecord(recordId: string) { return this.#source.listProjectionsByRecord(recordId); }
  async close() { /* lifecycle owned by the transactional execution repository */ }
}
