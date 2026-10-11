import { describe, expect, it } from "vitest";
import {
  readJurisprudenceRateLimitConfig,
  JurisprudenceRateLimitConfigError,
  DEFAULT_RATE_LIMIT_SUBJECT_MAX,
  DEFAULT_RATE_LIMIT_SUBJECT_WINDOW_SECONDS,
  DEFAULT_RATE_LIMIT_GLOBAL_MAX,
  DEFAULT_RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
} from "@/lib/security/jurisprudence-rate-limiter-config";

describe("readJurisprudenceRateLimitConfig", () => {
  const validSecret = "test-hmac-secret-1234567890";

  it("loads valid required config with conservative MVP defaults", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
    };

    const config = readJurisprudenceRateLimitConfig(env);

    expect(config.hmacSecret).toBe(validSecret);
    expect(config.subjectMax).toBe(DEFAULT_RATE_LIMIT_SUBJECT_MAX);
    expect(config.subjectWindowSeconds).toBe(DEFAULT_RATE_LIMIT_SUBJECT_WINDOW_SECONDS);
    expect(config.globalMax).toBe(DEFAULT_RATE_LIMIT_GLOBAL_MAX);
    expect(config.globalWindowSeconds).toBe(DEFAULT_RATE_LIMIT_GLOBAL_WINDOW_SECONDS);
  });

  it("fails closed when HMAC secret is missing", () => {
    const env: Partial<NodeJS.ProcessEnv> = {};

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      /JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET is required/
    );
  });

  it("fails closed when HMAC secret is blank or whitespace", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "   \t\n  ",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });

  it("loads custom valid overrides", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX: "10",
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_WINDOW_SECONDS: "120",
      JURISPRUDENCE_RATE_LIMIT_GLOBAL_MAX: "100",
      JURISPRUDENCE_RATE_LIMIT_GLOBAL_WINDOW_SECONDS: "7200",
    };

    const config = readJurisprudenceRateLimitConfig(env);

    expect(config.subjectMax).toBe(10);
    expect(config.subjectWindowSeconds).toBe(120);
    expect(config.globalMax).toBe(100);
    expect(config.globalWindowSeconds).toBe(7200);
  });

  it("accepts valid integers with surrounding whitespace", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX: "  8  ",
    };

    const config = readJurisprudenceRateLimitConfig(env);
    expect(config.subjectMax).toBe(8);
  });

  it("rejects integers with trailing characters (e.g. 5abc)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX: "5abc",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      /must be a positive integer/
    );
  });

  it("rejects values with unit suffix (e.g. 60seconds)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_WINDOW_SECONDS: "60seconds",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });

  it("rejects decimal numbers (e.g. 5.0)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX: "5.0",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });

  it("rejects negative numbers (e.g. -1)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX: "-1",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });

  it("rejects scientific notation (e.g. 1e3)", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_GLOBAL_MAX: "1e3",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });

  it("rejects zero when minimum boundary is 1", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: validSecret,
      JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX: "0",
    };

    expect(() => readJurisprudenceRateLimitConfig(env)).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });
});
