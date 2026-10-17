import { describe, expect, it, vi } from "vitest";
import * as dbClient from "@/database/client";
import { createJurisprudenceInterpretationRuntime } from "@/lib/jurisprudence/jurisprudence-interpretation-runtime";
import type {
  JurisprudenceRepositoryReadAccess,
  JurisprudenceReadTransactionScope,
} from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceRateLimitConfigError } from "@/lib/security/jurisprudence-rate-limiter-config";
import { OpenAIHermesConfigError } from "@/lib/hermes/config/openai-hermes-config";
import type { HermesProviderPort } from "@/lib/hermes/contracts/hermes-provider-port";
import type { HermesRequest, HermesProviderOutcome } from "@/lib/hermes/contracts/hermes-envelope";
import type { JurisprudenceRateLimiterPort, JurisprudenceRateLimiterOutcome, RateLimiterConsumeInput } from "@/lib/security/jurisprudence-rate-limiter-port";
import type { GetInternalJurisprudenceRecordQuery, JurisprudenceInternalRecordResultDto } from "@/types/jurisprudence-application";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/database/schema";

class DummyHermesProvider implements HermesProviderPort {
  async generateStructuredOutput(request: HermesRequest): Promise<HermesProviderOutcome> {
    void request;
    return {
      ok: false,
      error: { code: "unknown_provider_failure", isRetryable: false },
    };
  }
}

class DummyRateLimiter implements JurisprudenceRateLimiterPort {
  async consume(input: RateLimiterConsumeInput): Promise<JurisprudenceRateLimiterOutcome> {
    void input;
    return {
      allowed: true,
      requestCount: 1,
      remaining: 4,
      resetInSeconds: 60,
    };
  }
}

const dummyService = {
  async getInternalRecord(): Promise<JurisprudenceInternalRecordResultDto> {
    throw new Error("not used in factory construction");
  },
};

describe("createJurisprudenceInterpretationRuntime", () => {
  it("fails closed when HMAC secret is missing", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
    };

    expect(() => createJurisprudenceInterpretationRuntime({ env })).toThrowError(
      JurisprudenceRateLimitConfigError
    );
  });

  it("fails closed when OpenAI config is missing and no hermesProvider injected", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
    };

    expect(() => createJurisprudenceInterpretationRuntime({ env })).toThrowError(
      OpenAIHermesConfigError
    );
  });

  it("composes runtime bundle when valid env is provided", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      DATABASE_HERMES_CONTROL_URL: "postgresql://hermes_control_login:pwd@host:6543/postgres",
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();
    const dummyService = {
      async getInternalRecord(query: GetInternalJurisprudenceRecordQuery): Promise<JurisprudenceInternalRecordResultDto> {
        void query;
        throw new Error("not used in factory construction");
      },
    };

    const runtime = createJurisprudenceInterpretationRuntime({
      env,
      hermesProvider: dummyProvider,
      rateLimiter: dummyLimiter,
      applicationService: dummyService,
    });

    expect(runtime.orchestrator).toBeDefined();
    expect(runtime.rateLimiter).toBe(dummyLimiter);
    expect(runtime.rateLimitConfig.hmacSecret).toBe("hmac-secret-12345");
    expect(runtime.rateLimitConfig.subjectMax).toBe(5);
    expect(runtime.rateLimitConfig.globalMax).toBe(60);
  });

  it("canonical source lookup in default runtime composes through dedicated interpretation read connection and role", async () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL: "postgresql://jurisprudence_interpretation_read_login:pwd@host:5432/db",
      DATABASE_HERMES_CONTROL_URL: "postgresql://hermes_control_login:pwd@host:6543/postgres",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    let readGetterInvoked = false;
    let readRunnerInvoked = false;
    let writeGetterInvoked = false;

    vi.spyOn(dbClient, "getJurisprudenceInternalWriteDatabase").mockImplementation(() => {
      writeGetterInvoked = true;
      throw new Error("unexpected write db access");
    });

    const canonicalCanonicalPayload = {
      id: "rec-test-123",
      slug: "test-slug",
      recordVersion: 1,
      editorialStatus: "verified",
      publicationStatus: "published",
      caseNumber: "EXP. 1234-2026",
      resolutionNumber: "RES. 1",
      resolutionType: "Sentencia",
      institution: {
        id: "inst-1",
        name: "Corte Suprema",
        shortName: "CS",
        country: "Peru",
        kind: "judiciary",
        officialHomepage: null,
      },
      issuingBody: "Sala Civil",
      instanceLevel: "Suprema",
      specialty: "Civil",
      matter: "Obligaciones",
      submatter: null,
      judicialDistrict: null,
      chamberOrCourt: "Sala",
      rapporteur: null,
      issuedAt: "2026-01-01",
      officiallyPublishedAt: "2026-01-02",
      officialContent: {
        officialSummary: "Resumen oficial",
        officialFullText: "Texto oficial y vinculante canónico para interpretación.",
        fullTextAvailable: true,
        publicationAllowed: true,
        documentAvailability: "metadata_only",
        originFormat: "pdf",
        language: "es",
        pageCount: 10,
      },
      editorialContent: {
        editorialTitle: "Título",
        editorialSummary: null,
        publicExcerpt: null,
        legalIssue: null,
        mainCriterion: null,
        relevantGrounds: [],
        decision: null,
        citedNorms: [],
        citedPrecedentIds: [],
        relatedRecordIds: [],
        keywords: [],
      },
      generatedContent: {
        internalDraft: null,
        reviewed: false,
        supportedBySource: false,
      },
      authority: {
        resolutionCategory: "ordinary_decision",
        legalAuthority: "unknown",
        authorityEvidence: null,
        authorityVerifiedAt: null,
        validityStatus: "unknown",
        validityEvidence: null,
      },
      source: {
        type: "official_judiciary",
        name: "Fuente Oficial",
        url: null,
        documentId: null,
        publishedAt: null,
        retrievedAt: null,
        checksum: null,
        verificationStatus: "verified",
        verifiedAt: "2026-01-02T00:00:00.000Z",
        verifiedBy: null,
        verificationNotes: null,
        evidenceReference: "Documento oficial verificado",
      },
      officialFile: null,
      search: {
        normalizedSearchText: "TEXTO BUSQUEDA",
        normalizedMatters: [],
        normalizedBodies: [],
        jurisdiction: "Peru",
        tags: [],
        editorialRelevance: 0,
      },
      internal: {
        editorialNotes: [],
        contradictions: [],
        generatedContentOnly: false,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    const fakeTx: JurisprudenceReadTransactionScope = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ payloadJson: canonicalCanonicalPayload, id: "rec-test-123" }],
          }),
        }),
      }),
    };

    const fakeReadAccess: JurisprudenceRepositoryReadAccess<object, JurisprudenceReadTransactionScope> = {
      getDatabase: () => {
        readGetterInvoked = true;
        return {};
      },
      runTransaction: async (_db, callback) => {
        readRunnerInvoked = true;
        return await callback(fakeTx);
      },
    };

    const runtime = createJurisprudenceInterpretationRuntime({
      env,
      hermesProvider: dummyProvider,
      rateLimiter: dummyLimiter,
      readAccess: fakeReadAccess,
    });

    expect(runtime.orchestrator).toBeDefined();

    // Now execute prepareInterpretation to prove findById uses the read path, invokes read getter and runner, and does not invoke write getter
    const result = await runtime.orchestrator.prepareInterpretation("rec-test-123", 1);

    expect(readGetterInvoked).toBe(true);
    expect(readRunnerInvoked).toBe(true);
    expect(writeGetterInvoked).toBe(false);
    expect(result.ok).toBe(true);
  });

  it("runtime source path throws if DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL is missing and no service/db injected", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      // Notice DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL is present, but INTERPRETATION_READ is missing!
      DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL: "postgresql://write:pwd@host:5432/db",
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    expect(() =>
      createJurisprudenceInterpretationRuntime({
        env,
        hermesProvider: dummyProvider,
        rateLimiter: dummyLimiter,
      })
    ).toThrowError("jurisprudence_interpretation_read_database_configuration_missing");
  });

  it("env consistency: custom env with URL_A uses that config for DB client and does not re-read process.env", async () => {
    const originalEnv = process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL;
    delete process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL;

    try {
      const customUrl = "postgresql://jurisprudence_interpretation_read_login:pwd@custom-host:5432/db_custom";
      const customEnv: Partial<NodeJS.ProcessEnv> = {
        JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
        OPENAI_API_KEY: "sk-test-key",
        BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
        DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL: customUrl,
        DATABASE_HERMES_CONTROL_URL: "postgresql://hermes_control_login:pwd@host:6543/postgres",
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      };

      const dummyProvider = new DummyHermesProvider();
      const dummyLimiter = new DummyRateLimiter();

      // Runtime factory must construct successfully using customEnv without requiring process.env
      const runtime = createJurisprudenceInterpretationRuntime({
        env: customEnv,
        hermesProvider: dummyProvider,
        rateLimiter: dummyLimiter,
      });

      expect(runtime.orchestrator).toBeDefined();
    } finally {
      if (originalEnv === undefined) {
        delete process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL;
      } else {
        process.env.DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL = originalEnv;
      }
    }
  });

  it("lease = 90 with reservation absent/default 105 fails closed during runtime construction", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "90",
      DATABASE_HERMES_CONTROL_URL: "postgresql://hermes_control_login:pwd@host:6543/postgres",
      // HERMES_RESERVATION_TTL_SECONDS is absent -> defaults to 105
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    expect(() =>
      createJurisprudenceInterpretationRuntime({
        env,
        hermesProvider: dummyProvider,
        rateLimiter: dummyLimiter,
        applicationService: dummyService,
      })
    ).toThrow(/must be strictly greater than leaseTtlSeconds \(90\) \+ 15/);
  });

  it("lease = 90 with reservation = 110 succeeds during runtime construction", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "90",
      HERMES_RESERVATION_TTL_SECONDS: "110",
      DATABASE_HERMES_CONTROL_URL: "postgresql://hermes_control_login:pwd@host:6543/postgres",
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    const runtime = createJurisprudenceInterpretationRuntime({
      env,
      hermesProvider: dummyProvider,
      rateLimiter: dummyLimiter,
      applicationService: dummyService,
    });

    expect(runtime.executionService).toBeDefined();
  });

  it("typed dependency injection of reservationTtlSeconds overrides default", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "90",
      DATABASE_HERMES_CONTROL_URL: "postgresql://hermes_control_login:pwd@host:6543/postgres",
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    // Injecting reservationTtlSeconds = 115 allows lease = 90 to construct cleanly without env var
    const runtime = createJurisprudenceInterpretationRuntime({
      env,
      hermesProvider: dummyProvider,
      rateLimiter: dummyLimiter,
      applicationService: dummyService,
      reservationTtlSeconds: 115,
    });

    expect(runtime.executionService).toBeDefined();
  });

  it("fails closed when DATABASE_URL is present but DATABASE_HERMES_CONTROL_URL is missing", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      DATABASE_URL: "postgresql://generic:pwd@host:5432/main",
      DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL: "postgresql://jurisprudence:pwd@host:5432/db",
      // Notice DATABASE_HERMES_CONTROL_URL is omitted!
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    expect(() =>
      createJurisprudenceInterpretationRuntime({
        env,
        hermesProvider: dummyProvider,
        rateLimiter: dummyLimiter,
        applicationService: dummyService,
      })
    ).toThrowError("hermes_control_database_configuration_missing");
  });

  it("honors injected hermesDb dependency and does not require DATABASE_HERMES_CONTROL_URL in env", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      // DATABASE_HERMES_CONTROL_URL is absent
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();
    const mockHermesDb = { execute: vi.fn(), query: {} } as unknown as PostgresJsDatabase<typeof schema>;

    const runtime = createJurisprudenceInterpretationRuntime({
      env,
      hermesProvider: dummyProvider,
      rateLimiter: dummyLimiter,
      applicationService: dummyService,
      hermesDb: mockHermesDb,
    });

    expect(runtime.executionService).toBeDefined();
  });

  it("fails closed when dependencies.db is supplied but dependencies.hermesDb is absent and DATABASE_HERMES_CONTROL_URL is missing", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      DATABASE_URL: "postgresql://generic:pwd@host:5432/main",
      DATABASE_JURISPRUDENCE_INTERPRETATION_READ_URL: "postgresql://jurisprudence:pwd@host:5432/db",
      // DATABASE_HERMES_CONTROL_URL is absent
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();
    const genericDb = { execute: vi.fn(), query: {} } as unknown as PostgresJsDatabase<typeof schema>;

    expect(() =>
      createJurisprudenceInterpretationRuntime({
        env,
        hermesProvider: dummyProvider,
        rateLimiter: dummyLimiter,
        applicationService: dummyService,
        db: genericDb,
        // dependencies.hermesDb is intentionally omitted
      })
    ).toThrowError("hermes_control_database_configuration_missing");
  });

  it("when both dependencies.db and dependencies.hermesDb are supplied, Hermes components use hermesDb and do not touch generic db", () => {
    const env: Partial<NodeJS.ProcessEnv> = {
      JURISPRUDENCE_RATE_LIMIT_HMAC_SECRET: "hmac-secret-12345",
      OPENAI_API_KEY: "sk-test-key",
      BUHOLEX_JURISPRUDENCE_MODEL: "gpt-4o-2024-08-06",
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
    };

    const dummyProvider = new DummyHermesProvider();
    const dummyLimiter = new DummyRateLimiter();

    const mockGenericDb = {
      transaction: vi.fn(),
      execute: vi.fn(),
      query: {},
    } as unknown as PostgresJsDatabase<typeof schema>;

    const mockHermesDb = {
      transaction: vi.fn(),
      execute: vi.fn(),
      query: {},
    } as unknown as PostgresJsDatabase<typeof schema>;

    const runtime = createJurisprudenceInterpretationRuntime({
      env,
      hermesProvider: dummyProvider,
      rateLimiter: dummyLimiter,
      applicationService: dummyService,
      db: mockGenericDb,
      hermesDb: mockHermesDb,
    });

    expect(runtime.executionService).toBeDefined();
    expect(mockGenericDb.transaction).not.toHaveBeenCalled();
  });
});
