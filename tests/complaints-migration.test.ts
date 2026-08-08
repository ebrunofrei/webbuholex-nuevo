import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

describe("Complaints Database Migration", () => {
  it("should have a generated sql migration file and meta files", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    // There must be exactly 5 migrations now
    expect(sqlFiles.length).toBe(5);
    expect(sqlFiles[0]?.startsWith("0000")).toBe(true);
    expect(sqlFiles[1]).toBe("0001_complaints_security.sql");
    expect(sqlFiles[2]).toBe("0002_complaints_role_assumption.sql");
    expect(sqlFiles[3]).toBe("0003_complaints_runtime_logins.sql");
    expect(sqlFiles[4]).toBe("0004_complaints_runtime_column_privileges.sql");

    const metaFiles = readdirSync(
      join(process.cwd(), "database", "migrations", "meta"),
    );
    expect(metaFiles).toContain("0000_snapshot.json");
    expect(metaFiles).toContain("_journal.json");

    // Check journal coherence
    const journalContent = JSON.parse(
      readFileSync(
        join(process.cwd(), "database", "migrations", "meta", "_journal.json"),
        "utf8",
      ),
    );
    expect(journalContent.entries.length).toBe(5);
    expect(journalContent.entries[0]?.tag).toBe(
      sqlFiles[0]?.replace(".sql", ""),
    );
    expect(journalContent.entries[1]?.tag).toBe("0001_complaints_security");
    expect(journalContent.entries[2]?.tag).toBe("0002_complaints_role_assumption");
    expect(journalContent.entries[3]?.tag).toBe("0003_complaints_runtime_logins");
    expect(journalContent.entries[4]?.tag).toBe("0004_complaints_runtime_column_privileges");
  });

  it("should contain exactly 7 CREATE TABLE statements in the private schema and no public tables", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find((f) => f.startsWith("0000"));
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile!),
      "utf8",
    );

    const createTableMatches = content.match(/CREATE TABLE/g);
    expect(createTableMatches?.length ?? 0).toBe(7);

    expect(content).toContain('CREATE SCHEMA "complaints_private"');
    expect(content).toContain(
      'CREATE TABLE "complaints_private"."complaint_sequences"',
    );
    expect(content).toContain('CREATE TABLE "complaints_private"."complaints"');
    expect(content).toContain(
      'CREATE TABLE "complaints_private"."complaint_status_history"',
    );
    expect(content).toContain(
      'CREATE TABLE "complaints_private"."complaint_provider_responses"',
    );
    expect(content).toContain(
      'CREATE TABLE "complaints_private"."complaint_internal_notes"',
    );
    expect(content).toContain(
      'CREATE TABLE "complaints_private"."complaint_outbox"',
    );
    expect(content).toContain(
      'CREATE TABLE "complaints_private"."complaint_audit_events"',
    );

    expect(content).not.toContain('CREATE TABLE "public".');
  });

  it("should contain operational indexes, ON DELETE RESTRICT, and uniques", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find((f) => f.startsWith("0000"));
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile!),
      "utf8",
    );

    expect(content).toContain("ON DELETE restrict");
    expect(content).toContain(
      'CREATE INDEX "complaint_outbox_status_available_idx"',
    );
    expect(content).toContain('UNIQUE("sheet_number")');
    expect(content).toContain('UNIQUE("sheet_year","sheet_sequence")');
    expect(content).toContain('UNIQUE("complaint_id","version")');
  });

  it("should contain the append-only triggers for exactly 4 domains and immutable snapshot", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find((f) => f.startsWith("0000"));
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile!),
      "utf8",
    );

    expect(content).toContain("prevent_update_delete_audit_events");
    expect(content).toContain("prevent_update_delete_internal_notes");
    expect(content).toContain("prevent_update_delete_provider_responses");
    expect(content).toContain("prevent_update_delete_status_history");
    expect(content).not.toContain("prevent_update_delete_outbox");

    expect(content).toContain("prevent_payload_snapshot_update_complaints");
  });

  it("should contain proper REVOKEs and absence of GRANT or secrets", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile0 = files.find((f) => f.startsWith("0000"));
    const sqlFile1 = files.find((f) => f.startsWith("0001"));
    const content0 = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile0!),
      "utf8",
    );
    const content1 = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile1!),
      "utf8",
    );

    expect(content0).toContain(
      'REVOKE ALL ON SCHEMA "complaints_private" FROM PUBLIC',
    );
    expect(content0).toContain(
      'REVOKE ALL ON ALL TABLES IN SCHEMA "complaints_private" FROM PUBLIC',
    );
    expect(content0).not.toContain("GRANT ALL ON SCHEMA");
    expect(content0).not.toContain("password");
    expect(content0).not.toContain("secret");

    expect(content1).toContain(
      "REVOKE ALL ON SCHEMA complaints_private FROM PUBLIC",
    );
    expect(content1).not.toContain("password");
    expect(content1).not.toContain("secret");
  });

  it("should have absence of DROP TABLE, DROP SCHEMA and TRUNCATE", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFiles = files.filter((f) => f.endsWith(".sql"));

    sqlFiles.forEach((sqlFile) => {
      const content = readFileSync(
        join(process.cwd(), "database", "migrations", sqlFile),
        "utf8",
      );
      expect(content).not.toContain("DROP TABLE");
      expect(content).not.toContain("DROP SCHEMA");
      expect(content).not.toContain("TRUNCATE");
    });
  });

  it("should have correct SET privileges for 0002 role assumption", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find((f) => f.startsWith("0002"));
    expect(sqlFile).toBeDefined();
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile!),
      "utf8",
    );

    // roles siguen NOLOGIN (not changed in this file, but we check no LOGIN)
    expect(content).not.toMatch(/LOGIN/i);
    expect(content).not.toMatch(/PASSWORD/i);
    expect(content).not.toMatch(/SUPERUSER/i);
    expect(content).not.toMatch(/CREATEDB/i);
    expect(content).not.toMatch(/CREATEROLE/i);
    expect(content).not.toMatch(/REPLICATION/i);
    expect(content).not.toMatch(/GRANT ALL/i);
    expect(content).not.toMatch(/TO PUBLIC/i);

    // capacidad SET concedida
    expect(content).toContain("WITH SET TRUE");
    expect(content).toContain("INHERIT FALSE");
    expect(content).toContain("ADMIN FALSE");

    // Explicit expectations as per request
    expect(content).toContain("GRANT complaints_api_runtime TO postgres");
    expect(content).toContain("GRANT complaints_outbox_worker TO postgres");
  });

  it("should have correct setup for 0003 runtime logins", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find((f) => f.startsWith("0003"));
    expect(sqlFile).toBeDefined();
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile!),
      "utf8",
    );

    // Create physical roles
    expect(content).toContain("CREATE ROLE complaints_api_login");
    expect(content).toContain("CREATE ROLE complaints_worker_login");

    // Check strict attributes
    expect(content).toContain("LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
    expect(content).not.toMatch(/PASSWORD/i);
    expect(content).not.toMatch(/secret/i);
    expect(content).not.toMatch(/credential/i);

    // Ensure explicit strict memberships
    expect(content).toContain("GRANT complaints_api_runtime TO complaints_api_login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
    expect(content).toContain("GRANT complaints_outbox_worker TO complaints_worker_login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");

    // Cross membership should be absent
    expect(content).not.toContain("GRANT complaints_outbox_worker TO complaints_api_login");
    expect(content).not.toContain("GRANT complaints_api_runtime TO complaints_worker_login");

    // No functional ACL directly
    expect(content).not.toContain("GRANT USAGE ON SCHEMA");
    expect(content).not.toContain("GRANT SELECT");
    expect(content).not.toContain("GRANT INSERT");
    expect(content).not.toContain("GRANT UPDATE");
    expect(content).not.toContain("GRANT DELETE");
    expect(content).not.toContain("GRANT TRUNCATE");
    expect(content).not.toContain("GRANT REFERENCES");
    expect(content).not.toContain("GRANT TRIGGER");
    expect(content).not.toContain("GRANT EXECUTE");
    expect(content).not.toContain("GRANT USAGE ON SEQUENCE");

    // No GRANT to PUBLIC
    expect(content).not.toMatch(/GRANT .* TO PUBLIC/i);

    // Comment explaining CREATEROLE automatic membership
    expect(content).toContain("A user with CREATEROLE (but not superuser) creating a new role may automatically");
    expect(content).not.toContain("Supabase intercepta GRANT");
  });

  it("should have correct setup for 0004 runtime column privileges", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFile = files.find((f) => f.startsWith("0004"));
    expect(sqlFile).toBeDefined();
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", sqlFile!),
      "utf8",
    );
    const normalizedContent = content.replace(/\s+/g, " ");

    // A. complaint_sequences
    expect(normalizedContent).toContain("GRANT INSERT (created_at, updated_at) ON complaints_private.complaint_sequences TO complaints_api_runtime;");
    expect(normalizedContent).not.toMatch(/GRANT INSERT ON complaints_private\.complaint_sequences TO complaints_api_runtime;/);

    // B. complaints
    expect(normalizedContent).toContain("REVOKE INSERT ON complaints_private.complaints FROM complaints_api_runtime;");
    expect(normalizedContent).toMatch(/GRANT INSERT\s*\([^)]*id,\s*schema_version,\s*sheet_year,\s*sheet_sequence,\s*sheet_number,\s*private_token_hash,\s*token_hash_key_version,\s*idempotency_key_hash,\s*idempotency_hash_key_version,\s*payload_hash,\s*status,\s*submitted_at,\s*deadline_at,\s*version,\s*payload_snapshot,\s*created_at,\s*updated_at[^)]*\)\s*ON complaints_private\.complaints TO complaints_api_runtime;/);
    expect(normalizedContent).not.toMatch(/GRANT INSERT ON complaints_private\.complaints TO complaints_api_runtime;/);

    // C. complaint_status_history
    expect(normalizedContent).toContain("REVOKE INSERT ON complaints_private.complaint_status_history FROM complaints_api_runtime;");
    expect(normalizedContent).toMatch(/GRANT INSERT\s*\([^)]*id,\s*complaint_id,\s*to_status,\s*changed_at,\s*changed_by[^)]*\)\s*ON complaints_private\.complaint_status_history TO complaints_api_runtime;/);
    expect(normalizedContent).not.toMatch(/GRANT INSERT ON complaints_private\.complaint_status_history TO complaints_api_runtime;/);

    // D. complaint_audit_events
    expect(normalizedContent).toContain("REVOKE INSERT ON complaints_private.complaint_audit_events FROM complaints_api_runtime;");
    expect(normalizedContent).toMatch(/GRANT INSERT\s*\([^)]*id,\s*complaint_id,\s*event_type,\s*created_at,\s*created_by[^)]*\)\s*ON complaints_private\.complaint_audit_events TO complaints_api_runtime;/);
    expect(normalizedContent).not.toMatch(/GRANT INSERT ON complaints_private\.complaint_audit_events TO complaints_api_runtime;/);

    // E. complaint_outbox
    expect(normalizedContent).toContain("REVOKE INSERT ON complaints_private.complaint_outbox FROM complaints_api_runtime;");
    expect(normalizedContent).toMatch(/GRANT INSERT\s*\([^)]*id,\s*complaint_id,\s*event_type,\s*payload,\s*status,\s*attempts,\s*available_at,\s*created_at,\s*updated_at[^)]*\)\s*ON complaints_private\.complaint_outbox TO complaints_api_runtime;/);
    expect(normalizedContent).not.toMatch(/GRANT INSERT ON complaints_private\.complaint_outbox TO complaints_api_runtime;/);

    // F. Negative Security Assertions
    expect(normalizedContent).not.toContain("complaints_api_login");
    expect(normalizedContent).not.toContain("complaints_worker_login");
    expect(normalizedContent).not.toMatch(/TO PUBLIC/i);
    expect(normalizedContent).not.toMatch(/GRANT ALL/i);
    expect(normalizedContent).not.toMatch(/GRANT INSERT .* TO complaints_outbox_worker/i);
    expect(normalizedContent).not.toMatch(/GRANT UPDATE .* TO complaints_outbox_worker/i);
    expect(normalizedContent).not.toMatch(/GRANT SELECT .* TO complaints_outbox_worker/i);
  });
});
