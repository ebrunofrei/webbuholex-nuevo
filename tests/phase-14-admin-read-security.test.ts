import { describe, expect, it, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";
import type { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";
import type { AdminCapability, ExternalIdentityProvider } from "@/database/repositories/authorization.types";
import { withComplaintsAdminReadRole } from "@/database/roles";

describe("Phase 14.O.D.4.6-A.2 - Admin Read Security Foundation (Static/Unit)", () => {
  describe("A. Capability Contract", () => {
    it("admite complaints:read y complaints:respond a nivel TypeScript", () => {
      const readCap: AdminCapability = "complaints:read";
      const respondCap: AdminCapability = "complaints:respond";
      expect(readCap).toBe("complaints:read");
      expect(respondCap).toBe("complaints:respond");

      // Verificación estática: valores desconocidos lanzan error TS.
      // @ts-expect-error type test para unknown
      const unknownCap: AdminCapability = "complaints:unknown";
      expect(unknownCap).toBe("complaints:unknown");
    });

    it("la segregación es estricta: read no implica respond y viceversa", async () => {
      const mockRepoRead: OperatorAuthorizationRepository = {
        resolveAuthorizedOperator: async (provider: ExternalIdentityProvider, sub: string, capability: AdminCapability) => {
          if (capability === "complaints:read") {
            return { kind: "authorized", operatorId: "123" };
          }
          return { kind: "capability_missing" };
        },
      };

      const session = {
        status: "authenticated",
        provider: "auth0",
        providerSubjectId: "auth0|sub",
        sessionId: "mock",
        issuedAt: 0,
        expiresAt: 0,
      } as unknown as import("@/types/auth").WorkspaceSession;

      const resultRespond = await resolveTrustedAdminPrincipal(session, "complaints:respond", mockRepoRead);
      expect(resultRespond.kind).toBe("capability_missing");

      const resultRead = await resolveTrustedAdminPrincipal(session, "complaints:read", mockRepoRead);
      expect(resultRead.kind).toBe("authorized");

      const mockRepoRespond: OperatorAuthorizationRepository = {
        resolveAuthorizedOperator: async (provider: ExternalIdentityProvider, sub: string, capability: AdminCapability) => {
          if (capability === "complaints:respond") {
            return { kind: "authorized", operatorId: "456" };
          }
          return { kind: "capability_missing" };
        },
      };

      const resultRead2 = await resolveTrustedAdminPrincipal(session, "complaints:read", mockRepoRespond);
      expect(resultRead2.kind).toBe("capability_missing");
      const resultRespond2 = await resolveTrustedAdminPrincipal(session, "complaints:respond", mockRepoRespond);
      expect(resultRespond2.kind).toBe("authorized");
    });
  });

  describe("B. Roles Transaction Wrapper (withComplaintsAdminReadRole)", () => {
    it("ejecuta SET LOCAL ROLE complaints_admin_read_runtime", async () => {
      const mockExecute = vi.fn();
      const mockTx = { execute: mockExecute };
      const mockDb = {
        transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          return await cb(mockTx);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await withComplaintsAdminReadRole(mockDb as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<any>, async () => "ok");
      expect(mockExecute).toHaveBeenCalled();
      expect(JSON.stringify(mockExecute.mock.calls[0]![0])).toContain("complaints_admin_read_runtime");
    });

    it("es fail-closed: si SET LOCAL ROLE falla, el callback no se ejecuta", async () => {
      let callbackExecuted = false;
      const mockTx = {
        execute: async () => {
          throw new Error("SET LOCAL ROLE FAILED");
        },
      };
      const mockDb = {
        transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          return await cb(mockTx);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(withComplaintsAdminReadRole(mockDb as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<any>, async () => {
        callbackExecuted = true;
      })).rejects.toThrow("SET LOCAL ROLE FAILED");

      expect(callbackExecuted).toBe(false);
    });

    it("el error del callback se propaga correctamente", async () => {
      const mockTx = {
        execute: async () => {},
      };
      const mockDb = {
        transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          return await cb(mockTx);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(withComplaintsAdminReadRole(mockDb as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<any>, async () => {
        throw new Error("Callback Error");
      })).rejects.toThrow("Callback Error");
    });
  });

  describe("C. Static SQL Migration Analysis", () => {
    let sqlContent: string;

    beforeAll(() => {
      sqlContent = readFileSync("database/migrations/0011_admin_read_runtime.sql", "utf-8");
    });

    it("crea el runtime role pero no el login", () => {
      expect(sqlContent).toContain("CREATE ROLE complaints_admin_read_runtime");
      expect(sqlContent).not.toContain("CREATE ROLE complaints_admin_read_login");
    });

    it("no contiene passwords ni secrets", () => {
      expect(sqlContent.toLowerCase()).not.toContain("password");
      expect(sqlContent.toLowerCase()).not.toContain("secret");
    });

    it("contiene GRANT SELECT solo para las 6 columnas autorizadas", () => {
      const selectMatch = sqlContent.match(/GRANT SELECT \(([^)]+)\) ON complaints_private\.complaints/);
      if (!selectMatch || !selectMatch[1]) throw new Error("Match failed");

      const columns = selectMatch[1].split(",").map(c => c.trim().toLowerCase());
      expect(columns).toHaveLength(6);
      expect(columns).toContain("id");
      expect(columns).toContain("sheet_number");
      expect(columns).toContain("status");
      expect(columns).toContain("submitted_at");
      expect(columns).toContain("deadline_at");
      expect(columns).toContain("updated_at");

      expect(sqlContent).not.toMatch(/GRANT SELECT ON complaints_private\.complaints/i);
    });

    it("no contiene grants de escritura", () => {
      expect(sqlContent.toLowerCase()).not.toContain("grant insert");
      expect(sqlContent.toLowerCase()).not.toContain("grant update");
      expect(sqlContent.toLowerCase()).not.toContain("grant delete");
      expect(sqlContent.toLowerCase()).not.toContain("grant truncate");
    });

    it("no contiene grants de escalamiento de roles", () => {
       expect(sqlContent.toLowerCase()).not.toContain("grant complaints_admin_runtime");
       expect(sqlContent.toLowerCase()).not.toContain("grant complaints_authorization_runtime");
    });
  });
});
