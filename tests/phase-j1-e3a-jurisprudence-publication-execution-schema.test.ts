import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

describe("J1-E.3A.1 PostgreSQL Publication Execution Schema Foundation", () => {
  it("should have migration 0021 discovered and applied", () => {
    const files = readdirSync(join(process.cwd(), "database", "migrations"));
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();
    
    const migration0021 = sqlFiles.find((f) => f.startsWith("0021"));
    expect(migration0021).toBeDefined();
    expect(migration0021).toBe("0021_jurisprudence_publication_execution_foundation.sql");

    const journalContent = JSON.parse(
      readFileSync(
        join(process.cwd(), "database", "migrations", "meta", "_journal.json"),
        "utf8",
      ),
    );

    const entries = journalContent.entries;
    expect(entries.length).toBe(22);
    expect(entries[21].tag).toBe("0021_jurisprudence_publication_execution_foundation");
    expect(entries[21].idx).toBe(21);
  });

  it("should contain the required tables, models, columns and indexes", () => {
    const content = readFileSync(
      join(process.cwd(), "database", "migrations", "0021_jurisprudence_publication_execution_foundation.sql"),
      "utf8",
    );

    // PUBLICATION_EXECUTION_TABLE_EXISTS
    expect(content).toContain('CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_executions"');
    
    // PUBLICATION_EXECUTION_EVENT_TABLE_EXISTS
    expect(content).toContain('CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_execution_events"');
    
    // PUBLICATION_IDEMPOTENCY_TABLE_EXISTS
    expect(content).toContain('CREATE TABLE IF NOT EXISTS "jurisprudence_internal"."jurisprudence_publication_idempotency"');

    // EXECUTION_MODEL_FULLY_REPRESENTABLE (checking key columns)
    expect(content).toContain('"execution_id" varchar PRIMARY KEY NOT NULL');
    expect(content).toContain('"record_id" varchar NOT NULL');
    expect(content).toContain('"record_version" integer NOT NULL');
    expect(content).toContain('"editorial_case_id" varchar NOT NULL');
    expect(content).toContain('"publication_dossier_id" varchar NOT NULL');
    expect(content).toContain('"authorization_case_id" varchar NOT NULL');
    expect(content).toContain('"projection_id" varchar NOT NULL');
    expect(content).toContain('"status" varchar NOT NULL');
    expect(content).toContain('"version" integer NOT NULL');
    expect(content).toContain('"executed_at" timestamp with time zone NOT NULL');
    expect(content).toContain('"executed_by_reference" varchar NOT NULL');
    expect(content).toContain('"withdrawn_at" timestamp with time zone');
    expect(content).toContain('"withdrawal_reason" varchar');
    expect(content).toContain('"superseded_at" timestamp with time zone');
    expect(content).toContain('"superseded_by_record_version" integer');
    expect(content).toContain('"publication_executed" boolean NOT NULL');
    expect(content).toContain('"deployed" boolean NOT NULL');

    // EVENT_MODEL_FULLY_REPRESENTABLE
    expect(content).toContain('"event_id" varchar PRIMARY KEY NOT NULL');
    expect(content).toContain('"execution_id" varchar NOT NULL');
    expect(content).toContain('"execution_version" integer NOT NULL');
    expect(content).toContain('"sequence" integer NOT NULL');
    expect(content).toContain('"type" varchar NOT NULL');
    expect(content).toContain('"payload_json" jsonb NOT NULL');

    // RECORD_VERSION_SEPARATE_FROM_EXECUTION_VERSION
    expect(content).toContain('CONSTRAINT "publication_execution_version_positive" CHECK ("version" > 0)');
    expect(content).toContain('CONSTRAINT "publication_execution_record_version_positive" CHECK ("record_version" > 0)');

    // EXECUTION_EVENT_SEPARATE_FROM_OUTBOX_EVENT
    expect(content).not.toContain('outbox');

    // IDEMPOTENCY_MODEL_FULLY_REPRESENTABLE & COMMAND_FINGERPRINT_SUPPORTED & RESULT_JSON_SUPPORTED
    expect(content).toContain('"idempotency_key" varchar PRIMARY KEY NOT NULL');
    expect(content).toContain('"command_fingerprint" varchar NOT NULL');
    expect(content).toContain('"result_json" jsonb NOT NULL');

    // Constraints & FKs
    expect(content).toContain('FOREIGN KEY ("record_id") REFERENCES "jurisprudence_internal"."jurisprudence_records"("id")');
    expect(content).toContain('FOREIGN KEY ("execution_id") REFERENCES "jurisprudence_internal"."jurisprudence_publication_executions"("execution_id")');
    expect(content).toContain('UNIQUE("execution_id","sequence")');
  });
});
