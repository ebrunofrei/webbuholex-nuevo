import "server-only";
import { randomUUID } from "node:crypto";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { PostgresJurisprudenceEditorialCaseRepository } from "@/lib/postgres-jurisprudence-editorial-case-repository";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import { PostgresJurisprudencePublicationDossierRepository } from "@/lib/postgres-jurisprudence-publication-dossier-repository";
import { PostgresJurisprudencePublicationAuthorizationRepository } from "@/lib/postgres-jurisprudence-publication-authorization-repository";
import { createJurisprudencePublicationAuthorizationService } from "@/lib/jurisprudence-publication-authorization-service";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { DefaultJurisprudenceInternalApi } from "@/lib/jurisprudence-internal-api";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import type { JurisprudencePublicationAuthorizationService } from "@/types/jurisprudence-publication-authorization";

export interface JurisprudencePublicationAuthorizationRuntimeContainer {
  readonly service: JurisprudencePublicationAuthorizationService;
  close(): Promise<void>;
}

export interface JurisprudencePublicationAuthorizationRuntimeDependencies {
  getInternalReadDatabase?: () => PostgresJsDatabase<Record<string, never>>;
  getInternalWriteDatabase?: () => PostgresJsDatabase<typeof schema>;
}

export function createJurisprudencePublicationAuthorizationRuntime(
  deps?: JurisprudencePublicationAuthorizationRuntimeDependencies
): JurisprudencePublicationAuthorizationRuntimeContainer {
  const now = () => new Date().toISOString();
  const generateId = () => randomUUID();
  const logger = { log: () => undefined };

  const getInternalWriteDatabase = deps?.getInternalWriteDatabase ?? getJurisprudenceInternalWriteDatabase;
  const getInternalReadDatabase = deps?.getInternalReadDatabase ?? getJurisprudenceInternalReadDatabase;

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
  const service = createJurisprudencePublicationAuthorizationService({
    api,
    editorialWorkflow,
    publicationGovernance,
    repository: authorizationRepository,
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
      await publicationGovernance.close();
      closed = true;
    },
  };
}
