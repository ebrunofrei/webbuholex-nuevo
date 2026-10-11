import { describe, expect, it } from "vitest";
import {
  PostgresJurisprudenceRateLimiter,
  type RateLimiterSqlExecutor,
  type RateLimiterTransactionRunner,
} from "@/lib/security/postgres-jurisprudence-rate-limiter";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

interface StoredCounter {
  windowStartedAtMs: number;
  requestCount: number;
  expiresAtMs: number;
}

interface SimulatedRow {
  request_count: number;
  retry_after_seconds: number;
  reset_in_seconds: number;
}

class SimulatedRateLimitDatabase implements RateLimiterSqlExecutor, RateLimiterTransactionRunner {
  private readonly store = new Map<string, StoredCounter>();
  private readonly dialect = new PgDialect();
  public currentTimeMs: number = 1000000;
  public capturedStatements: string[] = [];

  advanceTime(seconds: number): void {
    this.currentTimeMs += seconds * 1000;
  }

  async run<T>(callback: (tx: RateLimiterSqlExecutor) => Promise<T>): Promise<T> {
    return await callback(this);
  }

  async execute(sqlQuery: SQL): Promise<unknown> {
    const rawSql = this.dialect.sqlToQuery(sqlQuery);

    this.capturedStatements.push(rawSql.sql);

    // Verify atomic SQL shape
    expect(rawSql.sql).toContain('INSERT INTO "jurisprudence_public"."jurisprudence_rate_limits"');
    expect(rawSql.sql).toContain('ON CONFLICT ("scope", "subject_hash")');
    expect(rawSql.sql).toContain('DO UPDATE SET');
    expect(rawSql.sql).toContain('RETURNING');

    const scope = String(rawSql.params[0]);
    const subjectHash = String(rawSql.params[1]);
    const windowSeconds = Number(rawSql.params[2]);

    const key = `${scope}:${subjectHash}`;
    const existing = this.store.get(key);

    let count: number;
    let expiresAtMs: number;

    if (!existing) {
      count = 1;
      expiresAtMs = this.currentTimeMs + windowSeconds * 1000;
      this.store.set(key, {
        windowStartedAtMs: this.currentTimeMs,
        requestCount: count,
        expiresAtMs,
      });
    } else if (existing.expiresAtMs <= this.currentTimeMs) {
      count = 1;
      expiresAtMs = this.currentTimeMs + windowSeconds * 1000;
      this.store.set(key, {
        windowStartedAtMs: this.currentTimeMs,
        requestCount: count,
        expiresAtMs,
      });
    } else {
      existing.requestCount += 1;
      count = existing.requestCount;
      expiresAtMs = existing.expiresAtMs;
    }

    const remainingSec = Math.max(0, Math.ceil((expiresAtMs - this.currentTimeMs) / 1000));
    const retryAfter = Math.max(1, remainingSec);

    const row: SimulatedRow = {
      request_count: count,
      retry_after_seconds: retryAfter,
      reset_in_seconds: remainingSec,
    };

    return [row];
  }
}

class RejectingTransactionRunner implements RateLimiterTransactionRunner {
  constructor(private readonly errorMessage: string) {}

  async run<T>(_callback: (tx: RateLimiterSqlExecutor) => Promise<T>): Promise<T> {
    throw new Error(this.errorMessage);
  }
}

describe("PostgresJurisprudenceRateLimiter", () => {
  it("allows first request on empty counter", async () => {
    const db = new SimulatedRateLimitDatabase();
    const limiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: db });

    const result = await limiter.consume({
      scope: "subject",
      subjectHash: "subj-1",
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.requestCount).toBe(1);
      expect(result.remaining).toBe(4);
      expect(result.resetInSeconds).toBe(60);
    }
  });

  it("allows consecutive requests up to limit", async () => {
    const db = new SimulatedRateLimitDatabase();
    const limiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: db });

    for (let i = 1; i <= 5; i++) {
      const result = await limiter.consume({
        scope: "subject",
        subjectHash: "subj-burst",
        limit: 5,
        windowSeconds: 60,
      });
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.requestCount).toBe(i);
        expect(result.remaining).toBe(5 - i);
      }
    }
  });

  it("rejects request once limit is exceeded and provides positive retryAfterSeconds", async () => {
    const db = new SimulatedRateLimitDatabase();
    const limiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: db });

    // Consume all 5
    for (let i = 1; i <= 5; i++) {
      await limiter.consume({
        scope: "subject",
        subjectHash: "subj-over",
        limit: 5,
        windowSeconds: 60,
      });
    }

    // 6th request: rejected
    const blocked = await limiter.consume({
      scope: "subject",
      subjectHash: "subj-over",
      limit: 5,
      windowSeconds: 60,
    });

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed && !("unavailable" in blocked)) {
      expect(blocked.requestCount).toBe(6);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("atomically resets counter when window expires", async () => {
    const db = new SimulatedRateLimitDatabase();
    const limiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: db });

    // Consume all 5
    for (let i = 1; i <= 5; i++) {
      await limiter.consume({
        scope: "subject",
        subjectHash: "subj-reset",
        limit: 5,
        windowSeconds: 60,
      });
    }

    // Advance simulated database clock by 61 seconds (past window)
    db.advanceTime(61);

    // Next request should reset counter and be allowed
    const fresh = await limiter.consume({
      scope: "subject",
      subjectHash: "subj-reset",
      limit: 5,
      windowSeconds: 60,
    });

    expect(fresh.allowed).toBe(true);
    if (fresh.allowed) {
      expect(fresh.requestCount).toBe(1);
      expect(fresh.remaining).toBe(4);
    }
  });

  it("isolates counters between distinct subjects", async () => {
    const db = new SimulatedRateLimitDatabase();
    const limiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: db });

    // Exhaust subject A
    for (let i = 1; i <= 3; i++) {
      await limiter.consume({
        scope: "subject",
        subjectHash: "subj-a",
        limit: 3,
        windowSeconds: 60,
      });
    }

    const blockedA = await limiter.consume({
      scope: "subject",
      subjectHash: "subj-a",
      limit: 3,
      windowSeconds: 60,
    });
    expect(blockedA.allowed).toBe(false);

    // Subject B is completely unaffected
    const resultB = await limiter.consume({
      scope: "subject",
      subjectHash: "subj-b",
      limit: 3,
      windowSeconds: 60,
    });
    expect(resultB.allowed).toBe(true);
    if (resultB.allowed) {
      expect(resultB.requestCount).toBe(1);
    }
  });

  it("isolates counters between subject and global scopes", async () => {
    const db = new SimulatedRateLimitDatabase();
    const limiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: db });

    // Exhaust subject scope
    for (let i = 1; i <= 2; i++) {
      await limiter.consume({
        scope: "subject",
        subjectHash: "common-hash",
        limit: 2,
        windowSeconds: 60,
      });
    }

    const blockedSubject = await limiter.consume({
      scope: "subject",
      subjectHash: "common-hash",
      limit: 2,
      windowSeconds: 60,
    });
    expect(blockedSubject.allowed).toBe(false);

    // Same subjectHash under global scope is independent
    const globalResult = await limiter.consume({
      scope: "global",
      subjectHash: "common-hash",
      limit: 50,
      windowSeconds: 3600,
    });
    expect(globalResult.allowed).toBe(true);
    if (globalResult.allowed) {
      expect(globalResult.requestCount).toBe(1);
    }
  });

  it("fails closed with typed unavailable result when database connection throws", async () => {
    const failingRunner = new RejectingTransactionRunner("PostgreSQL connection terminated abruptly");
    const failingLimiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: failingRunner });

    const result = await failingLimiter.consume({
      scope: "subject",
      subjectHash: "subj-err",
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result).toEqual({
      allowed: false,
      unavailable: true,
      reason: "limiter_unavailable",
    });
  });

  it("fails closed when transaction execution rejects", async () => {
    const failingRunner = new RejectingTransactionRunner("Pooler transaction timeout");
    const failingLimiter = new PostgresJurisprudenceRateLimiter({ transactionRunner: failingRunner });

    const result = await failingLimiter.consume({
      scope: "subject",
      subjectHash: "subj-err",
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result).toEqual({
      allowed: false,
      unavailable: true,
      reason: "limiter_unavailable",
    });
  });
});
