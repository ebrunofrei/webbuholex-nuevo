import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { createHermesPostDispatchReconciler } from "@/lib/hermes/control/hermes-reconciliation-cron-host";
import * as dbClient from "@/database/client";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/database/schema";

describe("Hermes Reconciliation Cron Host", () => {
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

  it("default host factory resolves dedicated Hermes DB client and NOT generic getDatabase", () => {
    const mockHermesDb = { execute: vi.fn(), query: {} } as unknown as PostgresJsDatabase<typeof schema>;
    const getHermesSpy = vi
      .spyOn(dbClient, "getHermesControlDatabase")
      .mockReturnValue(mockHermesDb);
    const getGenericSpy = vi
      .spyOn(dbClient, "getDatabase")
      .mockImplementation(() => {
        throw new Error("Generic getDatabase should NOT be called by Hermes cron host");
      });

    const reconciler = createHermesPostDispatchReconciler();

    expect(reconciler).toBeDefined();
    expect(getHermesSpy).toHaveBeenCalledTimes(1);
    expect(getGenericSpy).not.toHaveBeenCalled();
  });

  it("honors injected db dependency without invoking getHermesControlDatabase or getDatabase", () => {
    const injectedDb = { execute: vi.fn(), query: {} } as unknown as PostgresJsDatabase<typeof schema>;
    const getHermesSpy = vi
      .spyOn(dbClient, "getHermesControlDatabase")
      .mockImplementation(() => {
        throw new Error("getHermesControlDatabase should not be called when db is injected");
      });
    const getGenericSpy = vi
      .spyOn(dbClient, "getDatabase")
      .mockImplementation(() => {
        throw new Error("getDatabase should not be called when db is injected");
      });

    const reconciler = createHermesPostDispatchReconciler({ db: injectedDb, defaultLimit: 25 });

    expect(reconciler).toBeDefined();
    expect(getHermesSpy).not.toHaveBeenCalled();
    expect(getGenericSpy).not.toHaveBeenCalled();
  });

  it("fails closed when DATABASE_HERMES_CONTROL_URL is missing and no db is injected (even if DATABASE_URL is present)", () => {
    delete process.env.DATABASE_HERMES_CONTROL_URL;
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/main";

    expect(() => createHermesPostDispatchReconciler()).toThrowError(
      "hermes_control_database_configuration_missing"
    );
  });
});
