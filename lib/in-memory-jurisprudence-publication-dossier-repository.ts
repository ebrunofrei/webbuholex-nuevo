import {
  assertPublicationGovernanceRepositoryOpen,
  cloneGovernedSource,
  clonePublicationDossier,
  clonePublicationDossierEvent,
  clonePublicationGovernanceIdempotency,
  cloneSourceBinding,
  JurisprudencePublicationGovernanceError,
} from "@/lib/jurisprudence-publication-dossier-repository";
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

function active(dossier: JurisprudencePublicationDossier): boolean { return dossier.closedAt === null && dossier.supersededAt === null; }

export class InMemoryJurisprudencePublicationDossierRepository implements JurisprudencePublicationDossierRepository {
  readonly #sources = new Map<string, JurisprudenceSourceRecord>();
  readonly #bindings = new Map<string, JurisprudenceSourceBinding>();
  readonly #dossiers = new Map<string, JurisprudencePublicationDossier>();
  readonly #events = new Map<string, PublicationDossierEvent[]>();
  readonly #idempotency = new Map<string, PublicationGovernanceIdempotencyEntry>();
  #closed = false;

  async findSourceById(sourceId: string) { assertPublicationGovernanceRepositoryOpen(this.#closed); const value = this.#sources.get(sourceId); return value === undefined ? null : cloneGovernedSource(value); }
  async createSource(source: JurisprudenceSourceRecord, idempotency: PublicationGovernanceIdempotencyEntry) {
    assertPublicationGovernanceRepositoryOpen(this.#closed);
    if (this.#sources.has(source.sourceId)) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El identificador de fuente ya existe.");
    if (this.#idempotency.has(idempotency.idempotencyKey)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    this.#sources.set(source.sourceId, cloneGovernedSource(source)); this.#idempotency.set(idempotency.idempotencyKey, clonePublicationGovernanceIdempotency(idempotency));
  }
  async findBindingById(bindingId: string) { assertPublicationGovernanceRepositoryOpen(this.#closed); const value = this.#bindings.get(bindingId); return value === undefined ? null : cloneSourceBinding(value); }
  async createBinding(binding: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry) {
    assertPublicationGovernanceRepositoryOpen(this.#closed);
    if (this.#bindings.has(binding.bindingId)) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El identificador de vínculo ya existe.");
    if (this.#idempotency.has(idempotency.idempotencyKey)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    this.#bindings.set(binding.bindingId, cloneSourceBinding(binding)); this.#idempotency.set(idempotency.idempotencyKey, clonePublicationGovernanceIdempotency(idempotency));
  }
  async supersedeBinding(previous: JurisprudenceSourceBinding, replacement: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry) {
    assertPublicationGovernanceRepositoryOpen(this.#closed);
    const current = this.#bindings.get(previous.bindingId);
    if (current === undefined) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el vínculo anterior.");
    if (current.bindingStatus !== "active" || current.supersededAt !== null) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El vínculo anterior ya no está activo.");
    if (this.#bindings.has(replacement.bindingId)) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El vínculo de reemplazo ya existe.");
    if (this.#idempotency.has(idempotency.idempotencyKey)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    this.#bindings.set(previous.bindingId, cloneSourceBinding(previous)); this.#bindings.set(replacement.bindingId, cloneSourceBinding(replacement)); this.#idempotency.set(idempotency.idempotencyKey, clonePublicationGovernanceIdempotency(idempotency));
  }
  async findById(dossierId: string) { assertPublicationGovernanceRepositoryOpen(this.#closed); const value = this.#dossiers.get(dossierId); return value === undefined ? null : clonePublicationDossier(value); }
  async findActiveByRecordAndVersion(recordId: string, recordVersion: number) { assertPublicationGovernanceRepositoryOpen(this.#closed); const value = [...this.#dossiers.values()].find((item) => item.recordId === recordId && item.recordVersion === recordVersion && active(item)); return value === undefined ? null : clonePublicationDossier(value); }
  async create(commit: PublicationDossierCreateCommit) {
    assertPublicationGovernanceRepositoryOpen(this.#closed);
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    if ([...this.#dossiers.values()].some((item) => item.recordId === commit.dossier.recordId && item.recordVersion === commit.dossier.recordVersion && active(item))) throw new JurisprudencePublicationGovernanceError("DUPLICATE_ACTIVE_DOSSIER", "Ya existe un expediente activo.");
    this.#dossiers.set(commit.dossier.dossierId, clonePublicationDossier(commit.dossier)); this.#events.set(commit.dossier.dossierId, [clonePublicationDossierEvent(commit.event)]); this.#idempotency.set(commit.idempotency.idempotencyKey, clonePublicationGovernanceIdempotency(commit.idempotency));
  }
  async commit(commit: PublicationDossierUpdateCommit) {
    assertPublicationGovernanceRepositoryOpen(this.#closed);
    if (this.#idempotency.has(commit.idempotency.idempotencyKey)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
    const current = this.#dossiers.get(commit.dossier.dossierId);
    if (current === undefined) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente.");
    if (current.version !== commit.expectedVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del expediente cambió.");
    const events = this.#events.get(current.dossierId);
    if (events === undefined || commit.event.sequence !== events.length + 1) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La secuencia del historial es inválida.");
    this.#dossiers.set(commit.dossier.dossierId, clonePublicationDossier(commit.dossier)); events.push(clonePublicationDossierEvent(commit.event)); this.#idempotency.set(commit.idempotency.idempotencyKey, clonePublicationGovernanceIdempotency(commit.idempotency));
  }
  async listEvents(dossierId: string) { assertPublicationGovernanceRepositoryOpen(this.#closed); const value = this.#events.get(dossierId); if (value === undefined) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente."); return value.map(clonePublicationDossierEvent); }
  async findIdempotencyResult(idempotencyKey: string) { assertPublicationGovernanceRepositoryOpen(this.#closed); const value = this.#idempotency.get(idempotencyKey); return value === undefined ? null : clonePublicationGovernanceIdempotency(value); }
  async close() { this.#closed = true; }
}
