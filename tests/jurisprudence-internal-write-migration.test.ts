import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Jurisprudence Internal Write Database Security Migration", () => {
  const migrationsDir = path.join(process.cwd(), "database", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  const migration26Path = path.join(migrationsDir, "0026_jurisprudence_internal_write_security.sql");

  it("migrator discovers 0026 in journal", () => {
    const journalContent = fs.readFileSync(journalPath, "utf-8");
    const journal = JSON.parse(journalContent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry26 = journal.entries.find((e: any) => e.idx === 26);
    expect(entry26).toBeDefined();
    expect(entry26.tag).toBe("0026_jurisprudence_internal_write_security");
  });

  it("0026 creates runtime role and login role without password", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    expect(content).toContain("CREATE ROLE jurisprudence_internal_write_runtime NOLOGIN;");
    expect(content).toContain("CREATE ROLE jurisprudence_internal_write_login LOGIN NOINHERIT;");
    expect(content).not.toContain("PASSWORD");
  });

  it("0026 grants membership to login role", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    expect(content).toContain("GRANT jurisprudence_internal_write_runtime TO jurisprudence_internal_write_login;");
  });

  it("0026 does not grant direct table access to login role", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    // Ensure all grants are for runtime role
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("GRANT ") && !line.includes("GRANT jurisprudence_internal_write_runtime")) {
        expect(line).toContain("TO jurisprudence_internal_write_runtime");
        expect(line).not.toContain("TO jurisprudence_internal_write_login");
      }
    }
  });

  it("0026 grants proper record privileges", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    expect(content).toContain("GRANT SELECT, INSERT, UPDATE ON jurisprudence_internal.jurisprudence_records TO jurisprudence_internal_write_runtime;");
    expect(content).not.toContain("DELETE ON jurisprudence_internal.jurisprudence_records");
  });

  it("0026 grants proper record versions privileges (append-only)", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    expect(content).toContain("GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_record_versions TO jurisprudence_internal_write_runtime;");
    expect(content).not.toContain("UPDATE ON jurisprudence_internal.jurisprudence_record_versions");
    expect(content).not.toContain("DELETE ON jurisprudence_internal.jurisprudence_record_versions");
  });

  it("0026 grants proper idempotency privileges", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    expect(content).toContain("GRANT SELECT, INSERT ON jurisprudence_internal.jurisprudence_idempotency TO jurisprudence_internal_write_runtime;");
    expect(content).not.toContain("UPDATE ON jurisprudence_internal.jurisprudence_idempotency");
    expect(content).not.toContain("DELETE ON jurisprudence_internal.jurisprudence_idempotency");
  });

  it("0026 does not grant access to other schemas", () => {
    const content = fs.readFileSync(migration26Path, "utf-8");
    expect(content).not.toContain("jurisprudence_public");
    expect(content).not.toContain("jurisprudence_publication_executions");
    expect(content).not.toContain("jurisprudence_publication_outbox");
    expect(content).not.toContain("projection_barriers");
  });
});
