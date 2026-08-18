import { describe, expect, it, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

import { withJurisprudencePublicationCommandRole } from "@/database/roles";

describe("Phase J1-E.3C.1 - Publication Command Security Foundation", () => {
  describe("Roles Transaction Wrapper (withJurisprudencePublicationCommandRole)", () => {
    it("ejecuta SET LOCAL ROLE jurisprudence_publication_command_runtime", async () => {
      const mockExecute = vi.fn();
      const mockTx = { execute: mockExecute };
      const mockDb = {
        transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          return await cb(mockTx);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await withJurisprudencePublicationCommandRole(mockDb as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<any>, async () => "ok");
      expect(mockExecute).toHaveBeenCalled();
      expect(JSON.stringify(mockExecute.mock.calls[0]![0])).toContain("jurisprudence_publication_command_runtime");
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
      await expect(withJurisprudencePublicationCommandRole(mockDb as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<any>, async () => {
        callbackExecuted = true;
      })).rejects.toThrow("SET LOCAL ROLE FAILED");

      expect(callbackExecuted).toBe(false);
    });
  });

  describe("Static SQL Migration Analysis", () => {
    let sqlContent: string;

    beforeAll(() => {
      sqlContent = readFileSync("database/migrations/0023_jurisprudence_publication_command_security.sql", "utf-8");
    });

    it("crea el runtime role NOLOGIN y command login LOGIN NOINHERIT", () => {
      expect(sqlContent).toMatch(/CREATE ROLE jurisprudence_publication_command_runtime NOLOGIN/i);
      expect(sqlContent).toMatch(/CREATE ROLE jurisprudence_publication_command_login LOGIN NOINHERIT/i);
    });

    it("otorga la membresía (membership exists)", () => {
      expect(sqlContent).toMatch(/GRANT jurisprudence_publication_command_runtime TO jurisprudence_publication_command_login/i);
    });

    it("no contiene passwords ni secrets", () => {
      expect(sqlContent.toLowerCase()).not.toContain("password");
      expect(sqlContent.toLowerCase()).not.toContain("secret");
    });

    it("command has internal schema USAGE", () => {
      expect(sqlContent).toMatch(/GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_publication_command_runtime/i);
    });

    it("command can required ops on executions", () => {
      expect(sqlContent).toMatch(/GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_publication_executions TO jurisprudence_publication_command_runtime/i);
    });

    it("command can required ops on execution events", () => {
      expect(sqlContent).toMatch(/GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_execution_events TO jurisprudence_publication_command_runtime/i);
    });

    it("command can required ops on publication idempotency", () => {
      expect(sqlContent).toMatch(/GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_publication_idempotency TO jurisprudence_publication_command_runtime/i);
    });

    it("command can INSERT outbox", () => {
      expect(sqlContent).toMatch(/GRANT INSERT ON jurisprudence_internal.jurisprudence_publication_outbox TO jurisprudence_publication_command_runtime/i);
    });

    it("command cannot UPDATE or DELETE outbox", () => {
      const outboxGrants = sqlContent.match(/GRANT (.*) ON jurisprudence_internal.jurisprudence_publication_outbox TO jurisprudence_publication_command_runtime/i);
      if (outboxGrants && outboxGrants[1]) {
        expect(outboxGrants[1].toLowerCase()).not.toContain("update");
        expect(outboxGrants[1].toLowerCase()).not.toContain("delete");
        expect(outboxGrants[1].toLowerCase()).not.toContain("all");
      }
    });

    it("processor cannot INSERT outbox (not modified here)", () => {
      expect(sqlContent).not.toMatch(/jurisprudence_publication_outbox_runtime/i);
    });

    it("public writer cannot access outbox (not modified here)", () => {
      expect(sqlContent).not.toMatch(/jurisprudence_public_write_runtime/i);
    });

    it("public read cannot access outbox (not modified here)", () => {
      expect(sqlContent).not.toMatch(/jurisprudence_public_read_runtime/i);
    });

    it("command cannot access public schema", () => {
      expect(sqlContent).not.toMatch(/jurisprudence_published/i);
    });

    it("no contiene grants de escalamiento excesivo o generales", () => {
       expect(sqlContent.toLowerCase()).not.toContain("grant all");
       expect(sqlContent.toLowerCase()).not.toContain("alter default privileges");
       expect(sqlContent.toLowerCase()).not.toContain("grant create");
       expect(sqlContent.toLowerCase()).not.toContain("grant truncate");
       expect(sqlContent.toLowerCase()).not.toContain("grant references");
       expect(sqlContent.toLowerCase()).not.toContain("grant trigger");
    });
  });
});
