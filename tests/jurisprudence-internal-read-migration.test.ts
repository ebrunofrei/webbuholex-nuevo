import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase J1-G.2R.2 - Internal Read Migration", () => {
  it("migration 0027 explicitly grants SELECT on version ledger and NOT on records table", () => {
    const migrationPath = path.join(process.cwd(), "database/migrations/0027_jurisprudence_internal_read_security.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8").toUpperCase();

    // 1. SELECT version ledger: allowed
    expect(sql).toContain("GRANT SELECT ON JURISPRUDENCE_INTERNAL.JURISPRUDENCE_RECORD_VERSIONS TO JURISPRUDENCE_INTERNAL_READ_RUNTIME");

    // 2. SELECT current record: not granted
    expect(sql).not.toContain("GRANT SELECT ON JURISPRUDENCE_INTERNAL.JURISPRUDENCE_RECORDS TO JURISPRUDENCE_INTERNAL_READ_RUNTIME");

    // 3. INSERT: not granted
    expect(sql).not.toContain("GRANT INSERT");

    // 4. UPDATE: not granted
    expect(sql).not.toContain("GRANT UPDATE");

    // 5. DELETE: not granted
    expect(sql).not.toContain("GRANT DELETE");

    // 6. public schema: not granted
    expect(sql).not.toContain("GRANT USAGE ON SCHEMA JURISPRUDENCE_PUBLIC");
    expect(sql).not.toContain("GRANT SELECT ON JURISPRUDENCE_PUBLIC");

    // 7. publication command tables: not granted
    expect(sql).not.toContain("PUBLICATION_EXECUTIONS");
    expect(sql).not.toContain("PUBLICATION_EXECUTION_EVENTS");

    // 8. outbox: not granted
    expect(sql).not.toContain("PUBLICATION_OUTBOX");
  });
});
