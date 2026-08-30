import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { readJurisprudenceAuthorizationDatabaseConfig } from "../database/config";
import { getJurisprudenceAuthorizationDatabase } from "../database/client";

describe("Jurisprudence Authorization Database Configuration", () => {
  it("throws when DATABASE_JURISPRUDENCE_AUTHORIZATION_URL is missing", () => {
    expect(() => readJurisprudenceAuthorizationDatabaseConfig({})).toThrowError(
      "jurisprudence_authorization_database_configuration_missing"
    );
  });

  it("throws when DATABASE_JURISPRUDENCE_AUTHORIZATION_URL is invalid", () => {
    expect(() =>
      readJurisprudenceAuthorizationDatabaseConfig({
        DATABASE_JURISPRUDENCE_AUTHORIZATION_URL: "not_a_url",
      })
    ).toThrowError("jurisprudence_authorization_database_configuration_invalid");
  });

  it("returns normalized configuration when DATABASE_JURISPRUDENCE_AUTHORIZATION_URL is valid", () => {
    const validUrl = "postgresql://user:pass@host:5432/dbname";
    const config = readJurisprudenceAuthorizationDatabaseConfig({
      DATABASE_JURISPRUDENCE_AUTHORIZATION_URL: validUrl,
    });

    expect(config).toEqual({
      url: validUrl,
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false, // Must be false for connection pooler
    });
  });

  it("lazy initializes and throws only when client is requested without env", () => {
    const originalEnv = process.env.DATABASE_JURISPRUDENCE_AUTHORIZATION_URL;
    delete process.env.DATABASE_JURISPRUDENCE_AUTHORIZATION_URL;

    try {
      expect(() => getJurisprudenceAuthorizationDatabase()).toThrowError(
        "jurisprudence_authorization_database_configuration_missing"
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.DATABASE_JURISPRUDENCE_AUTHORIZATION_URL;
      } else {
        process.env.DATABASE_JURISPRUDENCE_AUTHORIZATION_URL = originalEnv;
      }
    }
  });
});
