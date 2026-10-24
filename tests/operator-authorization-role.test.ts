import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { withOperatorAuthorizationRole } from "@/database/roles";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { AuthorizationPersistenceError } from "@/database/repositories/authorization.errors";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

interface MockTxScope {
  execute: ReturnType<typeof vi.fn>;
  select?: ReturnType<typeof vi.fn>;
}

type TransactionCallback = (tx: MockTxScope) => Promise<unknown>;

function createMockDb(
  transactionImpl: (cb: TransactionCallback) => Promise<unknown>
): PostgresJsDatabase<typeof schema> {
  const db = drizzle.mock({ schema });
  Object.defineProperty(db, "transaction", {
    value: vi.fn(transactionImpl),
    writable: true,
  });
  return db;
}

describe("BÚHOLEX-AUTH-A0.4-FIX3: Generic Operator Authorization Runtime Role & Decoupling", () => {
  describe("1. Migration 0044 Static Security & Journal Contract", () => {
    const migrationPath = path.join(__dirname, "../database/migrations/0044_operator_authorization_runtime.sql");
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    const content = migrationSql.toUpperCase();

    it("creates operator_authorization_runtime with NOLOGIN attribute", () => {
      expect(content).toContain("OPERATOR_AUTHORIZATION_RUNTIME");
      expect(content).toContain("NOLOGIN");
    });

    it("grants operator_authorization_runtime to complaints_authorization_login transport", () => {
      expect(content).toContain("GRANT OPERATOR_AUTHORIZATION_RUNTIME TO COMPLAINTS_AUTHORIZATION_LOGIN;");
    });

    it("grants USAGE on schema authorization", () => {
      expect(content).toContain("GRANT USAGE ON SCHEMA \"AUTHORIZATION\" TO OPERATOR_AUTHORIZATION_RUNTIME;");
    });

    it("grants SELECT on authorization.operators and authorization.external_identity_bindings only", () => {
      expect(content).toContain("GRANT SELECT ON \"AUTHORIZATION\".\"OPERATORS\" TO OPERATOR_AUTHORIZATION_RUNTIME;");
      expect(content).toContain("GRANT SELECT ON \"AUTHORIZATION\".\"EXTERNAL_IDENTITY_BINDINGS\" TO OPERATOR_AUTHORIZATION_RUNTIME;");
    });

    it("DOES NOT grant module capability or role tables", () => {
      expect(content).not.toContain("OPERATOR_CAPABILITIES");
      expect(content).not.toContain("OPERATOR_JURISPRUDENCE_ROLES");
      expect(content).not.toContain("OPERATOR_JURISPRUDENCE_ROLE_SETS");
    });

    it("contains NO write, mutation, or broad schema privileges", () => {
      expect(content).not.toContain("GRANT INSERT");
      expect(content).not.toContain("GRANT UPDATE");
      expect(content).not.toContain("GRANT DELETE");
      expect(content).not.toContain("GRANT TRUNCATE");
      expect(content).not.toContain("GRANT REFERENCES");
      expect(content).not.toContain("GRANT TRIGGER");
      expect(content).not.toContain("GRANT ALL");
    });

    it("preserves canonical journal ordering: 0043 -> 0044", () => {
      const journalPath = path.join(__dirname, "../database/migrations/meta/_journal.json");
      const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
      const entries = journal.entries;

      const idx43 = entries.find((e: { idx: number }) => e.idx === 43);
      const idx44 = entries.find((e: { idx: number }) => e.idx === 44);

      expect(idx43).toBeDefined();
      expect(idx43.tag).toBe("0043_supabase_auth_provider_support");

      expect(idx44).toBeDefined();
      expect(idx44.tag).toBe("0044_operator_authorization_runtime");
      expect(entries.indexOf(idx44)).toBe(entries.indexOf(idx43) + 1);
    });
  });

  describe("2. Database Role Wrapper withOperatorAuthorizationRole", () => {
    it("executes SET LOCAL ROLE operator_authorization_runtime and preserves return value", async () => {
      const executedStatements: string[] = [];
      const mockTx = {
        execute: vi.fn(async (query: { queryChunks?: Array<{ value?: string[] }> }) => {
          const sqlText = query?.queryChunks?.[0]?.value?.[0] || String(query);
          executedStatements.push(sqlText);
        }),
        select: vi.fn(async () => {
          executedStatements.push("business_query");
        }),
      };

      const mockDb = createMockDb(async (cb) => {
        executedStatements.push("BEGIN");
        const res = await cb(mockTx);
        executedStatements.push("COMMIT");
        return res;
      });

      const result = await withOperatorAuthorizationRole(mockDb, async (tx) => {
        await tx.select();
        return "operator_success";
      });

      expect(result).toBe("operator_success");
      expect(executedStatements).toHaveLength(4);
      expect(executedStatements[0]).toBe("BEGIN");
      expect(executedStatements[1]).toBe("SET LOCAL ROLE operator_authorization_runtime");
      expect(executedStatements[2]).toBe("business_query");
      expect(executedStatements[3]).toBe("COMMIT");
    });

    it("does not execute complaints or jurisprudence authorization roles", async () => {
      const executedStatements: string[] = [];
      const mockTx = {
        execute: vi.fn(async (query: { queryChunks?: Array<{ value?: string[] }> }) => {
          const sqlText = query?.queryChunks?.[0]?.value?.[0] || String(query);
          executedStatements.push(sqlText);
        }),
      };

      const mockDb = createMockDb(async (cb) => {
        return await cb(mockTx);
      });

      await withOperatorAuthorizationRole(mockDb, async () => "ok");

      expect(executedStatements).toContain("SET LOCAL ROLE operator_authorization_runtime");
      expect(executedStatements).not.toContain("SET LOCAL ROLE complaints_authorization_runtime");
      expect(executedStatements).not.toContain("SET LOCAL ROLE jurisprudence_authorization_runtime");
    });

    it("fails closed: if SET LOCAL ROLE fails, callback is never called", async () => {
      const mockTx = {
        execute: vi.fn().mockRejectedValue(new Error("role operator_authorization_runtime does not exist")),
      };

      const mockDb = createMockDb(async (cb) => {
        return await cb(mockTx);
      });

      let callbackExecuted = false;
      await expect(
        withOperatorAuthorizationRole(mockDb, async () => {
          callbackExecuted = true;
          return "unreachable";
        })
      ).rejects.toThrow("role operator_authorization_runtime does not exist");

      expect(callbackExecuted).toBe(false);
    });
  });

  describe("3. Repository resolveActiveOperator Decoupling", () => {
    it("returns authorized with REAL operator UUID when operator is active", async () => {
      const realOperatorUuid = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
      const mockTx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: vi.fn(() => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    operatorId: realOperatorUuid,
                    status: "active",
                  },
                ]),
              }),
            }),
          }),
        })),
      };

      const mockDb = createMockDb(async (cb) => {
        return await cb(mockTx);
      });

      const repo = createAuthorizationRepository(mockDb);
      const result = await repo.resolveActiveOperator("supabase", "user-sub-123");

      expect(result).toEqual({
        kind: "authorized",
        operatorId: realOperatorUuid,
      });
      expect(mockTx.execute.mock.calls.length).toBeGreaterThan(0);
      const firstCall = mockTx.execute.mock.calls[0];
      const firstExecuteCall = firstCall ? firstCall[0] : null;
      const sqlText = firstExecuteCall?.queryChunks?.[0]?.value?.[0] || String(firstExecuteCall);
      expect(sqlText).toBe("SET LOCAL ROLE operator_authorization_runtime");
    });

    it("returns operator_not_mapped when no external binding exists", async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: vi.fn(() => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        })),
      };

      const mockDb = createMockDb(async (cb) => {
        return await cb(mockTx);
      });

      const repo = createAuthorizationRepository(mockDb);
      const result = await repo.resolveActiveOperator("supabase", "unmapped-sub");

      expect(result).toEqual({ kind: "operator_not_mapped" });
    });

    it("returns operator_inactive when operator status is not active", async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: vi.fn(() => ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    operatorId: "op-uuid-inactive",
                    status: "suspended",
                  },
                ]),
              }),
            }),
          }),
        })),
      };

      const mockDb = createMockDb(async (cb) => {
        return await cb(mockTx);
      });

      const repo = createAuthorizationRepository(mockDb);
      const result = await repo.resolveActiveOperator("auth0", "inactive-sub");

      expect(result).toEqual({ kind: "operator_inactive" });
    });

    it("translates postgres connection failure into AuthorizationPersistenceError", async () => {
      class MockPostgresError extends Error {
        code = "ECONNREFUSED";
        override name = "PostgresError";
      }
      const pgError = new MockPostgresError("connection failure");

      const mockDb = createMockDb(vi.fn().mockRejectedValue(pgError));

      const repo = createAuthorizationRepository(mockDb);
      await expect(
        repo.resolveActiveOperator("supabase", "sub-123")
      ).rejects.toThrow(AuthorizationPersistenceError);
    });
  });
});
