import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => {
  return {};
});

import { getJurisprudenceOutboxDatabase } from "../database/client";

// Mock config module to return valid config without env vars
vi.mock("../database/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../database/config")>();
  return {
    ...actual,
    readJurisprudenceOutboxDatabaseConfig: vi.fn().mockReturnValue({
      url: "postgresql://user:pass@host:5432/dbname",
      maxConnections: 1,
      idleTimeoutSeconds: 20,
      connectTimeoutSeconds: 5,
      prepare: false,
    }),
  };
});

describe("Jurisprudence Outbox Database Client", () => {
  beforeEach(() => {
    // Clear global cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    delete g.__buholexJurisprudenceOutboxClient__;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    delete g.__buholexJurisprudenceOutboxClient__;
  });

  it("reuses singleton client on multiple calls", () => {
    const db1 = getJurisprudenceOutboxDatabase();
    const db2 = getJurisprudenceOutboxDatabase();

    expect(db1).toBeDefined();
    // In javascript, objects are references, so === checks identity.
    // If it's a singleton, it should be exactly the same object.
    expect(db1).toBe(db2);
  });
});
