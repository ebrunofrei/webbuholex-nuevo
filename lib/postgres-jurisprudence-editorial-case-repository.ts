import "server-only";
import { and, eq, asc } from "drizzle-orm";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import { withJurisprudenceInternalWriteRole } from "@/database/roles";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";
import {
  jurisprudenceEditorialCases,
  jurisprudenceEditorialEvents,
  jurisprudenceEditorialIdempotency,
} from "@/database/schema/jurisprudence";
import {
  cloneEditorialCase,
  cloneEditorialEvent,
  cloneEditorialIdempotency,
  assertEditorialRepositoryOpen,
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

function parseJson(value: string | unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "La persistencia editorial contiene JSON inválido.");
    }
  }
  return value;
}

function parseCase(payloadJson: unknown): JurisprudenceEditorialCase {
  const parsed = jurisprudenceEditorialCaseSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "El expediente persistido no cumple el contrato.");
  return cloneEditorialCase(parsed.data);
}

function parseEvent(payloadJson: unknown): JurisprudenceEditorialEvent {
  const parsed = jurisprudenceEditorialEventSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "El evento persistido no cumple el contrato.");
  return cloneEditorialEvent(parsed.data);
}

function isActive(editorialCase: JurisprudenceEditorialCase): boolean {
  return editorialCase.closedAt === null && editorialCase.supersededAt === null;
}

function isPostgresError(error: unknown): error is { code: string; constraint_name?: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as Record<string, unknown>).code === 'string';
}

export class PostgresJurisprudenceEditorialCaseRepository implements JurisprudenceEditorialCaseRepository {
  #closed = false;

  private async safely<T>(operation: () => Promise<T>): Promise<T> {
    assertEditorialRepositoryOpen(this.#closed);
    try {
      return await operation();
    } catch (error) {
      if (error instanceof JurisprudenceEditorialWorkflowError) throw error;
      if (isPostgresError(error)) {
        if (error.code === '23505') {
          if (error.constraint_name === 'jurisprudence_editorial_cases_active_idx') {
            throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "Ya existe un expediente activo para el registro y versión.");
          }
          if (error.constraint_name === 'jurisprudence_editorial_cases_pkey') {
            throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "El identificador de expediente ya existe.");
          }
          if (error.constraint_name === 'jurisprudence_editorial_events_seq_unique') {
            throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión del expediente cambió durante la operación.");
          }
          if (error.constraint_name === 'jurisprudence_editorial_idempotency_pkey') {
            throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
          }
        }
      }
      throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "No fue posible completar la operación de persistencia editorial.");
    }
  }

  async findById(caseId: string): Promise<JurisprudenceEditorialCase | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudenceEditorialCases.payloadJson })
          .from(jurisprudenceEditorialCases)
          .where(eq(jurisprudenceEditorialCases.caseId, caseId))
          .limit(1);

        if (rows.length === 0) return null;
        return parseCase(rows[0]!.payloadJson);
      });
    });
  }

  async findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudenceEditorialCase | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudenceEditorialCases.payloadJson })
          .from(jurisprudenceEditorialCases)
          .where(
            and(
              eq(jurisprudenceEditorialCases.recordId, recordId),
              eq(jurisprudenceEditorialCases.recordVersion, recordVersion),
              eq(jurisprudenceEditorialCases.active, true)
            )
          )
          .limit(1);

        if (rows.length === 0) return null;
        return parseCase(rows[0]!.payloadJson);
      });
    });
  }

  async findIdempotency(idempotencyKey: string): Promise<JurisprudenceEditorialIdempotencyEntry | null> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({
            commandFingerprint: jurisprudenceEditorialIdempotency.commandFingerprint,
            resultJson: jurisprudenceEditorialIdempotency.resultJson
          })
          .from(jurisprudenceEditorialIdempotency)
          .where(eq(jurisprudenceEditorialIdempotency.idempotencyKey, idempotencyKey))
          .limit(1);

        if (rows.length === 0) return null;

        const row = rows[0]!;
        const parsed = jurisprudenceEditorialStoredResultSchema.safeParse(parseJson(row.resultJson));
        if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "El resultado idempotente persistido es inválido.");

        return cloneEditorialIdempotency({
          idempotencyKey,
          commandFingerprint: row.commandFingerprint,
          result: parsed.data,
        });
      });
    });
  }

  async create(commit: JurisprudenceEditorialCreateCommit): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        const idempotencyRows = await tx.select({ idempotencyKey: jurisprudenceEditorialIdempotency.idempotencyKey })
          .from(jurisprudenceEditorialIdempotency)
          .where(eq(jurisprudenceEditorialIdempotency.idempotencyKey, commit.idempotency.idempotencyKey))
          .limit(1);

        if (idempotencyRows.length > 0) {
          throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
        }

        const activeCaseRows = await tx.select({ caseId: jurisprudenceEditorialCases.caseId })
          .from(jurisprudenceEditorialCases)
          .where(
            and(
              eq(jurisprudenceEditorialCases.recordId, commit.editorialCase.recordId),
              eq(jurisprudenceEditorialCases.recordVersion, commit.editorialCase.recordVersion),
              eq(jurisprudenceEditorialCases.active, true)
            )
          )
          .limit(1);

        if (activeCaseRows.length > 0) {
          throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "Ya existe un expediente activo para el registro y versión.");
        }

        await tx.insert(jurisprudenceEditorialCases).values({
          caseId: commit.editorialCase.caseId,
          recordId: commit.editorialCase.recordId,
          recordVersion: commit.editorialCase.recordVersion,
          caseVersion: commit.editorialCase.caseVersion,
          active: isActive(commit.editorialCase),
          payloadJson: JSON.parse(JSON.stringify(commit.editorialCase)),
          updatedAt: new Date(commit.editorialCase.updatedAt),
        });

        await tx.insert(jurisprudenceEditorialEvents).values({
          eventId: commit.event.eventId,
          caseId: commit.event.caseId,
          sequence: commit.event.sequence,
          eventType: commit.event.type,
          payloadJson: JSON.parse(JSON.stringify(commit.event)),
          occurredAt: new Date(commit.event.occurredAt),
        });

        await tx.insert(jurisprudenceEditorialIdempotency).values({
          idempotencyKey: commit.idempotency.idempotencyKey,
          commandFingerprint: commit.idempotency.commandFingerprint,
          resultJson: JSON.parse(JSON.stringify(commit.idempotency.result)),
          createdAt: new Date(commit.event.occurredAt),
        });
      });
    });
  }

  async update(commit: JurisprudenceEditorialUpdateCommit): Promise<void> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      await withJurisprudenceInternalWriteRole(db, async (tx) => {
        const idempotencyRows = await tx.select({ idempotencyKey: jurisprudenceEditorialIdempotency.idempotencyKey })
          .from(jurisprudenceEditorialIdempotency)
          .where(eq(jurisprudenceEditorialIdempotency.idempotencyKey, commit.idempotency.idempotencyKey))
          .limit(1);

        if (idempotencyRows.length > 0) {
          throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue utilizada.");
        }

        const updateResult = await tx.update(jurisprudenceEditorialCases).set({
          recordVersion: commit.editorialCase.recordVersion,
          caseVersion: commit.editorialCase.caseVersion,
          active: isActive(commit.editorialCase),
          payloadJson: JSON.parse(JSON.stringify(commit.editorialCase)),
          updatedAt: new Date(commit.editorialCase.updatedAt),
        }).where(
          and(
            eq(jurisprudenceEditorialCases.caseId, commit.editorialCase.caseId),
            eq(jurisprudenceEditorialCases.caseVersion, commit.expectedCaseVersion)
          )
        );

        if (updateResult.count !== 1) {
          throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión del expediente cambió durante la operación.");
        }

        await tx.insert(jurisprudenceEditorialEvents).values({
          eventId: commit.event.eventId,
          caseId: commit.event.caseId,
          sequence: commit.event.sequence,
          eventType: commit.event.type,
          payloadJson: JSON.parse(JSON.stringify(commit.event)),
          occurredAt: new Date(commit.event.occurredAt),
        });

        await tx.insert(jurisprudenceEditorialIdempotency).values({
          idempotencyKey: commit.idempotency.idempotencyKey,
          commandFingerprint: commit.idempotency.commandFingerprint,
          resultJson: JSON.parse(JSON.stringify(commit.idempotency.result)),
          createdAt: new Date(commit.event.occurredAt),
        });
      });
    });
  }

  async getHistory(caseId: string): Promise<readonly JurisprudenceEditorialEvent[]> {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return await withJurisprudenceInternalReadRole(db, async (tx) => {
        const caseRows = await tx.select({ caseId: jurisprudenceEditorialCases.caseId })
          .from(jurisprudenceEditorialCases)
          .where(eq(jurisprudenceEditorialCases.caseId, caseId))
          .limit(1);

        if (caseRows.length === 0) {
          throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
        }

        const eventRows = await tx.select({ payloadJson: jurisprudenceEditorialEvents.payloadJson })
          .from(jurisprudenceEditorialEvents)
          .where(eq(jurisprudenceEditorialEvents.caseId, caseId))
          .orderBy(asc(jurisprudenceEditorialEvents.sequence));

        return eventRows.map(r => parseEvent(r.payloadJson));
      });
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
  }
}
