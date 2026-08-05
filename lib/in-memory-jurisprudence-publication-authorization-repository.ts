import {
  assertPublicationAuthorizationRepositoryOpen,
  clonePublicationAuthorizationCase,
  clonePublicationAuthorizationEvent,
  clonePublicationAuthorizationIdempotency,
  isPublicationAuthorizationActive,
  JurisprudencePublicationAuthorizationError,
} from "@/lib/jurisprudence-publication-authorization-repository";
import type {
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationCreateCommit,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationIdempotencyEntry,
  JurisprudencePublicationAuthorizationRepository,
  JurisprudencePublicationAuthorizationUpdateCommit,
} from "@/types/jurisprudence-publication-authorization";

export class InMemoryJurisprudencePublicationAuthorizationRepository implements JurisprudencePublicationAuthorizationRepository {
  readonly #cases = new Map<string, JurisprudencePublicationAuthorizationCase>();
  readonly #events = new Map<string, JurisprudencePublicationAuthorizationEvent[]>();
  readonly #idempotency = new Map<string, JurisprudencePublicationAuthorizationIdempotencyEntry>();
  #closed = false;

  async findById(authorizationCaseId: string) {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    const value = this.#cases.get(authorizationCaseId);
    return value === undefined ? null : clonePublicationAuthorizationCase(value);
  }
  async findActiveByRecordVersion(recordId: string, recordVersion: number, evaluatedAt: string) {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    const value = [...this.#cases.values()].find((item) => item.recordId === recordId && item.recordVersion === recordVersion && isPublicationAuthorizationActive(item, evaluatedAt));
    return value === undefined ? null : clonePublicationAuthorizationCase(value);
  }
  async listHistoryByRecord(recordId: string) {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    return [...this.#cases.values()]
      .filter((item) => item.recordId === recordId)
      .flatMap((item) => this.#events.get(item.authorizationCaseId) ?? [])
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId))
      .map(clonePublicationAuthorizationEvent);
  }
  async createDecision(commit: JurisprudencePublicationAuthorizationCreateCommit) {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    if (this.#cases.has(commit.authorizationCase.authorizationCaseId)) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "El identificador de autorización ya existe.");
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) throw new JurisprudencePublicationAuthorizationError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    if (commit.authorizationCase.status === "authorized" && [...this.#cases.values()].some((item) => item.recordId === commit.authorizationCase.recordId && item.recordVersion === commit.authorizationCase.recordVersion && isPublicationAuthorizationActive(item, commit.authorizationCase.decidedAt))) throw new JurisprudencePublicationAuthorizationError("EXISTING_ACTIVE_AUTHORIZATION", "Ya existe una autorización vigente.");
    this.#cases.set(commit.authorizationCase.authorizationCaseId, clonePublicationAuthorizationCase(commit.authorizationCase));
    this.#events.set(commit.authorizationCase.authorizationCaseId, [clonePublicationAuthorizationEvent(commit.event)]);
    this.#idempotency.set(commit.idempotency.idempotencyKey, clonePublicationAuthorizationIdempotency(commit.idempotency));
  }
  private update(commit: JurisprudencePublicationAuthorizationUpdateCommit): void {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) throw new JurisprudencePublicationAuthorizationError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    const current = this.#cases.get(commit.authorizationCase.authorizationCaseId);
    if (current === undefined) throw new JurisprudencePublicationAuthorizationError("NOT_FOUND", "No existe la autorización.");
    if (current.version !== commit.expectedVersion) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión de autorización cambió.");
    const events = this.#events.get(current.authorizationCaseId);
    if (events === undefined || commit.event.sequence !== events.length + 1) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La secuencia del historial es inválida.");
    this.#cases.set(current.authorizationCaseId, clonePublicationAuthorizationCase(commit.authorizationCase));
    events.push(clonePublicationAuthorizationEvent(commit.event));
    this.#idempotency.set(commit.idempotency.idempotencyKey, clonePublicationAuthorizationIdempotency(commit.idempotency));
  }
  async revokeAuthorization(commit: JurisprudencePublicationAuthorizationUpdateCommit) { this.update(commit); }
  async supersedeByRecordVersion(commit: JurisprudencePublicationAuthorizationUpdateCommit) { this.update(commit); }
  async findIdempotencyResult(idempotencyKey: string) {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    const value = this.#idempotency.get(idempotencyKey);
    return value === undefined ? null : clonePublicationAuthorizationIdempotency(value);
  }
  async close() { this.#closed = true; }
}
