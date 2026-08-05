import {
  assertEditorialRepositoryOpen,
  cloneEditorialCase,
  cloneEditorialEvent,
  cloneEditorialIdempotency,
  JurisprudenceEditorialWorkflowError,
} from "@/lib/jurisprudence-editorial-case-repository";
import type {
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCaseRepository,
  JurisprudenceEditorialCreateCommit,
  JurisprudenceEditorialEvent,
  JurisprudenceEditorialIdempotencyEntry,
  JurisprudenceEditorialUpdateCommit,
} from "@/types/jurisprudence-editorial-workflow";

function isActive(editorialCase: JurisprudenceEditorialCase): boolean {
  return editorialCase.closedAt === null && editorialCase.supersededAt === null;
}

export class InMemoryJurisprudenceEditorialCaseRepository implements JurisprudenceEditorialCaseRepository {
  readonly #cases = new Map<string, JurisprudenceEditorialCase>();
  readonly #history = new Map<string, JurisprudenceEditorialEvent[]>();
  readonly #idempotency = new Map<string, JurisprudenceEditorialIdempotencyEntry>();
  #closed = false;

  async findById(caseId: string): Promise<JurisprudenceEditorialCase | null> {
    assertEditorialRepositoryOpen(this.#closed);
    const value = this.#cases.get(caseId);
    return value === undefined ? null : cloneEditorialCase(value);
  }

  async findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudenceEditorialCase | null> {
    assertEditorialRepositoryOpen(this.#closed);
    const value = [...this.#cases.values()].find((entry) => entry.recordId === recordId && entry.recordVersion === recordVersion && isActive(entry));
    return value === undefined ? null : cloneEditorialCase(value);
  }

  async findIdempotency(idempotencyKey: string): Promise<JurisprudenceEditorialIdempotencyEntry | null> {
    assertEditorialRepositoryOpen(this.#closed);
    const value = this.#idempotency.get(idempotencyKey);
    return value === undefined ? null : cloneEditorialIdempotency(value);
  }

  async create(commit: JurisprudenceEditorialCreateCommit): Promise<void> {
    assertEditorialRepositoryOpen(this.#closed);
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) {
      throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
    }
    if (this.#cases.has(commit.editorialCase.caseId)) {
      throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "El identificador de expediente ya existe.");
    }
    if ([...this.#cases.values()].some((entry) => entry.recordId === commit.editorialCase.recordId && entry.recordVersion === commit.editorialCase.recordVersion && isActive(entry))) {
      throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "Ya existe un expediente activo para el registro y versión.");
    }
    this.#cases.set(commit.editorialCase.caseId, cloneEditorialCase(commit.editorialCase));
    this.#history.set(commit.editorialCase.caseId, [cloneEditorialEvent(commit.event)]);
    this.#idempotency.set(commit.idempotency.idempotencyKey, cloneEditorialIdempotency(commit.idempotency));
  }

  async update(commit: JurisprudenceEditorialUpdateCommit): Promise<void> {
    assertEditorialRepositoryOpen(this.#closed);
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) {
      throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
    }
    const current = this.#cases.get(commit.editorialCase.caseId);
    if (current === undefined) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
    if (current.caseVersion !== commit.expectedCaseVersion) {
      throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del expediente no coincide.");
    }
    const history = this.#history.get(current.caseId);
    if (history === undefined || commit.event.sequence !== history.length + 1) {
      throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La secuencia del historial editorial no es válida.");
    }
    this.#cases.set(commit.editorialCase.caseId, cloneEditorialCase(commit.editorialCase));
    history.push(cloneEditorialEvent(commit.event));
    this.#idempotency.set(commit.idempotency.idempotencyKey, cloneEditorialIdempotency(commit.idempotency));
  }

  async getHistory(caseId: string): Promise<readonly JurisprudenceEditorialEvent[]> {
    assertEditorialRepositoryOpen(this.#closed);
    const history = this.#history.get(caseId);
    if (history === undefined) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
    return history.map(cloneEditorialEvent);
  }

  async close(): Promise<void> {
    this.#closed = true;
  }
}
