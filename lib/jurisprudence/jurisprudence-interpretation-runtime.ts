import "server-only";
import { randomUUID } from "node:crypto";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import { getJurisprudenceInterpretationReadDatabase } from "@/database/client";
import { readJurisprudenceInterpretationReadDatabaseConfig } from "@/database/config";
import {
  withJurisprudenceInterpretationReadRole,
  type JurisprudenceTransaction,
} from "@/database/roles";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { CanonicalJurisprudenceInterpretationSourceAdapter } from "@/lib/jurisprudence/canonical-jurisprudence-interpretation-source-adapter";
import { readOpenAIHermesConfig } from "@/lib/hermes/config/openai-hermes-config";
import { OpenAIHermesAdapter } from "@/lib/hermes/adapters/openai-hermes-adapter";
import type { HermesProviderPort } from "@/lib/hermes/contracts/hermes-provider-port";
import { JurisprudenceInterpretationOrchestrator } from "@/lib/domain/services/jurisprudence-interpretation-orchestrator";
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

export interface JurisprudenceInterpretationRuntimeDependencies<
  TDb = PostgresJsDatabase<typeof schema>,
  TTx extends JurisprudenceReadTransactionScope = JurisprudenceTransaction,
> {
  readonly applicationService?: Pick<JurisprudenceApplicationService, "getInternalRecord">;
  readonly getInterpretationReadDatabase?: () => PostgresJsDatabase<typeof schema>;
  readonly readAccess?: JurisprudenceRepositoryReadAccess<TDb, TTx>;
  readonly hermesProvider?: HermesProviderPort;
  readonly rateLimiter?: JurisprudenceRateLimiterPort;
  readonly env?: Partial<NodeJS.ProcessEnv>;
}

export interface JurisprudenceInterpretationRuntime {
  readonly orchestrator: JurisprudenceInterpretationOrchestrator;
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

  let hermesProvider = dependencies.hermesProvider;
  if (!hermesProvider) {
    const openAIConfig = readOpenAIHermesConfig(env);
    hermesProvider = new OpenAIHermesAdapter(openAIConfig);
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
  const orchestrator = new JurisprudenceInterpretationOrchestrator({
    hermesProvider,
    jurisprudenceRepository: sourceAdapter,
  });

  return {
    orchestrator,
    rateLimiter,
    rateLimitConfig,
  };
}
