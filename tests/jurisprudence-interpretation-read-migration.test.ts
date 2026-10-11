import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { z } from "zod";

const journalSchema = z.object({
  entries: z.array(
    z.object({
      idx: z.number(),
      tag: z.string(),
    })
  ),
});

describe("Jurisprudence Interpretation Read Database Security Migration (0040)", () => {
  const migrationsDir = path.join(process.cwd(), "database", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  const migration40Path = path.join(migrationsDir, "0040_jurisprudence_interpretation_read_security.sql");

  it("migrator discovers 0040 in journal as next consecutive migration after 0039", () => {
    const journalContent = fs.readFileSync(journalPath, "utf-8");
    const journal = journalSchema.parse(JSON.parse(journalContent));
    const entry39 = journal.entries.find((e) => e.idx === 39);
    const entry40 = journal.entries.find((e) => e.idx === 40);

    expect(entry39).toBeDefined();
    expect(entry39?.tag).toBe("0039_jurisprudence_interpretation_rate_limiter");

    expect(entry40).toBeDefined();
    expect(entry40?.tag).toBe("0040_jurisprudence_interpretation_read_security");
  });

  it("0040 creates runtime role NOLOGIN and login role LOGIN NOINHERIT without password", () => {
    const content = fs.readFileSync(migration40Path, "utf-8");
    expect(content).toContain("CREATE ROLE jurisprudence_interpretation_read_runtime NOLOGIN;");
    expect(content).toContain("CREATE ROLE jurisprudence_interpretation_read_login LOGIN NOINHERIT;");
    expect(content).not.toContain("PASSWORD");
  });

  it("0040 grants runtime role membership to login role", () => {
    const content = fs.readFileSync(migration40Path, "utf-8");
    expect(content).toContain("GRANT jurisprudence_interpretation_read_runtime TO jurisprudence_interpretation_read_login;");
  });

  it("0040 grants USAGE on schema jurisprudence_internal to runtime role", () => {
    const content = fs.readFileSync(migration40Path, "utf-8");
    expect(content).toContain("GRANT USAGE ON SCHEMA jurisprudence_internal TO jurisprudence_interpretation_read_runtime;");
  });

  it("0040 grants SELECT ONLY on jurisprudence_internal.jurisprudence_records", () => {
    const content = fs.readFileSync(migration40Path, "utf-8");
    expect(content).toContain("GRANT SELECT ON jurisprudence_internal.jurisprudence_records TO jurisprudence_interpretation_read_runtime;");
  });

  it("0040 DOES NOT grant INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, EXECUTE, CREATE", () => {
    const content = fs.readFileSync(migration40Path, "utf-8").toUpperCase();
    expect(content).not.toContain("INSERT");
    expect(content).not.toContain("UPDATE");
    expect(content).not.toContain("DELETE");
    expect(content).not.toContain("TRUNCATE");
    expect(content).not.toContain("REFERENCES");
    expect(content).not.toContain("TRIGGER");
    expect(content).not.toContain("EXECUTE");
    expect(content).not.toContain("GRANT CREATE");
  });

  it("0040 does NOT grant SELECT on other internal tables or other schemas", () => {
    const content = fs.readFileSync(migration40Path, "utf-8").toUpperCase();
    expect(content).not.toContain("JURISPRUDENCE_RECORD_VERSIONS");
    expect(content).not.toContain("JURISPRUDENCE_IDEMPOTENCY");
    expect(content).not.toContain("JURISPRUDENCE_PUBLIC");
    expect(content).not.toContain("JURISPRUDENCE_RATE_LIMITS");
    expect(content).not.toContain("JURISPRUDENCE_PUBLICATION");
  });

  it("0040 does NOT modify grants of jurisprudence_internal_read_runtime or jurisprudence_internal_write_runtime", () => {
    const content = fs.readFileSync(migration40Path, "utf-8");
    expect(content).not.toContain("jurisprudence_internal_read_runtime");
    expect(content).not.toContain("jurisprudence_internal_write_runtime");
  });

  it("0040 does not grant direct table access to login role", () => {
    const content = fs.readFileSync(migration40Path, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("GRANT ") && !line.includes("GRANT jurisprudence_interpretation_read_runtime TO jurisprudence_interpretation_read_login")) {
        expect(line).toContain("TO jurisprudence_interpretation_read_runtime");
        expect(line).not.toContain("TO jurisprudence_interpretation_read_login");
      }
    }
  });
});
