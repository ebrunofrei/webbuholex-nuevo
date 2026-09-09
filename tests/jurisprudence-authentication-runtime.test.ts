import { describe, expect, it, vi, beforeEach } from "vitest";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";

vi.mock("@/lib/authorization/postgres-jurisprudence-role-assignment-repository", () => {
  return {
    PostgresJurisprudenceRoleAssignmentRepository: class {
      async getRolesForSubject() { return ["jurisprudence_reader"]; }
      async isSubjectActive() { return true; }
      async getRoleAssignmentVersion() { return 1; }
    },
  };
});

describe("JurisprudenceAuthenticationRuntime", () => {
  const validAuthConfig = {
    AUTH_PROVIDER_KIND: "auth0_oidc",
    AUTH_ISSUER: "https://test.auth0.com/",
    AUTH_CLIENT_ID: "client123",
    AUTH_AUDIENCE: "https://api.example.com",
    AUTH_COOKIE_NAME: "test_cookie",
    AUTH_ABSOLUTE_TTL_SECONDS: "3600",
    AUTH_IDLE_TTL_SECONDS: "1800",
    AUTH_ALLOWED_ORIGINS: "https://example.com",
    AUTH_ENVIRONMENT: "test",
    AUTH_CLIENT_SECRET_REFERENCE: "AUTH_SECRET",
    AUTH_SESSION_SECRET_REFERENCE: "SESSION_SECRET",
  };

  const validManagementConfig = {
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_MANAGEMENT_CLIENT_ID: "mgt_client",
    AUTH0_MANAGEMENT_CLIENT_SECRET: "mgt_secret",
  };

  const getSessionMock = vi.fn().mockResolvedValue({
    status: "authenticated",
    provider: "auth0",
    providerSubjectId: "auth0-123",
    sessionId: "sess_123",
    issuedAt: new Date().toISOString(),
    expiresAt: null,
  });

  const request = new Request("https://example.com");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed if auth config is not_configured", () => {
    const result = createJurisprudenceAuthenticationRuntime({}, validManagementConfig);
    expect(result.status).toBe("not_configured");
  });

  it("fails closed if auth config is invalid", () => {
    const result = createJurisprudenceAuthenticationRuntime(
      { AUTH_PROVIDER_KIND: "auth0_oidc" },
      validManagementConfig
    );
    expect(result.status).toBe("invalid");
  });

  it("fails closed if management config is not_configured", () => {
    const result = createJurisprudenceAuthenticationRuntime(validAuthConfig, {});
    expect(result.status).toBe("not_configured");
  });

  it("fails closed if management config is invalid", () => {
    const result = createJurisprudenceAuthenticationRuntime(validAuthConfig, {
      AUTH0_DOMAIN: "test.auth0.com",
      AUTH0_MANAGEMENT_CLIENT_ID: "client",
    });
    expect(result.status).toBe("invalid");
  });

  it("constructs configured runtime and uses injected dependencies", async () => {
    let fetchCalls = 0;
    const fakeFetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) => {
      fetchCalls++;
      if (typeof url === "string" && url.includes("/oauth/token")) {
        return new Response(JSON.stringify({ access_token: "fake_token", expires_in: 86400 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    const result = createJurisprudenceAuthenticationRuntime(
      validAuthConfig,
      validManagementConfig,
      {
        now: () => new Date().toISOString(),
        fetch: fakeFetch,
        getSession: getSessionMock,
      }
    );

    expect(result.status).toBe("configured");
    if (result.status !== "configured") throw new Error("Expected configured");

    const authResult = await result.runtime.authenticator.authenticate(request);

    expect(fakeFetch).toHaveBeenCalled();
    expect(getSessionMock).toHaveBeenCalled();

    expect(authResult.status).toBe("authenticated");
    if (authResult.status === "authenticated") {
      expect(authResult.principal.subjectId).toBe("auth0-123");
      expect(authResult.principal.roles.length).toBeGreaterThan(0);
    }

    // Status client reuse test (cache should hit, so no extra token fetch and no extra user status fetch)
    const initialFetchCount = fetchCalls;
    await result.runtime.authenticator.authenticate(request);
    // 0 user status fetch, 0 token fetch
    expect(fetchCalls).toBe(initialFetchCount);

    // Close idempotency
    await result.runtime.close();
    await result.runtime.close();
  });

  it("feature gate does not block auth runtime construction", () => {
    const original = process.env.JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED;
    try {
      process.env.JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED = "false";

      const result = createJurisprudenceAuthenticationRuntime(
        validAuthConfig,
        validManagementConfig
      );
      expect(result.status).toBe("configured");
    } finally {
      if (original === undefined) {
        delete process.env.JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED;
      } else {
        process.env.JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED = original;
      }
    }
  });
});
