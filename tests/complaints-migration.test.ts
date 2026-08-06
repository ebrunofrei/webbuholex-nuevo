import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

describe("Complaints Database Migration", () => {
  it("should have a generated sql migration file and meta files", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFiles = files.filter(f => f.endsWith(".sql"));
    expect(sqlFiles.length).toBe(1);

    const metaFiles = readdirSync(join(process.cwd(), "database", "migrations", "meta"));
    expect(metaFiles).toContain("0000_snapshot.json");
    expect(metaFiles).toContain("_journal.json");
  });

  it("should contain exactly 7 CREATE TABLE statements in the private schema and no public tables", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find(f => f.endsWith(".sql"));
    const content = readFileSync(join(process.cwd(), "database", "migrations", sqlFile!), "utf8");

    const createTableMatches = content.match(/CREATE TABLE/g);
    expect(createTableMatches?.length).toBe(7);

    expect(content).toContain('CREATE SCHEMA "complaints_private"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaint_sequences"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaints"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaint_status_history"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaint_provider_responses"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaint_internal_notes"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaint_outbox"');
    expect(content).toContain('CREATE TABLE "complaints_private"."complaint_audit_events"');

    expect(content).not.toContain('CREATE TABLE "public".');
  });

  it("should contain operational indexes, ON DELETE RESTRICT, and uniques", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find(f => f.endsWith(".sql"));
    const content = readFileSync(join(process.cwd(), "database", "migrations", sqlFile!), "utf8");

    expect(content).toContain('ON DELETE restrict');
    expect(content).toContain('CREATE INDEX "complaint_outbox_status_available_idx"');
    expect(content).toContain('UNIQUE("sheet_number")');
    expect(content).toContain('UNIQUE("sheet_year","sheet_sequence")');
    expect(content).toContain('UNIQUE("complaint_id","version")');
  });

  it("should contain the append-only triggers for exactly 4 domains and immutable snapshot", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find(f => f.endsWith(".sql"));
    const content = readFileSync(join(process.cwd(), "database", "migrations", sqlFile!), "utf8");

    expect(content).toContain('prevent_update_delete_audit_events');
    expect(content).toContain('prevent_update_delete_internal_notes');
    expect(content).toContain('prevent_update_delete_provider_responses');
    expect(content).toContain('prevent_update_delete_status_history');
    expect(content).not.toContain('prevent_update_delete_outbox');

    expect(content).toContain('prevent_payload_snapshot_update_complaints');
  });

  it("should contain proper REVOKEs and absence of GRANT or secrets", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find(f => f.endsWith(".sql"));
    const content = readFileSync(join(process.cwd(), "database", "migrations", sqlFile!), "utf8");

    expect(content).toContain('REVOKE ALL ON SCHEMA "complaints_private" FROM PUBLIC');
    expect(content).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA "complaints_private" FROM PUBLIC');
    expect(content).not.toContain('GRANT ALL ON SCHEMA');
    expect(content).not.toContain('password');
    expect(content).not.toContain('secret');
  });

  it("should have absence of DROP TABLE, DROP SCHEMA and TRUNCATE", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find(f => f.endsWith(".sql"));
    const content = readFileSync(join(process.cwd(), "database", "migrations", sqlFile!), "utf8");

    expect(content).not.toContain('DROP TABLE');
    expect(content).not.toContain('DROP SCHEMA');
    expect(content).not.toContain('TRUNCATE');
  });
});
