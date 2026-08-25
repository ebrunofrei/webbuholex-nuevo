import "server-only";
import { and, eq, asc } from "drizzle-orm";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import { withJurisprudenceInternalWriteRole } from "@/database/roles";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";
import {
  jurisprudenceGovernedSources,
  jurisprudenceSourceBindings,
  jurisprudencePublicationDossiers,
  jurisprudencePublicationDossierEvents,
  jurisprudencePublicationGovernanceIdempotency,
} from "@/database/schema/jurisprudence";
import {
  assertPublicationGovernanceRepositoryOpen,
  cloneGovernedSource,
  clonePublicationDossier,
  clonePublicationDossierEvent,
  clonePublicationGovernanceIdempotency,
  cloneSourceBinding,
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

function parseJson(value: string | unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido.");
    }
  }
  return value;
}

function parseSource(payloadJson: unknown): JurisprudenceSourceRecord {
  const parsed = jurisprudenceSourceRecordSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "La fuente persistida es inválida.");
  return cloneGovernedSource(parsed.data);
}

function parseBinding(payloadJson: unknown): JurisprudenceSourceBinding {
  const parsed = jurisprudenceSourceBindingSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El vínculo persistido es inválido.");
  return cloneSourceBinding(parsed.data);
}

function parseDossier(payloadJson: unknown): JurisprudencePublicationDossier {
  const parsed = publicationDossierSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El expediente persistido es inválido.");
  return clonePublicationDossier(parsed.data);
}

function parseEvent(payloadJson: unknown): PublicationDossierEvent {
  const parsed = publicationDossierEventSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El evento persistido es inválido.");
  return clonePublicationDossierEvent(parsed.data);
}

function isActive(dossier: JurisprudencePublicationDossier): boolean {
  return dossier.closedAt === null && dossier.supersededAt === null;
}

function isPostgresError(error: unknown): error is { code: string; constraint_name?: string } {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return typeof error.code === "string";
}

export class PostgresJurisprudencePublicationDossierRepository implements JurisprudencePublicationDossierRepository {
  #closed = false;

  private async safely<T>(operation: () => Promise<T>): Promise<T> {
    assertPublicationGovernanceRepositoryOpen(this.#closed);
    try {
      return await operation();
    } catch (error) {
      if (error instanceof JurisprudencePublicationGovernanceError) throw error;
      if (isPostgresError(error)) {
        if (error.code === "23505") {
          if (error.constraint_name === "jurisprudence_publication_dossiers_active_idx") {
            throw new JurisprudencePublicationGovernanceError("DUPLICATE_ACTIVE_DOSSIER", "Ya existe un expediente activo para el registro y versión.");
          }
          if (error.constraint_name === "jurisprudence_pub_dossier_events_seq_unique") {
            throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del expediente cambió durante la operación.");
          }
          if (error.constraint_name === "jurisprudence_publication_governance_idempotency_pkey") {
            throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
          }
        }
      }
      throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "No fue posible completar la persistencia de gobierno.");
    }
  }

  async findSourceById(sourceId: string): Promise<JurisprudenceSourceRecord | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudenceGovernedSources.payloadJson })
          .from(jurisprudenceGovernedSources)
          .where(eq(jurisprudenceGovernedSources.sourceId, sourceId))
          .limit(1);
        const row = rows[0];
        if (!row) return null;
        return parseSource(row.payloadJson);
      });
    });
  }

  async createSource(source: JurisprudenceSourceRecord, idempotency: PublicationGovernanceIdempotencyEntry): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        await tx.insert(jurisprudenceGovernedSources).values({
          sourceId: source.sourceId,
          payloadJson: source,
        });
        await tx.insert(jurisprudencePublicationGovernanceIdempotency).values({
          idempotencyKey: idempotency.idempotencyKey,
          commandFingerprint: idempotency.commandFingerprint,
          resultJson: idempotency.result,
        });
      });
    });
  }

  async findBindingById(bindingId: string): Promise<JurisprudenceSourceBinding | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudenceSourceBindings.payloadJson })
          .from(jurisprudenceSourceBindings)
          .where(eq(jurisprudenceSourceBindings.bindingId, bindingId))
          .limit(1);
        const row = rows[0];
        if (!row) return null;
        return parseBinding(row.payloadJson);
      });
    });
  }

  async createBinding(binding: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        await tx.insert(jurisprudenceSourceBindings).values({
          bindingId: binding.bindingId,
          recordId: binding.recordId,
          recordVersion: binding.recordVersion,
          bindingStatus: binding.bindingStatus,
          payloadJson: binding,
        });
        await tx.insert(jurisprudencePublicationGovernanceIdempotency).values({
          idempotencyKey: idempotency.idempotencyKey,
          commandFingerprint: idempotency.commandFingerprint,
          resultJson: idempotency.result,
        });
      });
    });
  }

  async supersedeBinding(previous: JurisprudenceSourceBinding, replacement: JurisprudenceSourceBinding, idempotency: PublicationGovernanceIdempotencyEntry): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        const updateResult = await tx.update(jurisprudenceSourceBindings)
          .set({
            bindingStatus: previous.bindingStatus,
            payloadJson: previous,
          })
          .where(
            and(
              eq(jurisprudenceSourceBindings.bindingId, previous.bindingId),
              eq(jurisprudenceSourceBindings.bindingStatus, "active")
            )
          );

        if (updateResult.count !== 1) {
          throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El vínculo anterior ya no está activo.");
        }

        await tx.insert(jurisprudenceSourceBindings).values({
          bindingId: replacement.bindingId,
          recordId: replacement.recordId,
          recordVersion: replacement.recordVersion,
          bindingStatus: replacement.bindingStatus,
          payloadJson: replacement,
        });

        await tx.insert(jurisprudencePublicationGovernanceIdempotency).values({
          idempotencyKey: idempotency.idempotencyKey,
          commandFingerprint: idempotency.commandFingerprint,
          resultJson: idempotency.result,
        });
      });
    });
  }

  async findById(dossierId: string): Promise<JurisprudencePublicationDossier | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudencePublicationDossiers.payloadJson })
          .from(jurisprudencePublicationDossiers)
          .where(eq(jurisprudencePublicationDossiers.dossierId, dossierId))
          .limit(1);
        const row = rows[0];
        if (!row) return null;
        return parseDossier(row.payloadJson);
      });
    });
  }

  async findActiveByRecordAndVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicationDossier | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudencePublicationDossiers.payloadJson })
          .from(jurisprudencePublicationDossiers)
          .where(
            and(
              eq(jurisprudencePublicationDossiers.recordId, recordId),
              eq(jurisprudencePublicationDossiers.recordVersion, recordVersion),
              eq(jurisprudencePublicationDossiers.active, true)
            )
          )
          .limit(1);
        const row = rows[0];
        if (!row) return null;
        return parseDossier(row.payloadJson);
      });
    });
  }

  async create(commit: PublicationDossierCreateCommit): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        await tx.insert(jurisprudencePublicationDossiers).values({
          dossierId: commit.dossier.dossierId,
          recordId: commit.dossier.recordId,
          recordVersion: commit.dossier.recordVersion,
          dossierVersion: commit.dossier.version,
          active: isActive(commit.dossier),
          payloadJson: commit.dossier,
        });
        await tx.insert(jurisprudencePublicationDossierEvents).values({
          eventId: commit.event.eventId,
          dossierId: commit.event.dossierId,
          sequence: commit.event.sequence,
          eventType: commit.event.type,
          payloadJson: commit.event,
          occurredAt: new Date(commit.event.occurredAt),
        });
        await tx.insert(jurisprudencePublicationGovernanceIdempotency).values({
          idempotencyKey: commit.idempotency.idempotencyKey,
          commandFingerprint: commit.idempotency.commandFingerprint,
          resultJson: commit.idempotency.result,
        });
      });
    });
  }

  async commit(commit: PublicationDossierUpdateCommit): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        const updateResult = await tx.update(jurisprudencePublicationDossiers)
          .set({
            recordVersion: commit.dossier.recordVersion,
            dossierVersion: commit.dossier.version,
            active: isActive(commit.dossier),
            payloadJson: commit.dossier,
          })
          .where(
            and(
              eq(jurisprudencePublicationDossiers.dossierId, commit.dossier.dossierId),
              eq(jurisprudencePublicationDossiers.dossierVersion, commit.expectedVersion)
            )
          );

        if (updateResult.count !== 1) {
          throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del expediente cambió.");
        }

        await tx.insert(jurisprudencePublicationDossierEvents).values({
          eventId: commit.event.eventId,
          dossierId: commit.event.dossierId,
          sequence: commit.event.sequence,
          eventType: commit.event.type,
          payloadJson: commit.event,
          occurredAt: new Date(commit.event.occurredAt),
        });
        await tx.insert(jurisprudencePublicationGovernanceIdempotency).values({
          idempotencyKey: commit.idempotency.idempotencyKey,
          commandFingerprint: commit.idempotency.commandFingerprint,
          resultJson: commit.idempotency.result,
        });
      });
    });
  }

  async listEvents(dossierId: string): Promise<readonly PublicationDossierEvent[]> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const dossierRows = await tx.select({ dossierId: jurisprudencePublicationDossiers.dossierId })
          .from(jurisprudencePublicationDossiers)
          .where(eq(jurisprudencePublicationDossiers.dossierId, dossierId))
          .limit(1);

        if (dossierRows.length === 0) {
          throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente.");
        }

        const eventRows = await tx.select({ payloadJson: jurisprudencePublicationDossierEvents.payloadJson })
          .from(jurisprudencePublicationDossierEvents)
          .where(eq(jurisprudencePublicationDossierEvents.dossierId, dossierId))
          .orderBy(asc(jurisprudencePublicationDossierEvents.sequence));

        return eventRows.map((row) => parseEvent(row.payloadJson));
      });
    });
  }

  async findIdempotencyResult(idempotencyKey: string): Promise<PublicationGovernanceIdempotencyEntry | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({
          commandFingerprint: jurisprudencePublicationGovernanceIdempotency.commandFingerprint,
          resultJson: jurisprudencePublicationGovernanceIdempotency.resultJson
        })
        .from(jurisprudencePublicationGovernanceIdempotency)
        .where(eq(jurisprudencePublicationGovernanceIdempotency.idempotencyKey, idempotencyKey))
        .limit(1);

        const row = rows[0];
        if (!row) return null;

        const parsed = publicationGovernanceStoredResultSchema.safeParse(parseJson(row.resultJson));
        if (!parsed.success) {
          throw new JurisprudencePublicationGovernanceError("REPOSITORY_UNAVAILABLE", "El resultado idempotente es inválido.");
        }
        return clonePublicationGovernanceIdempotency({
          idempotencyKey,
          commandFingerprint: row.commandFingerprint,
          result: parsed.data,
        });
      });
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
  }
}
