import "server-only";
import { randomUUID } from "node:crypto";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import { PostgresJurisprudencePublicationDossierRepository } from "@/lib/postgres-jurisprudence-publication-dossier-repository";
import { PostgresJurisprudenceEditorialCaseRepository } from "@/lib/postgres-jurisprudence-editorial-case-repository";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { DefaultJurisprudenceInternalApi } from "@/lib/jurisprudence-internal-api";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import type { JurisprudencePublicationGovernanceService } from "@/types/jurisprudence-publication-governance";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

export interface JurisprudenceGovernanceRuntimeContainer {
  readonly service: JurisprudencePublicationGovernanceService;
  close(): Promise<void>;
}

export interface JurisprudenceGovernanceRuntimeDependencies {
  getInternalReadDatabase?: () => PostgresJsDatabase<Record<string, never>>;
  getInternalWriteDatabase?: () => PostgresJsDatabase<typeof schema>;
}

export function createJurisprudenceGovernanceRuntime(
  deps?: JurisprudenceGovernanceRuntimeDependencies
): JurisprudenceGovernanceRuntimeContainer {
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

  const service = createJurisprudencePublicationGovernanceService({
    api,
    editorialWorkflow,
    repository: governanceRepository,
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
      closed = true;
    },
  };
}
