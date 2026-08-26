import "server-only";
import { eq, and, asc } from "drizzle-orm";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import {
  jurisprudencePublicationAuthorizationCases,
  jurisprudencePublicationAuthorizationEvents,
  jurisprudencePublicationAuthorizationIdempotency,
} from "@/database/schema/jurisprudence";
import { withJurisprudenceInternalWriteRole } from "@/database/roles";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";
import {
  assertPublicationAuthorizationRepositoryOpen,
  clonePublicationAuthorizationCase,
  clonePublicationAuthorizationEvent,
  clonePublicationAuthorizationIdempotency,
  isPublicationAuthorizationActive,
  JurisprudencePublicationAuthorizationError,
} from "@/lib/jurisprudence-publication-authorization-repository";
import {
  jurisprudencePublicationAuthorizationCaseSchema,
  jurisprudencePublicationAuthorizationEventSchema,
  jurisprudencePublicationAuthorizationViewSchema,
} from "@/lib/schemas/jurisprudence-publication-authorization";
import type {
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationCreateCommit,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationIdempotencyEntry,
  JurisprudencePublicationAuthorizationRepository,
  JurisprudencePublicationAuthorizationUpdateCommit,
} from "@/types/jurisprudence-publication-authorization";

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido.");
  }
}

function parseCase(payloadJson: unknown): JurisprudencePublicationAuthorizationCase {
  const parsed = jurisprudencePublicationAuthorizationCaseSchema.safeParse(
    typeof payloadJson === "string" ? parseJson(payloadJson) : payloadJson
  );
  if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "La autorización persistida es inválida.");
  return clonePublicationAuthorizationCase(parsed.data);
}

function parseEvent(payloadJson: unknown): JurisprudencePublicationAuthorizationEvent {
  const parsed = jurisprudencePublicationAuthorizationEventSchema.safeParse(
    typeof payloadJson === "string" ? parseJson(payloadJson) : payloadJson
  );
  if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "El evento persistido es inválido.");
  return clonePublicationAuthorizationEvent(parsed.data);
}

function isPostgresError(error: unknown): error is { code: string; constraint_name?: string } {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return typeof error.code === "string";
}

export class PostgresJurisprudencePublicationAuthorizationRepository implements JurisprudencePublicationAuthorizationRepository {
  #closed = false;

  private safely<T>(operation: () => Promise<T>): Promise<T> {
    assertPublicationAuthorizationRepositoryOpen(this.#closed);
    return operation().catch((error) => {
      if (error instanceof JurisprudencePublicationAuthorizationError) throw error;
      if (isPostgresError(error) && error.code === "23505") {
        if (error.constraint_name === "jurisprudence_auth_events_seq_unique") {
          throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La secuencia del historial es inválida.");
        }
        if (error.constraint_name === "jurisprudence_publication_authorization_idempotency_pkey") {
          throw new JurisprudencePublicationAuthorizationError("IDEMPOTENCY_CONFLICT", "La clave ya fue utilizada.");
        }
      }
      throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "No fue posible completar la persistencia de autorizaciones.");
    });
  }

  async findById(authorizationCaseId: string) {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudencePublicationAuthorizationCases.payloadJson })
          .from(jurisprudencePublicationAuthorizationCases)
          .where(eq(jurisprudencePublicationAuthorizationCases.authorizationCaseId, authorizationCaseId))
          .limit(1);
        if (rows.length === 0) return null;
        return parseCase(rows[0]?.payloadJson);
      });
    });
  }

  async findActiveByRecordVersion(recordId: string, recordVersion: number, evaluatedAt: string) {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({ payloadJson: jurisprudencePublicationAuthorizationCases.payloadJson })
          .from(jurisprudencePublicationAuthorizationCases)
          .where(and(
            eq(jurisprudencePublicationAuthorizationCases.recordId, recordId),
            eq(jurisprudencePublicationAuthorizationCases.recordVersion, recordVersion),
            eq(jurisprudencePublicationAuthorizationCases.status, "authorized")
          ));

        return rows.map(r => parseCase(r.payloadJson)).find((item) => isPublicationAuthorizationActive(item, evaluatedAt)) ?? null;
      });
    });
  }

  async listHistoryByRecord(recordId: string) {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        // According to InMemory repo: ORDER BY occurredAt ASC, eventId ASC.
        // Sequence remains case-local, so cross-case record history must use occurredAt.
        const rows = await tx.select({ payloadJson: jurisprudencePublicationAuthorizationEvents.payloadJson })
          .from(jurisprudencePublicationAuthorizationEvents)
          .innerJoin(jurisprudencePublicationAuthorizationCases, eq(jurisprudencePublicationAuthorizationEvents.authorizationCaseId, jurisprudencePublicationAuthorizationCases.authorizationCaseId))
          .where(eq(jurisprudencePublicationAuthorizationCases.recordId, recordId))
          .orderBy(
            asc(jurisprudencePublicationAuthorizationEvents.occurredAt),
            asc(jurisprudencePublicationAuthorizationEvents.eventId)
          );

        return rows.map((r) => parseEvent(r.payloadJson));
      });
    });
  }

  async createDecision(commit: JurisprudencePublicationAuthorizationCreateCommit) {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      return withJurisprudenceInternalWriteRole(db, async (tx) => {
        if (commit.authorizationCase.status === "authorized") {
          const rows = await tx.select({ payloadJson: jurisprudencePublicationAuthorizationCases.payloadJson })
            .from(jurisprudencePublicationAuthorizationCases)
            .where(and(
              eq(jurisprudencePublicationAuthorizationCases.recordId, commit.authorizationCase.recordId),
              eq(jurisprudencePublicationAuthorizationCases.recordVersion, commit.authorizationCase.recordVersion),
              eq(jurisprudencePublicationAuthorizationCases.status, "authorized")
            ));

          const existing = rows.map(r => parseCase(r.payloadJson)).some(item => isPublicationAuthorizationActive(item, commit.authorizationCase.decidedAt));
          if (existing) {
            throw new JurisprudencePublicationAuthorizationError("EXISTING_ACTIVE_AUTHORIZATION", "Ya existe una autorización vigente.");
          }
        }

        await tx.insert(jurisprudencePublicationAuthorizationCases).values({
          authorizationCaseId: commit.authorizationCase.authorizationCaseId,
          recordId: commit.authorizationCase.recordId,
          recordVersion: commit.authorizationCase.recordVersion,
          authorizationVersion: commit.authorizationCase.version,
          status: commit.authorizationCase.status,
          payloadJson: commit.authorizationCase,
        });

        await tx.insert(jurisprudencePublicationAuthorizationEvents).values({
          eventId: commit.event.eventId,
          authorizationCaseId: commit.event.authorizationCaseId,
          sequence: commit.event.sequence,
          eventType: commit.event.type,
          payloadJson: commit.event,
          occurredAt: new Date(commit.event.occurredAt),
        });

        await tx.insert(jurisprudencePublicationAuthorizationIdempotency).values({
          idempotencyKey: commit.idempotency.idempotencyKey,
          commandFingerprint: commit.idempotency.commandFingerprint,
          resultJson: commit.idempotency.result,
          createdAt: new Date(commit.event.occurredAt),
        });
      });
    });
  }

  private async update(commit: JurisprudencePublicationAuthorizationUpdateCommit) {
    return this.safely(async () => {
      const db = getJurisprudenceInternalWriteDatabase();
      return withJurisprudenceInternalWriteRole(db, async (tx) => {
        const updateResult = await tx.update(jurisprudencePublicationAuthorizationCases)
          .set({
            authorizationVersion: commit.authorizationCase.version,
            status: commit.authorizationCase.status,
            payloadJson: commit.authorizationCase,
          })
          .where(and(
            eq(jurisprudencePublicationAuthorizationCases.authorizationCaseId, commit.authorizationCase.authorizationCaseId),
            eq(jurisprudencePublicationAuthorizationCases.authorizationVersion, commit.expectedVersion)
          ));

        if (updateResult.count !== 1) {
          throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión de autorización cambió.");
        }

        await tx.insert(jurisprudencePublicationAuthorizationEvents).values({
          eventId: commit.event.eventId,
          authorizationCaseId: commit.event.authorizationCaseId,
          sequence: commit.event.sequence,
          eventType: commit.event.type,
          payloadJson: commit.event,
          occurredAt: new Date(commit.event.occurredAt),
        });

        await tx.insert(jurisprudencePublicationAuthorizationIdempotency).values({
          idempotencyKey: commit.idempotency.idempotencyKey,
          commandFingerprint: commit.idempotency.commandFingerprint,
          resultJson: commit.idempotency.result,
          createdAt: new Date(commit.event.occurredAt),
        });
      });
    });
  }

  async revokeAuthorization(commit: JurisprudencePublicationAuthorizationUpdateCommit) {
    return this.update(commit);
  }

  async supersedeByRecordVersion(commit: JurisprudencePublicationAuthorizationUpdateCommit) {
    return this.update(commit);
  }

  async findIdempotencyResult(idempotencyKey: string) {
    return this.safely(async () => {
      const db = getJurisprudenceInternalReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        const rows = await tx.select({
          commandFingerprint: jurisprudencePublicationAuthorizationIdempotency.commandFingerprint,
          resultJson: jurisprudencePublicationAuthorizationIdempotency.resultJson
        })
          .from(jurisprudencePublicationAuthorizationIdempotency)
          .where(eq(jurisprudencePublicationAuthorizationIdempotency.idempotencyKey, idempotencyKey))
          .limit(1);

        if (rows.length === 0) return null;

        const parsed = jurisprudencePublicationAuthorizationViewSchema.safeParse(
          typeof rows[0]?.resultJson === "string" ? parseJson(rows[0]?.resultJson) : rows[0]?.resultJson
        );
        if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("REPOSITORY_UNAVAILABLE", "El resultado idempotente es inválido.");

        return clonePublicationAuthorizationIdempotency({
          idempotencyKey,
          commandFingerprint: rows[0]!.commandFingerprint,
          result: parsed.data,
        });
      });
    });
  }

  async close() {
    if (this.#closed) return;
    this.#closed = true;
  }
}
