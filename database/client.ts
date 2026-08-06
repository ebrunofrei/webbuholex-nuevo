import "server-only";
import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { DatabaseRuntimeConfig, readDatabaseRuntimeConfig } from "./config";

export interface DatabaseClientBundle {
  readonly sql: postgres.Sql;
  readonly db: PostgresJsDatabase<typeof schema>;
}

export function createDatabaseClient(config: DatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
  });

  const db = drizzle(sql, { schema });

  return { sql, db };
}

type DatabaseGlobal = typeof globalThis & {
  __buholexDatabaseClient__?: DatabaseClientBundle;
};

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readDatabaseRuntimeConfig();

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexDatabaseClient__) {
      g.__buholexDatabaseClient__ = createDatabaseClient(config);
    }
    return g.__buholexDatabaseClient__.db;
  }

  return createDatabaseClient(config).db;
}

export function getDatabaseClientBundle(): DatabaseClientBundle {
  const config = readDatabaseRuntimeConfig();

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexDatabaseClient__) {
      g.__buholexDatabaseClient__ = createDatabaseClient(config);
    }
    return g.__buholexDatabaseClient__;
  }

  return createDatabaseClient(config);
}
