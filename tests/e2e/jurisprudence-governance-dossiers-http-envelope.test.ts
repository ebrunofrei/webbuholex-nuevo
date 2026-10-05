import { describe, expect, it, vi, beforeAll } from "vitest";
import { handleJurisprudenceGovernanceDossierCommandsPost } from "@/lib/jurisprudence/jurisprudence-governance-http-handler";
import type { JurisprudenceAuthenticationRuntimeResult } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import type { JurisprudenceAuthenticationResult } from "@/types/jurisprudence-security";
import * as runtimeModule from "@/lib/jurisprudence/jurisprudence-governance-runtime";
import type { PublicationDossierView, SynchronizePublicationDossierCommand, EvaluatePublicationDossierCommand } from "@/types/jurisprudence-publication-governance";
import { randomUUID } from "node:crypto";

vi.mock("@/lib/jurisprudence/jurisprudence-governance-runtime", () => ({
  createJurisprudenceGovernanceRuntime: vi.fn()
}));

function createAuthFactory(result: JurisprudenceAuthenticationResult | Error) {
  return (): JurisprudenceAuthenticationRuntimeResult => {
    if (result instanceof Error) throw result;
    return {
      status: "configured",
      runtime: {
        authenticator: { authenticate: async () => result },
        close: async () => {},
      },
    };
  };
}

const authorizedPrincipal = {
  kind: "human",
  subjectId: "auth0|test-editor",
  roles: ["jurisprudence_editor"],
  authenticationLevel: "authenticated",
  issuedAt: new Date(Date.now() - 10000).toISOString(),
  expiresAt: new Date(Date.now() + 100000).toISOString(),
} as const;

function createMockService() {
  return {
    registerSource: vi.fn(),
    bindSource: vi.fn(),
    supersedeSourceBinding: vi.fn(),
    openDossier: vi.fn(),
    assessProvenance: vi.fn(),
    assessIntegrity: vi.fn(),
    assessRights: vi.fn(),
    assessPrivacy: vi.fn(),
    assessPublicProjection: vi.fn(),
    evaluateDossier: vi.fn<(input: EvaluatePublicationDossierCommand) => Promise<PublicationDossierView>>(),
    synchronizeDossier: vi.fn<(input: SynchronizePublicationDossierCommand) => Promise<PublicationDossierView>>(),
    closeDossier: vi.fn(),
    getDossier: vi.fn(),
    getHistory: vi.fn(),
    close: vi.fn(),
  };
}

describe("Governance Dossier Commands - HTTP Envelope Fix", () => {
  const origin = "http://localhost:3000";

  beforeAll(() => {
    process.env.AUTH_PROVIDER_KIND = "auth0_oidc";
    process.env.AUTH_ISSUER = "https://example.com/";
    process.env.AUTH_CLIENT_ID = "client_id";
    process.env.AUTH_AUDIENCE = "audience";
    process.env.AUTH_COOKIE_NAME = "test_cookie_name";
    process.env.AUTH_ABSOLUTE_TTL_SECONDS = "3600";
    process.env.AUTH_IDLE_TTL_SECONDS = "1800";
    process.env.AUTH_ALLOWED_ORIGINS = origin;
    process.env.AUTH_ENVIRONMENT = "test";
    process.env.AUTH_CLIENT_SECRET_REFERENCE = "SECRET";
    process.env.AUTH_SESSION_SECRET_REFERENCE = "SECRET";
  });

  const dependencies = {
    createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: authorizedPrincipal })
  };

  it("A, B, C, D, G: Valid synchronize_dossier with server context injection", async () => {
    const mockService = createMockService();
    mockService.synchronizeDossier = vi.fn().mockResolvedValue({ status: "success" });
    vi.mocked(runtimeModule.createJurisprudenceGovernanceRuntime).mockReturnValue({
      service: mockService,
      close: async () => {}
    });

    const clientPayload = {
      action: "synchronize_dossier",
      dossierId: "eb6b7057-e8eb-4226-8d24-edc5e1e41a82",
      expectedDossierVersion: 36,
      idempotencyKey: "sync-" + randomUUID(),
      // D. Attempt to override context
      context: {
        requestId: "fake-req",
        actorReference: "fake-actor",
        requestedAt: "1999-01-01T00:00:00.000Z"
      }
    };

    const request = new Request("https://api.example.com/dossiers/commands", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload)
    });

    const response = await handleJurisprudenceGovernanceDossierCommandsPost(request, dependencies);
    expect(response.status).toBe(201);

    // A. Passes HTTP validation
    const body = await response.json();
    expect(body.success).toBe(true);

    expect(mockService.synchronizeDossier).toHaveBeenCalledTimes(1);
    const domainCommand = mockService.synchronizeDossier.mock.calls[0]?.[0];
    if (!domainCommand) throw new Error("No domainCommand");

    // C. Action is stripped
    expect(domainCommand).not.toHaveProperty("action");

    // B. Server injects fields correctly
    // G. Auth0-style actorReference remains valid (auth0|test-editor)
    expect(domainCommand.context.actorReference).toBe("auth0|test-editor");
    expect(domainCommand.context.requestId).not.toBe("fake-req");
    expect(domainCommand.context.requestedAt).not.toBe("1999-01-01T00:00:00.000Z");
  });

  it("E. Invalid synchronize body still returns 400", async () => {
    const request = new Request("https://api.example.com/dossiers/commands", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "synchronize_dossier",
        dossierId: "eb6b7057-e8eb-4226-8d24-edc5e1e41a82",
        // missing expectedDossierVersion and idempotencyKey
      })
    });

    const response = await handleJurisprudenceGovernanceDossierCommandsPost(request, dependencies);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("F. Existing actions remain functional (e.g. evaluate_dossier)", async () => {
    const mockService = createMockService();
    mockService.evaluateDossier = vi.fn().mockResolvedValue({ status: "success" });
    vi.mocked(runtimeModule.createJurisprudenceGovernanceRuntime).mockReturnValue({
      service: mockService,
      close: async () => {}
    });

    const clientPayload = {
      action: "evaluate_dossier",
      dossierId: "eb6b7057-e8eb-4226-8d24-edc5e1e41a82",
      expectedRecordVersion: 1,
      expectedDossierVersion: 36,
      idempotencyKey: "eval-" + randomUUID(),
    };

    const request = new Request("https://api.example.com/dossiers/commands", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload)
    });

    const response = await handleJurisprudenceGovernanceDossierCommandsPost(request, dependencies);
    expect(response.status).toBe(201);
    const domainCommand = mockService.evaluateDossier.mock.calls[0]?.[0];
    if (!domainCommand) throw new Error("No domainCommand");
    expect(domainCommand.dossierId).toBe("eb6b7057-e8eb-4226-8d24-edc5e1e41a82");
    expect(domainCommand.context.actorReference).toBe("auth0|test-editor");
  });
});
