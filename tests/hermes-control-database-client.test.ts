import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import {
  createHermesControlDatabaseClient,
  getHermesControlDatabase,
  getDatabase,
} from "@/database/client";
import type { HermesControlDatabaseRuntimeConfig } from "@/database/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

vi.mock("postgres", () => {
  return {
    default: vi.fn(() => ({
      // mock sql client
    })),
  };
});

vi.mock("drizzle-orm/postgres-js", () => {
  return {
    drizzle: vi.fn((sql) => ({
      sql,
      mockDrizzleInstance: true,
    })),
  };
});

describe("Hermes Control Database Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("createHermesControlDatabaseClient passes correct parameters including prepare=false and ssl=require", () => {
    const config: HermesControlDatabaseRuntimeConfig = {
      url: "postgresql://hermes_control_login.tenant:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false,
    };

    const bundle = createHermesControlDatabaseClient(config);

    expect(postgres).toHaveBeenCalledWith(
      config.url,
      expect.objectContaining({
        max: 1,
        idle_timeout: 20,
        connect_timeout: 5,
        prepare: false,
        ssl: "require",
      })
    );
    expect(drizzle).toHaveBeenCalledWith(bundle.sql, expect.any(Object));
    expect(bundle.db).toBeDefined();
  });

  it("getHermesControlDatabase creates and memoizes instance per URL", () => {
    process.env.DATABASE_HERMES_CONTROL_URL =
      "postgresql://hermes_control_login.tenant:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

    const db1 = getHermesControlDatabase();
    const db2 = getHermesControlDatabase();

    expect(db1).toBeDefined();
    expect(db1).toBe(db2);
    expect(postgres).toHaveBeenCalledTimes(1);
  });

  it("getHermesControlDatabase accepts explicit config without reading process.env", () => {
    delete process.env.DATABASE_HERMES_CONTROL_URL;

    const explicitConfig: HermesControlDatabaseRuntimeConfig = {
      url: "postgresql://hermes_control_login.tenant:custom_secret@custom-host:6543/postgres",
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false,
    };

    const db = getHermesControlDatabase(explicitConfig);
    expect(db).toBeDefined();
    expect(postgres).toHaveBeenCalledWith(
      explicitConfig.url,
      expect.objectContaining({ prepare: false })
    );
  });

  it("fails closed when DATABASE_HERMES_CONTROL_URL is missing even if generic DATABASE_URL is present", () => {
    delete process.env.DATABASE_HERMES_CONTROL_URL;
    process.env.DATABASE_URL = "postgresql://generic_user:generic_pwd@generic-host:5432/main";

    expect(() => getHermesControlDatabase()).toThrowError(
      "hermes_control_database_configuration_missing"
    );
  });

  it("hermes control database client is separate from generic getDatabase", () => {
    process.env.DATABASE_HERMES_CONTROL_URL =
      "postgresql://hermes_control_login.tenant:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres_hermes_distinct";
    process.env.DATABASE_URL =
      "postgresql://generic_user:generic_pwd@generic-host:5432/main_distinct";

    const hermesDb = getHermesControlDatabase();
    const genericDb = getDatabase();

    expect(hermesDb).not.toBe(genericDb);
    expect(postgres).toHaveBeenCalledWith(
      process.env.DATABASE_HERMES_CONTROL_URL,
      expect.objectContaining({ ssl: "require", prepare: false })
    );
    expect(postgres).toHaveBeenCalledWith(
      process.env.DATABASE_URL,
      expect.not.objectContaining({ ssl: "require" })
    );
  });
});
