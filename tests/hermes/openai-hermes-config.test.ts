import { describe, expect, it } from "vitest";
import {
  readOpenAIHermesConfig,
  OpenAIHermesConfigError,
  DEFAULT_OPENAI_TIMEOUT_MS,
  MIN_OPENAI_TIMEOUT_MS,
  MAX_OPENAI_TIMEOUT_MS,
} from "@/lib/hermes/config/openai-hermes-config";

describe("readOpenAIHermesConfig", () => {
  it("loads valid required config with defaults", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
    };

    const config = readOpenAIHermesConfig(env);

    expect(config.apiKey).toBe("sk-test-key-12345");
    expect(config.jurisprudenceModel).toBe("gpt-4o-2024-08-06");
    expect(config.timeoutMs).toBe(DEFAULT_OPENAI_TIMEOUT_MS);
    expect(config.owlModel).toBeUndefined();
  });

  it("loads valid config with optional timeout and owl model", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      BUHOLEX_OWL_MODEL: "gpt-4o-mini",
      OPENAI_TIMEOUT_MS: "45000",
    };

    const config = readOpenAIHermesConfig(env);

    expect(config.timeoutMs).toBe(45000);
    expect(config.owlModel).toBe("gpt-4o-mini");
  });

  it("fails closed when OPENAI_API_KEY is missing", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
    expect(() => readOpenAIHermesConfig(env)).toThrowError(/OPENAI_API_KEY is required/);
  });

  it("fails closed when OPENAI_API_KEY is blank or whitespace", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "   \t\n  ",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
    expect(() => readOpenAIHermesConfig(env)).toThrowError(/OPENAI_API_KEY is required/);
  });

  it("fails closed when BUHOLEX_JURISPRUDENCE_MODEL is missing", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
    expect(() => readOpenAIHermesConfig(env)).toThrowError(/BUHOLEX_JURISPRUDENCE_MODEL is required/);
  });

  it("fails closed when BUHOLEX_JURISPRUDENCE_MODEL is blank or whitespace", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "   ",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
  });

  it("rejects non-integer OPENAI_TIMEOUT_MS", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: "not-a-number",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
    expect(() => readOpenAIHermesConfig(env)).toThrowError(/must be an integer/);
  });

  it("rejects timeout below minimum boundary", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: `${MIN_OPENAI_TIMEOUT_MS - 1}`,
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
  });

  it("rejects timeout above maximum boundary", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: `${MAX_OPENAI_TIMEOUT_MS + 1}`,
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
  });

  it("rejects malformed timeout with suffix characters (e.g. 30000abc)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: "30000abc",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
  });

  it("rejects decimal timeout (e.g. 30000.5)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: "30000.5",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
  });

  it("rejects scientific notation timeout (e.g. 1e4)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: "1e4",
    };

    expect(() => readOpenAIHermesConfig(env)).toThrowError(OpenAIHermesConfigError);
  });

  it("accepts valid integer timeout with surrounding whitespace", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key-12345",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      OPENAI_TIMEOUT_MS: "  35000  ",
    };

    const config = readOpenAIHermesConfig(env);
    expect(config.timeoutMs).toBe(35000);
  });
});
