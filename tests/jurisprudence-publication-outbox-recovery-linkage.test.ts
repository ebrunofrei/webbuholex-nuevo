import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("0028 Migration: Recovery Linkage", () => {
  describe("Static SQL Migration Analysis", () => {
    let migrationSql: string;

    beforeAll(() => {
      const migrationPath = join(process.cwd(), "database/migrations/0028_jurisprudence_publication_outbox_recovery_linkage.sql");
      migrationSql = readFileSync(migrationPath, "utf-8");
    });

    it("adds recovery_of_outbox_id column", () => {
      expect(migrationSql).toContain('ADD COLUMN "recovery_of_outbox_id" uuid;');
    });

    it("adds foreign key constraint", () => {
      expect(migrationSql).toContain('ADD CONSTRAINT "jurisprudence_publication_outbox_recovery_fk"');
      expect(migrationSql).toContain('REFERENCES "jurisprudence_internal"."jurisprudence_publication_outbox"("id")');
      expect(migrationSql).toContain('ON DELETE RESTRICT');
    });

    it("creates unique partial index for idempotency", () => {
      expect(migrationSql).toContain('CREATE UNIQUE INDEX "jurisprudence_publication_outbox_recovery_unique"');
      expect(migrationSql).toContain('WHERE "recovery_of_outbox_id" IS NOT NULL');
    });
  });
});
