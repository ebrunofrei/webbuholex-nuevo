import "server-only";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, asc } from "drizzle-orm";
import * as schema from "@/database/schema";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";
import {
  JurisprudencePublicationExecutionError,
  clonePublicProjection,
} from "@/lib/jurisprudence-publication-execution-repository";
import { jurisprudencePublicProjectionSchema } from "@/lib/schemas/jurisprudence-publication-execution";
import type {
  JurisprudencePublicProjection,
  JurisprudencePublicProjectionRepository,
} from "@/types/jurisprudence-publication-execution";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";

function parseJson(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La persistencia contiene JSON inválido.");
  }
  return value;
}

export type PostgresJurisprudencePublicProjectionRepositoryDependencies = {
  getReadDatabase: () => PostgresJsDatabase<Record<string, never>>;
};

export class PostgresJurisprudencePublicProjectionRepository implements JurisprudencePublicProjectionRepository {
  #closed = false;
  #deps: PostgresJurisprudencePublicProjectionRepositoryDependencies;

  constructor(deps?: Partial<PostgresJurisprudencePublicProjectionRepositoryDependencies>) {
    this.#deps = {
      getReadDatabase: deps?.getReadDatabase ?? getJurisprudenceInternalReadDatabase,
    };
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
      throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "No fue posible completar la lectura de proyección.");
    }
  }

  async findById(projectionId: string): Promise<JurisprudencePublicProjection | null> {
    return this.safely(async () => {
      const db = this.#deps.getReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        const result = await tx.select({ payloadJson: schema.jurisprudencePublicProjections.payloadJson })
          .from(schema.jurisprudencePublicProjections)
          .where(eq(schema.jurisprudencePublicProjections.projectionId, projectionId))
          .limit(1);

        if (result.length === 0) return null;
        const parsed = jurisprudencePublicProjectionSchema.safeParse(parseJson(result[0]!.payloadJson));
        if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La proyección persistida es inválida.");
        return clonePublicProjection(parsed.data);
      });
    });
  }

  async findActiveByRecordVersion(recordId: string, recordVersion: number): Promise<JurisprudencePublicProjection | null> {
    return this.safely(async () => {
      const db = this.#deps.getReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        const result = await tx.select({ payloadJson: schema.jurisprudencePublicProjections.payloadJson })
          .from(schema.jurisprudencePublicProjections)
          .where(
            and(
              eq(schema.jurisprudencePublicProjections.recordId, recordId),
              eq(schema.jurisprudencePublicProjections.recordVersion, recordVersion),
              eq(schema.jurisprudencePublicProjections.status, 'active_internal')
            )
          )
          .limit(1);

        if (result.length === 0) return null;
        const parsed = jurisprudencePublicProjectionSchema.safeParse(parseJson(result[0]!.payloadJson));
        if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La proyección persistida es inválida.");
        return clonePublicProjection(parsed.data);
      });
    });
  }

  async listByRecord(recordId: string): Promise<readonly JurisprudencePublicProjection[]> {
    return this.safely(async () => {
      const db = this.#deps.getReadDatabase();
      return withJurisprudenceInternalReadRole(db, async (tx) => {
        const results = await tx.select({ payloadJson: schema.jurisprudencePublicProjections.payloadJson })
          .from(schema.jurisprudencePublicProjections)
          .where(eq(schema.jurisprudencePublicProjections.recordId, recordId));

        return results.map(r => {
          const parsed = jurisprudencePublicProjectionSchema.safeParse(parseJson(r.payloadJson));
          if (!parsed.success) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La proyección persistida es inválida.");
          return clonePublicProjection(parsed.data);
        });
      });
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
  }
}
