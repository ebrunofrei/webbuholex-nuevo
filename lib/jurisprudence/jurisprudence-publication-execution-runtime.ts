import "server-only";
import { randomUUID } from "node:crypto";
import { createJurisprudencePublicationExecutionService } from "@/lib/jurisprudence-publication-execution-service";
import { PostgresJurisprudencePublicationSourceReader } from "@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader";
import { PostgresJurisprudencePublicationExecutionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-execution-repository";
import { PostgresJurisprudencePublicProjectionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-public-projection-repository";
import { PostgresJurisprudencePublicationTransactionCoordinator } from "@/lib/jurisprudence/postgres-jurisprudence-publication-transaction-coordinator";
import { PostgresJurisprudenceEditorialCaseRepository } from "@/lib/postgres-jurisprudence-editorial-case-repository";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { PostgresJurisprudencePublicationDossierRepository } from "@/lib/postgres-jurisprudence-publication-dossier-repository";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import { PostgresJurisprudencePublicationAuthorizationRepository } from "@/lib/postgres-jurisprudence-publication-authorization-repository";
import { createJurisprudencePublicationAuthorizationService } from "@/lib/jurisprudence-publication-authorization-service";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { DefaultJurisprudenceInternalApi } from "@/lib/jurisprudence-internal-api";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import type { JurisprudencePublicationExecutionService } from "@/types/jurisprudence-publication-execution";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

export interface JurisprudencePublicationExecutionRuntimeContainer {
  readonly service: JurisprudencePublicationExecutionService;
  close(): Promise<void>;
}

export interface JurisprudencePublicationExecutionRuntimeDependencies {
  getInternalReadDatabase?: () => PostgresJsDatabase<Record<string, never>>;
  getInternalWriteDatabase?: () => PostgresJsDatabase<typeof schema>;
}

export function createJurisprudencePublicationExecutionRuntime(
  deps?: JurisprudencePublicationExecutionRuntimeDependencies
): JurisprudencePublicationExecutionRuntimeContainer {
  const now = () => new Date().toISOString();
  const generateId = () => randomUUID();
  const logger = { log: () => undefined };

  const getInternalWriteDatabase = deps?.getInternalWriteDatabase ?? getJurisprudenceInternalWriteDatabase;
  const getInternalReadDatabase = deps?.getInternalReadDatabase ?? getJurisprudenceInternalReadDatabase;

  const writeDb = getInternalWriteDatabase();
  const readDb = getInternalReadDatabase();

  const internalRepository = new PostgresJurisprudenceRepository({ now, generateId, getWriteDatabase: getInternalWriteDatabase });
  const applicationService = new JurisprudenceApplicationService({ repository: internalRepository, now, logger });
  const api = new DefaultJurisprudenceInternalApi(applicationService);

  const editorialRepository = new PostgresJurisprudenceEditorialCaseRepository({
    getReadDatabase: getInternalReadDatabase,
    getWriteDatabase: getInternalWriteDatabase,
  });
  const editorialWorkflow = createJurisprudenceEditorialWorkflow({
    api,
    repository: editorialRepository,
    now,
    generateId,
    logger,
  });

  const governanceRepository = new PostgresJurisprudencePublicationDossierRepository({
    getReadDatabase: getInternalReadDatabase,
    getWriteDatabase: getInternalWriteDatabase,
  });
  const publicationGovernance = createJurisprudencePublicationGovernanceService({
    api,
    editorialWorkflow,
    repository: governanceRepository,
    now,
    generateId,
    logger,
  });

  const authorizationRepository = new PostgresJurisprudencePublicationAuthorizationRepository({
    getReadDatabase: getInternalReadDatabase,
    getWriteDatabase: getInternalWriteDatabase,
  });
  const publicationAuthorization = createJurisprudencePublicationAuthorizationService({
    api,
    editorialWorkflow,
    publicationGovernance,
    repository: authorizationRepository,
    now,
    generateId,
    logger,
  });

  // Source reader uses internal read DB for the underlying record
  const sourceReader = new PostgresJurisprudencePublicationSourceReader(readDb);

  const executionRepository = new PostgresJurisprudencePublicationExecutionRepository(writeDb);
  const projectionRepository = new PostgresJurisprudencePublicProjectionRepository({
    getReadDatabase: getInternalReadDatabase,
  });

  const transactionCoordinator = new PostgresJurisprudencePublicationTransactionCoordinator(writeDb);

  const service = createJurisprudencePublicationExecutionService({
    sourceReader,
    editorialWorkflow,
    publicationGovernance,
    publicationAuthorization,
    executionRepository,
    projectionRepository,
    transactionCoordinator,
    now,
    generateId,
    logger,
  });

  let closed = false;

  return {
    service,
    close: async () => {
      if (closed) return;
      await service.close();
      await publicationAuthorization.close();
      await publicationGovernance.close();
      closed = true;
    },
  };
}
