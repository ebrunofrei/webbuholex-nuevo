import { sql, type SQL } from "drizzle-orm";
import { getJurisprudencePublicWriteDatabase } from "@/database/client";
import { withJurisprudencePublicWriteRole } from "@/database/roles";
import type {
  JurisprudenceRateLimiterPort,
  JurisprudenceRateLimiterOutcome,
  RateLimiterConsumeInput,
} from "./jurisprudence-rate-limiter-port";

export interface RateLimiterSqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

export interface RateLimiterTransactionRunner {
  run<T>(callback: (tx: RateLimiterSqlExecutor) => Promise<T>): Promise<T>;
}

class DefaultJurisprudenceRateLimiterTransactionRunner implements RateLimiterTransactionRunner {
  async run<T>(callback: (tx: RateLimiterSqlExecutor) => Promise<T>): Promise<T> {
    const db = getJurisprudencePublicWriteDatabase();
    return withJurisprudencePublicWriteRole(db, async (tx) => {
      return callback(tx);
    });
  }
}

export interface PostgresJurisprudenceRateLimiterDependencies {
  readonly transactionRunner?: RateLimiterTransactionRunner;
}

interface RateLimitRow {
  readonly request_count: number;
  readonly retry_after_seconds: number;
  readonly reset_in_seconds: number;
}

function parseRateLimitRow(row: unknown): RateLimitRow | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }
  const candidate = row;
  if (!("request_count" in candidate)) {
    return null;
  }
  const requestCount = Number(candidate.request_count);
  const retryAfterSeconds = "retry_after_seconds" in candidate ? Number(candidate.retry_after_seconds) : 1;
  const resetInSeconds = "reset_in_seconds" in candidate ? Number(candidate.reset_in_seconds) : 0;

  if (!Number.isFinite(requestCount)) {
    return null;
  }

  return {
    request_count: requestCount,
    retry_after_seconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 1,
    reset_in_seconds: Number.isFinite(resetInSeconds) ? resetInSeconds : 0,
  };
}

export class PostgresJurisprudenceRateLimiter implements JurisprudenceRateLimiterPort {
  private readonly transactionRunner: RateLimiterTransactionRunner;

  constructor(dependencies: PostgresJurisprudenceRateLimiterDependencies = {}) {
    this.transactionRunner = dependencies.transactionRunner ?? new DefaultJurisprudenceRateLimiterTransactionRunner();
  }

  async consume(input: RateLimiterConsumeInput): Promise<JurisprudenceRateLimiterOutcome> {
    try {
      return await this.transactionRunner.run(async (tx) => {
        // Single atomic query: inserts new window or updates active window or resets expired window.
        // PostgreSQL clock `now()` is authoritative for all window timestamps.
        const rawResult = await tx.execute(sql`
          INSERT INTO "jurisprudence_public"."jurisprudence_rate_limits" (
            "scope",
            "subject_hash",
            "window_started_at",
            "request_count",
            "expires_at"
          )
          VALUES (
            ${input.scope},
            ${input.subjectHash},
            now(),
            1,
            now() + (${input.windowSeconds} * interval '1 second')
          )
          ON CONFLICT ("scope", "subject_hash")
          DO UPDATE SET
            "request_count" = CASE
              WHEN "jurisprudence_public"."jurisprudence_rate_limits"."expires_at" <= now() THEN 1
              ELSE "jurisprudence_public"."jurisprudence_rate_limits"."request_count" + 1
            END,
            "window_started_at" = CASE
              WHEN "jurisprudence_public"."jurisprudence_rate_limits"."expires_at" <= now() THEN now()
              ELSE "jurisprudence_public"."jurisprudence_rate_limits"."window_started_at"
            END,
            "expires_at" = CASE
              WHEN "jurisprudence_public"."jurisprudence_rate_limits"."expires_at" <= now() THEN now() + (${input.windowSeconds} * interval '1 second')
              ELSE "jurisprudence_public"."jurisprudence_rate_limits"."expires_at"
            END
          RETURNING
            "request_count",
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expires_at" - now()))))::int AS "retry_after_seconds",
            GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("expires_at" - now()))))::int AS "reset_in_seconds";
        `);

        if (!Array.isArray(rawResult) || rawResult.length === 0) {
          return {
            allowed: false,
            unavailable: true,
            reason: "limiter_unavailable",
          };
        }

        const parsed = parseRateLimitRow(rawResult[0]);
        if (!parsed) {
          return {
            allowed: false,
            unavailable: true,
            reason: "limiter_unavailable",
          };
        }

        const requestCount = parsed.request_count;
        const retryAfterSeconds = Math.max(1, parsed.retry_after_seconds);
        const resetInSeconds = Math.max(0, parsed.reset_in_seconds);

        if (requestCount <= input.limit) {
          return {
            allowed: true,
            requestCount,
            remaining: Math.max(0, input.limit - requestCount),
            resetInSeconds,
          };
        }

        return {
          allowed: false,
          requestCount,
          retryAfterSeconds,
          resetInSeconds,
        };
      });
    } catch {
      // FAIL CLOSED: Infrastructure or database failure never permits unthrottled requests.
      return {
        allowed: false,
        unavailable: true,
        reason: "limiter_unavailable",
      };
    }
  }
}
