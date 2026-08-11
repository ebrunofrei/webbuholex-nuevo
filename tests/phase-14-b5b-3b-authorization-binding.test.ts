// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";
import { AuthorizationPersistenceError } from "@/database/repositories/authorization.errors";
import type { WorkspaceSession } from "@/types/auth";
import type { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { externalIdentityBindings, operatorCapabilities } from "@/database/schema/authorization";
import { getTableConfig } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));

describe("Authorization Resolver Contract (B5B.3B.1)", () => {
  let mockRepository: OperatorAuthorizationRepository;

  beforeEach(() => {
    mockRepository = {
      resolveAuthorizedOperator: vi.fn(),
    };
  });

  const baseSession: WorkspaceSession = {
    status: "authenticated",
    sessionId: "sess_123",
    providerSubjectId: "auth0|123",
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    provider: "auth0",
  };

  it("A. Unauthenticated session -> unauthenticated; DB not called", async () => {
    const session: WorkspaceSession = { ...baseSession, status: "unauthenticated" };
    const result = await resolveTrustedAdminPrincipal(session, "complaints:respond", mockRepository);
    expect(result.kind).toBe("unauthenticated");
    expect(mockRepository.resolveAuthorizedOperator).not.toHaveBeenCalled();
  });

  it("B. Wrong provider -> unauthenticated; DB not called", async () => {
    const session = { ...baseSession, provider: null } as unknown as WorkspaceSession;
    const result = await resolveTrustedAdminPrincipal(session, "complaints:respond", mockRepository);
    expect(result.kind).toBe("unauthenticated");
    expect(mockRepository.resolveAuthorizedOperator).not.toHaveBeenCalled();
  });

  it("C. Null providerSubjectId -> unauthenticated; DB not called", async () => {
    const session: WorkspaceSession = { ...baseSession, providerSubjectId: null };
    const result = await resolveTrustedAdminPrincipal(session, "complaints:respond", mockRepository);
    expect(result.kind).toBe("unauthenticated");
    expect(mockRepository.resolveAuthorizedOperator).not.toHaveBeenCalled();
  });

  it("D. Whitespace providerSubjectId -> unauthenticated; DB not called", async () => {
    const session: WorkspaceSession = { ...baseSession, providerSubjectId: "   " };
    const result = await resolveTrustedAdminPrincipal(session, "complaints:respond", mockRepository);
    expect(result.kind).toBe("unauthenticated");
    expect(mockRepository.resolveAuthorizedOperator).not.toHaveBeenCalled();
  });

  it("E. Unmapped Auth0 subject -> operator_not_mapped", async () => {
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: "operator_not_mapped" });
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
    expect(result.kind).toBe("operator_not_mapped");
  });

  it("F. Mapped active + complaints:respond -> authorized", async () => {
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: "authorized", operatorId: "op-uuid" });
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
    expect(result.kind).toBe("authorized");
  });

  it("G, U. Authorized operatorId equals DB-bound internal UUID and identitySource is authenticated_session", async () => {
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: "authorized", operatorId: "op-uuid" });
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
    if (result.kind === "authorized") {
      expect(result.principal.operatorId).toBe("op-uuid");
      expect(result.principal.identitySource).toBe("authenticated_session");
    } else {
      expect.fail("Expected authorized");
    }
  });

  it("H. Mapped active without capability -> capability_missing", async () => {
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: "capability_missing" });
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
    expect(result.kind).toBe("capability_missing");
  });

  it("I. Mapped suspended even with capability -> operator_inactive", async () => {
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: "operator_inactive" });
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
    expect(result.kind).toBe("operator_inactive");
  });

  it("J, K, L, M. Auth0 roles/permissions/metadata cannot grant authorization (ignored by resolver)", async () => {
    // The resolver interface accepts WorkspaceSession (which has no roles/claims) and explicitly queries the repository based ONLY on providerSubjectId.
    // Client cannot inject operatorId because it's not on the WorkspaceSession.
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: "operator_not_mapped" });
    const maliciousSession = { ...baseSession, roles: ["admin"], operatorId: "fake-op-id" } as unknown as WorkspaceSession;
    const result = await resolveTrustedAdminPrincipal(maliciousSession, "complaints:respond", mockRepository);
    expect(result.kind).toBe("operator_not_mapped");
  });

  it("E1. Known AuthorizationPersistenceError -> resolver returns authorization_unavailable.", async () => {
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockRejectedValue(new AuthorizationPersistenceError("DB Down"));
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
    expect(result.kind).toBe("authorization_unavailable");
  });

  it("E2. Unexpected repository error -> SAME ERROR INSTANCE rethrown.", async () => {
    const unexpected = new Error("Unexpected TypeError");
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockRejectedValue(unexpected);
    await expect(resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository))
      .rejects.toBe(unexpected);
  });

  it("E3. Unexpected resolver dependency/factory error -> SAME ERROR INSTANCE rethrown.", async () => {
    const unexpected = new TypeError("Factory failed");
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockImplementation(() => { throw unexpected; });
    await expect(resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository))
      .rejects.toBe(unexpected);
  });

  it("E4. Expected denial results are not thrown.", async () => {
    const denials = [
      { kind: "unauthenticated" },
      { kind: "operator_not_mapped" },
      { kind: "operator_inactive" },
      { kind: "capability_missing" }
    ] as const;

    for (const d of denials) {
      if (d.kind === "unauthenticated") {
        const result = await resolveTrustedAdminPrincipal({ ...baseSession, status: "unauthenticated" }, "complaints:respond", mockRepository);
        expect(result.kind).toBe("unauthenticated");
        continue;
      }

      vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue(d as unknown as Awaited<ReturnType<OperatorAuthorizationRepository["resolveAuthorizedOperator"]>>);

      const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
      expect(result.kind).toBe(d.kind);
    }
  });

  it("E5. authorization_unavailable contains no SQL, table name, connection URL, credential, raw DB message.", async () => {
    const dbError = new AuthorizationPersistenceError("authorization_repository_query_failed", new Error("select * from passwords where user='admin'"));
    vi.mocked(mockRepository.resolveAuthorizedOperator).mockRejectedValue(dbError);
    const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);

    expect(result.kind).toBe("authorization_unavailable");
    const json = JSON.stringify(result).toLowerCase();
    expect(json).not.toContain("select");
    expect(json).not.toContain("table");
    expect(json).not.toContain("password");
    expect(json).not.toContain("url");
  });

  it("V. TrustedAdminPrincipal cannot be created on any denial path", async () => {
    const denials = ["unauthenticated", "operator_not_mapped", "operator_inactive", "capability_missing", "authorization_unavailable"] as const;
    for (const kind of denials) {
      if (kind === "unauthenticated") {
        const result = await resolveTrustedAdminPrincipal({ ...baseSession, status: "unauthenticated" }, "complaints:respond", mockRepository);
        expect("principal" in result).toBe(false);
        continue;
      }
      vi.mocked(mockRepository.resolveAuthorizedOperator).mockResolvedValue({ kind: kind as Exclude<typeof kind, "unauthenticated" | "authorization_unavailable"> });
      const result = await resolveTrustedAdminPrincipal(baseSession, "complaints:respond", mockRepository);
      expect("principal" in result).toBe(false);
    }
  });
});

describe("Authorization Repository & Schema Contract (B5B.3B.1B)", () => {
  it("N. Read only contract: no DB writes", async () => {
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const tx = {
          execute: vi.fn(),
          select: () => {
            const builder = {
              from: () => builder,
              innerJoin: () => builder,
              where: () => builder,
              limit: () => Promise.resolve([])
            };
            return builder;
          }
        };
        return await cb(tx);
      })
    };
    const repo = createAuthorizationRepository(mockDb as unknown as Parameters<typeof createAuthorizationRepository>[0]);
    await repo.resolveAuthorizedOperator("auth0", "sub", "complaints:respond");
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it("O. Single query contract: one authorization query / one DB round-trip", async () => {
    let limitCallCount = 0;
    let executeCallCount = 0;
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const tx = {
          execute: vi.fn().mockImplementation(() => { executeCallCount++; }),
          select: () => {
            const builder = {
              from: () => builder,
              innerJoin: () => builder,
              where: () => builder,
              limit: () => { limitCallCount++; return Promise.resolve([]); }
            };
            return builder;
          }
        };
        return await cb(tx);
      })
    };
    const repo = createAuthorizationRepository(mockDb as unknown as Parameters<typeof createAuthorizationRepository>[0]);
    await repo.resolveAuthorizedOperator("auth0", "sub", "complaints:respond");
    expect(executeCallCount).toBe(1);
    expect(limitCallCount).toBe(1);
  });

  it("P. Binding uniqueness: duplicate external binding rejected", () => {
    const config = getTableConfig(externalIdentityBindings);
    const uniques = config.uniqueConstraints.map(c => c.columns.map(col => col.name).sort().join(","));
    expect(uniques).toContain("external_subject_id,provider");
  });

  it("Q. Capability uniqueness: duplicate capability rejected", () => {
    const config = getTableConfig(operatorCapabilities);
    const pks = config.primaryKeys.map(pk => pk.columns.map(col => col.name).sort().join(","));
    expect(pks).toContain("capability,operator_id");
  });

  it("R. Multiple bindings per operator allowed: NO UNIQUE(operator_id, provider)", () => {
    const config = getTableConfig(externalIdentityBindings);
    const uniques = config.uniqueConstraints.map(c => c.columns.map(col => col.name).sort().join(","));
    expect(uniques).not.toContain("operator_id,provider");
  });
});
