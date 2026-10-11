export type JurisprudenceRateLimiterScope = "subject" | "global";

export interface RateLimiterConsumeInput {
  readonly scope: JurisprudenceRateLimiterScope;
  readonly subjectHash: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateLimiterAllowedOutcome {
  readonly allowed: true;
  readonly requestCount: number;
  readonly remaining: number;
  readonly resetInSeconds: number;
}

export interface RateLimiterExceededOutcome {
  readonly allowed: false;
  readonly requestCount: number;
  readonly retryAfterSeconds: number;
  readonly resetInSeconds: number;
}

export interface RateLimiterUnavailableOutcome {
  readonly allowed: false;
  readonly unavailable: true;
  readonly reason: "limiter_unavailable";
}

export type JurisprudenceRateLimiterOutcome =
  | RateLimiterAllowedOutcome
  | RateLimiterExceededOutcome
  | RateLimiterUnavailableOutcome;

export interface JurisprudenceRateLimiterPort {
  consume(input: RateLimiterConsumeInput): Promise<JurisprudenceRateLimiterOutcome>;
}
