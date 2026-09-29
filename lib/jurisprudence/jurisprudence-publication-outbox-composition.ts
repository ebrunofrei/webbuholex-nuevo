import "server-only";
import { PostgresJurisprudencePublicationOutboxProcessorRepository } from "./postgres-jurisprudence-publication-outbox-processor-repository";
import { PostgresJurisprudencePublicProjectionWriter } from "./postgres-jurisprudence-public-projection-writer";
import { PostgresJurisprudenceRepository } from "./postgres-jurisprudence-repository";
import { JurisprudencePublicationOutboxProcessor } from "./jurisprudence-publication-outbox-processor";
import { getJurisprudenceOutboxDatabase, getJurisprudenceInternalWriteDatabase, getJurisprudencePublicWriteDatabase } from "@/database/client";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

export interface JurisprudencePublicationOutboxProcessorDependencies {
  getOutboxDatabase?: () => PostgresJsDatabase<typeof schema>;
  getPublicWriteDatabase?: () => PostgresJsDatabase<typeof schema>;
  getInternalWriteDatabase?: () => PostgresJsDatabase<typeof schema>;
}

export function createJurisprudencePublicationOutboxProcessor(
  deps?: JurisprudencePublicationOutboxProcessorDependencies
): JurisprudencePublicationOutboxProcessor {
  const getOutboxDatabase = deps?.getOutboxDatabase ?? getJurisprudenceOutboxDatabase;
  const getPublicWriteDatabase = deps?.getPublicWriteDatabase ?? getJurisprudencePublicWriteDatabase;
  const getInternalWriteDatabase = deps?.getInternalWriteDatabase ?? getJurisprudenceInternalWriteDatabase;

  const repository = new PostgresJurisprudencePublicationOutboxProcessorRepository({ getOutboxDatabase });
  const writer = new PostgresJurisprudencePublicProjectionWriter({ getWriteDatabase: getPublicWriteDatabase });
  const recordRepository = new PostgresJurisprudenceRepository({ getWriteDatabase: getInternalWriteDatabase });

  return new JurisprudencePublicationOutboxProcessor(repository, writer, recordRepository);
}
