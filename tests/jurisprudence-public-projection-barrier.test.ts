import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { jurisprudencePublicProjectionBarriers } from "@/database/schema/jurisprudence";

describe("Phase J1-E.3D.1 - Jurisprudence Public Projection Barrier", () => {
  it("defines the barrier table correctly", () => {
    const config = getTableConfig(jurisprudencePublicProjectionBarriers);
    expect(config.name).toBe("projection_barriers");
    expect(config.schema).toBe("jurisprudence_public");
  });

  it("defines columns with correct types", () => {
    const config = getTableConfig(jurisprudencePublicProjectionBarriers);
    const columns = config.columns;

    expect(columns).toHaveLength(5);
    expect(columns[0]!.name).toBe("record_id");
    expect(columns[0]!.primary).toBe(true);
    expect(columns[0]!.columnType).toBe("PgVarchar");

    expect(columns[1]!.name).toBe("record_version");
    expect(columns[1]!.notNull).toBe(true);
    expect(columns[1]!.columnType).toBe("PgInteger");

    expect(columns[2]!.name).toBe("execution_version");
    expect(columns[2]!.notNull).toBe(true);
    expect(columns[2]!.columnType).toBe("PgInteger");

    expect(columns[3]!.name).toBe("projection_state");
    expect(columns[3]!.notNull).toBe(true);
    expect(columns[3]!.columnType).toBe("PgVarchar");
    expect((columns[3] as unknown as { enumValues: string[] }).enumValues).toEqual(["published", "withdrawn"]);

    expect(columns[4]!.name).toBe("updated_at");
    expect(columns[4]!.notNull).toBe(true);
    expect(columns[4]!.columnType).toBe("PgTimestamp");
  });

  it("has no cross-schema or domain foreign keys", () => {
    const config = getTableConfig(jurisprudencePublicProjectionBarriers);
    expect(config.foreignKeys).toHaveLength(0);
  });

  it("has the required check constraints", () => {
    const config = getTableConfig(jurisprudencePublicProjectionBarriers);
    expect(config.checks).toHaveLength(3);

    const checkNames = config.checks.map(c => c.name);
    expect(checkNames).toContain("projection_barrier_record_version_positive");
    expect(checkNames).toContain("projection_barrier_execution_version_positive");
    expect(checkNames).toContain("valid_projection_state");
  });

  describe("SQL Migration 0024", () => {
    const migrationPath = join(process.cwd(), "database/migrations/0024_jurisprudence_public_projection_barrier.sql");
    const migrationSql = readFileSync(migrationPath, "utf-8");

    it("creates the projection_barriers table", () => {
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "jurisprudence_public"."projection_barriers"');
      expect(migrationSql).toContain('"record_id" varchar PRIMARY KEY NOT NULL');
    });

    it("includes check constraints in SQL", () => {
      expect(migrationSql).toContain('CONSTRAINT "projection_barrier_record_version_positive" CHECK ("record_version" > 0)');
      expect(migrationSql).toContain('CONSTRAINT "projection_barrier_execution_version_positive" CHECK ("execution_version" > 0)');
      expect(migrationSql).toContain('CONSTRAINT "valid_projection_state" CHECK ("projection_state" IN (\'published\', \'withdrawn\'))');
    });

    it("grants SELECT, INSERT, UPDATE to public write runtime and login roles", () => {
      expect(migrationSql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "jurisprudence_public"."projection_barriers" TO "jurisprudence_public_write_login"');
      expect(migrationSql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "jurisprudence_public"."projection_barriers" TO "jurisprudence_public_write_runtime"');
    });

    it("does not grant DELETE to public write roles", () => {
      expect(migrationSql).not.toContain('DELETE ON TABLE "jurisprudence_public"."projection_barriers" TO "jurisprudence_public_write');
    });

    it("revokes all privileges from public read roles", () => {
      expect(migrationSql).toContain('REVOKE ALL PRIVILEGES ON TABLE "jurisprudence_public"."projection_barriers" FROM "jurisprudence_public_read_login"');
      expect(migrationSql).toContain('REVOKE ALL PRIVILEGES ON TABLE "jurisprudence_public"."projection_barriers" FROM "jurisprudence_public_read_runtime"');
    });

    it("does not grant any privileges to outbox processor or publication command roles", () => {
      expect(migrationSql).not.toContain('jurisprudence_publication_outbox_runtime');
      expect(migrationSql).not.toContain('jurisprudence_publication_command_runtime');
    });
  });

  describe("Migrator Journal", () => {
    const journalPath = join(process.cwd(), "database/migrations/meta/_journal.json");
    const journalData = JSON.parse(readFileSync(journalPath, "utf-8"));

    it("discovers 0024 migration in journal", () => {
      const entry = journalData.entries.find((e: { idx: number }) => e.idx === 24);
      expect(entry).toBeDefined();
      expect(entry.tag).toBe("0024_jurisprudence_public_projection_barrier");
    });
  });
});
