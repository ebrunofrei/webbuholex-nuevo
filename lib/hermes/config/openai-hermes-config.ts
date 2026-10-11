import { z } from "zod";
import type { OpenAIHermesConfig } from "../adapters/openai-hermes-config";

export type { OpenAIHermesConfig };

export const DEFAULT_OPENAI_TIMEOUT_MS = 30000;
export const MIN_OPENAI_TIMEOUT_MS = 1000;
export const MAX_OPENAI_TIMEOUT_MS = 300000;

export class OpenAIHermesConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIHermesConfigError";
  }
}

const openAIHermesConfigSchema = z.object({
  apiKey: z.string().trim().min(1, "OPENAI_API_KEY_REQUIRED"),
  jurisprudenceModel: z.string().trim().min(1, "BUHOLEX_JURISPRUDENCE_MODEL_REQUIRED"),
  owlModel: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().min(MIN_OPENAI_TIMEOUT_MS).max(MAX_OPENAI_TIMEOUT_MS),
});

export function readOpenAIHermesConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env
): OpenAIHermesConfig {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new OpenAIHermesConfigError("OPENAI_API_KEY is required and must not be empty");
  }

  const jurisprudenceModel = env.BUHOLEX_JURISPRUDENCE_MODEL;
  if (!jurisprudenceModel || jurisprudenceModel.trim() === "") {
    throw new OpenAIHermesConfigError("BUHOLEX_JURISPRUDENCE_MODEL is required and must not be empty");
  }

  let timeoutMs = DEFAULT_OPENAI_TIMEOUT_MS;
  const timeoutRaw = env.OPENAI_TIMEOUT_MS;
  if (timeoutRaw !== undefined && timeoutRaw.trim() !== "") {
    const trimmedTimeout = timeoutRaw.trim();
    if (!/^\d+$/.test(trimmedTimeout)) {
      throw new OpenAIHermesConfigError(
        `OPENAI_TIMEOUT_MS must be an integer between ${MIN_OPENAI_TIMEOUT_MS} and ${MAX_OPENAI_TIMEOUT_MS}`
      );
    }
    const parsedTimeout = Number(trimmedTimeout);
    if (!Number.isSafeInteger(parsedTimeout) || parsedTimeout < MIN_OPENAI_TIMEOUT_MS || parsedTimeout > MAX_OPENAI_TIMEOUT_MS) {
      throw new OpenAIHermesConfigError(
        `OPENAI_TIMEOUT_MS must be an integer between ${MIN_OPENAI_TIMEOUT_MS} and ${MAX_OPENAI_TIMEOUT_MS}`
      );
    }
    timeoutMs = parsedTimeout;
  }

  const rawOwl = env.BUHOLEX_OWL_MODEL?.trim();

  const candidate: {
    apiKey: string;
    jurisprudenceModel: string;
    timeoutMs: number;
    owlModel?: string;
  } = {
    apiKey: apiKey.trim(),
    jurisprudenceModel: jurisprudenceModel.trim(),
    timeoutMs,
    ...(rawOwl && rawOwl.length > 0 ? { owlModel: rawOwl } : {}),
  };

  const validation = openAIHermesConfigSchema.safeParse(candidate);
  if (!validation.success) {
    throw new OpenAIHermesConfigError("Invalid OpenAI Hermes configuration");
  }

  const result: OpenAIHermesConfig = {
    apiKey: validation.data.apiKey,
    jurisprudenceModel: validation.data.jurisprudenceModel,
    timeoutMs: validation.data.timeoutMs,
    ...(validation.data.owlModel !== undefined ? { owlModel: validation.data.owlModel } : {}),
  };

  return result;
}
