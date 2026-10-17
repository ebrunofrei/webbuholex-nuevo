import { describe, it, expect } from "vitest";
import { readHermesControlDatabaseConfig } from "../database/config";

describe("Hermes Control Database Configuration", () => {
  it("throws when DATABASE_HERMES_CONTROL_URL is missing", () => {
    expect(() => readHermesControlDatabaseConfig({})).toThrowError(
      "hermes_control_database_configuration_missing"
    );
  });

  it("throws when DATABASE_HERMES_CONTROL_URL is empty string", () => {
    expect(() =>
      readHermesControlDatabaseConfig({
        DATABASE_HERMES_CONTROL_URL: "",
      })
    ).toThrowError("hermes_control_database_configuration_missing");
  });

  it("throws when DATABASE_HERMES_CONTROL_URL is whitespace-only", () => {
    expect(() =>
      readHermesControlDatabaseConfig({
        DATABASE_HERMES_CONTROL_URL: "   ",
      })
    ).toThrowError("hermes_control_database_configuration_invalid");
  });

  it("throws when DATABASE_HERMES_CONTROL_URL is malformed", () => {
    expect(() =>
      readHermesControlDatabaseConfig({
        DATABASE_HERMES_CONTROL_URL: "not_a_valid_postgres_url",
      })
    ).toThrowError("hermes_control_database_configuration_invalid");
  });

  it("throws when DATABASE_HERMES_CONTROL_URL uses wrong protocol", () => {
    expect(() =>
      readHermesControlDatabaseConfig({
        DATABASE_HERMES_CONTROL_URL: "http://user:pass@host:6543/postgres",
      })
    ).toThrowError("hermes_control_database_configuration_invalid");
  });

  it("returns normalized configuration when DATABASE_HERMES_CONTROL_URL is valid", () => {
    const validUrl = "postgresql://hermes_control_login.tenant_ref:secret_pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
    const config = readHermesControlDatabaseConfig({
      DATABASE_HERMES_CONTROL_URL: validUrl,
    });

    expect(config).toEqual({
      url: validUrl,
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false, // Must be false for Transaction Pooler compatibility (port 6543)
    });
  });

  it("fails closed when generic DATABASE_URL is present but DATABASE_HERMES_CONTROL_URL is missing (mandatory zero fallback)", () => {
    expect(() =>
      readHermesControlDatabaseConfig({
        DATABASE_URL: "postgresql://generic_user:generic_pass@host:5432/main",
        DATABASE_MIGRATION_URL: "postgresql://postgres:mig_pass@host:5432/postgres",
        DATABASE_ADMIN_URL: "postgresql://admin:admin_pass@host:5432/postgres",
        DATABASE_API_URL: "postgresql://api:api_pass@host:6543/postgres",
      })
    ).toThrowError("hermes_control_database_configuration_missing");
  });

  it("does not leak secrets or credentials in error messages upon malformed URL with embedded secret", () => {
    const fakeSecret = "super_secret_sensitive_password_token_987654";
    const malformedUrlWithSecret = `postgresql://hermes_control_login:${fakeSecret}@/missing-host`;

    try {
      readHermesControlDatabaseConfig({
        DATABASE_HERMES_CONTROL_URL: malformedUrlWithSecret,
      });
      expect.unreachable("should have thrown error");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(Error);
      const message = (err as Error).message;
      expect(message).toBe("hermes_control_database_configuration_invalid");
      expect(message).not.toContain(fakeSecret);
      expect(message).not.toContain("hermes_control_login");
      expect(message).not.toContain("postgresql://");
    }
  });
});
