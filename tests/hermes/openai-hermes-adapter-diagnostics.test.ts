import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OpenAIHermesAdapter,
  type HermesProviderDiagnosticEvent,
  type HermesProviderDiagnosticLogger,
} from "../../lib/hermes/adapters/openai-hermes-adapter";
import type { OpenAIHermesConfig } from "../../lib/hermes/adapters/openai-hermes-config";
import type { HermesRequest } from "../../lib/hermes/contracts/hermes-envelope";
import { JurisprudenceInterpretationOrchestrator } from "../../lib/domain/services/jurisprudence-interpretation-orchestrator";
import type { JurisprudenceInterpretationSourcePort } from "../../lib/domain/repositories/jurisprudence-interpretation-source-port";

describe("OpenAI Hermes Adapter Diagnostics (HERMES-PROD-A1.10)", () => {
  const secretApiKey = "sk-test-secret-key-1234567890abcdef";
  const testConfig: OpenAIHermesConfig = {
    apiKey: secretApiKey,
    jurisprudenceModel: "gpt-model-test",
    timeoutMs: 30000,
  };

  const sampleRequest: HermesRequest = {
    messages: [
      {
        role: "system",
        content: "CONFIDENTIAL_SYSTEM_POLICY_PROMPT_DO_NOT_LEAK",
        classification: "TRUSTED_SYSTEM_POLICY",
      },
      {
        role: "user",
        content: "CONFIDENTIAL_USER_FULLTEXT_LEGAL_SOURCE_DO_NOT_LEAK",
        classification: "USER_PROVIDED_LEGAL_TEXT",
      },
    ],
    structuredOutputIntent: "buholex_jurisprudence_interpretation",
    metadata: {
      analysisId: "analysis-rec-777",
      locale: "es-PE",
    },
  };

  let capturedEvents: HermesProviderDiagnosticEvent[];
  let testLogger: HermesProviderDiagnosticLogger;

  beforeEach(() => {
    capturedEvents = [];
    testLogger = {
      log: (event: HermesProviderDiagnosticEvent) => {
        capturedEvents.push(event);
      },
    };
    vi.restoreAllMocks();
  });

  const FORBIDDEN_KEY_PATTERNS = [
    "authorization",
    "apikey",
    "api_key",
    "messages",
    "prompt",
    "fulltext",
    "full_text",
    "rawbody",
    "raw_body",
    "responsebody",
    "response_body",
    "databaseurl",
    "database_url",
    "secret",
  ];

  function isObject(val: unknown): val is Record<string, unknown> {
    return typeof val === "object" && val !== null;
  }

  function isHermesProviderDiagnosticEvent(val: unknown): val is HermesProviderDiagnosticEvent {
    if (!isObject(val)) return false;
    return (
      val.event === "hermes_provider_failure" &&
      val.provider === "openai" &&
      val.endpointKind === "chat_completions" &&
      typeof val.failureClass === "string" &&
      typeof val.model === "string" &&
      typeof val.timeout === "boolean" &&
      typeof val.elapsedMs === "number" &&
      val.retryCount === 0 &&
      typeof val.requestId === "string"
    );
  }

  function getSingleEvent(): HermesProviderDiagnosticEvent {
    expect(capturedEvents).toHaveLength(1);
    const event = capturedEvents[0];
    if (!event) {
      throw new Error("Expected diagnostic event to be present");
    }
    return event;
  }

  function assertDiagnosticSecurity(event: HermesProviderDiagnosticEvent) {
    const keys = Object.keys(event);
    for (const key of keys) {
      const lower = key.toLowerCase();
      for (const forbidden of FORBIDDEN_KEY_PATTERNS) {
        expect(lower).not.toContain(forbidden);
      }
    }

    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain(secretApiKey);
    expect(serialized).not.toContain("CONFIDENTIAL_SYSTEM_POLICY_PROMPT_DO_NOT_LEAK");
    expect(serialized).not.toContain("CONFIDENTIAL_USER_FULLTEXT_LEGAL_SOURCE_DO_NOT_LEAK");
    expect(event.retryCount).toBe(0);
    expect(event.provider).toBe("openai");
    expect(event.endpointKind).toBe("chat_completions");
  }

  // CASE 1: HTTP 500
  it("CASE 1: HTTP 500 -> diagnostic provider_http_5xx -> public provider_failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "x-request-id": "req-500-abc" }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("unavailable");
      expect(outcome.error.isRetryable).toBe(true);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_http_5xx");
    expect(event.upstreamStatus).toBe(500);
    expect(event.timeout).toBe(false);
    expect(event.model).toBe("gpt-model-test");
    expect(event.requestId).toBe("analysis-rec-777");
    expect(event.providerRequestId).toBe("req-500-abc");
    expect(event.retryCount).toBe(0);

    assertDiagnosticSecurity(event);
  });

  // CASE 2: HTTP 503
  it("CASE 2: HTTP 503 -> diagnostic provider_http_5xx -> public provider_failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ "x-request-id": "req-503-xyz" }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("unavailable");
      expect(outcome.error.isRetryable).toBe(true);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_http_5xx");
    expect(event.upstreamStatus).toBe(503);
    expect(event.timeout).toBe(false);
    expect(event.providerRequestId).toBe("req-503-xyz");

    assertDiagnosticSecurity(event);
  });

  // CASE 3: HTTP 429
  it("CASE 3: HTTP 429 -> diagnostic provider_http_429 -> public provider_failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "x-request-id": "req-429-lim" }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("rate_limited");
      expect(outcome.error.isRetryable).toBe(true);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_http_429");
    expect(event.upstreamStatus).toBe(429);
    expect(event.timeout).toBe(false);
    expect(event.providerRequestId).toBe("req-429-lim");

    assertDiagnosticSecurity(event);
  });

  // CASE 4: HTTP 403
  it("CASE 4: HTTP 403 -> diagnostic provider_http_403 -> public provider_failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "x-request-id": "req-403-forbid" }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("provider_rejected");
      expect(outcome.error.isRetryable).toBe(false);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_http_403");
    expect(event.upstreamStatus).toBe(403);
    expect(event.timeout).toBe(false);
    expect(event.providerRequestId).toBe("req-403-forbid");

    assertDiagnosticSecurity(event);
  });

  // Additional 4xx taxonomy cases
  it("HTTP 400, 401, 404, 409, 422 are distinguished into precise failure classes", async () => {
    const statusClassMap: Array<{ status: number; expectedClass: string }> = [
      { status: 400, expectedClass: "provider_http_400" },
      { status: 401, expectedClass: "provider_http_401" },
      { status: 404, expectedClass: "provider_http_404" },
      { status: 409, expectedClass: "provider_http_409" },
      { status: 422, expectedClass: "provider_http_422" },
    ];

    for (const { status, expectedClass } of statusClassMap) {
      capturedEvents = [];
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        headers: new Headers(),
      });

      const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
      const outcome = await adapter.generateStructuredOutput(sampleRequest);
      expect(outcome.ok).toBe(false);
      const event = getSingleEvent();
      expect(event.failureClass).toBe(expectedClass);
      expect(event.upstreamStatus).toBe(status);
      assertDiagnosticSecurity(event);
    }
  });

  // CASE 5: fetch rejects / network error
  it("CASE 5: fetch rejects/network error -> diagnostic provider_network_failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED - connection reset by peer"));

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("unavailable");
      expect(outcome.error.isRetryable).toBe(true);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_network_failure");
    expect(event.timeout).toBe(false);
    expect(event.upstreamStatus).toBeUndefined();
    expect(event.requestId).toBe("analysis-rec-777");

    assertDiagnosticSecurity(event);
  });

  // CASE 6: AbortError / timeout
  it("CASE 6: AbortError / timeout -> diagnostic provider_timeout", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(abortError);

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("timeout");
      expect(outcome.error.isRetryable).toBe(true);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_timeout");
    expect(event.timeout).toBe(true);
    expect(event.upstreamStatus).toBeUndefined();
    expect(event.requestId).toBe("analysis-rec-777");

    assertDiagnosticSecurity(event);
  });

  // CASE 7: HTTP 200 + invalid JSON
  it("CASE 7: HTTP 200 + invalid JSON -> provider_response_json_invalid", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "req-200-bad-json" }),
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON at position 0");
      },
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("invalid_output");
      expect(outcome.error.isRetryable).toBe(false);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_response_json_invalid");
    expect(event.upstreamStatus).toBe(200);
    expect(event.timeout).toBe(false);
    expect(event.providerRequestId).toBe("req-200-bad-json");

    assertDiagnosticSecurity(event);
  });

  // CASE 8: HTTP 200 + expected structured output missing
  it("CASE 8: HTTP 200 + expected structured output missing -> provider_structured_output_missing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "req-200-no-choices" }),
      json: async () => ({ choices: [] }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("invalid_output");
      expect(outcome.error.isRetryable).toBe(false);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_structured_output_missing");
    expect(event.upstreamStatus).toBe(200);
    expect(event.timeout).toBe(false);
    expect(event.providerRequestId).toBe("req-200-no-choices");

    assertDiagnosticSecurity(event);
  });

  // CASE 8b: HTTP 200 + payload content invalid JSON
  it("HTTP 200 + payload content invalid JSON -> provider_structured_output_invalid", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "req-200-corrupt-payload" }),
      json: async () => ({
        choices: [
          {
            message: {
              content: "{ corrupt json syntax not parseable",
            },
          },
        ],
      }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("invalid_output");
      expect(outcome.error.isRetryable).toBe(false);
    }

    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_structured_output_invalid");
    expect(event.upstreamStatus).toBe(200);
    expect(event.timeout).toBe(false);
    expect(event.providerRequestId).toBe("req-200-corrupt-payload");

    assertDiagnosticSecurity(event);
  });

  // CASE 9: HTTP 200 + valid structured result
  it("CASE 9: HTTP 200 + valid structured result -> PASS -> no failure diagnostic", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "req-200-ok" }),
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "sum",
                legalMatter: "matter",
              }),
            },
          },
        ],
      }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const outcome = await adapter.generateStructuredOutput(sampleRequest);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.payload).toEqual({
        summary: "sum",
        legalMatter: "matter",
      });
    }

    expect(capturedEvents).toHaveLength(0);
  });

  // SECTION 13 & 14: Orchestrator integration guarantees public provider_failure
  it("Orchestrator translates adapter failures to public provider_failure without leaking internals", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
    });

    const adapter = new OpenAIHermesAdapter(testConfig, testLogger);
    const mockRepo: JurisprudenceInterpretationSourcePort = {
      findById: vi.fn().mockResolvedValue({
        recordId: "analysis-rec-777",
        recordVersion: 1,
        caseNumber: "c1",
        resolutionNumber: "r1",
        institutionName: "inst",
        issuingBody: "body",
        issuedAt: "2024",
        fullText: "canonical text of legal precedent",
      }),
    };

    const orchestrator = new JurisprudenceInterpretationOrchestrator({
      hermesProvider: adapter,
      jurisprudenceRepository: mockRepo,
    });

    const result = await orchestrator.interpret("analysis-rec-777", 1);

    expect(result).toEqual({ ok: false, code: "provider_failure" });
    const event = getSingleEvent();
    expect(event.failureClass).toBe("provider_http_5xx");
  });

  // Default logger structured output test
  it("Default logger outputs single-line structured JSON to console.error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "x-request-id": "req-default-logger" }),
    });

    const adapter = new OpenAIHermesAdapter(testConfig);
    await adapter.generateStructuredOutput(sampleRequest);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const rawLogged = consoleErrorSpy.mock.calls[0]?.[0];
    expect(typeof rawLogged).toBe("string");
    if (typeof rawLogged !== "string") {
      throw new Error("Expected rawLogged to be string");
    }

    const parsed: unknown = JSON.parse(rawLogged);
    expect(isHermesProviderDiagnosticEvent(parsed)).toBe(true);
    if (!isHermesProviderDiagnosticEvent(parsed)) {
      throw new Error("Expected parsed JSON to be HermesProviderDiagnosticEvent");
    }

    expect(parsed.event).toBe("hermes_provider_failure");
    expect(parsed.failureClass).toBe("provider_http_5xx");
    expect(parsed.providerRequestId).toBe("req-default-logger");
    assertDiagnosticSecurity(parsed);

    consoleErrorSpy.mockRestore();
  });
});
