import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Jurisprudence Public Write Login Hardening", () => {
  const migrationsDir = path.join(process.cwd(), "database", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  const migration24Path = path.join(migrationsDir, "0024_jurisprudence_public_projection_barrier.sql");
  const migration25Path = path.join(migrationsDir, "0025_jurisprudence_public_write_login_hardening.sql");

  it("migrator discovers 0025 in journal", () => {
    const journalContent = fs.readFileSync(journalPath, "utf-8");
    const journal = JSON.parse(journalContent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry25 = journal.entries.find((e: any) => e.idx === 25);
    expect(entry25).toBeDefined();
    expect(entry25.tag).toBe("0025_jurisprudence_public_write_login_hardening");
    expect(journal.entries.length).toBeGreaterThanOrEqual(26);
  });

  it("0024 contains direct login grant historically", () => {
    const content = fs.readFileSync(migration24Path, "utf-8");
    expect(content).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "jurisprudence_public"."projection_barriers" TO "jurisprudence_public_write_login";');
  });

  it("0025 revokes projection barrier from write login", () => {
    const content = fs.readFileSync(migration25Path, "utf-8");
    expect(content).toContain('REVOKE ALL PRIVILEGES ON TABLE "jurisprudence_public"."projection_barriers" FROM "jurisprudence_public_write_login";');
  });

  it("0025 does NOT revoke write runtime", () => {
    const content = fs.readFileSync(migration25Path, "utf-8");
    expect(content).not.toContain("jurisprudence_public_write_runtime");
  });

  it("published records grants are not changed in 0025", () => {
    const content = fs.readFileSync(migration25Path, "utf-8");
    expect(content).not.toContain("published_records");
  });

  it("read roles, outbox roles, command roles are not changed in 0025", () => {
    const content = fs.readFileSync(migration25Path, "utf-8");
    expect(content).not.toContain("jurisprudence_public_read_login");
    expect(content).not.toContain("jurisprudence_public_read_runtime");
    expect(content).not.toContain("jurisprudence_publication_outbox_login");
    expect(content).not.toContain("jurisprudence_publication_outbox_runtime");
    expect(content).not.toContain("jurisprudence_publication_command_login");
    expect(content).not.toContain("jurisprudence_publication_command_runtime");
  });
});
