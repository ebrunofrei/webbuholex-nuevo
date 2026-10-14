// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createInterpretHandler, MAX_BODY_BYTES } from "@/lib/jurisprudence/jurisprudence-interpret-http-handler";
import type { WorkspaceSession } from "@/types/auth";
import type {
  JurisprudenceInterpretationRuntime,
  JurisprudenceInterpretationOrchestratorPort,
} from "@/lib/jurisprudence/jurisprudence-interpretation-runtime";
import type {
  HermesExecuteJurisprudenceInput,
  HermesRuntimeExecutionResult,
  HermesRuntimeExecutionServicePort,
} from "@/lib/hermes/runtime/hermes-runtime-execution-service";
import type { JurisprudenceRateLimiterPort, JurisprudenceRateLimiterOutcome, RateLimiterConsumeInput } from "@/lib/security/jurisprudence-rate-limiter-port";
import type { JurisprudenceRateLimitConfig } from "@/lib/security/jurisprudence-rate-limiter-config";
import type {
  JurisprudenceInterpretationResult,
  JurisprudencePreparationResult,
} from "@/lib/domain/services/jurisprudence-interpretation-orchestrator";
import type { JurisprudenceInterpretation } from "@/lib/hermes/contracts/jurisprudence-interpretation";
import type { ResolveCanonicalRecordBySlugResult } from "@/lib/jurisprudence/jurisprudence-public-slug-resolver";
import { jurisprudenceHttpInterpretRequestBodySchema } from "@/lib/schemas/jurisprudence-http";

const MOCK_HMAC_SECRET = "test-hmac-secret-at-least-32-chars-long";

const validInterpretation: JurisprudenceInterpretation = {
  summary: "Resumen jurídico de prueba sobre nulidad de acto administrativo.",
  legalMatter: "Derecho Administrativo",
  legalIssues: ["Determinación de competencia", "Debido procedimiento administrativo"],
  ratioDecidendi: {
    status: "identified",
    text: "El acto administrativo emitido por órgano incompetente adolece de nulidad absoluta.",
    support: [{
      quote: "El acto administrativo emitido por órgano incompetente es nulo de pleno derecho.",
      paragraphReference: "párrafo 14",
      pageReference: "pág. 5",
    }],
  },
  obiterDicta: [{
    text: "Las potestades sancionadoras deben observar el principio de legalidad de forma estricta.",
    support: [{
      quote: "La potestad sancionadora requiere habilitación legal previa.",
      paragraphReference: "párrafo 22",
      pageReference: "pág. 8",
    }],
  }],
  citedNorms: [{
    reference: "Artículo 10 de la Ley del Procedimiento Administrativo General",
    support: [{
      quote: "Son vicios del acto administrativo que causan su nulidad de pleno derecho...",
      paragraphReference: "párrafo 15",
      pageReference: "pág. 5",
    }],
  }],
  citedPrecedents: [{
    reference: "STC Exp. N° 00012-2024-AI/TC",
    support: [{
      quote: "Conforme a la doctrina sentada en la sentencia del Tribunal Constitucional...",
      paragraphReference: "párrafo 18",
      pageReference: "pág. 6",
    }],
  }],
  keyCriteria: ["Incompetencia material acarrea nulidad insubsanable"],
  scope: "Alcance vinculante respecto a procedimientos administrativos ordinarios.",
  limitations: "No aplica a regímenes especiales con regulación expresa diversa.",
  citations: [{
    quote: "El acto administrativo emitido por órgano incompetente es nulo de pleno derecho.",
    paragraphReference: "párrafo 14",
    pageReference: "pág. 5",
  }],
  verificationStatus: "machine_generated_unverified",
};

const defaultMockResolver = async (slug: unknown): Promise<ResolveCanonicalRecordBySlugResult> => {
  if (
    slug === "exp-00123-2024-aa-tc" ||
    slug === "slug-publico-valido" ||
    slug === "exp-valido-1" ||
    slug === "exp-case-5"
  ) {
    return {
      ok: true,
      value: {
        recordId: "rec-valido-1",
        recordVersion: 1,
      },
    };
  }
  return { ok: false, code: "not_found" };
};

function createMockRuntime(overrides: {
  executionResult?: HermesRuntimeExecutionResult;
  onExecutionServiceCall?: (input: HermesExecuteJurisprudenceInput) => void;
  throwInExecutionService?: boolean;
  orchestratorResult?: JurisprudenceInterpretationResult;
  subjectConsumeOutcome?: JurisprudenceRateLimiterOutcome;
  globalConsumeOutcome?: JurisprudenceRateLimiterOutcome;
  onOrchestratorCall?: (recordId: string, recordVersion: number) => void;
  onRateLimiterConsume?: (input: RateLimiterConsumeInput) => void;
  throwInOrchestrator?: boolean;
} = {}): {
  runtime: JurisprudenceInterpretationRuntime;
  rateLimiterConsumeSpy: ReturnType<typeof vi.fn>;
  orchestratorInterpretSpy: ReturnType<typeof vi.fn>;
  executionSpy: ReturnType<typeof vi.fn>;
} {
  const rateLimitConfig: JurisprudenceRateLimitConfig = {
    hmacSecret: MOCK_HMAC_SECRET,
    subjectMax: 5,
    subjectWindowSeconds: 60,
    globalMax: 60,
    globalWindowSeconds: 3600,
  };

  const rateLimiterConsumeSpy = vi.fn(async (input: RateLimiterConsumeInput): Promise<JurisprudenceRateLimiterOutcome> => {
    overrides.onRateLimiterConsume?.(input);
    if (input.scope === "subject") {
      return overrides.subjectConsumeOutcome ?? {
        allowed: true,
        requestCount: 1,
        remaining: 4,
        resetInSeconds: 60,
      };
    }
    return overrides.globalConsumeOutcome ?? {
      allowed: true,
      requestCount: 1,
      remaining: 59,
      resetInSeconds: 3600,
    };
  });

  const rateLimiter: JurisprudenceRateLimiterPort = {
    consume: rateLimiterConsumeSpy,
  };

  const orchestratorInterpretSpy = vi.fn(async (recordId: string, recordVersion: number): Promise<JurisprudenceInterpretationResult> => {
    overrides.onOrchestratorCall?.(recordId, recordVersion);
    if (overrides.throwInOrchestrator) {
      throw new Error("Unexpected database / orchestrator panic");
    }
    return overrides.orchestratorResult ?? {
      ok: true,
      interpretation: validInterpretation,
    };
  });

  const orchestrator: JurisprudenceInterpretationOrchestratorPort = {
    prepareInterpretation: vi.fn(async (recordId: string, recordVersion: number): Promise<JurisprudencePreparationResult> => {
      orchestratorInterpretSpy(recordId, recordVersion);
      return {
        ok: true,
        recordId,
        recordVersion,
        sourceText: "canonical text",
        request: {
          messages: [
            { role: "system", content: "sys policy", classification: "TRUSTED_SYSTEM_POLICY" },
            { role: "user", content: "user legal text", classification: "USER_PROVIDED_LEGAL_TEXT" },
          ],
          structuredOutputIntent: "buholex_jurisprudence_interpretation",
          metadata: { analysisId: recordId, locale: "es-PE" },
        },
      };
    }),
    validateGrounding: vi.fn(() => true),
  };

  const executionSpy = vi.fn(async (input: HermesExecuteJurisprudenceInput): Promise<HermesRuntimeExecutionResult> => {
    overrides.onExecutionServiceCall?.(input);
    if (overrides.throwInExecutionService) {
      throw new Error("Unexpected database / execution panic");
    }
    if (overrides.executionResult) {
      return overrides.executionResult;
    }
    const orchRes = await orchestratorInterpretSpy(input.recordId, input.recordVersion);
    if (!orchRes.ok) {
      if (orchRes.code === "provider_failure") {
        return { ok: false, code: "provider_transport_failure" };
      }
      if (orchRes.code === "invalid_interpretation") {
        return { ok: false, code: "validation_failure" };
      }
      if (orchRes.code === "grounding_failed") {
        return { ok: false, code: "grounding_failure" };
      }
      return { ok: false, code: orchRes.code };
    }
    return {
      ok: true,
      operationId: "mock-op-id",
      interpretation: orchRes.interpretation,
    };
  });

  const executionService: HermesRuntimeExecutionServicePort = {
    executeJurisprudenceInterpretation: executionSpy,
  };

  return {
    runtime: {
      executionService,
      orchestrator,
      rateLimiter,
      rateLimitConfig,
    },
    rateLimiterConsumeSpy,
    orchestratorInterpretSpy,
    executionSpy,
  };
}

function buildRequest(init: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
  omitIdempotencyKey?: boolean;
} = {}): Request {
  const method = init.method ?? "POST";
  const url = init.url ?? "https://buholex.com/api/jurisprudence/interpret";
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("content-type") && method === "POST") {
    headers.set("content-type", "application/json");
  }

  if (!headers.has("idempotency-key") && !init.omitIdempotencyKey) {
    headers.set("idempotency-key", "11111111-1111-4111-8111-111111111111");
  }

  let body: BodyInit | undefined = undefined;
  if (init.rawBody !== undefined) {
    body = init.rawBody;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
  } else if (method === "POST") {
    body = JSON.stringify({
      slug: "exp-00123-2024-aa-tc",
    });
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined) {
    requestInit.body = body;
  }

  return new Request(url, requestInit);
}

const mockAuthenticatedSession: WorkspaceSession = {
  status: "authenticated",
  sessionId: "test-session-id",
  providerSubjectId: "auth0|test-user-123",
  issuedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: null,
  provider: "auth0",
};

function createAuthenticatedHandler(overrides: {
  runtimeFactory?: () => JurisprudenceInterpretationRuntime;
  now?: () => string;
  generateRequestId?: () => string;
  getSession?: () => Promise<WorkspaceSession | null | undefined>;
  resolveCanonicalBySlug?: (slug: unknown) => Promise<ResolveCanonicalRecordBySlugResult>;
} = {}) {
  return createInterpretHandler({
    runtimeFactory: overrides.runtimeFactory,
    now: overrides.now,
    generateRequestId: overrides.generateRequestId,
    getSession: overrides.getSession ?? (async () => mockAuthenticatedSession),
    resolveCanonicalBySlug: overrides.resolveCanonicalBySlug ?? defaultMockResolver,
  });
}

describe("Public Jurisprudence Interpretation Route (app/api/jurisprudence/interpret/route.ts)", () => {
  it("POST success with eligible source and valid interpretation", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      body: { slug: "exp-00123-2024-aa-tc" },
      headers: { "x-request-id": "req-custom-trace-12345" },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("x-request-id")).toBe("req-custom-trace-12345");

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.slug).toBe("exp-00123-2024-aa-tc");
    expect("recordId" in data.data).toBe(false);
    expect("recordVersion" in data.data).toBe(false);
    expect(data.data.interpretation).toEqual(validInterpretation);
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  it("GET unsupported / no accidental GET implementation", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ method: "GET" });
    const res = await handler(req);
    expect(res.status).toBe(405);
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("malformed JSON -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ rawBody: "{ malformed json" });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("malformed_json");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("unknown field -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      body: {
        slug: "exp-00123-2024-aa-tc",
        fullText: "malicious injected text",
      },
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("missing slug -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: {} });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("blank slug -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { slug: "   " } });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("client cannot send canonical identifiers: recordId and recordVersion rejected -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    // Client sends recordId + recordVersion only
    const req1 = buildRequest({ body: { recordId: "rec-1", recordVersion: 1 } });
    const res1 = await handler(req1);
    expect(res1.status).toBe(400);
    const data1 = await res1.json();
    expect(data1.ok).toBe(false);
    expect(data1.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    // Client sends slug + recordId injection
    const req2 = buildRequest({ body: { slug: "exp-00123-2024-aa-tc", recordId: "rec-1" } });
    const res2 = await handler(req2);
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.ok).toBe(false);
    expect(data2.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    // Client sends slug + recordVersion injection
    const req3 = buildRequest({ body: { slug: "exp-00123-2024-aa-tc", recordVersion: 1 } });
    const res3 = await handler(req3);
    expect(res3.status).toBe(400);
    const data3 = await res3.json();
    expect(data3.ok).toBe(false);
    expect(data3.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("slug format validation rejects invalid values -> 400", async () => {
    const invalidSlugs = [
      "SLUG-MAYUSCULA",
      "slug_con_guion_bajo",
      "slug con espacios",
      "ab",
      "a".repeat(181),
      "--guiones-dobles",
      "-guion-inicial",
      "guion-final-",
      12345,
      true,
      [],
      {},
    ];

    for (const invalidSlug of invalidSlugs) {
      const { runtime, orchestratorInterpretSpy } = createMockRuntime();
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: invalidSlug } });
      const res = await handler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("invalid_request_schema");
      expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    }
  });

  it("unsupported media type -> 415", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      headers: { "content-type": "text/plain" },
      rawBody: "slug=test",
    });
    const res = await handler(req);
    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("unsupported_media_type");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("oversized body -> 413", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const largePadding = "x".repeat(MAX_BODY_BYTES + 10);
    const req = buildRequest({
      rawBody: JSON.stringify({ slug: "exp-00123-2024-aa-tc", padding: largePadding }),
    });
    const res = await handler(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("payload_too_large");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("oversized body without content-length header -> 413 on actual stream overflow", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const largePadding = "x".repeat(MAX_BODY_BYTES + 10);
    const bodyText = JSON.stringify({ slug: "exp-00123-2024-aa-tc", padding: largePadding });

    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("idempotency-key", "11111111-1111-4111-8111-111111111111");

    const req = new Request("https://buholex.com/api/jurisprudence/interpret", {
      method: "POST",
      headers,
      body: bodyText,
    });
    req.headers.delete("content-length");

    const res = await handler(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("payload_too_large");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("cross-origin browser request -> 403", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      url: "https://buholex.com/api/jurisprudence/interpret",
      headers: { origin: "https://evil-attacker.com" },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("origin_not_allowed");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("host spoofing regression: foreign Origin matching spoofed Host header must be rejected -> 403", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req1 = buildRequest({
      url: "https://buholex-preview.vercel.app/api/jurisprudence/interpret",
      headers: {
        origin: "https://evil.example",
        host: "evil.example",
      },
    });
    const res1 = await handler(req1);
    expect(res1.status).toBe(403);
    const data1 = await res1.json();
    expect(data1.ok).toBe(false);
    expect(data1.error.code).toBe("origin_not_allowed");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    const req2 = buildRequest({
      url: "http://localhost:3000/api/jurisprudence/interpret",
      headers: {
        origin: "https://attacker.example",
        host: "attacker.example",
      },
    });
    const res2 = await handler(req2);
    expect(res2.status).toBe(403);
    const data2 = await res2.json();
    expect(data2.ok).toBe(false);
    expect(data2.error.code).toBe("origin_not_allowed");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("valid same-origin HTTPS browser request -> 200 allowed", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      url: "https://buholex.com/api/jurisprudence/interpret",
      headers: { origin: "https://buholex.com" },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(orchestratorInterpretSpy).toHaveBeenCalled();
  });

  it("no-Origin direct client request -> 200 allowed through origin gate", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(orchestratorInterpretSpy).toHaveBeenCalled();
  });

  it("malformed origin -> 403", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      headers: { origin: "not-a-valid-url" },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("record absent -> nondisclosing 404 jurisprudence_not_found", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "record_not_found" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("jurisprudence_not_found");
    expect(orchestratorInterpretSpy).toHaveBeenCalled();
  });

  it("version mismatch -> 409 record_version_mismatch without canonical identifiers", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "record_version_mismatch" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("record_version_mismatch");
    expect(JSON.stringify(data)).not.toContain("rec-valido-1");
    expect(orchestratorInterpretSpy).toHaveBeenCalled();
  });

  it("source too large -> 422", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "source_too_large" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("source_too_large");
  });

  it("subject rate limit exceeded -> 429 with Retry-After", async () => {
    const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime({
      subjectConsumeOutcome: {
        allowed: false,
        requestCount: 6,
        retryAfterSeconds: 45,
        resetInSeconds: 45,
      },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      headers: { "x-real-ip": "203.0.113.195" },
    });
    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("45");
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("rate_limited");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    expect(rateLimiterConsumeSpy).toHaveBeenCalledTimes(1);
    const firstCall = rateLimiterConsumeSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (firstCall) {
      expect(firstCall[0].scope).toBe("subject");
    }
  });

  it("global rate limit exceeded -> 429 with Retry-After", async () => {
    const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime({
      subjectConsumeOutcome: {
        allowed: true,
        requestCount: 1,
        remaining: 4,
        resetInSeconds: 60,
      },
      globalConsumeOutcome: {
        allowed: false,
        requestCount: 61,
        retryAfterSeconds: 300,
        resetInSeconds: 300,
      },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("300");
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("rate_limited");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    expect(rateLimiterConsumeSpy).toHaveBeenCalledTimes(2);
    const firstCall = rateLimiterConsumeSpy.mock.calls[0];
    const secondCall = rateLimiterConsumeSpy.mock.calls[1];
    expect(firstCall).toBeDefined();
    expect(secondCall).toBeDefined();
    if (firstCall && secondCall) {
      expect(firstCall[0].scope).toBe("subject");
      expect(secondCall[0].scope).toBe("global");
    }
  });

  it("limiter failure -> 503 fail closed", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      subjectConsumeOutcome: {
        allowed: false,
        unavailable: true,
        reason: "limiter_unavailable",
      },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("limiter_unavailable");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("provider failure -> 502 safe neutral code", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "provider_failure" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("provider_failure");
    expect(JSON.stringify(data)).not.toMatch(/openai|gpt|sk-|model|prompt/i);
  });

  it("invalid interpretation -> 502", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "invalid_interpretation" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_interpretation");
  });

  it("grounding failure -> safe 502", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "grounding_failed" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("grounding_failed");
  });

  it("unexpected internal exception -> safe 500", async () => {
    const { runtime } = createMockRuntime({
      throwInOrchestrator: true,
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("unexpected_internal_failure");
    expect(JSON.stringify(data)).not.toMatch(/panic|stack|Database/i);
  });

  it("subject hash privacy: proves raw IP is hashed with HMAC-SHA256 (64-char lowercase hex) and never passed to limiter", async () => {
    let capturedSubjectHash: string | undefined;
    const { runtime } = createMockRuntime({
      onRateLimiterConsume: (input) => {
        if (input.scope === "subject") {
          capturedSubjectHash = input.subjectHash;
        }
      },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const rawIp = "198.51.100.42";
    const req = buildRequest({
      headers: { "x-real-ip": rawIp },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(capturedSubjectHash).toBeDefined();
    expect(capturedSubjectHash).not.toContain(rawIp);
    expect(capturedSubjectHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("HERMES-PROD-A2.1 Server-Side Auth Gate", () => {
  it("CASE 1: POST válido + sin sesión (unauthenticated) -> 401 authentication_required, provider calls = 0", async () => {
    const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime();
    const handler = createInterpretHandler({
      runtimeFactory: () => runtime,
      getSession: async () => ({
        status: "unauthenticated",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      }),
    });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toContain("application/json");

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "authentication_required",
        message: "Debes iniciar sesión para utilizar esta función.",
      },
    });

    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();
  });

  it("CASE 2: POST válido + sesión inválida/ausente (null, undefined, not_configured, loading) -> 401, provider calls = 0", async () => {
    const invalidSessions: (WorkspaceSession | null | undefined)[] = [
      null,
      undefined,
      {
        status: "not_configured",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      },
      {
        status: "loading",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      },
    ];

    for (const invalidSession of invalidSessions) {
      const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime();
      const handler = createInterpretHandler({
        runtimeFactory: () => runtime,
        getSession: async () => invalidSession,
      });

      const req = buildRequest();
      const res = await handler(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        error: {
          code: "authentication_required",
          message: "Debes iniciar sesión para utilizar esta función.",
        },
      });

      expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
      expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();
    }
  });

  it("CASE 3: sesión válida + payload inválido -> conserva error de validación correspondiente, provider calls = 0", async () => {
    const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    // 3a. Malformed JSON -> 400 malformed_json
    const reqMalformed = buildRequest({ rawBody: "{ invalid json string" });
    const resMalformed = await handler(reqMalformed);
    expect(resMalformed.status).toBe(400);
    const dataMalformed = await resMalformed.json();
    expect(dataMalformed.ok).toBe(false);
    expect(dataMalformed.error.code).toBe("malformed_json");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();

    // 3b. Missing slug -> 400 invalid_request_schema
    const reqMissing = buildRequest({ body: {} });
    const resMissing = await handler(reqMissing);
    expect(resMissing.status).toBe(400);
    const dataMissing = await resMissing.json();
    expect(dataMissing.ok).toBe(false);
    expect(dataMissing.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();

    // 3c. Blank slug -> 400 invalid_request_schema
    const reqBlank = buildRequest({ body: { slug: "   " } });
    const resBlank = await handler(reqBlank);
    expect(resBlank.status).toBe(400);
    const dataBlank = await resBlank.json();
    expect(dataBlank.ok).toBe(false);
    expect(dataBlank.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();

    // 3d. Unknown fields -> 400 invalid_request_schema
    const reqUnknown = buildRequest({
      body: { slug: "exp-00123-2024-aa-tc", extraInjection: "hack" },
    });
    const resUnknown = await handler(reqUnknown);
    expect(resUnknown.status).toBe(400);
    const dataUnknown = await resUnknown.json();
    expect(dataUnknown.ok).toBe(false);
    expect(dataUnknown.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();

    // 3e. Invalid slug format -> 400 invalid_request_schema
    const reqBadSlug = buildRequest({ body: { slug: "INVALID-SLUG-UPPERCASE" } });
    const resBadSlug = await handler(reqBadSlug);
    expect(resBadSlug.status).toBe(400);
    const dataBadSlug = await resBadSlug.json();
    expect(dataBadSlug.ok).toBe(false);
    expect(dataBadSlug.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();

    // 3f. Oversized body -> 413 payload_too_large
    const largePadding = "x".repeat(MAX_BODY_BYTES + 10);
    const reqOversized = buildRequest({
      rawBody: JSON.stringify({ slug: "exp-00123-2024-aa-tc", padding: largePadding }),
    });
    const resOversized = await handler(reqOversized);
    expect(resOversized.status).toBe(413);
    const dataOversized = await resOversized.json();
    expect(dataOversized.ok).toBe(false);
    expect(dataOversized.error.code).toBe("payload_too_large");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();
  });

  it("CASE 4: sesión válida + rate limit excedido -> conserva comportamiento actual, provider calls = 0", async () => {
    // 4a. Subject rate limit
    const { runtime: runtimeSub, orchestratorInterpretSpy: spySub } = createMockRuntime({
      subjectConsumeOutcome: {
        allowed: false,
        requestCount: 6,
        retryAfterSeconds: 60,
        resetInSeconds: 60,
      },
    });
    const handlerSub = createAuthenticatedHandler({ runtimeFactory: () => runtimeSub });
    const resSub = await handlerSub(buildRequest());
    expect(resSub.status).toBe(429);
    expect(resSub.headers.get("retry-after")).toBe("60");
    const dataSub = await resSub.json();
    expect(dataSub.ok).toBe(false);
    expect(dataSub.error.code).toBe("rate_limited");
    expect(spySub).not.toHaveBeenCalled();

    // 4b. Global rate limit
    const { runtime: runtimeGlob, orchestratorInterpretSpy: spyGlob } = createMockRuntime({
      globalConsumeOutcome: {
        allowed: false,
        requestCount: 61,
        retryAfterSeconds: 120,
        resetInSeconds: 120,
      },
    });
    const handlerGlob = createAuthenticatedHandler({ runtimeFactory: () => runtimeGlob });
    const resGlob = await handlerGlob(buildRequest());
    expect(resGlob.status).toBe(429);
    expect(resGlob.headers.get("retry-after")).toBe("120");
    const dataGlob = await resGlob.json();
    expect(dataGlob.ok).toBe(false);
    expect(dataGlob.error.code).toBe("rate_limited");
    expect(spyGlob).not.toHaveBeenCalled();
  });

  it("CASE 5: sesión válida + request válido + provider success mock -> conserva HTTP 200 / ok true", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      body: { slug: "exp-00123-2024-aa-tc" },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.slug).toBe("exp-00123-2024-aa-tc");
    expect("recordId" in data.data).toBe(false);
    expect("recordVersion" in data.data).toBe(false);
    expect(data.data.interpretation).toEqual(validInterpretation);
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  it("CASE 6: sesión válida + provider failure mock -> conserva public provider_failure contract", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "provider_failure" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(502);

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "provider_failure",
        message: "El proveedor de análisis presentó una falla temporal.",
      },
    });
    expect(orchestratorInterpretSpy).toHaveBeenCalled();

    const text = JSON.stringify(data);
    expect(text).not.toMatch(/openai|gpt|sk-|model|prompt|adapter|timeout/i);
  });

  it("CASE 7: 401 response: NO filtra session/claims/token/cookies/secrets", async () => {
    const { runtime } = createMockRuntime();
    const handler = createInterpretHandler({
      runtimeFactory: () => runtime,
      getSession: async () => ({
        status: "unauthenticated",
        sessionId: "secret-sid-do-not-leak-12345",
        providerSubjectId: "auth0|secret-sub-do-not-leak",
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-02T00:00:00.000Z",
        provider: "auth0",
      }),
    });

    const req = buildRequest({
      headers: {
        cookie: "appSession=super_secret_cookie_token_987654321",
        authorization: "Bearer secret_bearer_token_abcdef",
      },
    });
    const res = await handler(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "authentication_required",
        message: "Debes iniciar sesión para utilizar esta función.",
      },
    });

    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("set-cookie")).toBeNull();

    const serializedBody = JSON.stringify(data);
    expect(serializedBody).not.toContain("secret-sid-do-not-leak-12345");
    expect(serializedBody).not.toContain("secret-sub-do-not-leak");
    expect(serializedBody).not.toContain("super_secret_cookie_token");
    expect(serializedBody).not.toContain("secret_bearer_token");
    expect(serializedBody).not.toMatch(/auth0|cookie|token|bearer|claim|issuer|tenant|domain|stack/i);
  });

  it("CASE 8: authentication resolver throws unexpectedly -> fail closed -> NO provider call -> respuesta pública segura", async () => {
    const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime();
    const handler = createInterpretHandler({
      runtimeFactory: () => runtime,
      getSession: async () => {
        throw new Error("CRITICAL_INTERNAL_AUTH0_CONNECTION_FAILED: secret-key-in-stack-trace");
      },
    });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "unexpected_internal_failure",
        message: "Ocurrió un error inesperado al procesar la solicitud.",
      },
    });

    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("CRITICAL_INTERNAL_AUTH0_CONNECTION_FAILED");
    expect(serialized).not.toContain("secret-key-in-stack-trace");
    expect(serialized).not.toMatch(/stack|panic|Auth0/i);
  });

  it("ORDER CHECK: unauthenticated request is rejected at auth gate BEFORE body reading / zod parsing", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({
      runtimeFactory: () => runtime,
      getSession: async () => ({
        status: "unauthenticated",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      }),
    });

    const req = buildRequest({ rawBody: "{ broken json" });
    const res = await handler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("authentication_required");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });
});

describe("HERMES-PROD-A2.3 Client Slug → Public Resolver → Canonical Record → Hermes", () => {
  // CASE 1: anonymous + valid slug -> 401 authentication_required, resolver calls = 0, orchestrator calls = 0
  it("CASE 1: anonymous + valid slug -> 401 authentication_required, resolver calls = 0, orchestrator calls = 0", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);
    const handler = createInterpretHandler({
      runtimeFactory: () => runtime,
      getSession: async () => ({
        status: "unauthenticated",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      }),
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("authentication_required");
    expect(resolverSpy).not.toHaveBeenCalled();
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  // CASE 2: authenticated + valid slug -> resolver returns canonical pair -> orchestrator called once with resolved recordId + recordVersion -> HTTP 200
  it("CASE 2: authenticated + valid slug -> resolver returns canonical pair -> orchestrator called once with resolved recordId + recordVersion -> HTTP 200", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const resolverSpy = vi.fn(async (slug: unknown): Promise<ResolveCanonicalRecordBySlugResult> => {
      if (slug === "exp-case-2-valid") {
        return {
          ok: true,
          value: {
            recordId: "canonical-rec-002",
            recordVersion: 3,
          },
        };
      }
      return { ok: false, code: "not_found" };
    });

    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({ body: { slug: "exp-case-2-valid" } });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.slug).toBe("exp-case-2-valid");
    expect("recordId" in data.data).toBe(false);
    expect("recordVersion" in data.data).toBe(false);
    expect(resolverSpy).toHaveBeenCalledWith("exp-case-2-valid");
    expect(orchestratorInterpretSpy).toHaveBeenCalledTimes(1);
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("canonical-rec-002", 3);
  });

  // CASE 3: authenticated + client sends recordId + recordVersion only -> 400, resolver calls = 0, orchestrator calls = 0
  it("CASE 3: authenticated + client sends recordId + recordVersion only -> 400, resolver calls = 0, orchestrator calls = 0", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);
    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({
      body: {
        recordId: "rec-canonical-001",
        recordVersion: 1,
      },
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(resolverSpy).not.toHaveBeenCalled();
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  // CASE 4: authenticated + slug + recordId/version injection -> 400 strict-schema rejection, resolver calls = 0, orchestrator calls = 0
  it("CASE 4: authenticated + slug + recordId/version injection -> 400 strict-schema rejection, resolver calls = 0, orchestrator calls = 0", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);
    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({
      body: {
        slug: "exp-00123-2024-aa-tc",
        recordId: "rec-injected-id",
        recordVersion: 99,
      },
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(resolverSpy).not.toHaveBeenCalled();
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  // CASE 5: authenticated + invalid slug -> 400, resolver/orchestrator = 0
  it("CASE 5: authenticated + invalid slug -> 400, resolver/orchestrator = 0", async () => {
    const invalidSlugs = [
      "",
      "   ",
      "SLUG-MAYUSCULA",
      "slug_con_guiones_bajos",
      "ab",
      "slug/con/slashes",
      "slug con espacios",
      null,
      12345,
      [],
      {},
    ];

    for (const invalidSlug of invalidSlugs) {
      const { runtime, orchestratorInterpretSpy } = createMockRuntime();
      const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);
      const handler = createAuthenticatedHandler({
        runtimeFactory: () => runtime,
        resolveCanonicalBySlug: resolverSpy,
      });

      const req = buildRequest({ body: { slug: invalidSlug } });
      const res = await handler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("invalid_request_schema");
      expect(resolverSpy).not.toHaveBeenCalled();
      expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
    }
  });

  // CASE 6: authenticated + non-existing/unpublished/withdrawn slug -> resolver returns not_found -> HTTP 404 jurisprudence_not_found, orchestrator = 0, rate limiter NOT consumed
  it("CASE 6: authenticated + non-existing/unpublished/withdrawn slug -> resolver returns not_found -> HTTP 404 jurisprudence_not_found, orchestrator = 0, rate limiter NOT consumed", async () => {
    const { runtime, orchestratorInterpretSpy, rateLimiterConsumeSpy } = createMockRuntime();
    const resolverSpy = vi.fn(async (): Promise<ResolveCanonicalRecordBySlugResult> => {
      return { ok: false, code: "not_found" };
    });

    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({ body: { slug: "exp-no-publicado-o-retirado" } });
    const res = await handler(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "jurisprudence_not_found",
        message: "No se encontró una resolución pública disponible para análisis.",
      },
    });

    expect(resolverSpy).toHaveBeenCalledWith("exp-no-publicado-o-retirado");
    expect(rateLimiterConsumeSpy).not.toHaveBeenCalled();
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  // CASE 7: authenticated + resolver throws -> safe 500, orchestrator = 0, no secret/DB/SQL leakage
  it("CASE 7: authenticated + resolver throws -> safe 500, orchestrator = 0, no secret/DB/SQL leakage", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const resolverSpy = vi.fn(async () => {
      throw new Error("PG::ConnectionFailure: postgres://user:super_secret_db_pass@postgres-primary:5432/buholex_db SELECT * FROM jurisprudence_public.published_records");
    });

    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "unexpected_internal_failure",
        message: "Ocurrió un error inesperado al procesar la solicitud.",
      },
    });

    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    const text = JSON.stringify(data);
    expect(text).not.toContain("super_secret_db_pass");
    expect(text).not.toContain("postgres-primary");
    expect(text).not.toContain("published_records");
    expect(text).not.toMatch(/postgres|sql|select|stack|ConnectionFailure/i);
  });

  // CASE 8: authenticated + valid slug + subject rate limited -> resolver succeeds, 429, orchestrator = 0
  it("CASE 8: authenticated + valid slug + subject rate limited -> resolver succeeds, 429, orchestrator = 0", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      subjectConsumeOutcome: {
        allowed: false,
        requestCount: 6,
        retryAfterSeconds: 45,
        resetInSeconds: 45,
      },
    });
    const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);

    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("45");
    const data = await res.json();
    expect(data.error.code).toBe("rate_limited");
    expect(resolverSpy).toHaveBeenCalledWith("exp-00123-2024-aa-tc");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  // CASE 9: authenticated + valid slug + global rate limited -> resolver succeeds, 429, orchestrator = 0
  it("CASE 9: authenticated + valid slug + global rate limited -> resolver succeeds, 429, orchestrator = 0", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      subjectConsumeOutcome: {
        allowed: true,
        requestCount: 1,
        remaining: 4,
        resetInSeconds: 60,
      },
      globalConsumeOutcome: {
        allowed: false,
        requestCount: 61,
        retryAfterSeconds: 120,
        resetInSeconds: 120,
      },
    });
    const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);

    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    const data = await res.json();
    expect(data.error.code).toBe("rate_limited");
    expect(resolverSpy).toHaveBeenCalledWith("exp-00123-2024-aa-tc");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  // CASE 10: authenticated + valid slug + provider success mock -> public response success, no recordId/recordVersion exposed
  it("CASE 10: authenticated + valid slug + provider success mock -> public response success, no recordId/recordVersion exposed", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.slug).toBe("exp-00123-2024-aa-tc");
    expect(data.data.interpretation).toEqual(validInterpretation);

    // Verify recordId and recordVersion are completely absent
    expect("recordId" in data.data).toBe(false);
    expect("recordVersion" in data.data).toBe(false);
    expect("id" in data.data).toBe(false);
    expect(Object.keys(data.data).sort()).toEqual(["interpretation", "slug"].sort());

    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  // CASE 11: authenticated + valid slug + provider_failure -> existing 502 provider_failure contract preserved
  it("CASE 11: authenticated + valid slug + provider_failure -> existing 502 provider_failure contract preserved", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "provider_failure" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(502);

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "provider_failure",
        message: "El proveedor de análisis presentó una falla temporal.",
      },
    });
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  // CASE 12: authenticated + valid slug + grounding_failed -> existing grounding failure contract preserved
  it("CASE 12: authenticated + valid slug + grounding_failed -> existing grounding failure contract preserved", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "grounding_failed" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(502);

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "grounding_failed",
        message: "La interpretación no pudo ser respaldada con citas exactas del texto canónico.",
      },
    });
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  // CASE 13: authenticated + valid slug + record_version_mismatch from orchestrator -> preserve safe existing failure semantics (409), do not expose canonical identifiers
  it("CASE 13: authenticated + valid slug + record_version_mismatch from orchestrator -> preserve safe existing failure semantics (409), do not expose canonical identifiers", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "record_version_mismatch" },
    });
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(409);

    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      error: {
        code: "record_version_mismatch",
        message: "La versión del registro solicitada no coincide con la versión canónica actual.",
      },
    });

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("rec-valido-1");
    expect(serialized).not.toContain("recordVersion");
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  // CASE 14: no-Origin direct authenticated client -> remains subject to auth -> if authenticated and otherwise valid, normal path may proceed
  it("CASE 14: no-Origin direct authenticated client -> remains subject to auth -> normal path proceeds", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      headers: {}, // No Origin header
      body: { slug: "exp-00123-2024-aa-tc" },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.slug).toBe("exp-00123-2024-aa-tc");
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  // CASE 15: cross-origin authenticated browser request -> 403 before resolver DB query
  it("CASE 15: cross-origin authenticated browser request -> 403 before resolver DB query", async () => {
    const { runtime } = createMockRuntime();
    const resolverSpy = vi.fn().mockImplementation(defaultMockResolver);
    const handler = createAuthenticatedHandler({
      runtimeFactory: () => runtime,
      resolveCanonicalBySlug: resolverSpy,
    });

    const req = buildRequest({
      url: "https://buholex.com/api/jurisprudence/interpret",
      headers: { origin: "https://evil-attacker.com" },
      body: { slug: "exp-00123-2024-aa-tc" },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe("origin_not_allowed");
    expect(resolverSpy).not.toHaveBeenCalled();
  });

  // CASE 16: response serialization regression: serialized response contains neither "recordId" nor "recordVersion"
  it("CASE 16: response serialization regression: serialized response contains neither 'recordId' nor 'recordVersion'", async () => {
    const { runtime } = createMockRuntime();
    const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
    const res = await handler(req);
    expect(res.status).toBe(200);

    const rawJsonText = await res.text();
    expect(rawJsonText).not.toContain("recordId");
    expect(rawJsonText).not.toContain("recordVersion");
    expect(rawJsonText).not.toContain("rec-valido-1");
  });

  // CASE 17: source-level regression: HTTP body schema contains slug and rejects canonical IDs
  it("CASE 17: source-level regression: HTTP body schema contains slug and rejects canonical IDs", () => {
    // 1. Valid slug only -> succeeds
    const validResult = jurisprudenceHttpInterpretRequestBodySchema.safeParse({
      slug: "exp-00123-2024-aa-tc",
    });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.slug).toBe("exp-00123-2024-aa-tc");
    }

    // 2. Client sends canonical pair only -> rejected
    const canonicalOnlyResult = jurisprudenceHttpInterpretRequestBodySchema.safeParse({
      recordId: "rec-canonical-001",
      recordVersion: 1,
    });
    expect(canonicalOnlyResult.success).toBe(false);

    // 3. Client sends slug + recordId -> rejected by strict
    const injectedRecordIdResult = jurisprudenceHttpInterpretRequestBodySchema.safeParse({
      slug: "exp-00123-2024-aa-tc",
      recordId: "rec-canonical-001",
    });
    expect(injectedRecordIdResult.success).toBe(false);

    // 4. Client sends slug + recordVersion -> rejected by strict
    const injectedVersionResult = jurisprudenceHttpInterpretRequestBodySchema.safeParse({
      slug: "exp-00123-2024-aa-tc",
      recordVersion: 1,
    });
    expect(injectedVersionResult.success).toBe(false);

    // 5. Schema shape inspection: keys must be exclusively 'slug'
    const schemaShapeKeys = Object.keys(jurisprudenceHttpInterpretRequestBodySchema.shape);
    expect(schemaShapeKeys).toEqual(["slug"]);
  });

  describe("HERMES-PROD-A3.6 HTTP Boundary & Control Mappings", () => {
    it("missing Idempotency-Key -> 400 idempotency_key_required", async () => {
      const { runtime, executionSpy } = createMockRuntime();
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({
        body: { slug: "exp-00123-2024-aa-tc" },
        omitIdempotencyKey: true,
      });

      const res = await handler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("idempotency_key_required");
      expect(executionSpy).not.toHaveBeenCalled();
    });

    it("malformed Idempotency-Key -> 400 idempotency_key_invalid", async () => {
      const { runtime, executionSpy } = createMockRuntime();
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({
        body: { slug: "exp-00123-2024-aa-tc" },
        headers: { "idempotency-key": "not-a-valid-uuid-string" },
      });

      const res = await handler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("idempotency_key_invalid");
      expect(executionSpy).not.toHaveBeenCalled();
    });

    it("whitespace-padded Idempotency-Key -> 400 idempotency_key_invalid", async () => {
      const { runtime, executionSpy } = createMockRuntime();
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({
        body: { slug: "exp-00123-2024-aa-tc" },
      });
      const origGet = req.headers.get.bind(req.headers);
      req.headers.get = (name: string) => {
        if (name.toLowerCase() === "idempotency-key") {
          return " 11111111-1111-4111-8111-111111111111 ";
        }
        return origGet(name);
      };

      const res = await handler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("idempotency_key_invalid");
      expect(executionSpy).not.toHaveBeenCalled();
    });

    it("valid UUID preserved exactly without normalization", async () => {
      const { runtime, executionSpy } = createMockRuntime();
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const testKey = "22222222-2222-4222-8222-222222222222";
      const req = buildRequest({
        body: { slug: "exp-00123-2024-aa-tc" },
        headers: { "idempotency-key": testKey },
      });

      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(executionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: testKey,
        })
      );
    });

    it("entitlement denial -> 403 feature_not_entitled / account_inactive", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "feature_not_entitled" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("feature_not_entitled");
    });

    it("quota exhausted -> 429 quota_exhausted", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "quota_exhausted", requestedUnits: 1, monthlyQuota: 50 },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("quota_exhausted");
    });

    it("document conflict -> 409 active_document_conflict", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "active_document_conflict" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("active_document_conflict");
    });

    it("already in progress / duplicate in flight -> 409 duplicate_in_flight", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "duplicate_in_flight" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("duplicate_in_flight");
    });

    it("capacity/daily limits -> 429 concurrency_capacity_exceeded", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "concurrency_capacity_exceeded" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("concurrency_limit_exceeded");
    });

    it("validation failure -> safe 502 invalid_interpretation", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "validation_failure" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("invalid_interpretation");
    });

    it("grounding failure -> safe 502 grounding_failed", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "grounding_failure" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("grounding_failed");
    });

    it("finalization unavailable -> safe 503 usage_control_unavailable", async () => {
      const { runtime } = createMockRuntime({
        executionResult: {
          ok: false,
          code: "finalization_unavailable",
          operationId: "mock-op-123",
          targetStatus: "outcome_unknown",
          providerOutcomeKnown: false,
        },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("usage_control_unavailable");
    });

    it("control unavailable -> 503 control_unavailable", async () => {
      const { runtime } = createMockRuntime({
        executionResult: { ok: false, code: "control_unavailable" },
      });
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("usage_control_unavailable");
    });

    it("successful analysis -> 200 with Cache-Control no-store and no sensitive internal fields", async () => {
      const { runtime } = createMockRuntime();
      const handler = createAuthenticatedHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { slug: "exp-00123-2024-aa-tc" } });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toContain("no-store");

      const bodyText = await res.text();
      expect(bodyText).not.toContain("11111111-1111-4111-8111-111111111111");
      expect(bodyText).not.toContain("mock-op-id");
      expect(bodyText).not.toContain("auth0|test-user-123");
    });
  });
});
