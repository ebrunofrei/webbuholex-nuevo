import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/diagnostic/auth-smoke/route";
import * as sessionModule from "@/lib/auth/session";
import * as runtimeModule from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import { NextRequest } from "next/server";
import type { JurisprudenceAuthenticator } from "@/types/jurisprudence-security";
import * as mngConfigModule from "@/lib/auth0-management-api-configuration";
import * as authConfigModule from "@/lib/authentication-configuration";
import { Auth0ManagementApiIdentityStatusClient } from "@/lib/auth0-management-api-identity-status-client";
import { Auth0ExternalIdentityProviderAdapter } from "@/lib/auth0-external-identity-provider-adapter";
import { PostgresJurisprudenceRoleAssignmentRepository } from "@/lib/authorization/postgres-jurisprudence-role-assignment-repository";

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceSession: vi.fn(),
}));

vi.mock("@/lib/jurisprudence/jurisprudence-authentication-runtime", () => ({
  createJurisprudenceAuthenticationRuntime: vi.fn(),
}));

vi.mock("@/lib/auth0-management-api-configuration", () => ({
  loadAuth0ManagementApiConfiguration: vi.fn().mockReturnValue({ status: "not_configured" }),
}));

vi.mock("@/lib/authentication-configuration", () => ({
  loadAuthenticationConfiguration: vi.fn().mockReturnValue({ status: "not_configured" }),
}));

vi.mock("@/lib/auth0-management-api-identity-status-client", () => ({
  Auth0ManagementApiIdentityStatusClient: vi.fn(),
}));

vi.mock("@/lib/auth0-external-identity-provider-adapter", () => ({
  Auth0ExternalIdentityProviderAdapter: vi.fn(),
}));

vi.mock("@/lib/authorization/postgres-jurisprudence-role-assignment-repository", () => ({
  PostgresJurisprudenceRoleAssignmentRepository: vi.fn(),
}));

function createSafeSchemaKeys() {
  return [
    "environment",
    "runtimeConfigured",
    "m2mTokenRequest",
    "auth0UserGetAttempted",
    "auth0UserGetHttpStatus",
    "identityStatus",
    "tokenCacheValid",
    "providerAdapter",
    "localRepository",
    "localActive",
    "localRoleCount",
    "localRoleVersion",
    "sessionAvailable",
    "authenticatorRealSessionSmoke"
  ].sort();
}

describe("auth-smoke/route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const baseReqUrl = "http://localhost/api/diagnostic/auth-smoke";

  it("returns 404 outside preview and factory is not called", async () => {
    process.env.VERCEL_ENV = "production";
    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(404);
    expect(runtimeModule.createJurisprudenceAuthenticationRuntime).not.toHaveBeenCalled();
  });

  it("returns 401 if unauthenticated and factory is not called", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "unauthenticated",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(401);
    expect(runtimeModule.createJurisprudenceAuthenticationRuntime).not.toHaveBeenCalled();
  });

  it("returns 401 if authenticated but no providerSubjectId", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(401);
    expect(runtimeModule.createJurisprudenceAuthenticationRuntime).not.toHaveBeenCalled();
  });

  it("ignores external subject in request query and relies on session providerSubjectId", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|session-subject",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    vi.mocked(mngConfigModule.loadAuth0ManagementApiConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof mngConfigModule.loadAuth0ManagementApiConfiguration>);
    vi.mocked(authConfigModule.loadAuthenticationConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof authConfigModule.loadAuthenticationConfiguration>);

    const getIdentityStatusMock = vi.fn().mockResolvedValue({ status: "active" });
    vi.mocked(Auth0ManagementApiIdentityStatusClient).mockImplementation(function() { return {
      getIdentityStatus: getIdentityStatusMock,
    };} as unknown as typeof Auth0ManagementApiIdentityStatusClient);

    vi.mocked(Auth0ExternalIdentityProviderAdapter).mockImplementation(function() { return {
      getIdentityStatus: vi.fn().mockResolvedValue({ status: "verified" }),
    };} as unknown as typeof Auth0ExternalIdentityProviderAdapter);

    vi.mocked(PostgresJurisprudenceRoleAssignmentRepository).mockImplementation(function() { return {
      isSubjectActive: vi.fn().mockResolvedValue(true),
      getRolesForSubject: vi.fn().mockResolvedValue([]),
      getRoleAssignmentVersion: vi.fn().mockResolvedValue(1),
    };} as unknown as typeof PostgresJurisprudenceRoleAssignmentRepository);

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthenticator: JurisprudenceAuthenticator = {
      authenticate: vi.fn().mockResolvedValue({ status: "authenticated" }),
    };

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValueOnce({
      status: "configured",
      runtime: {
        authenticator: mockAuthenticator,
        close: closeMock,
      }
    });

    const res = await GET(new NextRequest(baseReqUrl + "?subject=malicious-id"));
    expect(res.status).toBe(200);

    expect(getIdentityStatusMock).toHaveBeenCalledWith("auth0|session-subject");
    expect(getIdentityStatusMock).not.toHaveBeenCalledWith("malicious-id");
  });

  it("returns safe exact schema and calls close when configured", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthenticator: JurisprudenceAuthenticator = {
      authenticate: vi.fn().mockResolvedValue({ status: "authenticated" }),
    };

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValueOnce({
      status: "configured",
      runtime: {
        authenticator: mockAuthenticator,
        close: closeMock,
      }
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(200);

    const json = await res.json();
    const actualKeys = Object.keys(json).sort();
    expect(actualKeys).toEqual(createSafeSchemaKeys());

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("returns safe diagnostic failure exact schema when runtime is not configured", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValueOnce({
      status: "not_configured"
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(200);

    const json = await res.json();
    const actualKeys = Object.keys(json).sort();
    expect(actualKeys).toEqual(createSafeSchemaKeys());

    expect(json.runtimeConfigured).toBe(false);
  });

  it("returns safe exact schema when factory throws unhandled exception", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockImplementationOnce(() => {
      throw new Error("Secret infrastructure leak detail: DB_URL=postgres://...");
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(200);

    const json = await res.json();
    const actualKeys = Object.keys(json).sort();
    expect(actualKeys).toEqual(createSafeSchemaKeys());

    expect(json.runtimeConfigured).toBe(false);
  });

  it("calls runtime close even if authenticator throws", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthenticator: JurisprudenceAuthenticator = {
      authenticate: vi.fn().mockRejectedValue(new Error("Network fail")),
    };

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValueOnce({
      status: "configured",
      runtime: {
        authenticator: mockAuthenticator,
        close: closeMock,
      }
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(200);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("calls runtime close even if a component throws", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    vi.mocked(mngConfigModule.loadAuth0ManagementApiConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof mngConfigModule.loadAuth0ManagementApiConfiguration>);
    vi.mocked(authConfigModule.loadAuthenticationConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof authConfigModule.loadAuthenticationConfiguration>);

    vi.mocked(Auth0ManagementApiIdentityStatusClient).mockImplementation(function() {
      throw new Error("Component init throw");
    } as unknown as typeof Auth0ManagementApiIdentityStatusClient);

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthenticator: JurisprudenceAuthenticator = {
      authenticate: vi.fn().mockResolvedValue({ status: "authenticated" }),
    };

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValueOnce({
      status: "configured",
      runtime: {
        authenticator: mockAuthenticator,
        close: closeMock,
      }
    });

    const res = await GET(new NextRequest(baseReqUrl));
    expect(res.status).toBe(200);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("verifies token cache logic observable semantics for valid cache", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthenticator: JurisprudenceAuthenticator = {
      authenticate: vi.fn().mockResolvedValue({ status: "authenticated" }),
    };

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockImplementation((_a, _b, options) => {
      if (options?.fetch) {
         Promise.all([
           options.fetch(new URL("https://example.com/oauth/token")),
           options.fetch(new URL("https://example.com/api/v2/users/auth0|123")),
           options.fetch(new URL("https://example.com/api/v2/users/auth0|123"))
         ]).catch(() => {});
      }
      return {
        status: "configured",
        runtime: {
          authenticator: mockAuthenticator,
          close: closeMock,
        }
      };
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
       ok: true,
       status: 200,
    }) as unknown as typeof fetch;

    vi.mocked(mngConfigModule.loadAuth0ManagementApiConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof mngConfigModule.loadAuth0ManagementApiConfiguration>);
    vi.mocked(authConfigModule.loadAuthenticationConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof authConfigModule.loadAuthenticationConfiguration>);

    vi.mocked(Auth0ManagementApiIdentityStatusClient).mockImplementation(function() { return {
      getIdentityStatus: vi.fn().mockResolvedValue({ status: "active" }),
    };} as unknown as typeof Auth0ManagementApiIdentityStatusClient);

    const res = await GET(new NextRequest(baseReqUrl));
    const json = await res.json();

    expect(json.tokenCacheValid).toBe(true);
    expect(json.m2mTokenRequest).toBe("pass");
  });

  it("verifies token cache logic observable semantics for invalid cache", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(sessionModule.getWorkspaceSession).mockResolvedValueOnce({
      status: "authenticated",
      sessionId: "s1",
      providerSubjectId: "auth0|123",
      issuedAt: null,
      expiresAt: null,
      provider: "auth0",
    });

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const mockAuthenticator: JurisprudenceAuthenticator = {
      authenticate: vi.fn().mockResolvedValue({ status: "authenticated" }),
    };

    vi.mocked(runtimeModule.createJurisprudenceAuthenticationRuntime).mockImplementation((_a, _b, options) => {
      if (options?.fetch) {
         Promise.all([
           options.fetch(new URL("https://example.com/oauth/token")),
           options.fetch(new URL("https://example.com/api/v2/users/auth0|123")),
           options.fetch(new URL("https://example.com/oauth/token")),
           options.fetch(new URL("https://example.com/api/v2/users/auth0|123"))
         ]).catch(() => {});
      }
      return {
        status: "configured",
        runtime: {
          authenticator: mockAuthenticator,
          close: closeMock,
        }
      };
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
       ok: true,
       status: 200,
    }) as unknown as typeof fetch;

    vi.mocked(mngConfigModule.loadAuth0ManagementApiConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof mngConfigModule.loadAuth0ManagementApiConfiguration>);
    vi.mocked(authConfigModule.loadAuthenticationConfiguration).mockReturnValueOnce({ status: "configured" } as unknown as ReturnType<typeof authConfigModule.loadAuthenticationConfiguration>);

    vi.mocked(Auth0ManagementApiIdentityStatusClient).mockImplementation(function() { return {
      getIdentityStatus: vi.fn().mockResolvedValue({ status: "active" }),
    };} as unknown as typeof Auth0ManagementApiIdentityStatusClient);

    const res = await GET(new NextRequest(baseReqUrl));
    const json = await res.json();

    expect(json.tokenCacheValid).toBe(false);
  });
});
