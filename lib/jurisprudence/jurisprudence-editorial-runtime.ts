import "server-only";
import { randomUUID } from "node:crypto";
import { PostgresJurisprudenceEditorialCaseRepository } from "@/lib/postgres-jurisprudence-editorial-case-repository";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { DefaultJurisprudenceInternalApi } from "@/lib/jurisprudence-internal-api";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";
import type { JurisprudenceEditorialWorkflow } from "@/types/jurisprudence-editorial-workflow";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

export interface JurisprudenceEditorialRuntimeContainer {
  readonly workflow: JurisprudenceEditorialWorkflow;
  close(): Promise<void>;
}

export interface JurisprudenceEditorialRuntimeDependencies {
  getInternalReadDatabase?: () => PostgresJsDatabase<Record<string, never>>;
  getInternalWriteDatabase?: () => PostgresJsDatabase<typeof schema>;
}

export function createJurisprudenceEditorialRuntime(
  deps?: JurisprudenceEditorialRuntimeDependencies
): JurisprudenceEditorialRuntimeContainer {
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

  const workflow = createJurisprudenceEditorialWorkflow({
    api,
    repository: editorialRepository,
    now,
    generateId,
    logger,
  });

  let closed = false;

  return {
    workflow,
    close: async () => {
      if (closed) return;
      await workflow.close();
      closed = true;
    },
  };
}
