import { z } from "zod";

export interface JurisprudenceRateLimitConfig {
  readonly hmacSecret: string;
  readonly subjectMax: number;
  readonly subjectWindowSeconds: number;
  readonly globalMax: number;
  readonly globalWindowSeconds: number;
}

export class JurisprudenceRateLimitConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JurisprudenceRateLimitConfigError";
  }
}

// Configurable MVP defaults (not permanent business policy)
export const DEFAULT_RATE_LIMIT_SUBJECT_MAX = 5;
export const DEFAULT_RATE_LIMIT_SUBJECT_WINDOW_SECONDS = 60;
export const DEFAULT_RATE_LIMIT_GLOBAL_MAX = 60;
export const DEFAULT_RATE_LIMIT_GLOBAL_WINDOW_SECONDS = 3600;

function parseBoundedPositiveInt(
  raw: string | undefined,
  fallback: number,
  varName: string,
  min: number,
  max: number
): number {
  if (raw === undefined || raw.trim().length === 0) {
    return fallback;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new JurisprudenceRateLimitConfigError(
      `${varName} must be a positive integer between ${min} and ${max}`
    );
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new JurisprudenceRateLimitConfigError(
      `${varName} must be a positive integer between ${min} and ${max}`
    );
  }
  return parsed;
}

const jurisprudenceRateLimitConfigSchema = z.object({
  hmacSecret: z.string().trim().min(1, "JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET_REQUIRED"),
  subjectMax: z.number().int().positive(),
  subjectWindowSeconds: z.number().int().positive(),
  globalMax: z.number().int().positive(),
  globalWindowSeconds: z.number().int().positive(),
});

export function readJurisprudenceRateLimitConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env
): JurisprudenceRateLimitConfig {
  const secret = env.JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new JurisprudenceRateLimitConfigError(
      "JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET is required and must not be empty"
    );
  }

  const subjectMax = parseBoundedPositiveInt(
    env.JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX,
    DEFAULT_RATE_LIMIT_SUBJECT_MAX,
    "JURISPRUDENCE_RATE_LIMIT_SUBJECT_MAX",
    1,
    1000
  );

  const subjectWindowSeconds = parseBoundedPositiveInt(
    env.JURISPRUDENCE_RATE_LIMIT_SUBJECT_WINDOW_SECONDS,
    DEFAULT_RATE_LIMIT_SUBJECT_WINDOW_SECONDS,
    "JURISPRUDENCE_RATE_LIMIT_SUBJECT_WINDOW_SECONDS",
    1,
    86400
  );

  const globalMax = parseBoundedPositiveInt(
    env.JURISPRUDENCE_RATE_LIMIT_GLOBAL_MAX,
    DEFAULT_RATE_LIMIT_GLOBAL_MAX,
    "JURISPRUDENCE_RATE_LIMIT_GLOBAL_MAX",
    1,
    100000
  );

  const globalWindowSeconds = parseBoundedPositiveInt(
    env.JURISPRUDENCE_RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
    DEFAULT_RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
    "JURISPRUDENCE_RATE_LIMIT_GLOBAL_WINDOW_SECONDS",
    1,
    604800
  );

  const candidate: JurisprudenceRateLimitConfig = {
    hmacSecret: secret.trim(),
    subjectMax,
    subjectWindowSeconds,
    globalMax,
    globalWindowSeconds,
  };

  const validation = jurisprudenceRateLimitConfigSchema.safeParse(candidate);
  if (!validation.success) {
    throw new JurisprudenceRateLimitConfigError("Invalid rate limiter configuration");
  }

  return validation.data;
}
