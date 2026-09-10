import { describe, it, expect, vi } from "vitest";
import { Auth0ExternalIdentityProviderAdapter } from "../lib/auth0-external-identity-provider-adapter";
import type { WorkspaceSession } from "@/types/auth";
import type {
  ActiveAuthenticationConfiguration,
  ExternalIdentityStatus,
} from "@/types/authentication-configuration";
import { ProviderBackedJurisprudenceAuthenticator } from "@/lib/provider-backed-jurisprudence-authenticator";

const mockConfig: ActiveAuthenticationConfiguration = {
  status: "configured_for_test",
  providerKind: "auth0_oidc",
  issuer: "https://test.auth0.com/",
  clientId: "test-client-id",
  audience: "test-audience",
  sessionStrategy: "stateful",
  cookie: {
    name: "test-cookie",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  },
  absoluteTtlSeconds: 3600,
  idleTtlSeconds: 1800,
  allowedOrigins: ["https://example.com"],
  environment: "test",
  roleSource: "internal_repository",
  clientSecretReference: { kind: "environment", key: "TEST_SECRET" },
  sessionSecretReference: { kind: "environment", key: "TEST_SESSION_SECRET" },
};

describe("Auth0ExternalIdentityProviderAdapter", () => {
  const dummyRequest = new Request("https://example.com");

  it("should return anonymous when session status is unauthenticated", async () => {
    const sessionResolver = vi.fn().mockResolvedValue({
      status: "unauthenticated",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    } satisfies WorkspaceSession);

    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn(),
    }, sessionResolver);

    const result = await adapter.resolveAuthentication(dummyRequest);
    expect(result).toEqual({ status: "anonymous" });
  });

  it("should return unavailable when session status is loading", async () => {
    const sessionResolver = vi.fn().mockResolvedValue({
      status: "loading",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    } satisfies WorkspaceSession);

    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn(),
    }, sessionResolver);

    const result = await adapter.resolveAuthentication(dummyRequest);
    expect(result).toEqual({ status: "unavailable", reason: "infrastructure_error" });
  });

  it("should fail closed on session resolver throw", async () => {
    const sessionResolver = vi.fn().mockRejectedValue(new Error("Network failure"));
    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn(),
    }, sessionResolver);

    const result = await adapter.resolveAuthentication(dummyRequest);
    expect(result).toEqual({ status: "unavailable", reason: "infrastructure_error" });
  });

  it("should map not_configured to infrastructure_error", async () => {
    const sessionResolver = vi.fn().mockResolvedValue({
      status: "not_configured",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    } satisfies WorkspaceSession);

    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn(),
    }, sessionResolver);

    const result = await adapter.resolveAuthentication(dummyRequest);
    expect(result).toEqual({ status: "unavailable", reason: "infrastructure_error" });
  });

  it("should fail closed when authenticated session lacks required metadata or has invalid timestamps/provider", async () => {
    const invalidSessions: WorkspaceSession[] = [
      { status: "authenticated", providerSubjectId: null, sessionId: "sid", issuedAt: "2023-01-01T00:00:00Z", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "", sessionId: "sid", issuedAt: "2023-01-01T00:00:00Z", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "  ", sessionId: "sid", issuedAt: "2023-01-01T00:00:00Z", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: null, issuedAt: "2023-01-01T00:00:00Z", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "", issuedAt: "2023-01-01T00:00:00Z", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "sid", issuedAt: null, expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "sid", issuedAt: "", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "sid", issuedAt: "not-a-date", expiresAt: null, provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "sid", issuedAt: "2023-01-01T00:00:00Z", expiresAt: "", provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "sid", issuedAt: "2023-01-01T00:00:00Z", expiresAt: "not-a-date", provider: "auth0" },
      { status: "authenticated", providerSubjectId: "sub", sessionId: "sid", issuedAt: "2023-01-01T00:00:00Z", expiresAt: null, provider: null },
    ];

    for (const invalid of invalidSessions) {
      const adapter = new Auth0ExternalIdentityProviderAdapter(
        mockConfig,
        { getIdentityStatus: vi.fn() },
        vi.fn().mockResolvedValue(invalid)
      );

      const result = await adapter.resolveAuthentication(dummyRequest);
      expect(result).toEqual({ status: "unavailable", reason: "infrastructure_error" });
    }
  });

  it("should map verified session faithfully (expiresAt null)", async () => {
    const sessionResolver = vi.fn().mockResolvedValue({
      status: "authenticated",
      providerSubjectId: "auth0-123",
      sessionId: "session-456",
      issuedAt: "2023-01-01T00:00:00.000Z",
      expiresAt: null,
      provider: "auth0",
    } satisfies WorkspaceSession);

    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn(),
    }, sessionResolver);

    const result = await adapter.resolveAuthentication(dummyRequest);
    expect(result).toEqual({
      status: "verified",
      providerKind: "auth0_oidc",
      subjectId: "auth0-123",
      sessionReference: "session-456",
      issuer: "https://test.auth0.com/",
      audiences: ["test-audience"],
      issuedAt: "2023-01-01T00:00:00.000Z",
      expiresAt: null,
    });
  });

  it("should map verified session faithfully (expiresAt string)", async () => {
    const sessionResolver = vi.fn().mockResolvedValue({
      status: "authenticated",
      providerSubjectId: "auth0|123",
      sessionId: "session-456",
      issuedAt: "2023-01-01T00:00:00.000Z",
      expiresAt: "2023-01-01T01:00:00.000Z",
      provider: "auth0",
    } satisfies WorkspaceSession);

    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn(),
    }, sessionResolver);

    const result = await adapter.resolveAuthentication(dummyRequest);
    expect(result).toEqual({
      status: "verified",
      providerKind: "auth0_oidc",
      subjectId: "auth0|123",
      sessionReference: "session-456",
      issuer: "https://test.auth0.com/",
      audiences: ["test-audience"],
      issuedAt: "2023-01-01T00:00:00.000Z",
      expiresAt: "2023-01-01T01:00:00.000Z",
    });
  });

  it("should delegate getIdentityStatus exactly", async () => {
    const statuses: ExternalIdentityStatus[] = [
      { status: "active" },
      { status: "suspended" },
      { status: "not_found" },
      { status: "unavailable" },
    ];

    for (const expectedStatus of statuses) {
      const getIdentityStatus = vi.fn().mockResolvedValue(expectedStatus);
      const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, { getIdentityStatus }, vi.fn());

      const result = await adapter.getIdentityStatus("test-sub");
      expect(result).toEqual(expectedStatus);
      expect(getIdentityStatus).toHaveBeenCalledTimes(1);
      expect(getIdentityStatus).toHaveBeenCalledWith("test-sub");
    }
  });

  it("should map getIdentityStatus throw to fail-closed unavailable", async () => {
    const getIdentityStatus = vi.fn().mockRejectedValue(new Error("Status failure"));
    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, { getIdentityStatus }, vi.fn());

    const result = await adapter.getIdentityStatus("test-sub");
    expect(result).toEqual({ status: "unavailable" });
  });

  it("should implement an honest no-op close()", async () => {
    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, { getIdentityStatus: vi.fn() }, vi.fn());
    await expect(adapter.close()).resolves.toBeUndefined();
  });
});

describe("Authenticator Compatibility", () => {
  const dummyRequest = new Request("https://example.com");

  it("should produce a resolution accepted by ProviderBackedJurisprudenceAuthenticator", async () => {
    const sessionResolver = vi.fn().mockResolvedValue({
      status: "authenticated",
      providerSubjectId: "auth0-123",
      sessionId: "session-456",
      issuedAt: "2023-01-01T00:00:00.000Z",
      expiresAt: "2023-01-01T01:00:00.000Z",
      provider: "auth0",
    } satisfies WorkspaceSession);

    const adapter = new Auth0ExternalIdentityProviderAdapter(mockConfig, {
      getIdentityStatus: vi.fn().mockResolvedValue({ status: "active" }),
    }, sessionResolver);

    const authenticator = new ProviderBackedJurisprudenceAuthenticator({
      configuration: mockConfig,
      provider: adapter,
      roles: {
        getRolesForSubject: vi.fn().mockResolvedValue(["jurisprudence_reader"]),
        isSubjectActive: vi.fn().mockResolvedValue(true),
        getRoleAssignmentVersion: vi.fn().mockResolvedValue(1),
      },
      now: () => "2023-01-01T00:30:00.000Z",
    });

    const result = await authenticator.authenticate(dummyRequest);
    expect(result.status).toBe("authenticated");
    if (result.status === "authenticated") {
      expect(result.principal.subjectId).toBe("auth0-123");
    }
  });
});
