import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleJurisprudencePublicationExecutionPost } from "@/lib/jurisprudence/jurisprudence-publication-execution-http-handler";
import * as configModule from "@/lib/jurisprudence/jurisprudence-publication-execution-config";
import * as authRuntimeModule from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import * as executionRuntimeModule from "@/lib/jurisprudence/jurisprudence-publication-execution-runtime";
import * as authPolicyModule from "@/lib/jurisprudence-authorization-policy";
import * as authConfigModule from "@/lib/authentication-configuration";
import { JurisprudencePublicationExecutionError } from "@/lib/jurisprudence-publication-execution-repository";
import { randomUUID } from "node:crypto";
import type { JurisprudencePrincipal, JurisprudenceAuthenticator } from "@/types/jurisprudence-security";
import type { JurisprudencePublicationExecutionView, JurisprudencePublicationExecutionService } from "@/types/jurisprudence-publication-execution";
import type { JurisprudenceAuthenticationRuntimeResult } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import type { JurisprudencePublicationExecutionRuntimeContainer } from "@/lib/jurisprudence/jurisprudence-publication-execution-runtime";
import type { AuthenticationConfiguration } from "@/types/authentication-configuration";

type NodeRequestInit = RequestInit & { duplex?: "half" };
vi.mock("@/lib/jurisprudence/jurisprudence-publication-execution-config", () => ({
  isJurisprudencePublicationExecutionEnabled: vi.fn()
}));

vi.mock("@/lib/jurisprudence/jurisprudence-authentication-runtime", () => ({
  createJurisprudenceAuthenticationRuntime: vi.fn()
}));

vi.mock("@/lib/jurisprudence/jurisprudence-publication-execution-runtime", () => ({
  createJurisprudencePublicationExecutionRuntime: vi.fn()
}));

vi.mock("@/lib/jurisprudence-authorization-policy", () => ({
  hasJurisprudencePermission: vi.fn(),
  validateJurisprudencePrincipal: vi.fn(),
  isJurisprudencePrincipalExpired: vi.fn()
}));

vi.mock("@/lib/authentication-configuration", () => ({
  loadAuthenticationConfiguration: vi.fn()
}));

describe("Jurisprudence Publication Execution HTTP Handler", () => {
  let mockAuthenticate: ReturnType<typeof vi.fn>;
  let mockAuthClose: ReturnType<typeof vi.fn>;
  let mockExecutePublication: ReturnType<typeof vi.fn>;
  let mockExecutionClose: ReturnType<typeof vi.fn>;
  let mockPrincipal: JurisprudencePrincipal | null;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.AUTH_ALLOWED_ORIGINS = "https://example.com,https://admin.example.com";
    process.env.AUTH_PROVIDER_KIND = "auth0_oidc";
    process.env.AUTH_ISSUER = "https://example.com";
    process.env.AUTH_CLIENT_ID = "cid";
    process.env.AUTH_AUDIENCE = "aud";
    process.env.AUTH_COOKIE_NAME = "cookie";
    process.env.AUTH_ABSOLUTE_TTL_SECONDS = "3600";
    process.env.AUTH_IDLE_TTL_SECONDS = "1800";
    process.env.AUTH_ENVIRONMENT = "test";
    process.env.AUTH_CLIENT_SECRET_REFERENCE = "secret";
    process.env.AUTH_SESSION_SECRET_REFERENCE = "secret";

    mockPrincipal = {
      kind: "human",
      subjectId: "auth0|test-publisher",
      roles: ["jurisprudence_publisher"],
      authenticationLevel: "authenticated",
      issuedAt: new Date().toISOString()
    };

    mockAuthenticate = vi.fn().mockImplementation(async () => {
      if (!mockPrincipal) return { status: "rejected", reason: "invalid_credentials" };
      return { status: "authenticated", principal: mockPrincipal };
    });
    mockAuthClose = vi.fn().mockResolvedValue(undefined);

    vi.mocked(configModule.isJurisprudencePublicationExecutionEnabled).mockReturnValue(true);

    vi.mocked(authRuntimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValue({
      status: "configured",
      runtime: {
        authenticator: {
          authenticate: mockAuthenticate as unknown as JurisprudenceAuthenticator["authenticate"]
        },
        close: mockAuthClose as unknown as () => Promise<void>
      }
    } as JurisprudenceAuthenticationRuntimeResult);

    mockExecutePublication = vi.fn().mockResolvedValue({
      publicationExecuted: true,
      current: true
    } as unknown as JurisprudencePublicationExecutionView);
    mockExecutionClose = vi.fn().mockResolvedValue(undefined);

    vi.mocked(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).mockReturnValue({
      service: {
        executePublication: mockExecutePublication as unknown as JurisprudencePublicationExecutionService["executePublication"]
      },
      close: mockExecutionClose as unknown as () => Promise<void>
    } as JurisprudencePublicationExecutionRuntimeContainer);

    vi.mocked(authPolicyModule.validateJurisprudencePrincipal).mockReturnValue(true);
    vi.mocked(authPolicyModule.isJurisprudencePrincipalExpired).mockReturnValue(false);
    vi.mocked(authPolicyModule.hasJurisprudencePermission).mockReturnValue(true);

    vi.mocked(authConfigModule.loadAuthenticationConfiguration).mockReturnValue({
      status: "configured_for_test",
      allowedOrigins: ["https://example.com", "https://admin.example.com"]
    } as unknown as AuthenticationConfiguration);
  });

  const validPayload = {
    recordId: "record-123",
    expectedRecordVersion: 2,
    editorialCaseId: "case-ed-123",
    publicationDossierId: "dossier-123",
    authorizationCaseId: "case-auth-123",
    idempotencyKey: "idem-123"
  };

  const createRequest = (payload: unknown = validPayload, headers: Record<string, string> = {}) => {
    const reqHeaders = new Headers(headers);
    if (!reqHeaders.has("content-type")) {
      reqHeaders.set("content-type", "application/json");
    }
    if (!reqHeaders.has("origin")) {
      reqHeaders.set("origin", "https://example.com");
    }
    if (payload instanceof ReadableStream) {
      return new Request("https://example.com/api/admin/jurisprudence/publication/execution", {
        method: "POST",
        headers: reqHeaders,
        body: payload,
        duplex: "half"
      } as NodeRequestInit);
    }
    const bodyStr = payload ? JSON.stringify(payload) : "";
    if (payload && !reqHeaders.has("content-length")) {
      reqHeaders.set("content-length", bodyStr.length.toString());
    }
    return new Request("https://example.com/api/admin/jurisprudence/publication/execution", {
      method: "POST",
      headers: reqHeaders,
      body: bodyStr || null
    });
  };

  it("1. auth runtime not configured returns 503", async () => {
    vi.mocked(authRuntimeModule.createJurisprudenceAuthenticationRuntime).mockReturnValue({ status: "not_configured" } as JurisprudenceAuthenticationRuntimeResult);
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("1b. AUTH_RUNTIME_FACTORY_THROW_SAFE", async () => {
    vi.mocked(authRuntimeModule.createJurisprudenceAuthenticationRuntime).mockImplementation(() => {
      throw new Error("SECRET_TOKEN_123_DO_NOT_LEAK");
    });
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(JSON.stringify(data)).not.toContain("SECRET_TOKEN");
    expect(configModule.isJurisprudencePublicationExecutionEnabled).not.toHaveBeenCalled();
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
  });

  it("2. unauthenticated denied before feature gate observability", async () => {
    mockPrincipal = null;
    vi.mocked(configModule.isJurisprudencePublicationExecutionEnabled).mockImplementation(() => {
      throw new Error("Gate checked before auth!");
    });
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(401);
  });

  it("3. rejected identity denied", async () => {
    mockAuthenticate.mockResolvedValue({ status: "rejected", reason: "invalid_credentials" });
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(401);
  });

  it("4. non-human denied", async () => {
    mockPrincipal = { ...mockPrincipal!, kind: "service" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(401);
  });

  it("5. expired/invalid principal denied", async () => {
    vi.mocked(authPolicyModule.isJurisprudencePrincipalExpired).mockReturnValue(true);
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(401);
  });

  it("6. zero roles denied (missing jurisprudence_publisher)", async () => {
    mockPrincipal = { ...mockPrincipal!, roles: [] };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(403);
  });

  it("7. canonical permission denied", async () => {
    vi.mocked(authPolicyModule.hasJurisprudencePermission).mockReturnValue(false);
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(403);
  });

  it("8. foreign origin denied", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(validPayload, { origin: "https://evil.com" }));
    expect(response.status).toBe(403);
  });

  it("8b. malformed origin denied", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(validPayload, { origin: "ftp://example.com" }));
    expect(response.status).toBe(403);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
  });

  it("9. null origin denied", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(validPayload, { origin: "null" }));
    expect(response.status).toBe(403);
  });

  it("9b. missing origin denied (fail closed policy)", async () => {
    const reqHeaders = new Headers({ "content-type": "application/json" });
    const req = new Request("https://example.com/api/admin/jurisprudence/publication/execution", {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(validPayload)
    });
    const response = await handleJurisprudencePublicationExecutionPost(req);
    expect(response.status).toBe(403);
  });

  it("10. feature gate absent", async () => {
    vi.mocked(configModule.isJurisprudencePublicationExecutionEnabled).mockImplementation(() => {
      throw new Error("Missing env var");
    });
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(503);
  });

  it("11. feature gate false", async () => {
    vi.mocked(configModule.isJurisprudencePublicationExecutionEnabled).mockReturnValue(false);
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(503);
  });

  it("13. unsupported content type", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(validPayload, { "content-type": "text/plain" }));
    expect(response.status).toBe(415);
  });

  it("14. oversized declared body", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(validPayload, { "content-length": "1000000" }));
    expect(response.status).toBe(413);
  });

  it("15. oversized undeclared/chunked body", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(70000));
        controller.close();
      }
    });
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(stream, { "content-length": "" }));
    expect(response.status).toBe(413);
  });

  it("16. malformed JSON", async () => {
    const req = new Request("https://example.com/api/admin/jurisprudence/publication/execution", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.com" },
      body: "{"
    });
    const response = await handleJurisprudencePublicationExecutionPost(req);
    expect(response.status).toBe(400);
  });

  it("17. missing fields", async () => {
    const payload = { recordId: "123" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
  });

  it("18. unknown field", async () => {
    const payload = { ...validPayload, unexpected: "foo" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
  });

  it("19. context rejected (strict schema)", async () => {
    const payload = { ...validPayload, context: {} };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
  });

  it("20. actorReference rejected", async () => {
    const payload = { ...validPayload, actorReference: "foo" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
  });

  it("20a. principal rejected", async () => {
    const payload = { ...validPayload, principal: "foo" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("20b. roles rejected", async () => {
    const payload = { ...validPayload, roles: [] };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("20c. permissions rejected", async () => {
    const payload = { ...validPayload, permissions: [] };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("20d. providerSubjectId rejected", async () => {
    const payload = { ...validPayload, providerSubjectId: "foo" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("20e. roleVersion rejected", async () => {
    const payload = { ...validPayload, roleVersion: 1 };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("20f. requestId rejected", async () => {
    const payload = { ...validPayload, requestId: "123" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("20g. requestedAt rejected", async () => {
    const payload = { ...validPayload, requestedAt: "2024-01-01" };
    const response = await handleJurisprudencePublicationExecutionPost(createRequest(payload));
    expect(response.status).toBe(400);
    expect(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).not.toHaveBeenCalled();
    expect(mockExecutePublication).not.toHaveBeenCalled();
  });

  it("23. valid execution reaches runtime once", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(201);
    expect(mockExecutePublication).toHaveBeenCalledTimes(1);
  });

  it("24-27. correct server context generation and exact idempotency key", async () => {
    await handleJurisprudencePublicationExecutionPost(createRequest());
    const call = mockExecutePublication.mock.calls[0]?.[0];
    expect(call.context.actorReference).toBe("auth0|test-publisher");
    expect(call.context.requestId).toBeDefined();
    expect(call.context.requestedAt).toBeDefined();
    expect(call.idempotencyKey).toBe("idem-123");
  });

  it("28. successful execution uses the uniform 201 mapping because replay is not distinguishable at the HTTP handler boundary", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(201);
  });

  it("29. idempotency conflict real mapping", async () => {
    mockExecutePublication.mockRejectedValue(new JurisprudencePublicationExecutionError("IDEMPOTENCY_CONFLICT", "Conflict"));
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("30. safe business failure (422)", async () => {
    mockExecutePublication.mockRejectedValue(new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "Invalid"));
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error.code).toBe("UNPROCESSABLE_ENTITY");
  });

  it("31. execution factory throw safe", async () => {
    vi.mocked(executionRuntimeModule.createJurisprudencePublicationExecutionRuntime).mockImplementation(() => {
      throw new Error("Factory boom");
    });
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(500);
  });

  it("32. unexpected failure safe", async () => {
    mockExecutePublication.mockRejectedValue(new Error("Database boom DB_URL=secret"));
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.message).toBeUndefined();
  });

  it("33-35. close behavior", async () => {
    mockExecutionClose.mockRejectedValue(new Error("Close failed"));
    mockAuthClose.mockRejectedValue(new Error("Close failed"));
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.status).toBe(201);
    expect(mockAuthClose).toHaveBeenCalledTimes(1);
    expect(mockExecutionClose).toHaveBeenCalledTimes(1);
  });

  it("37. no-store response", async () => {
    const response = await handleJurisprudencePublicationExecutionPost(createRequest());
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
