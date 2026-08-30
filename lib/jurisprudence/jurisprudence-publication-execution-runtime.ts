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

export interface JurisprudencePublicationExecutionRuntimeContainer {
  readonly service: JurisprudencePublicationExecutionService;
  close(): Promise<void>;
}

export function createJurisprudencePublicationExecutionRuntime(): JurisprudencePublicationExecutionRuntimeContainer {
  const now = () => new Date().toISOString();
  const generateId = () => randomUUID();
  const logger = { log: () => undefined };

  const writeDb = getJurisprudenceInternalWriteDatabase();
  const readDb = getJurisprudenceInternalReadDatabase();

  const internalRepository = new PostgresJurisprudenceRepository({ now, generateId });
  const applicationService = new JurisprudenceApplicationService({ repository: internalRepository, now, logger });
  const api = new DefaultJurisprudenceInternalApi(applicationService);

  const editorialRepository = new PostgresJurisprudenceEditorialCaseRepository();
  const editorialWorkflow = createJurisprudenceEditorialWorkflow({
    api,
    repository: editorialRepository,
    now,
    generateId,
    logger,
  });

  const governanceRepository = new PostgresJurisprudencePublicationDossierRepository();
  const publicationGovernance = createJurisprudencePublicationGovernanceService({
    api,
    editorialWorkflow,
    repository: governanceRepository,
    now,
    generateId,
    logger,
  });

  const authorizationRepository = new PostgresJurisprudencePublicationAuthorizationRepository();
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
  const projectionRepository = new PostgresJurisprudencePublicProjectionRepository();

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
