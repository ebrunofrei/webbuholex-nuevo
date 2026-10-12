import type { HermesProviderPort } from "../contracts/hermes-provider-port";
import type { HermesRequest, HermesProviderOutcome } from "../contracts/hermes-envelope";
import { jurisprudenceInterpretationSchema } from "../contracts/jurisprudence-interpretation";
import { owlLegalAnalysisResultSchema } from "../../owl/contracts/owl-analysis.schemas";
import type { OpenAIHermesConfig } from "./openai-hermes-config";
import { toJSONSchema } from "zod";

export type HermesProviderFailureClass =
  | "provider_timeout"
  | "provider_network_failure"
  | "provider_http_400"
  | "provider_http_401"
  | "provider_http_403"
  | "provider_http_404"
  | "provider_http_409"
  | "provider_http_422"
  | "provider_http_429"
  | "provider_http_5xx"
  | "provider_response_json_invalid"
  | "provider_structured_output_missing"
  | "provider_structured_output_invalid"
  | "provider_unknown_failure";

export interface HermesProviderDiagnosticEvent {
  readonly event: "hermes_provider_failure";
  readonly provider: "openai";
  readonly endpointKind: "chat_completions";
  readonly failureClass: HermesProviderFailureClass;
  readonly model: string;
  readonly upstreamStatus?: number;
  readonly timeout: boolean;
  readonly elapsedMs: number;
  readonly retryCount: 0;
  readonly requestId: string;
  readonly providerRequestId?: string;
}

export interface HermesProviderDiagnosticLogger {
  log(event: HermesProviderDiagnosticEvent): void;
}

export const defaultHermesProviderDiagnosticLogger: HermesProviderDiagnosticLogger = {
  log(event: HermesProviderDiagnosticEvent): void {
    console.error(JSON.stringify(event));
  }
};

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

function isOpenAIResponse(data: unknown): data is OpenAIResponse {
  if (typeof data !== "object" || data === null) return false;
  if (!("choices" in data) || !Array.isArray(data.choices) || data.choices.length === 0) return false;
  const choice = data.choices[0];
  if (typeof choice !== "object" || choice === null) return false;
  if (!("message" in choice) || typeof choice.message !== "object" || choice.message === null) return false;
  const msg = choice.message;
  return "content" in msg && typeof msg.content === "string";
}

function mapUpstreamStatusToFailureClass(status: number): HermesProviderFailureClass {
  if (status === 400) return "provider_http_400";
  if (status === 401) return "provider_http_401";
  if (status === 403) return "provider_http_403";
  if (status === 404) return "provider_http_404";
  if (status === 409) return "provider_http_409";
  if (status === 422) return "provider_http_422";
  if (status === 429) return "provider_http_429";
  if (status >= 500 && status < 600) return "provider_http_5xx";
  return "provider_unknown_failure";
}

export class OpenAIHermesAdapter implements HermesProviderPort {
  private readonly logger: HermesProviderDiagnosticLogger;

  constructor(
    private readonly config: OpenAIHermesConfig,
    logger?: HermesProviderDiagnosticLogger
  ) {
    this.logger = logger ?? defaultHermesProviderDiagnosticLogger;
  }

  private emitDiagnostic(event: HermesProviderDiagnosticEvent): void {
    try {
      this.logger.log(event);
    } catch {
      // Diagnostic logging must never fail caller execution
    }
  }

  async generateStructuredOutput(request: HermesRequest): Promise<HermesProviderOutcome> {
    const startTime = performance.now();
    const requestId = request.metadata.analysisId;

    let schemaObject: unknown;
    let modelName: string;

    // Exhaustive dispatch
    switch (request.structuredOutputIntent) {
      case "buholex_jurisprudence_interpretation":
        schemaObject = toJSONSchema(jurisprudenceInterpretationSchema, { io: "input" });
        modelName = this.config.jurisprudenceModel;
        break;
      case "owl_legal_analysis_result":
        schemaObject = toJSONSchema(owlLegalAnalysisResultSchema, { io: "input" });
        modelName = this.config.owlModel || this.config.jurisprudenceModel;
        break;
      default: {
        const exhaustiveCheck: never = request.structuredOutputIntent;
        throw new Error(`Unmapped intent: ${exhaustiveCheck}`);
      }
    }

    if (!this.config.apiKey) {
      const elapsedMs = Math.max(0, Math.round(performance.now() - startTime));
      this.emitDiagnostic({
        event: "hermes_provider_failure",
        provider: "openai",
        endpointKind: "chat_completions",
        failureClass: "provider_unknown_failure",
        model: modelName,
        timeout: false,
        elapsedMs,
        retryCount: 0,
        requestId,
      });
      return {
        ok: false,
        error: { code: "unknown_provider_failure", isRetryable: false }
      };
    }

    const controller = new AbortController();
    let isTimeout = false;
    const timeoutId = setTimeout(() => {
      isTimeout = true;
      controller.abort();
    }, this.config.timeoutMs);

    // Map exact 2 messages explicitly
    const systemMessage = request.messages[0];
    const userMessage = request.messages[1];

    const providerMessages = [
      { role: "system" as const, content: systemMessage.content },
      { role: "user" as const, content: userMessage.content }
    ];

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: providerMessages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: request.structuredOutputIntent,
              strict: true,
              schema: schemaObject
            }
          }
        })
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const elapsedMs = Math.max(0, Math.round(performance.now() - startTime));
      const isAbort = (error instanceof Error && error.name === "AbortError") || isTimeout;
      if (isAbort) {
        this.emitDiagnostic({
          event: "hermes_provider_failure",
          provider: "openai",
          endpointKind: "chat_completions",
          failureClass: "provider_timeout",
          model: modelName,
          timeout: true,
          elapsedMs,
          retryCount: 0,
          requestId,
        });
        return { ok: false, error: { code: "timeout", isRetryable: true } };
      }
      this.emitDiagnostic({
        event: "hermes_provider_failure",
        provider: "openai",
        endpointKind: "chat_completions",
        failureClass: "provider_network_failure",
        model: modelName,
        timeout: false,
        elapsedMs,
        retryCount: 0,
        requestId,
      });
      return {
        ok: false,
        error: { code: "unavailable", isRetryable: true }
      };
    }

    clearTimeout(timeoutId);

    const providerRequestId =
      typeof response.headers?.get === "function"
        ? response.headers.get("x-request-id") || undefined
        : undefined;

    if (!response.ok) {
      const elapsedMs = Math.max(0, Math.round(performance.now() - startTime));
      const failureClass = mapUpstreamStatusToFailureClass(response.status);

      this.emitDiagnostic({
        event: "hermes_provider_failure",
        provider: "openai",
        endpointKind: "chat_completions",
        failureClass,
        model: modelName,
        upstreamStatus: response.status,
        timeout: false,
        elapsedMs,
        retryCount: 0,
        requestId,
        ...(providerRequestId ? { providerRequestId } : {}),
      });

      if (response.status === 429) {
        return { ok: false, error: { code: "rate_limited", isRetryable: true } };
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: { code: "provider_rejected", isRetryable: false } };
      }
      if (response.status >= 500) {
        return { ok: false, error: { code: "unavailable", isRetryable: true } };
      }
      return { ok: false, error: { code: "unavailable", isRetryable: true } };
    }

    let externalData: unknown;
    try {
      externalData = await response.json();
    } catch {
      const elapsedMs = Math.max(0, Math.round(performance.now() - startTime));
      this.emitDiagnostic({
        event: "hermes_provider_failure",
        provider: "openai",
        endpointKind: "chat_completions",
        failureClass: "provider_response_json_invalid",
        model: modelName,
        upstreamStatus: response.status,
        timeout: false,
        elapsedMs,
        retryCount: 0,
        requestId,
        ...(providerRequestId ? { providerRequestId } : {}),
      });
      return { ok: false, error: { code: "invalid_output", isRetryable: false } };
    }

    if (!isOpenAIResponse(externalData)) {
      const elapsedMs = Math.max(0, Math.round(performance.now() - startTime));
      this.emitDiagnostic({
        event: "hermes_provider_failure",
        provider: "openai",
        endpointKind: "chat_completions",
        failureClass: "provider_structured_output_missing",
        model: modelName,
        upstreamStatus: response.status,
        timeout: false,
        elapsedMs,
        retryCount: 0,
        requestId,
        ...(providerRequestId ? { providerRequestId } : {}),
      });
      return { ok: false, error: { code: "invalid_output", isRetryable: false } };
    }

    const rawContent = externalData.choices[0]?.message.content ?? "";

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawContent);
    } catch {
      const elapsedMs = Math.max(0, Math.round(performance.now() - startTime));
      this.emitDiagnostic({
        event: "hermes_provider_failure",
        provider: "openai",
        endpointKind: "chat_completions",
        failureClass: "provider_structured_output_invalid",
        model: modelName,
        upstreamStatus: response.status,
        timeout: false,
        elapsedMs,
        retryCount: 0,
        requestId,
        ...(providerRequestId ? { providerRequestId } : {}),
      });
      return { ok: false, error: { code: "invalid_output", isRetryable: false } };
    }

    return {
      ok: true,
      payload: parsedPayload
    };
  }
}
