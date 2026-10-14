import "server-only";
import { randomUUID } from "node:crypto";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import { getJurisprudenceInterpretationReadDatabase } from "@/database/client";
import { readJurisprudenceInterpretationReadDatabaseConfig } from "@/database/config";
import {
  withJurisprudenceInterpretationReadRole,
  type JurisprudenceTransaction,
  withHermesControlRole,
  type HermesControlTransaction,
} from "@/database/roles";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { CanonicalJurisprudenceInterpretationSourceAdapter } from "@/lib/jurisprudence/canonical-jurisprudence-interpretation-source-adapter";
import { readOpenAIHermesConfig } from "@/lib/hermes/config/openai-hermes-config";
import { OpenAIHermesAdapter } from "@/lib/hermes/adapters/openai-hermes-adapter";
import type { HermesProviderPort } from "@/lib/hermes/contracts/hermes-provider-port";
import {
  JurisprudenceInterpretationOrchestrator,
  type JurisprudencePreparationResult,
} from "@/lib/domain/services/jurisprudence-interpretation-orchestrator";
import type { JurisprudenceInterpretation } from "@/lib/hermes/contracts/jurisprudence-interpretation";
import {
  readJurisprudenceRateLimitConfig,
  type JurisprudenceRateLimitConfig,
} from "@/lib/security/jurisprudence-rate-limiter-config";
import type { JurisprudenceRateLimiterPort } from "@/lib/security/jurisprudence-rate-limiter-port";
import { PostgresJurisprudenceRateLimiter } from "@/lib/security/postgres-jurisprudence-rate-limiter";

import type {
  JurisprudenceRepositoryReadAccess,
  JurisprudenceReadTransactionScope,
} from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { getDatabase } from "@/database/client";
import {
  HermesRuntimeExecutionService,
  readHermesRuntimeLimitsConfig,
  readHermesReservationTtlConfig,
} from "@/lib/hermes/runtime/hermes-runtime-execution-service";
import type {
  HermesRuntimeExecutionServicePort,
} from "@/lib/hermes/runtime/hermes-runtime-execution-service";
import type {
  HermesSubjectRepository,
  HermesControlRoleRunner,
} from "@/lib/hermes/control/hermes-subject-repository";
import { PostgresHermesSubjectRepository } from "@/lib/hermes/control/hermes-subject-repository";
import type {
  HermesEntitlementRepository,
} from "@/lib/hermes/control/hermes-entitlement-repository";
import { PostgresHermesEntitlementRepository } from "@/lib/hermes/control/hermes-entitlement-repository";
import type {
  HermesQuotaCoordinator,
} from "@/lib/hermes/control/hermes-quota-coordinator";
import { PostgresHermesQuotaCoordinator } from "@/lib/hermes/control/hermes-quota-coordinator";
import type {
  HermesProviderBoundaryCoordinator,
  HermesProviderBoundaryLimits,
} from "@/lib/hermes/control/hermes-provider-boundary-coordinator";
import { PostgresHermesProviderBoundaryCoordinator } from "@/lib/hermes/control/hermes-provider-boundary-coordinator";
import type { OpenAIHermesConfig } from "@/lib/hermes/config/openai-hermes-config";

export interface JurisprudenceInterpretationRuntimeDependencies<
  TDb = PostgresJsDatabase<typeof schema>,
  TTx extends JurisprudenceReadTransactionScope = JurisprudenceTransaction,
> {
  readonly applicationService?: Pick<JurisprudenceApplicationService, "getInternalRecord"> | undefined;
  readonly getInterpretationReadDatabase?: (() => PostgresJsDatabase<typeof schema>) | undefined;
  readonly readAccess?: JurisprudenceRepositoryReadAccess<TDb, TTx> | undefined;
  readonly hermesProvider?: HermesProviderPort | undefined;
  readonly rateLimiter?: JurisprudenceRateLimiterPort | undefined;
  readonly env?: Partial<NodeJS.ProcessEnv> | undefined;
  readonly db?: PostgresJsDatabase<typeof schema> | undefined;
  readonly subjectRepository?: HermesSubjectRepository | undefined;
  readonly entitlementRepository?: HermesEntitlementRepository | undefined;
  readonly quotaCoordinator?: HermesQuotaCoordinator | undefined;
  readonly providerBoundaryCoordinator?: HermesProviderBoundaryCoordinator | undefined;
  readonly executionService?: HermesRuntimeExecutionServicePort | undefined;
  readonly limits?: HermesProviderBoundaryLimits | undefined;
  readonly reservationTtlSeconds?: number | undefined;
  readonly providerTimeoutMs?: number | undefined;
  readonly now?: (() => Date) | undefined;
  readonly sleep?: ((ms: number) => Promise<void>) | undefined;
}

export interface JurisprudenceInterpretationOrchestratorPort {
  prepareInterpretation(
    recordId: string,
    recordVersion: number
  ): Promise<JurisprudencePreparationResult>;
  validateGrounding(
    interpretation: JurisprudenceInterpretation,
    sourceText: string
  ): boolean;
}

export interface JurisprudenceInterpretationRuntime {
  readonly executionService: HermesRuntimeExecutionServicePort;
  readonly orchestrator: JurisprudenceInterpretationOrchestratorPort;
  readonly rateLimiter: JurisprudenceRateLimiterPort;
  readonly rateLimitConfig: JurisprudenceRateLimitConfig;
}

export function createJurisprudenceInterpretationRuntime<
  TDb = PostgresJsDatabase<typeof schema>,
  TTx extends JurisprudenceReadTransactionScope = JurisprudenceTransaction,
>(
  dependencies: JurisprudenceInterpretationRuntimeDependencies<TDb, TTx> = {}
): JurisprudenceInterpretationRuntime {
  const env = dependencies.env ?? process.env;

  const rateLimitConfig = readJurisprudenceRateLimitConfig(env);
  const rateLimiter = dependencies.rateLimiter ?? new PostgresJurisprudenceRateLimiter();

  let openAIConfig: OpenAIHermesConfig | undefined;
  let hermesProvider = dependencies.hermesProvider;
  let providerTimeoutMs = dependencies.providerTimeoutMs;

  if (!hermesProvider) {
    openAIConfig = readOpenAIHermesConfig(env);
    if (openAIConfig.timeoutMs > 30000) {
      throw new Error(
        `OpenAI provider timeout cannot exceed 30000 ms: received ${openAIConfig.timeoutMs}`
      );
    }
    providerTimeoutMs = openAIConfig.timeoutMs;
    hermesProvider = new OpenAIHermesAdapter(openAIConfig);
  } else if (providerTimeoutMs !== undefined && providerTimeoutMs > 30000) {
    throw new Error(
      `Injected provider timeout cannot exceed 30000 ms: received ${providerTimeoutMs}`
    );
  }

  let limits: HermesProviderBoundaryLimits;
  let reservationTtlSeconds: number | undefined;

  if (dependencies.limits !== undefined) {
    limits = dependencies.limits;
    reservationTtlSeconds =
      dependencies.reservationTtlSeconds ??
      (env.HERMES_RESERVATION_TTL_SECONDS !== undefined
        ? readHermesReservationTtlConfig(env)
        : undefined);
  } else {
    const runtimeLimits = readHermesRuntimeLimitsConfig(env);
    limits = runtimeLimits;
    reservationTtlSeconds =
      dependencies.reservationTtlSeconds ?? runtimeLimits.reservationTtlSeconds;
  }

  let applicationService = dependencies.applicationService;
  if (!applicationService) {
    const now = () => new Date().toISOString();
    const generateId = () => randomUUID();
    const internalRepository = dependencies.readAccess
      ? new PostgresJurisprudenceRepository<TDb, TTx>({
          now,
          generateId,
          readAccess: dependencies.readAccess,
        })
      : (() => {
          const interpretationReadConfig = readJurisprudenceInterpretationReadDatabaseConfig(env);
          const getDatabase = dependencies.getInterpretationReadDatabase ?? (() => getJurisprudenceInterpretationReadDatabase(interpretationReadConfig));
          const readAccess: JurisprudenceRepositoryReadAccess = {
            getDatabase,
            runTransaction: withJurisprudenceInterpretationReadRole,
          };
          return new PostgresJurisprudenceRepository({
            now,
            generateId,
            readAccess,
          });
        })();
    applicationService = new JurisprudenceApplicationService({ repository: internalRepository, now });
  }

  const sourceAdapter = new CanonicalJurisprudenceInterpretationSourceAdapter({ service: applicationService });
  // Domain orchestrator owns document preparation and grounding verification; provider dispatch is removed.
  const orchestrator = new JurisprudenceInterpretationOrchestrator({
    jurisprudenceRepository: sourceAdapter,
  });

  const roleRunner: HermesControlRoleRunner = async <T>(
    callback: (tx: HermesControlTransaction) => Promise<T>
  ): Promise<T> => {
    const db = dependencies.db ?? getDatabase();
    return withHermesControlRole(db, callback);
  };

  const subjectRepository =
    dependencies.subjectRepository ??
    new PostgresHermesSubjectRepository({ roleRunner });

  const entitlementRepository =
    dependencies.entitlementRepository ??
    new PostgresHermesEntitlementRepository({ roleRunner });

  const quotaCoordinator =
    dependencies.quotaCoordinator ??
    new PostgresHermesQuotaCoordinator({
      roleRunner,
      ...(dependencies.now !== undefined ? { now: dependencies.now } : {}),
    });

  const providerBoundaryCoordinator =
    dependencies.providerBoundaryCoordinator ??
    new PostgresHermesProviderBoundaryCoordinator({
      roleRunner,
      ...(dependencies.now !== undefined ? { now: dependencies.now } : {}),
    });

  const executionService =
    dependencies.executionService ??
    new HermesRuntimeExecutionService({
      subjectRepository,
      entitlementRepository,
      quotaCoordinator,
      providerBoundaryCoordinator,
      domainOrchestrator: orchestrator,
      providerPort: hermesProvider,
      limits,
      ...(reservationTtlSeconds !== undefined ? { reservationTtlSeconds } : {}),
      ...(providerTimeoutMs !== undefined ? { providerTimeoutMs } : {}),
      ...(dependencies.now !== undefined ? { now: dependencies.now } : {}),
      ...(dependencies.sleep !== undefined ? { sleep: dependencies.sleep } : {}),
    });

  return {
    executionService,
    orchestrator,
    rateLimiter,
    rateLimitConfig,
  };
}
