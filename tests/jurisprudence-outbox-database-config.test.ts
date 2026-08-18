import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { readJurisprudenceOutboxDatabaseConfig } from "../database/config";
import { getJurisprudenceOutboxDatabase } from "../database/client";

describe("Jurisprudence Outbox Database Configuration", () => {
  beforeEach(() => {
    // We don't want tests to leak state if client initializes and caches.
    // However, client cache is global, so we only test configuration logic explicitly
    // and rely on Vitest isolation for the client singleton.
  });

  it("throws when DATABASE_JURISPRUDENCE_OUTBOX_URL is missing", () => {
    expect(() => readJurisprudenceOutboxDatabaseConfig({})).toThrowError(
      "jurisprudence_outbox_database_configuration_missing"
    );
  });

  it("throws when DATABASE_JURISPRUDENCE_OUTBOX_URL is invalid", () => {
    expect(() =>
      readJurisprudenceOutboxDatabaseConfig({
        DATABASE_JURISPRUDENCE_OUTBOX_URL: "not_a_url",
      })
    ).toThrowError("jurisprudence_outbox_database_configuration_invalid");
  });

  it("returns normalized configuration when DATABASE_JURISPRUDENCE_OUTBOX_URL is valid", () => {
    const validUrl = "postgresql://user:pass@host:5432/dbname";
    const config = readJurisprudenceOutboxDatabaseConfig({
      DATABASE_JURISPRUDENCE_OUTBOX_URL: validUrl,
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
      readJurisprudenceOutboxDatabaseConfig({
        DATABASE_JURISPRUDENCE_INTERNAL_URL: "postgresql://user:pass@host:5432/internal",
        DATABASE_JURISPRUDENCE_READ_URL: "postgresql://user:pass@host:5432/read",
        DATABASE_JURISPRUDENCE_WRITE_URL: "postgresql://user:pass@host:5432/write",
        DATABASE_URL: "postgresql://user:pass@host:5432/main",
      })
    ).toThrowError("jurisprudence_outbox_database_configuration_missing");
  });

  it("lazy initializes and throws only when client is requested without env", () => {
    // In node environment without the outbox env var, this will fail.
    // If it was initialized eagerly, the module wouldn't even load.
    // Here we just test the getter fails runtime due to missing env.
    const originalEnv = process.env.DATABASE_JURISPRUDENCE_OUTBOX_URL;
    delete process.env.DATABASE_JURISPRUDENCE_OUTBOX_URL;

    try {
      expect(() => getJurisprudenceOutboxDatabase()).toThrowError(
        "jurisprudence_outbox_database_configuration_missing"
      );
    } finally {
      process.env.DATABASE_JURISPRUDENCE_OUTBOX_URL = originalEnv;
    }
  });
});
