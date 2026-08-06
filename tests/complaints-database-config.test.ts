import { describe, it, expect } from "vitest";
import { readDatabaseRuntimeConfig, readDatabaseMigrationConfig } from "@/database/config";

describe("complaints-database-config (Runtime)", () => {
  it("accepts valid postgres:// URL", () => {
    const source = { DATABASE_URL: "postgres://user:pass@localhost:5432/db" };
    const config = readDatabaseRuntimeConfig(source);
    expect(config.url).toBe("postgres://user:pass@localhost:5432/db");
  });

  it("accepts valid postgresql:// URL", () => {
    const source = { DATABASE_URL: "postgresql://user:pass@localhost:5432/db" };
    const config = readDatabaseRuntimeConfig(source);
    expect(config.url).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("throws error for missing variable", () => {
    const source = {};
    expect(() => readDatabaseRuntimeConfig(source)).toThrow("database_runtime_configuration_missing");
  });

  it("throws error for empty variable", () => {
    const source = { DATABASE_URL: "   " };
    expect(() => readDatabaseRuntimeConfig(source)).toThrow("database_runtime_configuration_invalid");
  });

  it("throws error for HTTP URL without leaking URL", () => {
    const source = { DATABASE_URL: "http://user:pass@localhost:5432/db" };
    let errorMsg = "";
    try {
      readDatabaseRuntimeConfig(source);
    } catch (e: unknown) {
      if (e instanceof Error) {
        errorMsg = e.message;
      }
    }
    expect(errorMsg).toBe("database_runtime_configuration_invalid");
    expect(errorMsg).not.toContain("http://");
    expect(errorMsg).not.toContain("localhost");
  });

  it("throws error for invalid URL string", () => {
    const source = { DATABASE_URL: "not-a-url" };
    expect(() => readDatabaseRuntimeConfig(source)).toThrow("database_runtime_configuration_invalid");
  });

  it("throws error for missing host", () => {
    const source = { DATABASE_URL: "postgres://user:pass@/db" };
    expect(() => readDatabaseRuntimeConfig(source)).toThrow("database_runtime_configuration_invalid");
  });

  it("throws error for missing database", () => {
    const source = { DATABASE_URL: "postgres://user:pass@localhost:5432/" };
    expect(() => readDatabaseRuntimeConfig(source)).toThrow("database_runtime_configuration_invalid");
  });

  it("throws error for missing password", () => {
    const source = { DATABASE_URL: "postgres://user@localhost:5432/db" };
    expect(() => readDatabaseRuntimeConfig(source)).toThrow("database_runtime_configuration_invalid");
  });

  it("enforces closed runtime parameters and prepare false", () => {
    const source = { DATABASE_URL: "postgres://user:pass@localhost:5432/db" };
    const config = readDatabaseRuntimeConfig(source);
    expect(config.prepare).toBe(false);
    expect(config.maxConnections).toBe(1);
    expect(config.idleTimeoutSeconds).toBe(20);
    expect(config.connectTimeoutSeconds).toBe(5);
  });

  it("does not mutate injected source", () => {
    const source = Object.freeze({ DATABASE_URL: "postgres://user:pass@localhost:5432/db" });
    expect(() => readDatabaseRuntimeConfig(source)).not.toThrow();
  });
});

describe("complaints-database-config (Migration)", () => {
  it("accepts valid URL", () => {
    const source = { DATABASE_MIGRATION_URL: "postgres://user:pass@localhost:5432/db" };
    const config = readDatabaseMigrationConfig(source);
    expect(config.url).toBe("postgres://user:pass@localhost:5432/db");
  });

  it("throws error for missing variable", () => {
    const source = {};
    expect(() => readDatabaseMigrationConfig(source)).toThrow("database_migration_configuration_missing");
  });

  it("throws error for invalid URL", () => {
    const source = { DATABASE_MIGRATION_URL: "http://localhost" };
    expect(() => readDatabaseMigrationConfig(source)).toThrow("database_migration_configuration_invalid");
  });

  it("is independent from runtime config", () => {
    const source = { DATABASE_URL: "postgres://user:pass@localhost:5432/db" };
    expect(() => readDatabaseMigrationConfig(source)).toThrow("database_migration_configuration_missing");
  });
});
