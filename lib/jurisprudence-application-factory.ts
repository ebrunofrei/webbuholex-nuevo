import path from "node:path";
import { randomUUID } from "node:crypto";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import { DefaultJurisprudenceInternalApi } from "@/lib/jurisprudence-internal-api";
import { SqliteJurisprudenceRepository } from "@/lib/sqlite-jurisprudence-repository";
import type {
  JurisprudenceApplicationDependencies,
  JurisprudenceInternalApi,
  JurisprudenceRepositoryApplicationFactoryInput,
  JurisprudenceSqliteApplicationFactoryInput,
} from "@/types/jurisprudence-application";

const defaultNow = () => new Date().toISOString();

function serviceDependencies(input: JurisprudenceRepositoryApplicationFactoryInput): JurisprudenceApplicationDependencies {
  return {
    repository: input.repository,
    now: input.now ?? defaultNow,
    ...(input.logger === undefined ? {} : { logger: input.logger }),
    ...(input.maxPublicScanRecords === undefined ? {} : { maxPublicScanRecords: input.maxPublicScanRecords }),
  };
}

export function createJurisprudenceInternalApi(
  input: JurisprudenceRepositoryApplicationFactoryInput,
): JurisprudenceInternalApi {
  return new DefaultJurisprudenceInternalApi(new JurisprudenceApplicationService(serviceDependencies(input)));
}

export function createInMemoryJurisprudenceInternalApi(
  options: Omit<JurisprudenceRepositoryApplicationFactoryInput, "repository"> = {},
): JurisprudenceInternalApi {
  return createJurisprudenceInternalApi({
    repository: new InMemoryJurisprudenceRepository(),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.logger === undefined ? {} : { logger: options.logger }),
    ...(options.maxPublicScanRecords === undefined ? {} : { maxPublicScanRecords: options.maxPublicScanRecords }),
  });
}

function assertSafeSqlitePath(databasePath: string): void {
  if (databasePath === ":memory:") return;
  const absolutePath = path.resolve(databasePath);
  const projectRoot = `${path.resolve(process.cwd())}${path.sep}`.toLocaleLowerCase("en-US");
  if (absolutePath.toLocaleLowerCase("en-US").startsWith(projectRoot)) {
    throw new JurisprudenceApplicationError(
      "VALIDATION_ERROR",
      "La base SQLite de la aplicación debe ubicarse fuera del repositorio Git.",
    );
  }
}

export function createSqliteJurisprudenceInternalApi(
  input: JurisprudenceSqliteApplicationFactoryInput,
): JurisprudenceInternalApi {
  assertSafeSqlitePath(input.databasePath);
  const repository = new SqliteJurisprudenceRepository(input.databasePath, {
    now: input.now ?? defaultNow,
    generateId: randomUUID,
  });
  return createJurisprudenceInternalApi({
    repository,
    ...(input.now === undefined ? {} : { now: input.now }),
    ...(input.logger === undefined ? {} : { logger: input.logger }),
    ...(input.maxPublicScanRecords === undefined ? {} : { maxPublicScanRecords: input.maxPublicScanRecords }),
  });
}
