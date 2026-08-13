import { describe, expect, it, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

import { withComplaintsAdminDetailReadRole } from "@/database/roles";

describe("Phase 14.O.D.4.6-C.1 - Admin Complaint Detail Read Security Foundation (Static/Unit)", () => {
  describe("A. Roles Transaction Wrapper (withComplaintsAdminDetailReadRole)", () => {
    it("ejecuta SET LOCAL ROLE complaints_admin_detail_read_runtime with REPEATABLE READ READ ONLY", async () => {
      const mockExecute = vi.fn();
      const mockTx = { execute: mockExecute };
      const mockDb = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>, options: any) => {
          expect(options).toEqual({ isolationLevel: "repeatable read", accessMode: "read only" });
          return await cb(mockTx);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await withComplaintsAdminDetailReadRole(mockDb as any, async () => "ok");
      expect(mockExecute).toHaveBeenCalled();
      expect(JSON.stringify(mockExecute.mock.calls[0]![0])).toContain("complaints_admin_detail_read_runtime");
    });
  });

  describe("B. Static SQL Migration Analysis", () => {
    let sqlContent: string;

    beforeAll(() => {
      sqlContent = readFileSync("database/migrations/0012_admin_detail_read_runtime.sql", "utf-8");
    });

    it("crea el runtime role NOLOGIN pero no el login", () => {
      expect(sqlContent).toContain("CREATE ROLE complaints_admin_detail_read_runtime NOLOGIN");
      expect(sqlContent).not.toContain("CREATE ROLE complaints_admin_detail_read_login");
    });

    it("runtime role lacks dangerous privileges", () => {
      expect(sqlContent).toContain("NOSUPERUSER");
      expect(sqlContent).toContain("NOCREATEDB");
      expect(sqlContent).toContain("NOCREATEROLE");
      expect(sqlContent).toContain("NOREPLICATION");
      expect(sqlContent).toContain("NOBYPASSRLS");
    });

    it("no contiene passwords ni secrets", () => {
      expect(sqlContent.toLowerCase()).not.toContain("password");
      expect(sqlContent.toLowerCase()).not.toContain("secret");
    });

    it("crea las tres vistas seguras requeridas", () => {
      expect(sqlContent).toContain("CREATE VIEW complaints_private.admin_complaint_detail_safe");
      expect(sqlContent).toContain("CREATE VIEW complaints_private.admin_complaint_current_response_safe");
      expect(sqlContent).toContain("CREATE VIEW complaints_private.admin_complaint_status_timeline_safe");
    });

    it("otorga privilegios solo a las vistas", () => {
      expect(sqlContent).toMatch(/GRANT SELECT ON complaints_private\.admin_complaint_detail_safe TO complaints_admin_detail_read_runtime/);
      expect(sqlContent).toMatch(/GRANT SELECT ON complaints_private\.admin_complaint_current_response_safe TO complaints_admin_detail_read_runtime/);
      expect(sqlContent).toMatch(/GRANT SELECT ON complaints_private\.admin_complaint_status_timeline_safe TO complaints_admin_detail_read_runtime/);

      expect(sqlContent).not.toMatch(/GRANT SELECT ON complaints_private\.complaints /);
      expect(sqlContent).not.toMatch(/GRANT SELECT ON complaints_private\.complaint_status_history /);
      expect(sqlContent).not.toMatch(/GRANT SELECT ON complaints_private\.complaint_provider_responses /);
    });

    it("no contiene grants de escritura", () => {
      expect(sqlContent.toLowerCase()).not.toContain("grant insert");
      expect(sqlContent.toLowerCase()).not.toContain("grant update");
      expect(sqlContent.toLowerCase()).not.toContain("grant delete");
      expect(sqlContent.toLowerCase()).not.toContain("grant truncate");
    });

    it("deniega acceso a PUBLIC sobre las vistas", () => {
      expect(sqlContent).toContain("REVOKE ALL ON complaints_private.admin_complaint_detail_safe FROM PUBLIC");
      expect(sqlContent).toContain("REVOKE ALL ON complaints_private.admin_complaint_current_response_safe FROM PUBLIC");
      expect(sqlContent).toContain("REVOKE ALL ON complaints_private.admin_complaint_status_timeline_safe FROM PUBLIC");
    });

    it("comprueba que payload_snapshot completo no se expone en la vista", () => {
      const match = sqlContent.match(/CREATE VIEW complaints_private.admin_complaint_detail_safe AS([\s\S]*?)FROM complaints_private\.complaints/);
      const viewSelect = match![1];
      expect(viewSelect).not.toMatch(/\bpayload_snapshot\b(?!->)/); // solo permitido si es seguido de ->
    });

    it("comprueba que schema_version está presente internamente en view logic", () => {
      expect(sqlContent).toMatch(/WHERE schema_version = '1\.0'/);
      const match = sqlContent.match(/CREATE VIEW complaints_private.admin_complaint_detail_safe AS([\s\S]*?)FROM complaints_private\.complaints/);
      expect(match![1]).toContain("schema_version");
    });

    it("comprueba que no hay PII diferido (document_number, ruc, email, phone, address) expuesto en vista", () => {
      const match = sqlContent.match(/CREATE VIEW complaints_private.admin_complaint_detail_safe AS([\s\S]*?)FROM complaints_private\.complaints/);
      const viewSelect = match![1];
      expect(viewSelect).not.toContain("document_number");
      expect(viewSelect).not.toContain("ruc");
      expect(viewSelect).not.toContain("email");
      expect(viewSelect).not.toContain("phone");
      expect(viewSelect).not.toContain("address");
    });

    it("comprueba current response highest-version logic", () => {
      expect(sqlContent).toContain("ORDER BY complaint_id, version DESC");
      expect(sqlContent).toContain("SELECT DISTINCT ON (complaint_id)");
    });

    it("comprueba timeline no expone identity ni reason", () => {
      const match = sqlContent.match(/CREATE VIEW complaints_private.admin_complaint_status_timeline_safe AS([\s\S]*?)FROM complaints_private\.complaint_status_history/);
      const viewSelect = match![1];
      expect(viewSelect).not.toContain("changed_by");
      expect(viewSelect).not.toContain("reason");
      expect(viewSelect).not.toContain("metadata");
    });

    it("no hace SELECT *", () => {
      expect(sqlContent).not.toContain("SELECT *");
    });
  });

  describe("C. Config and Env Check", () => {
    it("DATABASE_ADMIN_DETAIL_READ_URL está en .env.example", () => {
      const envContent = readFileSync(".env.example", "utf-8");
      expect(envContent).toContain("DATABASE_ADMIN_DETAIL_READ_URL=");
    });

    it("readComplaintsAdminDetailReadDatabaseConfig is lazy safe", async () => {
      const { readComplaintsAdminDetailReadDatabaseConfig } = await import("@/database/config");
      const missingConfig = readComplaintsAdminDetailReadDatabaseConfig({});
      expect(missingConfig.available).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((missingConfig as any).reason).toBe("missing");

      const invalidConfig = readComplaintsAdminDetailReadDatabaseConfig({ DATABASE_ADMIN_DETAIL_READ_URL: "not-a-url" });
      expect(invalidConfig.available).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((invalidConfig as any).reason).toBe("invalid");

      const validConfig = readComplaintsAdminDetailReadDatabaseConfig({ DATABASE_ADMIN_DETAIL_READ_URL: "postgres://user:pass@localhost:5432/db" });
      expect(validConfig.available).toBe(true);
      if (validConfig.available) {
        expect(validConfig.url).toBe("postgres://user:pass@localhost:5432/db");
      }
    });
  });

  describe("D. Corrective SQL Migration Analysis (0013 - Unsupported Schema Safe-Surface Fix)", () => {
    let sqlContent0013: string;

    beforeAll(() => {
      sqlContent0013 = readFileSync("database/migrations/0013_admin_detail_safe_unsupported_schema.sql", "utf-8");
    });

    it("recreates the safe view using CREATE OR REPLACE VIEW", () => {
      expect(sqlContent0013).toContain("CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS");
    });

    it("DOES NOT contain a schema-version row filter (no WHERE schema_version = '1.0')", () => {
      // The regression must prevent reintroduction of: WHERE schema_version = '1.0' or equivalent
      expect(sqlContent0013).not.toMatch(/WHERE\s+schema_version\s*=/);

      const match = sqlContent0013.match(/CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS([\s\S]*?)FROM complaints_private\.complaints/);
      expect(match).not.toBeNull();

      // Still maintains the exact column allowlist (does not expose full payload)
      expect(match![1]).not.toMatch(/\bpayload_snapshot\b(?!->)/);
      expect(match![1]).toContain("schema_version"); // schema_version is still exposed
    });

    it("preserves exact columns and data minimization (no PII exposure)", () => {
      const match = sqlContent0013.match(/CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS([\s\S]*?)FROM complaints_private\.complaints/);
      const viewSelect = match![1];
      expect(viewSelect).not.toContain("document_number");
      expect(viewSelect).not.toContain("ruc");
      expect(viewSelect).not.toContain("email");
      expect(viewSelect).not.toContain("phone");
      expect(viewSelect).not.toContain("address");
      expect(viewSelect).not.toContain("private_token_hash");
    });

    it("restores privileges properly", () => {
      expect(sqlContent0013).toMatch(/GRANT SELECT ON complaints_private\.admin_complaint_detail_safe TO complaints_admin_detail_read_runtime/);
      expect(sqlContent0013).toMatch(/REVOKE ALL ON complaints_private\.admin_complaint_detail_safe FROM PUBLIC/);
    });
  });

  describe("E. Corrective SQL Migration Analysis (0014 - Payload Projection Fix)", () => {
    let sqlContent0014: string;

    beforeAll(() => {
      sqlContent0014 = readFileSync("database/migrations/0014_admin_detail_safe_payload_projection.sql", "utf-8");
    });

    it("recreates the safe view using CREATE OR REPLACE VIEW", () => {
      expect(sqlContent0014).toContain("CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS");
    });

    it("uses exact canonical nested schema 1.0 paths", () => {
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'consumerType'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'firstNames'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'lastNames'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'legalName'");

      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->'representative'->>'firstNames'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->'representative'->>'lastNames'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->'representative'->>'relationship'");

      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'representativeFirstNames'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'representativeLastNames'");
      expect(sqlContent0014).toContain("payload_snapshot->'consumer'->>'representativeRole'");

      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'kind'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'description'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'amountApplicability'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'amount'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'currency'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'transactionDate'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'referenceNumber'");
      expect(sqlContent0014).toContain("payload_snapshot->'subject'->>'channel'");

      expect(sqlContent0014).toContain("payload_snapshot->'complaint'->>'kind'");
      expect(sqlContent0014).toContain("payload_snapshot->'complaint'->>'facts'");
      expect(sqlContent0014).toContain("payload_snapshot->'complaint'->>'requestedResolution'");
    });

    it("handles both legitimate representative shapes with COALESCE", () => {
      expect(sqlContent0014).toMatch(/COALESCE\([\s\S]*?payload_snapshot->'consumer'->'representative'->>'firstNames'[\s\S]*?payload_snapshot->'consumer'->>'representativeFirstNames'[\s\S]*?\)/);
      expect(sqlContent0014).toMatch(/COALESCE\([\s\S]*?payload_snapshot->'consumer'->'representative'->>'lastNames'[\s\S]*?payload_snapshot->'consumer'->>'representativeLastNames'[\s\S]*?\)/);
    });

    it("does not use top-level snake_case paths for json properties", () => {
      expect(sqlContent0014).not.toMatch(/payload_snapshot->>'consumer_type'/);
      expect(sqlContent0014).not.toMatch(/payload_snapshot->>'complaint_facts'/);
    });

    it("DOES NOT contain a schema-version row filter (no WHERE schema_version = '1.0')", () => {
      expect(sqlContent0014).not.toMatch(/WHERE\s+schema_version\s*=/);
    });

    it("preserves exact columns and data minimization (no PII exposure)", () => {
      const match = sqlContent0014.match(/CREATE OR REPLACE VIEW complaints_private.admin_complaint_detail_safe AS([\s\S]*?)FROM complaints_private\.complaints/);
      const viewSelect = match![1];
      expect(viewSelect).not.toContain("document_number");
      expect(viewSelect).not.toContain("ruc");
      expect(viewSelect).not.toContain("email");
      expect(viewSelect).not.toContain("phone");
      expect(viewSelect).not.toContain("address");
      expect(viewSelect).not.toContain("private_token_hash");
    });

    it("does not cast directly to jsonb using #>>", () => {
      expect(sqlContent0014).not.toContain("#>> '{}')::jsonb");
    });

    it("restores privileges properly", () => {
      expect(sqlContent0014).toMatch(/GRANT SELECT ON complaints_private\.admin_complaint_detail_safe TO complaints_admin_detail_read_runtime/);
      expect(sqlContent0014).toMatch(/REVOKE ALL ON complaints_private\.admin_complaint_detail_safe FROM PUBLIC/);
    });
  });
});
