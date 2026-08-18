import { eq, and, desc, asc } from "drizzle-orm";
import { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { PgTransaction } from "drizzle-orm/pg-core";
import { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "@/database/schema";
import {
  JurisprudencePublicationExecutionError,
  clonePublicationExecution,
  clonePublicationExecutionEvent,
  clonePublicationExecutionIdempotency,
  isPublicationExecutionCurrent,
} from "@/lib/jurisprudence-publication-execution-repository";
import {
  jurisprudencePublicationExecutionEventSchema,
  jurisprudencePublicationExecutionViewSchema,
} from "@/lib/schemas/jurisprudence-publication-execution";
import type {
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionCreateCommit,
  JurisprudencePublicationExecutionEvent,
  JurisprudencePublicationExecutionIdempotencyEntry,
  JurisprudencePublicationExecutionRepository,
  JurisprudencePublicationExecutionUpdateCommit,
  JurisprudencePublicationExecutionStatus,
  JurisprudencePublicationWithdrawalReason,
} from "@/types/jurisprudence-publication-execution";

type DbExecutor = PostgresJsDatabase<typeof schema> | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

function parseJson(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido.");
  }
  return value;
}

function parseEvent(payloadJson: unknown): JurisprudencePublicationExecutionEvent {
  const parsed = jurisprudencePublicationExecutionEventSchema.safeParse(parseJson(payloadJson));
  if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "El evento persistido es inválido.");
  return clonePublicationExecutionEvent(parsed.data);
}

function mapExecutionFromRow(row: typeof schema.jurisprudencePublicationExecutions.$inferSelect): JurisprudencePublicationExecution {
  return clonePublicationExecution({
    executionId: row.executionId,
    recordId: row.recordId,
    recordVersion: row.recordVersion,
    editorialCaseId: row.editorialCaseId,
    publicationDossierId: row.publicationDossierId,
    authorizationCaseId: row.authorizationCaseId,
    projectionId: row.projectionId,
    status: row.status as JurisprudencePublicationExecutionStatus,
    version: row.version,
    executedAt: row.executedAt.toISOString(),
    executedByReference: row.executedByReference,
    withdrawnAt: row.withdrawnAt ? row.withdrawnAt.toISOString() : null,
    withdrawalReason: row.withdrawalReason as JurisprudencePublicationWithdrawalReason | null,
    supersededAt: row.supersededAt ? row.supersededAt.toISOString() : null,
    supersededByRecordVersion: row.supersededByRecordVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publicationExecuted: row.publicationExecuted,
    deployed: false,
  });
}

export class PostgresJurisprudencePublicationExecutionRepository implements JurisprudencePublicationExecutionRepository {
  readonly #executor: DbExecutor;
  #closed = false;

  constructor(executor: DbExecutor) {
    this.#executor = executor;
  }

  private assertOpen() {
    if (this.#closed) {
      throw new JurisprudencePublicationExecutionError("RESOURCE_CLOSED", "El repositorio está cerrado.");
    }
  }

  private async safely<T>(operation: () => Promise<T>): Promise<T> {
    this.assertOpen();
    try {
      return await operation();
    } catch (error) {
      if (error instanceof JurisprudencePublicationExecutionError) throw error;
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if ((error as { code?: string }).code === '23505') {
          throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "Conflicto de versión detectado.");
        }
      }
      throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "No fue posible completar la persistencia de ejecución.");
    }
  }

  private async withTransaction<T>(operation: (tx: DbExecutor) => Promise<T>): Promise<T> {
    if (typeof (this.#executor as PostgresJsDatabase<typeof schema>).transaction === "function") {
      return await (this.#executor as PostgresJsDatabase<typeof schema>).transaction(async (tx) => {
        return await operation(tx);
      });
    } else {
      return await operation(this.#executor);
    }
  }

  async findById(executionId: string): Promise<JurisprudencePublicationExecution | null> {
    return this.safely(async () => {
      const result = await this.#executor.select()
        .from(schema.jurisprudencePublicationExecutions)
        .where(eq(schema.jurisprudencePublicationExecutions.executionId, executionId))
        .limit(1);

      if (result.length === 0) return null;
      if (result.length === 0) return null;
      return mapExecutionFromRow(result[0] as typeof schema.jurisprudencePublicationExecutions.$inferSelect);
    });
  }

  async findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicationExecution | null> {
    return this.safely(async () => {
      const results = await this.#executor.select()
        .from(schema.jurisprudencePublicationExecutions)
        .where(
          and(
            eq(schema.jurisprudencePublicationExecutions.recordId, recordId),
            eq(schema.jurisprudencePublicationExecutions.recordVersion, recordVersion),
            eq(schema.jurisprudencePublicationExecutions.status, 'executed')
          )
        );

      const mapped = results.map(mapExecutionFromRow);
      return mapped.find(isPublicationExecutionCurrent) ?? null;
    });
  }

  async findLatestByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicationExecution | null> {
    return this.safely(async () => {
      const result = await this.#executor.select()
        .from(schema.jurisprudencePublicationExecutions)
        .where(
          and(
            eq(schema.jurisprudencePublicationExecutions.recordId, recordId),
            eq(schema.jurisprudencePublicationExecutions.recordVersion, recordVersion)
          )
        )
        .orderBy(desc(schema.jurisprudencePublicationExecutions.version)) // equivalent to rowid DESC logic
        .limit(1);

      if (result.length === 0) return null;
      if (result.length === 0) return null;
      return mapExecutionFromRow(result[0] as typeof schema.jurisprudencePublicationExecutions.$inferSelect);
    });
  }

  async listHistory(recordId: string): Promise<readonly JurisprudencePublicationExecutionEvent[]> {
    return this.safely(async () => {
      const results = await this.#executor.select({ payloadJson: schema.jurisprudencePublicationExecutionEvents.payloadJson })
        .from(schema.jurisprudencePublicationExecutionEvents)
        .where(eq(schema.jurisprudencePublicationExecutionEvents.recordId, recordId))
        .orderBy(asc(schema.jurisprudencePublicationExecutionEvents.sequence));

      return results.map(r => parseEvent(r.payloadJson));
    });
  }

  async findIdempotencyResult(idempotencyKey: string): Promise<JurisprudencePublicationExecutionIdempotencyEntry | null> {
    return this.safely(async () => {
      const result = await this.#executor.select()
        .from(schema.jurisprudencePublicationIdempotency)
        .where(eq(schema.jurisprudencePublicationIdempotency.idempotencyKey, idempotencyKey))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0] as typeof schema.jurisprudencePublicationIdempotency.$inferSelect;
      const parsed = jurisprudencePublicationExecutionViewSchema.safeParse(parseJson(row.resultJson));
      if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "El resultado idempotente es inválido.");
      
      return clonePublicationExecutionIdempotency({
        idempotencyKey,
        commandFingerprint: row.commandFingerprint,
        result: parsed.data
      });
    });
  }

  async createExecution(commit: JurisprudencePublicationExecutionCreateCommit): Promise<void> {
    await this.safely(() => this.withTransaction(async (tx) => {
      const activeResults = await tx.select()
        .from(schema.jurisprudencePublicationExecutions)
        .where(
          and(
            eq(schema.jurisprudencePublicationExecutions.recordId, commit.execution.recordId),
            eq(schema.jurisprudencePublicationExecutions.recordVersion, commit.execution.recordVersion),
            eq(schema.jurisprudencePublicationExecutions.status, 'executed')
          )
        );
      
      const active = activeResults.map(mapExecutionFromRow).some(isPublicationExecutionCurrent);
      if (active) throw new JurisprudencePublicationExecutionError("EXECUTION_ALREADY_ACTIVE", "Ya existe una ejecución vigente.");

      await tx.insert(schema.jurisprudencePublicationExecutions).values({
        executionId: commit.execution.executionId,
        recordId: commit.execution.recordId,
        recordVersion: commit.execution.recordVersion,
        editorialCaseId: commit.execution.editorialCaseId,
        publicationDossierId: commit.execution.publicationDossierId,
        authorizationCaseId: commit.execution.authorizationCaseId,
        projectionId: commit.execution.projectionId,
        status: commit.execution.status,
        version: commit.execution.version,
        executedAt: new Date(commit.execution.executedAt),
        executedByReference: commit.execution.executedByReference,
        withdrawnAt: commit.execution.withdrawnAt ? new Date(commit.execution.withdrawnAt) : null,
        withdrawalReason: commit.execution.withdrawalReason,
        supersededAt: commit.execution.supersededAt ? new Date(commit.execution.supersededAt) : null,
        supersededByRecordVersion: commit.execution.supersededByRecordVersion,
        createdAt: new Date(commit.execution.createdAt),
        updatedAt: new Date(commit.execution.updatedAt),
        publicationExecuted: commit.execution.publicationExecuted,
        deployed: false,
      });

      await tx.insert(schema.jurisprudencePublicationExecutionEvents).values({
        eventId: commit.event.eventId,
        executionId: commit.event.executionId,
        recordId: commit.event.recordId,
        recordVersion: commit.event.recordVersion,
        executionVersion: commit.event.executionVersion,
        sequence: commit.event.sequence,
        type: commit.event.type,
        occurredAt: new Date(commit.event.occurredAt),
        payloadJson: commit.event,
      });

      await tx.insert(schema.jurisprudencePublicationIdempotency).values({
        idempotencyKey: commit.idempotency.idempotencyKey,
        commandFingerprint: commit.idempotency.commandFingerprint,
        resultJson: commit.idempotency.result,
        createdAt: new Date(commit.event.occurredAt),
      });
    }));
  }

  async updateExecution(commit: JurisprudencePublicationExecutionUpdateCommit): Promise<void> {
    await this.safely(() => this.withTransaction(async (tx) => {
      const updateResult = await tx.update(schema.jurisprudencePublicationExecutions)
        .set({
          version: commit.execution.version,
          status: commit.execution.status,
          withdrawnAt: commit.execution.withdrawnAt ? new Date(commit.execution.withdrawnAt) : null,
          withdrawalReason: commit.execution.withdrawalReason,
          supersededAt: commit.execution.supersededAt ? new Date(commit.execution.supersededAt) : null,
          supersededByRecordVersion: commit.execution.supersededByRecordVersion,
          updatedAt: new Date(commit.execution.updatedAt),
          publicationExecuted: commit.execution.publicationExecuted,
        })
        .where(
          and(
            eq(schema.jurisprudencePublicationExecutions.executionId, commit.execution.executionId),
            eq(schema.jurisprudencePublicationExecutions.version, commit.expectedVersion)
          )
        );
      
      // In Postgres driver, we can't always check count easily if no returning, but drizzle lets us check row count?
      // Wait, updateResult could be the raw postgres result. `updateResult.count` or `updateResult.rowCount`?
      // For drizzle with postgres, `updateResult` is typically the postgres Result object, which has `count` or `rowCount` depending on driver.
      // Drizzle with `postgres` (postgres.js) returns `postgres.RowList<T[]>`. The `count` property has the rows affected!
      if (updateResult.count !== 1) {
        throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "La versión de ejecución cambió.");
      }

      await tx.insert(schema.jurisprudencePublicationExecutionEvents).values({
        eventId: commit.event.eventId,
        executionId: commit.event.executionId,
        recordId: commit.event.recordId,
        recordVersion: commit.event.recordVersion,
        executionVersion: commit.event.executionVersion,
        sequence: commit.event.sequence,
        type: commit.event.type,
        occurredAt: new Date(commit.event.occurredAt),
        payloadJson: commit.event,
      });

      await tx.insert(schema.jurisprudencePublicationIdempotency).values({
        idempotencyKey: commit.idempotency.idempotencyKey,
        commandFingerprint: commit.idempotency.commandFingerprint,
        resultJson: commit.idempotency.result,
        createdAt: new Date(commit.event.occurredAt),
      });
    }));
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
  }
}
