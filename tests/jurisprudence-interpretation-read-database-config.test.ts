import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { readJurisprudenceInterpretationReadDatabaseConfig } from "../database/config";

describe("Jurisprudence Interpretation Read Database Configuration", () => {
  beforeEach(() => {
    // Rely on Vitest isolation
  });

  it("throws when DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL is missing", () => {
    expect(() => readJurisprudenceInterpretationReadDatabaseConfig({})).toThrowError(
      "jurisprudence_interpretation_read_database_configuration_missing"
    );
  });

  it("throws when DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL is invalid", () => {
    expect(() =>
      readJurisprudenceInterpretationReadDatabaseConfig({
        DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL: "not_a_valid_postgres_url",
      })
    ).toThrowError("jurisprudence_interpretation_read_database_configuration_invalid");
  });

  it("returns normalized configuration when DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL is valid", () => {
    const validUrl = "postgresql://user:pass@host:5432/dbname";
    const config = readJurisprudenceInterpretationReadDatabaseConfig({
      DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL: validUrl,
    });

    expect(config).toEqual({
      url: validUrl,
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false, // Must be false for connection pooler
    });
  });

  it("does not fallback to other database URLs", () => {
    expect(() =>
      readJurisprudenceInterpretationReadDatabaseConfig({
        DATABASE_JURISPRUDENCE_INTERNAL_URL: "postgresql://user:pass@host:5432/internal",
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL: "postgresql://user:pass@host:5432/internal_write",
        DATABASE_JURISPRUDENCE_READ_URL: "postgresql://user:pass@host:5432/read",
        DATABASE_JURISPRUDENCE_WRITE_URL: "postgresql://user:pass@host:5432/write",
        DATABASE_URL: "postgresql://user:pass@host:5432/main",
      })
    ).toThrowError("jurisprudence_interpretation_read_database_configuration_missing");
  });

  it("getJurisprudenceInterpretationReadDatabase resolves with explicit config without reading process.env", async () => {
    const originalEnv = process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL;
    delete process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL;

    try {
      const explicitConfig = {
        url: "postgresql://jurisprudence_interpretation_read_login:pwd@host:5432/db_custom",
        maxConnections: 1,
        idleTimeoutSeconds: 20,
        connectTimeoutSeconds: 5,
        prepare: false as const,
      };

      const { getJurisprudenceInterpretationReadDatabase } = await import("../database/client");
      const db1 = getJurisprudenceInterpretationReadDatabase(explicitConfig);
      const db2 = getJurisprudenceInterpretationReadDatabase(explicitConfig);

      expect(db1).toBeDefined();
      expect(db1).toBe(db2); // Cached reuse for same URL
    } finally {
      if (originalEnv === undefined) {
        delete process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL;
      } else {
        process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL = originalEnv;
      }
    }
  });
});
