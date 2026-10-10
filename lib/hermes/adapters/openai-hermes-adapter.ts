import type { HermesProviderPort } from "../contracts/hermes-provider-port";
import type { HermesRequest, HermesProviderOutcome } from "../contracts/hermes-envelope";
import { jurisprudenceInterpretationSchema } from "../contracts/jurisprudence-interpretation";
import { owlLegalAnalysisResultSchema } from "../../owl/contracts/owl-analysis.schemas";
import type { OpenAIHermesConfig } from "./openai-hermes-config";
import { toJSONSchema } from "zod";

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


export class OpenAIHermesAdapter implements HermesProviderPort {
  constructor(private readonly config: OpenAIHermesConfig) {}

  async generateStructuredOutput(request: HermesRequest): Promise<HermesProviderOutcome> {
    if (!this.config.apiKey) {
      return {
        ok: false,
        error: { code: "unknown_provider_failure", isRetryable: false }
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

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
      default:
        // Ensure TS checks exhaustiveness (or at least we throw at runtime if TS is bypassed)
        const exhaustiveCheck: never = request.structuredOutputIntent;
        throw new Error(`Unmapped intent: ${exhaustiveCheck}`);
    }

    // Map exact 2 messages explicitly
    const systemMessage = request.messages[0];
    const userMessage = request.messages[1];

    const providerMessages = [
      { role: "system" as const, content: systemMessage.content },
      { role: "user" as const, content: userMessage.content }
    ];

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) return { ok: false, error: { code: "rate_limited", isRetryable: true } };
        if (response.status === 401 || response.status === 403) return { ok: false, error: { code: "provider_rejected", isRetryable: false } };
        if (response.status >= 500) return { ok: false, error: { code: "unavailable", isRetryable: true } };
        return { ok: false, error: { code: "unavailable", isRetryable: true } };
      }

      const externalData: unknown = await response.json();

      if (!isOpenAIResponse(externalData)) {
        return { ok: false, error: { code: "invalid_output", isRetryable: false } };
      }

      const rawContent = externalData.choices[0]?.message.content || "";

      let parsedPayload: unknown;
      try {
        parsedPayload = JSON.parse(rawContent);
      } catch {
        return { ok: false, error: { code: "invalid_output", isRetryable: false } };
      }

      return {
        ok: true,
        payload: parsedPayload
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: { code: "timeout", isRetryable: true } };
      }
      return {
        ok: false,
        error: { code: "unavailable", isRetryable: true }
      };
    }
  }
}
