// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createJurisprudenceInterpretationRuntime } from "@/lib/jurisprudence/jurisprudence-interpretation-runtime";
import { createInterpretHandler, MAX_BODY_BYTES } from "@/lib/jurisprudence/jurisprudence-interpret-http-handler";
import type {
  JurisprudenceInterpretationRuntime,
  JurisprudenceInterpretationOrchestratorPort,
} from "@/lib/jurisprudence/jurisprudence-interpretation-runtime";
import type { JurisprudenceRateLimiterPort, JurisprudenceRateLimiterOutcome, RateLimiterConsumeInput } from "@/lib/security/jurisprudence-rate-limiter-port";
import type { JurisprudenceRateLimitConfig } from "@/lib/security/jurisprudence-rate-limiter-config";
import type { JurisprudenceInterpretationResult } from "@/lib/domain/services/jurisprudence-interpretation-orchestrator";
import type { JurisprudenceInterpretation } from "@/lib/hermes/contracts/jurisprudence-interpretation";

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

function createMockRuntime(overrides: {
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
    interpret: orchestratorInterpretSpy,
  };

  return {
    runtime: {
      orchestrator,
      rateLimiter,
      rateLimitConfig,
    },
    rateLimiterConsumeSpy,
    orchestratorInterpretSpy,
  };
}

function buildRequest(init: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
} = {}): Request {
  const method = init.method ?? "POST";
  const url = init.url ?? "https://buholex.com/api/jurisprudence/interpret";
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("content-type") && method === "POST") {
    headers.set("content-type", "application/json");
  }

  let body: BodyInit | undefined = undefined;
  if (init.rawBody !== undefined) {
    body = init.rawBody;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
  } else if (method === "POST") {
    body = JSON.stringify({
      recordId: "rec-valido-1",
      recordVersion: 1,
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

describe("Public Jurisprudence Interpretation Route (app/api/jurisprudence/interpret/route.ts)", () => {
  it("POST success with eligible source and valid interpretation", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      body: { recordId: "rec-valido-1", recordVersion: 1 },
      headers: { "x-request-id": "req-custom-trace-12345" },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("x-request-id")).toBe("req-custom-trace-12345");

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.recordId).toBe("rec-valido-1");
    expect(data.data.recordVersion).toBe(1);
    expect(data.data.interpretation).toEqual(validInterpretation);
    expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-valido-1", 1);
  });

  it("GET unsupported / no accidental GET implementation", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ method: "GET" });
    const res = await handler(req);
    expect(res.status).toBe(405);
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("malformed JSON -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      body: {
        recordId: "rec-1",
        recordVersion: 1,
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

  it("missing recordId -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { recordVersion: 1 } });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("blank recordId -> 400", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({ body: { recordId: "   ", recordVersion: 1 } });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_request_schema");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("recordVersion safe integer semantics: accepts positive safe integers (1, 42, MAX_SAFE_INTEGER)", async () => {
    for (const validVersion of [1, 42, Number.MAX_SAFE_INTEGER]) {
      const { runtime, orchestratorInterpretSpy } = createMockRuntime();
      const handler = createInterpretHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { recordId: "rec-1", recordVersion: validVersion } });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(orchestratorInterpretSpy).toHaveBeenCalledWith("rec-1", validVersion);
    }
  });

  it("recordVersion safe integer semantics: rejects invalid values (0, -1, 1.5, Infinity, >MAX_SAFE_INTEGER, string)", async () => {
    const invalidVersions = [
      0,
      -1,
      1.5,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
    ];

    for (const invalidVersion of invalidVersions) {
      const { runtime, orchestratorInterpretSpy } = createMockRuntime();
      const handler = createInterpretHandler({ runtimeFactory: () => runtime });

      const req = buildRequest({ body: { recordId: "rec-1", recordVersion: invalidVersion } });
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      headers: { "content-type": "text/plain" },
      rawBody: "recordId=1",
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const largePadding = "x".repeat(MAX_BODY_BYTES + 10);
    const req = buildRequest({
      rawBody: JSON.stringify({ recordId: "rec-1", recordVersion: 1, padding: largePadding }),
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const largePadding = "x".repeat(MAX_BODY_BYTES + 10);
    const bodyText = JSON.stringify({ recordId: "rec-1", recordVersion: 1, padding: largePadding });

    const headers = new Headers();
    headers.set("content-type", "application/json");
    // Ensure Content-Length is absent

    const req = new Request("https://buholex.com/api/jurisprudence/interpret", {
      method: "POST",
      headers,
      body: bodyText,
    });
    // Remove content-length header explicitly if runtime added it
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    // Case 1: Preview URL with attacker Origin and matching spoofed Host header
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

    // Case 2: localhost URL with foreign Origin and matching spoofed Host header
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest(); // no Origin header
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(orchestratorInterpretSpy).toHaveBeenCalled();
  });

  it("malformed origin -> 403", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime();
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest({
      headers: { origin: "not-a-valid-url" },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();
  });

  it("record absent -> nondisclosing 404", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "record_not_found" },
    });
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("record_not_found");
    expect(orchestratorInterpretSpy).toHaveBeenCalled();
  });

  it("version mismatch -> 409", async () => {
    const { runtime, orchestratorInterpretSpy } = createMockRuntime({
      orchestratorResult: { ok: false, code: "record_version_mismatch" },
    });
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("record_version_mismatch");
  });

  it("source too large -> 422", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "source_too_large" },
    });
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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

    // Verify rate limit order: global limiter was NOT called because subject blocked
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("300");
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("rate_limited");
    expect(orchestratorInterpretSpy).not.toHaveBeenCalled();

    // Both subject and global were invoked
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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("provider_failure");
    // Ensure no OpenAI or provider details leaked
    expect(JSON.stringify(data)).not.toMatch(/openai|gpt|sk-|model|prompt/i);
  });

  it("invalid interpretation -> 502", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "invalid_interpretation" },
    });
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("invalid_interpretation");
  });

  it("grounding failure -> 422", async () => {
    const { runtime } = createMockRuntime({
      orchestratorResult: { ok: false, code: "grounding_failed" },
    });
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

    const req = buildRequest();
    const res = await handler(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("grounding_failed");
  });

  it("unexpected internal exception -> safe 500", async () => {
    const { runtime } = createMockRuntime({
      throwInOrchestrator: true,
    });
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
    const handler = createInterpretHandler({ runtimeFactory: () => runtime });

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
