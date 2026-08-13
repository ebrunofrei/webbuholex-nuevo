import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveAuthorizedNavigation } from "@/lib/authorization/navigation-resolver";
import type { NavigationItem } from "@/types/navigation";
import type { WorkspaceSession } from "@/types/auth";
import type { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";

describe("Capability-Aware Workspace Navigation", () => {
  const baseItem: NavigationItem = {
    id: "test",
    label: "Test",
    href: "/test",
    accessLevel: "authenticated",
    visibility: "visible",
    activeMatch: "exact",
  };

  const capItem: NavigationItem = {
    ...baseItem,
    id: "cap-test",
    requiredCapability: "complaints:read",
  };

  const hiddenItem: NavigationItem = {
    ...baseItem,
    id: "hidden-test",
    visibility: "hidden",
  };

  const mockSession: WorkspaceSession = {
    status: "authenticated",
    provider: "auth0",
    providerSubjectId: "auth0|123",
    sessionId: "mock-session",
    issuedAt: "2026-08-12T00:00:00Z",
    expiresAt: "2026-08-13T00:00:00Z",
  };

  it("returns items without requiredCapability unchanged", async () => {
    const repo = {} as OperatorAuthorizationRepository;
    const result = await resolveAuthorizedNavigation([baseItem], mockSession, repo);
    expect(result).toEqual([baseItem]);
  });

  it("hides items with visibility: hidden", async () => {
    const repo = {} as OperatorAuthorizationRepository;
    const result = await resolveAuthorizedNavigation([baseItem, hiddenItem], mockSession, repo);
    expect(result).toEqual([baseItem]);
  });

  it("includes item if user is authorized for capability", async () => {
    const repo = {
      resolveAuthorizedOperator: vi.fn().mockResolvedValue({ kind: "authorized", operatorId: "op_123" }),
    } as unknown as OperatorAuthorizationRepository;

    const result = await resolveAuthorizedNavigation([capItem], mockSession, repo);

    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe("cap-test");
    expect(repo.resolveAuthorizedOperator).toHaveBeenCalledWith("auth0", "auth0|123", "complaints:read");
  });

  it("removes requiredCapability from returned items so client does not receive it", async () => {
    const repo = {
      resolveAuthorizedOperator: vi.fn().mockResolvedValue({ kind: "authorized", operatorId: "op_123" }),
    } as unknown as OperatorAuthorizationRepository;

    const result = await resolveAuthorizedNavigation([capItem], mockSession, repo);

    expect(result[0]).not.toHaveProperty("requiredCapability");
    expect(result[0]).toEqual({
      id: "cap-test",
      label: "Test",
      href: "/test",
      accessLevel: "authenticated",
      visibility: "visible",
      activeMatch: "exact",
    });
  });

  it("hides item if user lacks capability", async () => {
    const repo = {
      resolveAuthorizedOperator: vi.fn().mockResolvedValue({ kind: "capability_missing" }),
    } as unknown as OperatorAuthorizationRepository;

    const result = await resolveAuthorizedNavigation([capItem], mockSession, repo);
    expect(result).toEqual([]);
  });

  it("hides item if operator is inactive", async () => {
    const repo = {
      resolveAuthorizedOperator: vi.fn().mockResolvedValue({ kind: "operator_inactive" }),
    } as unknown as OperatorAuthorizationRepository;

    const result = await resolveAuthorizedNavigation([capItem], mockSession, repo);
    expect(result).toEqual([]);
  });

  it("hides item if identity is unmapped", async () => {
    const repo = {
      resolveAuthorizedOperator: vi.fn().mockResolvedValue({ kind: "operator_not_mapped" }),
    } as unknown as OperatorAuthorizationRepository;

    const result = await resolveAuthorizedNavigation([capItem], mockSession, repo);
    expect(result).toEqual([]);
  });

  it("hides item if authorization persistence fails", async () => {
    const repo = {
      resolveAuthorizedOperator: vi.fn().mockRejectedValue(new Error("Database error")),
    } as unknown as OperatorAuthorizationRepository;

    const unauthSession = { status: "unauthenticated" } as WorkspaceSession;
    const result = await resolveAuthorizedNavigation([capItem], unauthSession, repo);
    expect(result).toEqual([]);
  });
});
