import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => {
  return {};
});

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
    and: vi.fn(actual.and)
  };
});

import * as drizzleOrm from "drizzle-orm";
import { externalIdentityBindings } from "../database/schema/authorization";
import { PostgresJurisprudenceRoleAssignmentRepository, mapProviderToDatabaseIdentifier } from "../lib/authorization/postgres-jurisprudence-role-assignment-repository";

// Mock the database client and roles
const mockDb = {};
vi.mock("../database/client", () => ({
  getJurisprudenceAuthorizationDatabase: vi.fn(() => mockDb),
}));

let fakeTx: Record<string, ReturnType<typeof vi.fn>>;

vi.mock("../database/roles", () => ({
  withJurisprudenceAuthorizationRole: vi.fn(async (db: unknown, cb: (tx: unknown) => Promise<unknown>) => {
    return await cb(fakeTx);
  }),
}));

describe("PostgresJurisprudenceRoleAssignmentRepository", () => {
  let repo: PostgresJurisprudenceRoleAssignmentRepository;

  beforeEach(() => {
    repo = new PostgresJurisprudenceRoleAssignmentRepository();

    // We need to recreate the mock chain for every test to avoid state leaking between calls.
    const createQueryBuilder = () => {
      const qb: Record<string, ReturnType<typeof vi.fn>> = {};
      qb.select = vi.fn().mockReturnValue(qb);
      qb.from = vi.fn().mockReturnValue(qb);
      qb.where = vi.fn().mockReturnValue(qb);
      qb.limit = vi.fn().mockReturnValue(qb);
      qb.innerJoin = vi.fn().mockReturnValue(qb);
      return qb;
    };
    fakeTx = createQueryBuilder();
    vi.clearAllMocks();
  });

  it("provider-aware lookup uses provider + subject and maps auth0_oidc to auth0", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([{ operatorId: "123" }]);
    fakeTx.where = vi.fn().mockImplementation((...args: unknown[]) => {
      if (fakeTx.limit!.mock.calls.length === 0) {
         return fakeTx;
      }
      return Promise.resolve([{ role: "jurisprudence_reader" }]);
    });

    await repo.getRolesForSubject({ providerKind: "auth0_oidc", subjectId: "sub1" });

    expect(fakeTx.select).toHaveBeenCalled();
    expect(drizzleOrm.eq).toHaveBeenCalledWith(externalIdentityBindings.provider, "auth0");
    expect(drizzleOrm.eq).toHaveBeenCalledWith(externalIdentityBindings.externalSubjectId, "sub1");
    // Verify that and() was called with the results of those eq() calls.
    expect(drizzleOrm.and).toHaveBeenCalled();

    (drizzleOrm.eq as ReturnType<typeof vi.fn>).mockClear();
    (drizzleOrm.and as ReturnType<typeof vi.fn>).mockClear();
  });

  it("throws on unsupported provider kind, proving subject-only lookup is impossible", () => {
    expect(() => mapProviderToDatabaseIdentifier("unsupported_provider"))
      .toThrow("unsupported_provider_kind: unsupported_provider");
  });

  it("unknown identity -> roles []", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([]);
    const roles = await repo.getRolesForSubject({ providerKind: "auth0_oidc", subjectId: "unknown" });
    expect(roles).toEqual([]);
  });

  it("unknown identity -> active false", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([]);
    const active = await repo.isSubjectActive({ providerKind: "auth0_oidc", subjectId: "unknown" });
    expect(active).toBe(false);
  });

  it("unknown identity -> version 0", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([]);
    const version = await repo.getRoleAssignmentVersion({ providerKind: "auth0_oidc", subjectId: "unknown" });
    expect(version).toBe(0);
  });

  it("known active operator -> active true", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([{ status: "active" }]);
    const active = await repo.isSubjectActive({ providerKind: "auth0_oidc", subjectId: "sub1" });
    expect(active).toBe(true);
  });

  it("non-active operator -> false", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([{ status: "suspended" }]);
    const active = await repo.isSubjectActive({ providerKind: "auth0_oidc", subjectId: "sub1" });
    expect(active).toBe(false);
  });

  it("known operator / no roles -> []", async () => {
    // For getRolesForSubject, first call is limit(1) (binding)
    // second call is where() without limit (roles).
    fakeTx.limit = vi.fn().mockResolvedValue([{ operatorId: "123" }]);
    fakeTx.where = vi.fn().mockImplementation((...args: unknown[]) => {
      // Return the mock chain for the first call which chains to limit,
      // and for the second call return the promise array.
      if (fakeTx.limit!.mock.calls.length === 0) {
         return fakeTx;
      }
      return Promise.resolve([]);
    });

    const roles = await repo.getRolesForSubject({ providerKind: "auth0_oidc", subjectId: "sub1" });
    expect(roles).toEqual([]);
  });

  it("known operator / missing role_sets -> version 1", async () => {
    // First query limit() returns binding, second query limit() returns sets
    fakeTx.limit = vi.fn()
      .mockResolvedValueOnce([{ operatorId: "123" }])
      .mockResolvedValueOnce([]);

    const version = await repo.getRoleAssignmentVersion({ providerKind: "auth0_oidc", subjectId: "sub1" });
    expect(version).toBe(1);
  });

  it("known operator / persisted version -> exact version", async () => {
    fakeTx.limit = vi.fn()
      .mockResolvedValueOnce([{ operatorId: "123" }])
      .mockResolvedValueOnce([{ version: 5 }]);

    const version = await repo.getRoleAssignmentVersion({ providerKind: "auth0_oidc", subjectId: "sub1" });
    expect(version).toBe(5);
  });

  it("invalid persisted version fails closed", async () => {
    fakeTx.limit = vi.fn()
      .mockResolvedValueOnce([{ operatorId: "123" }])
      .mockResolvedValueOnce([{ version: 0 }]); // invalid version

    await expect(
      repo.getRoleAssignmentVersion({ providerKind: "auth0_oidc", subjectId: "sub1" })
    ).rejects.toThrow("infrastructure_error: invalid_persisted_version");
  });

  it("recognized role returned, unknown persisted role filtered", async () => {
    fakeTx.limit = vi.fn().mockResolvedValue([{ operatorId: "123" }]);
    fakeTx.where = vi.fn().mockImplementation((...args: unknown[]) => {
      if (fakeTx.limit!.mock.calls.length === 0) {
         return fakeTx;
      }
      return Promise.resolve([
        { role: "jurisprudence_reader" },
        { role: "unknown_role_future" }
      ]);
    });

    const roles = await repo.getRolesForSubject({ providerKind: "auth0_oidc", subjectId: "sub1" });
    expect(roles).toEqual(["jurisprudence_reader"]);
  });
});
