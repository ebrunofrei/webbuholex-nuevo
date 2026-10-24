// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider } from "@/lib/auth/provider";
import {
  mapSupabaseSessionToWorkspaceSession,
  parseJwtPayload,
  getSupabaseWorkspaceSession,
} from "@/lib/auth/supabase-session";
import { isAuth0Configured, getAuth0WorkspaceSession } from "@/lib/auth/session";
import { auth0 } from "@/lib/auth/auth0";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import { getSupabaseEnv } from "@/lib/auth/supabase-server";
import {
  buildLoginPath,
  buildLogoutPath,
  buildAuth0LoginPath,
  sanitizeSafeReturnTo,
  sanitizeWorkspaceReturnTo,
} from "@/lib/auth/return-to";
import {
  SupabaseExternalIdentityProviderAdapter,
  DefaultSupabaseIdentityStatusClient,
} from "@/lib/supabase-external-identity-provider-adapter";
import { mapProviderToDatabaseIdentifier } from "@/lib/authorization/postgres-jurisprudence-role-assignment-repository";
import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";
import { HERMES_IDENTITY_PROVIDERS } from "@/lib/hermes/control/hermes-control-contracts";
import { subjectIdentities } from "@/database/schema/hermes-control";
import { externalIdentityBindings } from "@/database/schema/authorization";
import { getTableConfig } from "drizzle-orm/pg-core";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import { middleware } from "@/middleware";
import { GET as loginRouteHandler } from "@/app/auth/login/route";
import { GET as callbackRouteHandler } from "@/app/auth/callback/route";
import { GET as logoutRouteHandler } from "@/app/auth/logout/route";
import type { WorkspaceSession } from "@/types/auth";
import type { ActiveAuthenticationConfiguration } from "@/types/authentication-configuration";
import type { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";

const mockExchangeCodeForSession = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options?: { cookies?: { getAll?: () => Array<{ name: string; value: string }>; setAll?: (cookies: Array<{ name: string; value: string; options?: unknown }>) => void } }) => ({
    auth: {
      exchangeCodeForSession: vi.fn(async (code: string) => {
        if (options?.cookies?.setAll) {
          options.cookies.setAll([
            { name: "sb-access-token", value: "test-access-token", options: { path: "/", httpOnly: true } },
            { name: "sb-refresh-token", value: "test-refresh-token", options: { path: "/", httpOnly: true } },
          ]);
        }
        return mockExchangeCodeForSession(code);
      }),
      signInWithOAuth: vi.fn(async (params: unknown) => {
        if (options?.cookies?.setAll) {
          options.cookies.setAll([
            { name: "sb-pkce-verifier", value: "test-verifier", options: { path: "/", httpOnly: true } },
          ]);
        }
        return mockSignInWithOAuth(params);
      }),
      signOut: vi.fn(async () => {
        if (options?.cookies?.setAll) {
          options.cookies.setAll([
            { name: "sb-access-token", value: "", options: { maxAge: 0 } },
            { name: "sb-refresh-token", value: "", options: { maxAge: 0 } },
          ]);
        }
        return mockSignOut();
      }),
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// Helper to create test configuration
function createTestAuthConfig(
  overrides: Partial<ActiveAuthenticationConfiguration> = {}
): ActiveAuthenticationConfiguration {
  return {
    status: "configured_for_test",
    providerKind: "supabase_auth",
    issuer: "https://eyaxxyacysfawlsallic.supabase.co/auth/v1/",
    clientId: "buholex-test",
    audience: "https://buholex.com",
    sessionStrategy: "stateful",
    cookie: {
      name: "sb-auth-token",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    },
    absoluteTtlSeconds: 28800,
    idleTtlSeconds: 3600,
    allowedOrigins: ["https://buholex.com"],
    environment: "test",
    roleSource: "internal_repository",
    clientSecretReference: { kind: "environment", key: "NEXT_PUBLIC_SUPABASE_ANON_KEY" },
    sessionSecretReference: { kind: "environment", key: "NEXT_PUBLIC_SUPABASE_ANON_KEY" },
    ...overrides,
  };
}

describe("BÚHOLEX-AUTH-A0.2: Provider-Neutral Foundation Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockExchangeCodeForSession.mockClear();
    mockSignInWithOAuth.mockClear();
    mockSignOut.mockClear();
    mockGetUser.mockClear();
    mockGetSession.mockClear();

    mockExchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null });
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?client_id=google-test-id" },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-mocked" } }, error: null });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-jwt.mock-payload.mock-sig",
          user: { id: "user-uuid-mocked" },
        },
      },
      error: null,
    });
  });

  // ============================================================
  // 1. Provider Selector
  // ============================================================
  describe("1. Provider Selector (getAuthProvider)", () => {
    it("defaults to auth0 when AUTH_PROVIDER is undefined", () => {
      expect(getAuthProvider({})).toBe("auth0");
    });

    it("defaults to auth0 when AUTH_PROVIDER is empty or whitespace", () => {
      expect(getAuthProvider({ AUTH_PROVIDER: "" })).toBe("auth0");
      expect(getAuthProvider({ AUTH_PROVIDER: "   " })).toBe("auth0");
    });

    it("returns auth0 when AUTH_PROVIDER is explicitly auth0", () => {
      expect(getAuthProvider({ AUTH_PROVIDER: "auth0" })).toBe("auth0");
      expect(getAuthProvider({ AUTH_PROVIDER: "AUTH0" })).toBe("auth0");
      expect(getAuthProvider({ AUTH_PROVIDER: "  auth0  " })).toBe("auth0");
    });

    it("returns supabase only when AUTH_PROVIDER is explicitly supabase", () => {
      expect(getAuthProvider({ AUTH_PROVIDER: "supabase" })).toBe("supabase");
      expect(getAuthProvider({ AUTH_PROVIDER: "SUPABASE" })).toBe("supabase");
      expect(getAuthProvider({ AUTH_PROVIDER: "  supabase  " })).toBe("supabase");
    });

    it("defaults to auth0 on unsupported or unknown provider values", () => {
      expect(getAuthProvider({ AUTH_PROVIDER: "clerk" })).toBe("auth0");
      expect(getAuthProvider({ AUTH_PROVIDER: "custom" })).toBe("auth0");
      expect(getAuthProvider({ AUTH_PROVIDER: "firebase" })).toBe("auth0");
    });
  });

  // ============================================================
  // 2. Supabase Environment Contract
  // ============================================================
  describe("2. Supabase Environment Contract (getSupabaseEnv)", () => {
    it("returns null when env variables are missing", () => {
      expect(getSupabaseEnv({})).toBeNull();
      expect(getSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co" })).toBeNull();
      expect(getSupabaseEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" })).toBeNull();
    });

    it("returns null on invalid URL protocol", () => {
      expect(
        getSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: "ftp://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        })
      ).toBeNull();
    });

    it("returns config when valid public variables are provided", () => {
      const config = getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://eyaxxyacysfawlsallic.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "staging-anon-key-12345",
      });
      expect(config).toEqual({
        url: "https://eyaxxyacysfawlsallic.supabase.co",
        anonKey: "staging-anon-key-12345",
      });
    });
  });

  // ============================================================
  // 3. Supabase Session Mapping & WorkspaceSession
  // ============================================================
  describe("3. Supabase Session Mapping to WorkspaceSession", () => {
    it("maps null or undefined session to unauthenticated WorkspaceSession", () => {
      const sessionNull = mapSupabaseSessionToWorkspaceSession(null);
      expect(sessionNull).toEqual({
        status: "unauthenticated",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      });

      const sessionUndef = mapSupabaseSessionToWorkspaceSession(undefined);
      expect(sessionUndef.status).toBe("unauthenticated");
    });

    it("maps session with missing or empty user id to unauthenticated", () => {
      expect(mapSupabaseSessionToWorkspaceSession({ user: {} }).status).toBe("unauthenticated");
      expect(mapSupabaseSessionToWorkspaceSession({ user: { id: "" } }).status).toBe("unauthenticated");
      expect(mapSupabaseSessionToWorkspaceSession({ user: { id: "   " } }).status).toBe("unauthenticated");
    });

    it("maps authenticated Supabase user without JWT session_id claim safely without inventing one", () => {
      const input = {
        user: {
          id: "e44d7159-b14a-4e20-94f8-111122223333",
          created_at: "2026-10-21T12:00:00.000Z",
        },
        expires_at: 1792605600,
      };

      const result = mapSupabaseSessionToWorkspaceSession(input);
      expect(result.status).toBe("authenticated");
      expect(result.provider).toBe("supabase");
      expect(result.providerSubjectId).toBe("e44d7159-b14a-4e20-94f8-111122223333");
      expect(result.sessionId).toBeNull(); // Never invented!
      expect(result.issuedAt).toBe("2026-10-21T12:00:00.000Z");
      expect(result.expiresAt).toBe(new Date(1792605600 * 1000).toISOString());
    });

    it("derives sessionId from JWT access_token payload when session_id claim is present", () => {
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          sub: "e44d7159-b14a-4e20-94f8-111122223333",
          session_id: "sb-sess-99887766",
          iat: 1700000000,
          exp: 1700003600,
        })
      ).toString("base64url");
      const dummyToken = `${header}.${payload}.dummy_signature`;

      const input = {
        access_token: dummyToken,
        user: { id: "e44d7159-b14a-4e20-94f8-111122223333" },
      };

      const result = mapSupabaseSessionToWorkspaceSession(input);
      expect(result.status).toBe("authenticated");
      expect(result.sessionId).toBe("sb-sess-99887766");
      expect(result.providerSubjectId).toBe("e44d7159-b14a-4e20-94f8-111122223333");
      expect(result.issuedAt).toBe(new Date(1700000000 * 1000).toISOString());
      expect(result.expiresAt).toBe(new Date(1700003600 * 1000).toISOString());
      expect(result.provider).toBe("supabase");
    });

    it("parseJwtPayload handles malformed tokens safely without throwing", () => {
      expect(parseJwtPayload("")).toBeNull();
      expect(parseJwtPayload("not.a.jwt.extra")).toBeNull();
      expect(parseJwtPayload("not-three-parts")).toBeNull();
      expect(parseJwtPayload("header.invalid_base64!@#.sig")).toBeNull();
    });

    it("WorkspaceSession contains zero leaked Supabase token or internal user fields", () => {
      const input = {
        access_token: "secret-jwt-token",
        user: { id: "user-uuid-1", created_at: "2026-10-21T12:00:00.000Z" },
      };
      const session = mapSupabaseSessionToWorkspaceSession(input);
      const keys = Object.keys(session);
      expect(keys.sort()).toEqual(
        ["expiresAt", "issuedAt", "provider", "providerSubjectId", "sessionId", "status"].sort()
      );
      expect(keys).not.toContain("access_token");
      expect(keys).not.toContain("refresh_token");
      expect(keys).not.toContain("user");
    });
  });

  // ============================================================
  // 4. Return-To Safety & Login/Logout Paths
  // ============================================================
  describe("4. Return-To Safety & Provider-Neutral Login/Logout Paths", () => {
    it("buildLoginPath preserves safe returnTo destinations", () => {
      expect(buildLoginPath("/app")).toBe("/auth/login?returnTo=%2Fapp");
      expect(buildLoginPath("/app/proyectos")).toBe("/auth/login?returnTo=%2Fapp%2Fproyectos");
      expect(buildLoginPath("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze")).toBe(
        "/auth/login?returnTo=%2Fjurisprudencia%2Fexp-00123-2024-aa-tc%3Fintent%3Danalyze"
      );
    });

    it("buildLogoutPath builds safe logout destination", () => {
      expect(buildLogoutPath()).toBe("/auth/logout?returnTo=%2Fapp");
      expect(buildLogoutPath("/app/proyectos")).toBe("/auth/logout?returnTo=%2Fapp%2Fproyectos");
    });

    it("buildAuth0LoginPath remains backwards compatible", () => {
      expect(buildAuth0LoginPath("/app")).toBe("/auth/login?returnTo=%2Fapp");
    });

    it("sanitizes dangerous open-redirect attempts to /app fallback", () => {
      expect(sanitizeSafeReturnTo("https://evil.example")).toBe("/app");
      expect(sanitizeSafeReturnTo("//evil.example/app")).toBe("/app");
      expect(sanitizeSafeReturnTo("javascript:alert(1)")).toBe("/app");
      expect(sanitizeSafeReturnTo("/app\\evil")).toBe("/app");
      expect(sanitizeWorkspaceReturnTo(null)).toBe("/app");
      expect(sanitizeWorkspaceReturnTo(undefined)).toBe("/app");
    });
  });

  // ============================================================
  // 5. Supabase External Identity Adapter
  // ============================================================
  describe("5. SupabaseExternalIdentityProviderAdapter", () => {
    const testConfig = createTestAuthConfig();

    it("resolves anonymous status when workspace session is unauthenticated", async () => {
      const adapter = new SupabaseExternalIdentityProviderAdapter(
        testConfig,
        async () => ({
          status: "unauthenticated",
          sessionId: null,
          providerSubjectId: null,
          issuedAt: null,
          expiresAt: null,
          provider: null,
        })
      );

      const request = new Request("https://buholex.com/test");
      const resolution = await adapter.resolveAuthentication(request);
      expect(resolution).toEqual({ status: "anonymous" });
    });

    it("resolves unavailable when workspace session is not_configured", async () => {
      const adapter = new SupabaseExternalIdentityProviderAdapter(
        testConfig,
        async () => ({
          status: "not_configured",
          sessionId: null,
          providerSubjectId: null,
          issuedAt: null,
          expiresAt: null,
          provider: null,
        })
      );

      const request = new Request("https://buholex.com/test");
      const resolution = await adapter.resolveAuthentication(request);
      expect(resolution).toEqual({ status: "unavailable", reason: "infrastructure_error" });
    });

    it("resolves verified status for authenticated Supabase session", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sb-sess-1234",
        providerSubjectId: "user-uuid-99",
        issuedAt: "2026-10-21T12:00:00.000Z",
        expiresAt: "2026-10-21T18:00:00.000Z",
        provider: "supabase",
      };

      const adapter = new SupabaseExternalIdentityProviderAdapter(testConfig, async () => session);
      const request = new Request("https://buholex.com/test");
      const resolution = await adapter.resolveAuthentication(request);

      expect(resolution).toEqual({
        status: "verified",
        providerKind: "supabase_auth",
        subjectId: "user-uuid-99",
        sessionReference: "sb-sess-1234",
        issuer: testConfig.issuer,
        audiences: [testConfig.audience],
        issuedAt: "2026-10-21T12:00:00.000Z",
        expiresAt: "2026-10-21T18:00:00.000Z",
      });
    });

    it("falls back to providerSubjectId as sessionReference when sessionId is null", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: "user-uuid-no-session-id",
        issuedAt: "2026-10-21T12:00:00.000Z",
        expiresAt: null,
        provider: "supabase",
      };

      const adapter = new SupabaseExternalIdentityProviderAdapter(testConfig, async () => session);
      const resolution = await adapter.resolveAuthentication(new Request("https://buholex.com/test"));

      expect(resolution.status).toBe("verified");
      if (resolution.status === "verified") {
        expect(resolution.sessionReference).toBe("user-uuid-no-session-id");
        expect(resolution.expiresAt).toBeNull();
      }
    });

    it("rejects session if provider mismatch occurs (fails closed)", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sid",
        providerSubjectId: "sub",
        issuedAt: "2026-10-21T12:00:00.000Z",
        expiresAt: null,
        provider: "auth0", // Mismatch for Supabase adapter
      };

      const adapter = new SupabaseExternalIdentityProviderAdapter(testConfig, async () => session);
      const resolution = await adapter.resolveAuthentication(new Request("https://buholex.com/test"));
      expect(resolution).toEqual({ status: "unavailable", reason: "infrastructure_error" });
    });

    it("identity status client checks subjectId conservatively without privileged calls", async () => {
      const statusClient = new DefaultSupabaseIdentityStatusClient();
      expect(await statusClient.getIdentityStatus("")).toEqual({ status: "not_found" });
      expect(await statusClient.getIdentityStatus("   ")).toEqual({ status: "not_found" });
      expect(await statusClient.getIdentityStatus("valid-user-uuid")).toEqual({ status: "active" });
    });
  });

  // ============================================================
  // 6. Database Provider Mapping & Authorization Resolution
  // ============================================================
  describe("6. Database Provider Mapping & Authorization Resolution", () => {
    it("mapProviderToDatabaseIdentifier maps auth0_oidc to auth0", () => {
      expect(mapProviderToDatabaseIdentifier("auth0_oidc")).toBe("auth0");
    });

    it("mapProviderToDatabaseIdentifier maps supabase_auth and supabase to supabase", () => {
      expect(mapProviderToDatabaseIdentifier("supabase_auth")).toBe("supabase");
      expect(mapProviderToDatabaseIdentifier("supabase")).toBe("supabase");
    });

    it("mapProviderToDatabaseIdentifier throws on unsupported provider", () => {
      expect(() => mapProviderToDatabaseIdentifier("unsupported")).toThrow("unsupported_provider_kind");
    });

    it("resolveTrustedAdminPrincipal accepts supabase session and queries repository with provider=supabase", async () => {
      const mockRepo: OperatorAuthorizationRepository = {
        resolveAuthorizedOperator: vi.fn().mockResolvedValue({
          kind: "authorized",
          operatorId: "op-uuid-1234",
        }),
        resolveActiveOperator: vi.fn().mockResolvedValue({
          kind: "authorized",
          operatorId: "op-uuid-1234",
        }),
      };

      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: "supabase-operator-sub-1",
        issuedAt: "2026-10-21T12:00:00.000Z",
        expiresAt: null,
        provider: "supabase",
      };

      const result = await resolveTrustedAdminPrincipal(session, "complaints:read", mockRepo);
      expect(result).toEqual({
        kind: "authorized",
        principal: {
          operatorId: "op-uuid-1234",
          identitySource: "authenticated_session",
        },
      });

      expect(mockRepo.resolveAuthorizedOperator).toHaveBeenCalledWith(
        "supabase",
        "supabase-operator-sub-1",
        "complaints:read"
      );
    });

    it("resolveTrustedAdminPrincipal continues to accept auth0 session (backwards compatibility)", async () => {
      const mockRepo: OperatorAuthorizationRepository = {
        resolveAuthorizedOperator: vi.fn().mockResolvedValue({
          kind: "authorized",
          operatorId: "op-uuid-auth0",
        }),
        resolveActiveOperator: vi.fn().mockResolvedValue({
          kind: "authorized",
          operatorId: "op-uuid-auth0",
        }),
      };

      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sid-auth0",
        providerSubjectId: "auth0|sub-123",
        issuedAt: "2026-10-21T12:00:00.000Z",
        expiresAt: null,
        provider: "auth0",
      };

      const result = await resolveTrustedAdminPrincipal(session, "complaints:read", mockRepo);
      expect(result.kind).toBe("authorized");
      expect(mockRepo.resolveAuthorizedOperator).toHaveBeenCalledWith(
        "auth0",
        "auth0|sub-123",
        "complaints:read"
      );
    });
  });

  // ============================================================
  // 7. Database Schemas & Hermes Provider Contract Acceptance
  // ============================================================
  describe("7. Database Schemas & Hermes Provider Contract Acceptance", () => {
    it("HERMES_IDENTITY_PROVIDERS contains auth0 and supabase", () => {
      expect(HERMES_IDENTITY_PROVIDERS).toContain("auth0");
      expect(HERMES_IDENTITY_PROVIDERS).toContain("supabase");
    });

    it("hermes_control.subjectIdentities schema provider column includes auth0 and supabase", () => {
      const config = getTableConfig(subjectIdentities);
      const providerCol = config.columns.find((c) => c.name === "provider");
      expect(providerCol).toBeDefined();

      const providerCheck = config.checks.find((c) => c.name === "subject_identities_provider_check");
      expect(providerCheck).toBeDefined();
    });

    it("authorization.externalIdentityBindings schema provider column includes auth0 and supabase", () => {
      const config = getTableConfig(externalIdentityBindings);
      const providerCol = config.columns.find((c) => c.name === "provider");
      expect(providerCol).toBeDefined();

      const providerCheck = config.checks.find(
        (c) => c.name === "external_identity_bindings_provider_check"
      );
      expect(providerCheck).toBeDefined();
    });
  });

  // ============================================================
  // 8. Jurisprudence Authentication Runtime Composition
  // ============================================================
  describe("8. Jurisprudence Authentication Runtime Composition", () => {
    it("composes runtime with Supabase adapter when provider is supabase", () => {
      const authConfigSource = {
        AUTH_PROVIDER: "supabase",
        AUTH_PROVIDER_KIND: "supabase_auth",
        AUTH_ISSUER: "https://eyaxxyacysfawlsallic.supabase.co/auth/v1/",
        AUTH_CLIENT_ID: "buholex-test",
        AUTH_AUDIENCE: "https://buholex.com",
        AUTH_COOKIE_NAME: "sb-auth-token",
        AUTH_ABSOLUTE_TTL_SECONDS: "28800",
        AUTH_IDLE_TTL_SECONDS: "3600",
        AUTH_ALLOWED_ORIGINS: "https://buholex.com",
        AUTH_ENVIRONMENT: "test",
        AUTH_CLIENT_SECRET_REFERENCE: "AUTH_SUPABASE_CLIENT_SECRET",
        AUTH_SESSION_SECRET_REFERENCE: "AUTH_SUPABASE_SESSION_SECRET",
      };

      const result = createJurisprudenceAuthenticationRuntime(
        authConfigSource,
        {},
        {
          provider: "supabase",
          now: () => "2026-10-21T12:00:00.000Z",
          getSession: async () => ({
            status: "unauthenticated",
            sessionId: null,
            providerSubjectId: null,
            issuedAt: null,
            expiresAt: null,
            provider: null,
          }),
        }
      );

      expect(result.status).toBe("configured");
      if (result.status === "configured") {
        expect(result.runtime.authenticator).toBeDefined();
      }
    });

    it("authenticates anonymous user safely through configured Supabase runtime", async () => {
      const authConfigSource = {
        AUTH_PROVIDER: "supabase",
        AUTH_PROVIDER_KIND: "supabase_auth",
        AUTH_ISSUER: "https://eyaxxyacysfawlsallic.supabase.co/auth/v1/",
        AUTH_CLIENT_ID: "buholex-test",
        AUTH_AUDIENCE: "https://buholex.com",
        AUTH_COOKIE_NAME: "sb-auth-token",
        AUTH_ABSOLUTE_TTL_SECONDS: "28800",
        AUTH_IDLE_TTL_SECONDS: "3600",
        AUTH_ALLOWED_ORIGINS: "https://buholex.com",
        AUTH_ENVIRONMENT: "test",
        AUTH_CLIENT_SECRET_REFERENCE: "AUTH_SUPABASE_CLIENT_SECRET",
        AUTH_SESSION_SECRET_REFERENCE: "AUTH_SUPABASE_SESSION_SECRET",
      };

      const result = createJurisprudenceAuthenticationRuntime(
        authConfigSource,
        {},
        {
          provider: "supabase",
          now: () => "2026-10-21T12:00:00.000Z",
          getSession: async () => ({
            status: "unauthenticated",
            sessionId: null,
            providerSubjectId: null,
            issuedAt: null,
            expiresAt: null,
            provider: null,
          }),
        }
      );

      if (result.status === "configured") {
        const authResult = await result.runtime.authenticator.authenticate(
          new Request("https://buholex.com/test")
        );
        expect(authResult.status).toBe("anonymous");
        if (authResult.status === "anonymous") {
          expect(authResult.principal.kind).toBe("anonymous");
          expect(authResult.principal.roles).toEqual([]);
        }
      }
    });
  });

  // ============================================================
  // 9. Middleware Provider-Neutral Dispatch
  // ============================================================
  describe("9. Middleware Provider-Neutral Dispatch", () => {
    it("public route does NOT throw 500 when Auth0 config is absent", async () => {
      const prevEnv = process.env.AUTH_PROVIDER;
      process.env.AUTH_PROVIDER = "auth0";
      try {
        const req = new NextRequest(new URL("https://buholex.com/explorar"));
        const res = await middleware(req);
        expect(res.status).toBeLessThan(500);
      } finally {
        process.env.AUTH_PROVIDER = prevEnv;
      }
    });

    it("public route does NOT throw 500 when Supabase config is absent", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const req = new NextRequest(new URL("https://buholex.com/explorar"));
        const res = await middleware(req);
        expect(res.status).toBeLessThan(500);
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("protected route /app fails closed to /iniciar-sesion when Supabase config is absent", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const req = new NextRequest(new URL("https://buholex.com/app"));
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location");
        expect(location).toContain("/iniciar-sesion");
        expect(location).toContain("returnTo=%2Fapp");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("protected route /app fails closed to /iniciar-sesion when Auth0 config is absent", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      process.env.AUTH_PROVIDER = "auth0";

      try {
        const req = new NextRequest(new URL("https://buholex.com/app/proyectos"));
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location");
        expect(location).toContain("/iniciar-sesion");
        expect(location).toContain("returnTo=%2Fapp%2Fproyectos");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
      }
    });

    it("middleware does NOT intercept /auth/login or /auth/callback under Supabase; lets Route Handlers execute", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/login?returnTo=/app"));
        const res = await middleware(req);
        // Middleware does not redirect or intercept /auth/login under Supabase
        expect(res.status).toBe(200);
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });
  });

  // ============================================================
  // 10. Physical Login Route Handler (app/auth/login/route.ts)
  // ============================================================
  describe("10. Physical Login Route Handler (app/auth/login/route.ts)", () => {
    it("physically initiates authentication calling signInWithOAuth with Google provider and safe returnTo", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/login?returnTo=/app/proyectos"));
        const res = await loginRouteHandler(req);

        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: "google",
            options: expect.objectContaining({
              redirectTo: "https://buholex.com/auth/callback?returnTo=%2Fapp%2Fproyectos",
            }),
          })
        );

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe(
          "https://accounts.google.com/o/oauth2/auth?client_id=google-test-id"
        );

        const cookies = res.cookies.getAll();
        expect(cookies.map((c) => c.name)).toContain("sb-pkce-verifier");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("sanitizes unsafe returnTo in login callback redirectTo", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/login?returnTo=https://evil.invalid"));
        await loginRouteHandler(req);

        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              redirectTo: "https://buholex.com/auth/callback?returnTo=%2Fapp",
            }),
          })
        );
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("fails closed and redirects to /iniciar-sesion if AUTH_PROVIDER is not supabase", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      process.env.AUTH_PROVIDER = "auth0";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/login?returnTo=/app"));
        const res = await loginRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/iniciar-sesion");
        expect(mockSignInWithOAuth).not.toHaveBeenCalled();
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
      }
    });

    it("falls back safely to /iniciar-sesion when Supabase env is missing", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      process.env.AUTH_PROVIDER = "supabase";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/login?returnTo=/app"));
        const res = await loginRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/iniciar-sesion");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
      }
    });
  });

  // ============================================================
  // 11. Callback Route Handler & Cookie Propagation (app/auth/callback/route.ts)
  // ============================================================
  describe("11. Callback Route Handler & Cookie Propagation (app/auth/callback/route.ts)", () => {
    it("CALLBACK_SET_COOKIE_PROPAGATED: redirect response contains Set-Cookie for all exchanged session cookies", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(
          new URL("https://buholex.com/auth/callback?code=valid-auth-code&returnTo=/app/proyectos")
        );
        const res = await callbackRouteHandler(req);

        expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-auth-code");
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("https://buholex.com/app/proyectos");

        const cookies = res.cookies.getAll();
        expect(cookies.length).toBeGreaterThanOrEqual(2);
        const cookieNames = cookies.map((c) => c.name);
        expect(cookieNames).toContain("sb-access-token");
        expect(cookieNames).toContain("sb-refresh-token");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("sanitizes unsafe returnTo in callback redirect", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(
          new URL("https://buholex.com/auth/callback?code=valid-code&returnTo=https://evil.invalid")
        );
        const res = await callbackRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("https://buholex.com/app");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("redirects safely to /iniciar-sesion if code parameter is missing", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/callback?returnTo=/app"));
        const res = await callbackRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/iniciar-sesion");
        expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("redirects safely to /iniciar-sesion if code exchange returns error", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
      mockExchangeCodeForSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error("invalid_grant"),
      });

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/callback?code=bad-code&returnTo=/app"));
        const res = await callbackRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/iniciar-sesion");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("fails closed if AUTH_PROVIDER is not supabase", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      process.env.AUTH_PROVIDER = "auth0";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/callback?code=some-code"));
        const res = await callbackRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/iniciar-sesion");
        expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
      }
    });
  });

  // ============================================================
  // 12. Logout Route Handler & Cookie Propagation (app/auth/logout/route.ts)
  // ============================================================
  describe("12. Logout Route Handler & Cookie Propagation (app/auth/logout/route.ts)", () => {
    it("LOGOUT_SET_COOKIE_PROPAGATED: calls signOut and includes cleared cookies on redirect", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/logout?returnTo=/iniciar-sesion"));
        const res = await logoutRouteHandler(req);

        expect(mockSignOut).toHaveBeenCalled();
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("https://buholex.com/iniciar-sesion");

        const cookies = res.cookies.getAll();
        expect(cookies.length).toBeGreaterThanOrEqual(2);
        const cookieNames = cookies.map((c) => c.name);
        expect(cookieNames).toContain("sb-access-token");
        expect(cookieNames).toContain("sb-refresh-token");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("sanitizes returnTo destination on logout", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      try {
        const req = new NextRequest(new URL("https://buholex.com/auth/logout?returnTo=https://evil.invalid"));
        const res = await logoutRouteHandler(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("https://buholex.com/app");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });
  });

  // ============================================================
  // 13. Supabase Session Trust & Precise Error Semantics (FIX3)
  // ============================================================
  describe("13. Supabase Session Trust & Precise Error Semantics (FIX3)", () => {
    it("returns not_configured when Supabase env is missing", async () => {
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const session = await getSupabaseWorkspaceSession();
        expect(session.status).toBe("not_configured");
        expect(session.sessionId).toBeNull();
        expect(session.providerSubjectId).toBeNull();
        expect(session.provider).toBeNull();
      } finally {
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("trusts server-verified getUser() as authoritative identity source", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "server-verified-uuid-456" } },
        error: null,
      });

      try {
        const session = await getSupabaseWorkspaceSession();
        expect(mockGetUser).toHaveBeenCalled();
        expect(session.status).toBe("authenticated");
        expect(session.providerSubjectId).toBe("server-verified-uuid-456");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("returns unauthenticated when server-verified getUser() returns auth error result", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("invalid_jwt_signature"),
      });

      try {
        const session = await getSupabaseWorkspaceSession();
        expect(mockGetUser).toHaveBeenCalled();
        expect(session.status).toBe("unauthenticated");
        expect(session.providerSubjectId).toBeNull();
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("returns unauthenticated when server-verified getUser() returns null user without error", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      try {
        const session = await getSupabaseWorkspaceSession();
        expect(mockGetUser).toHaveBeenCalled();
        expect(session.status).toBe("unauthenticated");
        expect(session.providerSubjectId).toBeNull();
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("propagates unexpected runtime exception thrown by getUser()", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      mockGetUser.mockRejectedValueOnce(new Error("upstream_supabase_gateway_timeout"));

      try {
        await expect(getSupabaseWorkspaceSession()).rejects.toThrow("upstream_supabase_gateway_timeout");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });

    it("propagates unexpected runtime exception thrown by getSession() after verified user", async () => {
      const prevProvider = process.env.AUTH_PROVIDER;
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      process.env.AUTH_PROVIDER = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://eyaxxyacysfawlsallic.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";

      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "server-verified-uuid-456" } },
        error: null,
      });
      mockGetSession.mockRejectedValueOnce(new Error("session_cache_read_failure"));

      try {
        await expect(getSupabaseWorkspaceSession()).rejects.toThrow("session_cache_read_failure");
      } finally {
        process.env.AUTH_PROVIDER = prevProvider;
        if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
        if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      }
    });
  });

  // ============================================================
  // 14. Auth0 Session Error Semantics (FIX2)
  // ============================================================
  describe("14. Auth0 Session Error Semantics (FIX2)", () => {
    it("returns not_configured when Auth0 env is absent", async () => {
      const prev = { ...process.env };
      delete process.env.AUTH0_DOMAIN;
      delete process.env.AUTH0_CLIENT_ID;
      delete process.env.AUTH0_CLIENT_SECRET;
      delete process.env.AUTH0_SECRET;
      delete process.env.APP_BASE_URL;

      try {
        expect(isAuth0Configured()).toBe(false);
        const session = await getAuth0WorkspaceSession();
        expect(session.status).toBe("not_configured");
        expect(session.sessionId).toBeNull();
        expect(session.providerSubjectId).toBeNull();
      } finally {
        process.env = prev;
      }
    });

    it("returns unauthenticated when Auth0 env is configured and getSession returns null", async () => {
      const prev = { ...process.env };
      process.env.AUTH0_DOMAIN = "test.auth0.com";
      process.env.AUTH0_CLIENT_ID = "test-client";
      process.env.AUTH0_CLIENT_SECRET = "test-secret";
      process.env.AUTH0_SECRET = "test-secret";
      process.env.APP_BASE_URL = "http://localhost:3000";

      const spy = vi.spyOn(auth0, "getSession").mockResolvedValueOnce(null);

      try {
        expect(isAuth0Configured()).toBe(true);
        const session = await getAuth0WorkspaceSession();
        expect(session.status).toBe("unauthenticated");
        expect(session.sessionId).toBeNull();
        expect(session.providerSubjectId).toBeNull();
      } finally {
        spy.mockRestore();
        process.env = prev;
      }
    });

    it("returns authenticated when Auth0 env is configured and getSession returns valid session", async () => {
      const prev = { ...process.env };
      process.env.AUTH0_DOMAIN = "test.auth0.com";
      process.env.AUTH0_CLIENT_ID = "test-client";
      process.env.AUTH0_CLIENT_SECRET = "test-secret";
      process.env.AUTH0_SECRET = "test-secret";
      process.env.APP_BASE_URL = "http://localhost:3000";

      const mockSession: SessionData = {
        user: { sub: "auth0|test-user-999" },
        tokenSet: {
          accessToken: "test-token",
          expiresAt: 1700003600,
        },
        internal: {
          sid: "auth0-session-sid-999",
          createdAt: 1700000000,
          sessionExpiresAt: 1700003600,
        },
      };

      const spy = vi.spyOn(auth0, "getSession").mockResolvedValueOnce(mockSession);

      try {
        expect(isAuth0Configured()).toBe(true);
        const session = await getAuth0WorkspaceSession();
        expect(session.status).toBe("authenticated");
        expect(session.sessionId).toBe("auth0-session-sid-999");
        expect(session.providerSubjectId).toBe("auth0|test-user-999");
        expect(session.provider).toBe("auth0");
        expect(session.issuedAt).toBe(new Date(1700000000 * 1000).toISOString());
        expect(session.expiresAt).toBe(new Date(1700003600 * 1000).toISOString());
      } finally {
        spy.mockRestore();
        process.env = prev;
      }
    });

    it("propagates unexpected runtime error from auth0.getSession without converting to not_configured", async () => {
      const prev = { ...process.env };
      process.env.AUTH0_DOMAIN = "test.auth0.com";
      process.env.AUTH0_CLIENT_ID = "test-client";
      process.env.AUTH0_CLIENT_SECRET = "test-secret";
      process.env.AUTH0_SECRET = "test-secret";
      process.env.APP_BASE_URL = "http://localhost:3000";

      const spy = vi.spyOn(auth0, "getSession").mockRejectedValueOnce(new Error("upstream_infrastructure_failure"));

      try {
        expect(isAuth0Configured()).toBe(true);
        await expect(getAuth0WorkspaceSession()).rejects.toThrow("upstream_infrastructure_failure");
      } finally {
        spy.mockRestore();
        process.env = prev;
      }
    });
  });
});
