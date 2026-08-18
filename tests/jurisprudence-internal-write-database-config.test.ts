import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { readJurisprudenceInternalWriteDatabaseConfig } from "../database/config";
import { getJurisprudenceInternalWriteDatabase } from "../database/client";

describe("Jurisprudence Internal Write Database Configuration", () => {
  beforeEach(() => {
    // Rely on Vitest isolation for the client singleton.
  });

  it("throws when DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL is missing", () => {
    expect(() => readJurisprudenceInternalWriteDatabaseConfig({})).toThrowError(
      "jurisprudence_internal_write_database_configuration_missing"
    );
  });

  it("throws when DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL is invalid", () => {
    expect(() =>
      readJurisprudenceInternalWriteDatabaseConfig({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL: "not_a_url",
      })
    ).toThrowError("jurisprudence_internal_write_database_configuration_invalid");
  });

  it("returns normalized configuration when DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL is valid", () => {
    const validUrl = "postgresql://user:pass@host:5432/dbname";
    const config = readJurisprudenceInternalWriteDatabaseConfig({
      DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL: validUrl,
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
      readJurisprudenceInternalWriteDatabaseConfig({
        DATABASE_JURISPRUDENCE_INTERNAL_URL: "postgresql://user:pass@host:5432/internal",
        DATABASE_JURISPRUDENCE_READ_URL: "postgresql://user:pass@host:5432/read",
        DATABASE_JURISPRUDENCE_WRITE_URL: "postgresql://user:pass@host:5432/write",
        DATABASE_JURISPRUDENCE_OUTBOX_URL: "postgresql://user:pass@host:5432/outbox",
        DATABASE_URL: "postgresql://user:pass@host:5432/main",
      })
    ).toThrowError("jurisprudence_internal_write_database_configuration_missing");
  });

  it("lazy initializes and throws only when client is requested without env", () => {
    const originalEnv = process.env.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL;
    delete process.env.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL;

    try {
      expect(() => getJurisprudenceInternalWriteDatabase()).toThrowError(
        "jurisprudence_internal_write_database_configuration_missing"
      );
    } finally {
      process.env.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL = originalEnv;
    }
  });
});
