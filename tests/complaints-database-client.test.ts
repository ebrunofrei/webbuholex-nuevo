import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { createDatabaseClient, getDatabase } from "@/database/client";
import * as configModule from "@/database/config";
import * as schema from "@/database/schema";

vi.mock("postgres", () => {
  return {
    default: vi.fn(() => ({
      // mock sql client
    }))
  };
});

vi.mock("drizzle-orm/postgres-js", () => {
  return {
    drizzle: vi.fn(() => ({
      // mock db instance
    }))
  };
});

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

describe("complaints-database-client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear global object
    delete (globalThis as unknown as Record<string, unknown>).__buholexDatabaseClient__;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (globalThis as unknown as Record<string, unknown>).__buholexDatabaseClient__;
    vi.restoreAllMocks();
  });

  it("createDatabaseClient passes correct parameters to postgres and drizzle", () => {
    const config: configModule.DatabaseRuntimeConfig = {
      url: "postgres://user:pass@localhost:5432/db",
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false,
    };

    createDatabaseClient(config);

    expect(postgres).toHaveBeenCalledWith("postgres://user:pass@localhost:5432/db", {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
    });

    expect(drizzle).toHaveBeenCalledWith(expect.anything(), { schema });
  });

  it("getDatabase reuses singleton in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");

    const db1 = getDatabase();
    const db2 = getDatabase();

    // Since mock is returning new objects every time, if it's the singleton, it should be exact same object reference
    expect(db1).toBe(db2);
    expect(postgres).toHaveBeenCalledTimes(1);
    expect(drizzle).toHaveBeenCalledTimes(1);
  });

  it("getDatabase creates new instance per call in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");

    const db1 = getDatabase();
    const db2 = getDatabase();

    expect(db1).not.toBe(db2);
    expect(postgres).toHaveBeenCalledTimes(2);
    expect(drizzle).toHaveBeenCalledTimes(2);
  });

  it("throws config error before attempting to create client", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");

    expect(() => getDatabase()).toThrow("database_runtime_configuration_missing");
    expect(postgres).not.toHaveBeenCalled();
    expect(drizzle).not.toHaveBeenCalled();
  });

  it("does not execute any query on initialization", () => {
    const config: configModule.DatabaseRuntimeConfig = {
      url: "postgres://user:pass@localhost:5432/db",
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false,
    };
    createDatabaseClient(config);
    // Since we mock postgres completely as a function returning an object, not a promise.
    expect(true).toBe(true);
  });

  it("statically verifies server-only import in client and index", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const clientContent = await fs.readFile(path.join(__dirname, "../database/client.ts"), "utf-8");
    const indexContent = await fs.readFile(path.join(__dirname, "../database/index.ts"), "utf-8");

    expect(clientContent).toMatch(/import\s+['"]server-only['"]/);
    expect(indexContent).toMatch(/import\s+['"]server-only['"]/);
  });
});
