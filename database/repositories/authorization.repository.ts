import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, exists } from "drizzle-orm";
import * as schema from "../schema";
import { withComplaintsAuthorizationRole } from "../roles";
import { AuthorizationPersistenceError } from "./authorization.errors";
import type {
  ExternalIdentityProvider,
  AdminCapability,
  AuthorizationRepositoryResult
} from "./authorization.types";

export interface OperatorAuthorizationRepository {
  resolveAuthorizedOperator(
    provider: ExternalIdentityProvider,
    externalSubjectId: string,
    requiredCapability: AdminCapability
  ): Promise<AuthorizationRepositoryResult>;
}

function findPostgresError(error: unknown, depth: number = 0): Record<string, unknown> | null {
  if (depth > 5 || typeof error !== "object" || error === null) return null;

  if (error instanceof Error && error.name === "AuthorizationPersistenceError") return null;

  const record = error as Record<string, unknown>;
  const hasPostgresContext = record.name === "PostgresError" || typeof record.severity === "string" || typeof record.routine === "string";

  // Postgres SQLSTATE codes are exactly 5 alphanumeric characters
  if (typeof record.code === "string" && /^[0-9A-Z]{5}$/.test(record.code) && hasPostgresContext) {
    return record;
  }

  if (typeof record.code === "string" && (record.code.startsWith("ECONN") || record.code === "ENOTFOUND" || record.code === "EHOSTUNREACH")) {
    return record;
  }

  if ("cause" in record && record.cause !== undefined) {
    return findPostgresError(record.cause, depth + 1);
  }

  return null;
}

function translateDatabaseError(error: unknown): unknown {
  const pgError = findPostgresError(error);
  if (pgError) {
    return new AuthorizationPersistenceError("authorization_repository_query_failed");
  }
  return error;
}

export function createAuthorizationRepository(
  db: PostgresJsDatabase<typeof schema>
): OperatorAuthorizationRepository {
  return {
    async resolveAuthorizedOperator(provider, externalSubjectId, requiredCapability) {
      try {
        return await withComplaintsAuthorizationRole(db, async (tx) => {
          const result = await tx
            .select({
              operatorId: schema.operators.id,
              status: schema.operators.status,
              hasCapability: exists(
                tx.select()
                  .from(schema.operatorCapabilities)
                  .where(
                    and(
                      eq(schema.operatorCapabilities.operatorId, schema.operators.id),
                      eq(schema.operatorCapabilities.capability, requiredCapability)
                    )
                  )
              )
            })
            .from(schema.externalIdentityBindings)
            .innerJoin(
              schema.operators,
              eq(schema.externalIdentityBindings.operatorId, schema.operators.id)
            )
            .where(
              and(
                eq(schema.externalIdentityBindings.provider, provider),
                eq(schema.externalIdentityBindings.externalSubjectId, externalSubjectId)
              )
            )
            .limit(1);

          if (result.length === 0) {
            return { kind: "operator_not_mapped" };
          }

          const row = result[0];
          if (!row) {
            return { kind: "operator_not_mapped" };
          }

          if (row.status !== "active") {
            return { kind: "operator_inactive" };
          }

          if (!row.hasCapability) {
            return { kind: "capability_missing" };
          }

          return { kind: "authorized", operatorId: row.operatorId };
        });
      } catch (error) {
        throw translateDatabaseError(error);
      }
    }
  };
}
